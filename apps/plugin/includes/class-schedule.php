<?php
/**
 * Missed-schedule repair plus auto/manual slot assignment.
 *
 * @package PublisherWP
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Nashir_Schedule {

	public function register(): void {
		add_action( 'nashir_heartbeat_event', array( $this, 'repair_missed' ), 5 );
		add_action( 'shutdown', array( $this, 'maybe_repair' ), 15 );
		add_action( 'save_post', array( $this, 'maybe_auto_slot' ), 30, 2 );
		add_action( 'admin_menu', array( $this, 'menu' ) );
		add_action( 'admin_init', array( $this, 'save_settings' ) );
	}

	public function menu(): void {
		add_submenu_page(
			'nashir',
			__( 'الجدولة', 'nashir' ),
			__( 'الجدولة', 'nashir' ),
			'manage_options',
			'nashir-schedule',
			array( $this, 'render' )
		);
	}

	public function save_settings(): void {
		if ( ! current_user_can( 'manage_options' ) || ! isset( $_POST['nashir_schedule_save'] ) ) {
			return;
		}
		check_admin_referer( 'nashir_schedule' );
		update_option( 'nashir_scheduler_mode', sanitize_key( wp_unslash( (string) ( $_POST['nashir_scheduler_mode'] ?? 'off' ) ) ) );
		update_option( 'nashir_auto_interval', absint( $_POST['nashir_auto_interval'] ?? 60 ) );
		update_option( 'nashir_allowed_types', sanitize_text_field( wp_unslash( (string) ( $_POST['nashir_allowed_types'] ?? 'post,page' ) ) ) );
		$slots = array();
		if ( isset( $_POST['nashir_slots'] ) && is_array( $_POST['nashir_slots'] ) ) {
			foreach ( $_POST['nashir_slots'] as $day => $value ) {
				$hours = array_filter( array_map( 'trim', explode( ',', sanitize_text_field( (string) $value ) ) ) );
				$slots[ (string) absint( $day ) ] = array_values( $hours );
			}
		}
		update_option( 'nashir_week_slots', wp_json_encode( $slots ) );
		add_settings_error( 'nashir', 'schedule', __( 'حُفظت إعدادات الجدولة.', 'nashir' ), 'updated' );
	}

	public function render(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		if ( ! Nashir_Plugin::licensed() ) {
			echo '<div class="wrap"><div class="notice notice-error"><p>' . esc_html__( 'يلزم تفعيل اشتراك PublisherWP لاستخدام الجدولة على هذا الموقع.', 'nashir' ) . '</p></div></div>';
			return;
		}
		$mode      = (string) get_option( 'nashir_scheduler_mode', 'off' );
		$interval  = (int) get_option( 'nashir_auto_interval', 60 );
		$types     = (string) get_option( 'nashir_allowed_types', 'post,page' );
		$slots     = json_decode( (string) get_option( 'nashir_week_slots', '{}' ), true );
		$slots     = is_array( $slots ) ? $slots : array();
		$days      = array(
			0 => __( 'الأحد', 'nashir' ),
			1 => __( 'الاثنين', 'nashir' ),
			2 => __( 'الثلاثاء', 'nashir' ),
			3 => __( 'الأربعاء', 'nashir' ),
			4 => __( 'الخميس', 'nashir' ),
			5 => __( 'الجمعة', 'nashir' ),
			6 => __( 'السبت', 'nashir' ),
		);
		settings_errors( 'nashir' );
		echo '<div class="wrap nashir-wrap"><h1>' . esc_html__( 'جدولة PublisherWP', 'nashir' ) . '</h1>';
		echo '<form method="post">';
		wp_nonce_field( 'nashir_schedule' );
		echo '<p><label>' . esc_html__( 'الوضع', 'nashir' ) . '</label><select name="nashir_scheduler_mode">';
		foreach ( array( 'off' => __( 'إيقاف', 'nashir' ), 'auto' => __( 'تلقائي (فاصل زمني)', 'nashir' ), 'manual' => __( 'يدوي (أيام وساعات)', 'nashir' ) ) as $value => $label ) {
			echo '<option value="' . esc_attr( $value ) . '"' . selected( $mode, $value, false ) . '>' . esc_html( $label ) . '</option>';
		}
		echo '</select></p>';
		echo '<p><label>' . esc_html__( 'الفاصل بالدقائق (تلقائي)', 'nashir' ) . '</label> <input type="number" name="nashir_auto_interval" min="15" value="' . esc_attr( (string) $interval ) . '"></p>';
		echo '<p><label>' . esc_html__( 'أنواع المقالات', 'nashir' ) . '</label> <input type="text" class="regular-text" name="nashir_allowed_types" value="' . esc_attr( $types ) . '"></p>';
		echo '<p>' . esc_html__( 'ساعات يدوية لكل يوم، مفصولة بفاصلة مثل 09:00,14:30', 'nashir' ) . '</p>';
		foreach ( $days as $index => $label ) {
			$val = isset( $slots[ (string) $index ] ) ? implode( ',', (array) $slots[ (string) $index ] ) : '';
			echo '<p><label>' . esc_html( $label ) . '</label> <input type="text" name="nashir_slots[' . esc_attr( (string) $index ) . ']" value="' . esc_attr( $val ) . '"></p>';
		}
		echo '<p><button class="button button-primary" name="nashir_schedule_save" value="1">' . esc_html__( 'حفظ', 'nashir' ) . '</button></p>';
		echo '</form></div>';
	}

	public function maybe_repair(): void {
		if ( get_transient( 'nashir_missed_lock' ) ) {
			return;
		}
		set_transient( 'nashir_missed_lock', 1, 60 );
		$this->repair_missed();
		$this->apply_meta_jobs();
	}

	public function repair_missed(): void {
		if ( ! Nashir_Plugin::licensed() ) {
			return;
		}
		$query = new WP_Query(
			array(
				'post_type'      => Nashir_Plugin::allowed_types(),
				'post_status'    => 'future',
				'posts_per_page' => 20,
				'date_query'     => array(
					array(
						'before'    => current_time( 'mysql' ),
						'inclusive' => true,
					),
				),
				'no_found_rows'  => true,
			)
		);

		foreach ( $query->posts as $post ) {
			if ( ! $post instanceof WP_Post ) {
				continue;
			}
			wp_publish_post( $post->ID );
		}
	}

	public function apply_meta_jobs(): void {
		$now = time();
		foreach ( array( '_nashir_unpublish_at' => 'draft', '_nashir_republish_at' => 'publish' ) as $meta => $status ) {
			$ids = get_posts(
				array(
					'post_type'      => Nashir_Plugin::allowed_types(),
					'post_status'    => 'any',
					'posts_per_page' => 20,
					'fields'         => 'ids',
					'meta_query'     => array(
						array(
							'key'     => $meta,
							'value'   => gmdate( 'c', $now ),
							'compare' => '<=',
						),
					),
				)
			);
			foreach ( $ids as $id ) {
				wp_update_post( array( 'ID' => (int) $id, 'post_status' => $status ) );
				delete_post_meta( (int) $id, $meta );
			}
		}

		$advanced = get_posts(
			array(
				'post_type'      => Nashir_Plugin::allowed_types(),
				'post_status'    => 'publish',
				'posts_per_page' => 20,
				'fields'         => 'ids',
				'meta_query'     => array(
					array(
						'key'     => '_nashir_advanced_at',
						'value'   => gmdate( 'c', $now ),
						'compare' => '<=',
					),
				),
			)
		);
		foreach ( $advanced as $id ) {
			Nashir_Editors::apply_pending( (int) $id );
			delete_post_meta( (int) $id, '_nashir_advanced_at' );
		}
	}

	public function maybe_auto_slot( int $post_id, WP_Post $post ): void {
		if ( ! Nashir_Plugin::licensed() ) {
			return;
		}
		if ( wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) ) {
			return;
		}
		if ( ! in_array( $post->post_type, Nashir_Plugin::allowed_types(), true ) ) {
			return;
		}
		if ( 'draft' !== $post->post_status ) {
			return;
		}

		$mode = (string) get_option( 'nashir_scheduler_mode', 'off' );
		if ( ! in_array( $mode, array( 'auto', 'manual' ), true ) ) {
			return;
		}
		if ( get_post_meta( $post_id, '_nashir_auto_assigned', true ) ) {
			return;
		}

		$slot = $this->next_slot( $mode );
		if ( ! $slot ) {
			return;
		}

		$local = wp_date( 'Y-m-d H:i:s', $slot );
		wp_update_post(
			array(
				'ID'            => $post_id,
				'post_status'   => 'future',
				'post_date'     => $local,
				'post_date_gmt' => get_gmt_from_date( $local ),
			)
		);
		update_post_meta( $post_id, '_nashir_auto_assigned', '1' );
	}

	private function next_slot( string $mode ): ?int {
		$now = time();
		if ( 'auto' === $mode ) {
			$minutes = max( 15, (int) get_option( 'nashir_auto_interval', 60 ) );
			return $now + ( $minutes * 60 );
		}

		$slots = json_decode( (string) get_option( 'nashir_week_slots', '{}' ), true );
		if ( ! is_array( $slots ) ) {
			return null;
		}

		for ( $offset = 0; $offset < 14; $offset++ ) {
			$day = (int) wp_date( 'w', $now + ( $offset * DAY_IN_SECONDS ) );
			$hours = isset( $slots[ (string) $day ] ) ? (array) $slots[ (string) $day ] : array();
			foreach ( $hours as $hhmm ) {
				$ts = strtotime( wp_date( 'Y-m-d', $now + ( $offset * DAY_IN_SECONDS ) ) . ' ' . $hhmm );
				if ( $ts && $ts > $now ) {
					return $ts;
				}
			}
		}
		return null;
	}
}
