<?php
/**
 * Drag-and-drop editorial calendar inside WordPress.
 *
 * @package PublisherWP
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Nashir_Calendar {

	public function register(): void {
		add_action( 'admin_menu', array( $this, 'menu' ) );
		add_action( 'wp_ajax_nashir_calendar_move', array( $this, 'move' ) );
		add_action( 'wp_ajax_nashir_calendar_create', array( $this, 'create' ) );
	}

	public function menu(): void {
		add_submenu_page(
			'nashir',
			__( 'التقويم', 'nashir' ),
			__( 'التقويم', 'nashir' ),
			'edit_posts',
			'nashir-calendar',
			array( $this, 'render' )
		);
	}

	public function render(): void {
		if ( ! current_user_can( 'edit_posts' ) ) {
			return;
		}
		if ( ! Nashir_Plugin::licensed() ) {
			echo '<div class="wrap"><div class="notice notice-error"><p>' . esc_html__( 'يلزم تفعيل اشتراك PublisherWP لاستخدام التقويم على هذا الموقع.', 'nashir' ) . '</p></div></div>';
			return;
		}

		$month = isset( $_GET['month'] ) ? absint( $_GET['month'] ) : (int) wp_date( 'n' );
		$year  = isset( $_GET['year'] ) ? absint( $_GET['year'] ) : (int) wp_date( 'Y' );
		$start = new DateTimeImmutable( sprintf( '%04d-%02d-01', $year, $month ) );
		$grid  = $this->grid( $start );
		$posts = $this->posts_for_month( $start );

		echo '<div class="wrap nashir-wrap nashir-calendar-wrap">';
		echo '<h1>' . esc_html__( 'تقويم PublisherWP', 'nashir' ) . '</h1>';
		echo '<p>' . esc_html__( 'اسحب المقال إلى يوم آخر لجدوله. التغيير يُزامَن مع حساب PublisherWP.', 'nashir' ) . '</p>';
		echo '<p><a class="button" href="' . esc_url( add_query_arg( array( 'month' => (int) $start->modify( '-1 month' )->format( 'n' ), 'year' => (int) $start->modify( '-1 month' )->format( 'Y' ) ) ) ) . '">' . esc_html__( 'الشهر السابق', 'nashir' ) . '</a> ';
		echo '<strong>' . esc_html( wp_date( 'F Y', $start->getTimestamp() ) ) . '</strong> ';
		echo '<a class="button" href="' . esc_url( add_query_arg( array( 'month' => (int) $start->modify( '+1 month' )->format( 'n' ), 'year' => (int) $start->modify( '+1 month' )->format( 'Y' ) ) ) ) . '">' . esc_html__( 'الشهر التالي', 'nashir' ) . '</a></p>';

		$days = array( __( 'السبت', 'nashir' ), __( 'الأحد', 'nashir' ), __( 'الاثنين', 'nashir' ), __( 'الثلاثاء', 'nashir' ), __( 'الأربعاء', 'nashir' ), __( 'الخميس', 'nashir' ), __( 'الجمعة', 'nashir' ) );
		echo '<div class="nashir-cal-head">';
		foreach ( $days as $day ) {
			echo '<div>' . esc_html( $day ) . '</div>';
		}
		echo '</div><div class="nashir-cal-grid">';

		foreach ( $grid as $date ) {
			$key   = $date->format( 'Y-m-d' );
			$items = $posts[ $key ] ?? array();
			echo '<div class="nashir-cal-day" data-date="' . esc_attr( $key ) . '" ondragover="event.preventDefault()" ondrop="nashirDrop(event)">';
			echo '<div class="nashir-cal-num">' . esc_html( $date->format( 'j' ) ) . '</div>';
			foreach ( $items as $item ) {
				printf(
					'<a class="nashir-cal-item status-%s" draggable="true" data-id="%d" href="%s" ondragstart="nashirDrag(event)">%s</a>',
					esc_attr( $item['status'] ),
					(int) $item['id'],
					esc_url( get_edit_post_link( (int) $item['id'], 'raw' ) ?: '#' ),
					esc_html( $item['title'] )
				);
			}
			echo '</div>';
		}

		echo '</div>';
		echo '<p><button type="button" class="button" id="nashir-new-post">' . esc_html__( 'مقال جديد في التقويم', 'nashir' ) . '</button></p>';
		echo '</div>';
	}

	/**
	 * @return array<int, DateTimeImmutable>
	 */
	private function grid( DateTimeImmutable $start ): array {
		$weekday = (int) $start->format( 'w' );
		$sat     = ( $weekday + 1 ) % 7;
		$cursor  = $start->modify( '-' . $sat . ' days' );
		$days    = array();
		for ( $i = 0; $i < 42; $i++ ) {
			$days[] = $cursor;
			$cursor = $cursor->modify( '+1 day' );
		}
		return $days;
	}

	/**
	 * @return array<string, array<int, array<string, mixed>>>
	 */
	private function posts_for_month( DateTimeImmutable $start ): array {
		$query = new WP_Query(
			array(
				'post_type'      => Nashir_Plugin::allowed_types(),
				'post_status'    => array( 'draft', 'pending', 'future', 'publish' ),
				'posts_per_page' => 200,
				'date_query'     => array(
					array(
						'after'     => $start->modify( '-7 days' )->format( 'Y-m-d' ),
						'before'    => $start->modify( '+40 days' )->format( 'Y-m-d' ),
						'inclusive' => true,
					),
				),
			)
		);

		$map = array();
		foreach ( $query->posts as $post ) {
			if ( ! $post instanceof WP_Post ) {
				continue;
			}
			$key           = substr( $post->post_date, 0, 10 );
			$map[ $key ][] = array(
				'id'     => (int) $post->ID,
				'title'  => get_the_title( $post ),
				'status' => $post->post_status,
			);
		}
		return $map;
	}

	public function move(): void {
		check_ajax_referer( 'nashir_calendar', 'nonce' );
		if ( ! current_user_can( 'edit_posts' ) ) {
			wp_send_json_error( array( 'message' => 'forbidden' ), 403 );
		}

		$post_id = isset( $_POST['post_id'] ) ? absint( $_POST['post_id'] ) : 0;
		$date    = isset( $_POST['date'] ) ? sanitize_text_field( wp_unslash( (string) $_POST['date'] ) ) : '';
		$post    = get_post( $post_id );
		if ( ! $post instanceof WP_Post || ! preg_match( '/^\d{4}-\d{2}-\d{2}$/', $date ) ) {
			wp_send_json_error( array( 'message' => 'bad' ), 400 );
		}

		$time  = substr( $post->post_date, 11 ) ?: '09:00:00';
		$local = $date . ' ' . $time;
		$status = strtotime( $local ) > time() ? 'future' : $post->post_status;
		if ( 'publish' === $post->post_status && strtotime( $local ) > time() ) {
			$status = 'future';
		}

		wp_update_post(
			array(
				'ID'            => $post_id,
				'post_date'     => $local,
				'post_date_gmt' => get_gmt_from_date( $local ),
				'post_status'   => $status,
			)
		);
		wp_send_json_success( array( 'ok' => true ) );
	}

	public function create(): void {
		check_ajax_referer( 'nashir_calendar', 'nonce' );
		if ( ! current_user_can( 'edit_posts' ) ) {
			wp_send_json_error( array( 'message' => 'forbidden' ), 403 );
		}
		$id = wp_insert_post(
			array(
				'post_title'  => __( 'مسودة من تقويم PublisherWP', 'nashir' ),
				'post_status' => 'draft',
				'post_type'   => 'post',
			)
		);
		if ( is_wp_error( $id ) ) {
			wp_send_json_error( array( 'message' => $id->get_error_message() ) );
		}
		wp_send_json_success( array( 'edit' => get_edit_post_link( (int) $id, 'raw' ) ) );
	}
}
