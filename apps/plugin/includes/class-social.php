<?php
/**
 * Social share templates stored locally and synced via Nashir account.
 *
 * @package PublisherWP
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Nashir_Social {

	/**
	 * @return array<string, string>
	 */
	public static function platforms(): array {
		return array(
			'facebook'        => 'Facebook',
			'x'               => 'X',
			'linkedin'        => 'LinkedIn',
			'pinterest'       => 'Pinterest',
			'instagram'       => 'Instagram',
			'medium'          => 'Medium',
			'threads'         => 'Threads',
			'google_business' => 'Google Business',
		);
	}

	public function register(): void {
		add_action( 'admin_menu', array( $this, 'menu' ) );
		add_action( 'admin_init', array( $this, 'save' ) );
		add_action( 'transition_post_status', array( $this, 'on_publish' ), 20, 3 );
	}

	public function menu(): void {
		add_submenu_page(
			'nashir',
			__( 'المشاركة الاجتماعية', 'nashir' ),
			__( 'اجتماعي', 'nashir' ),
			'manage_options',
			'nashir-social',
			array( $this, 'render' )
		);
	}

	public function save(): void {
		if ( ! current_user_can( 'manage_options' ) || ! isset( $_POST['nashir_social_save'] ) ) {
			return;
		}
		check_admin_referer( 'nashir_social' );
		$templates = array();
		if ( isset( $_POST['nashir_tpl'] ) && is_array( $_POST['nashir_tpl'] ) ) {
			foreach ( $_POST['nashir_tpl'] as $platform => $body ) {
				$key = sanitize_key( (string) $platform );
				if ( isset( self::platforms()[ $key ] ) ) {
					$templates[ $key ] = sanitize_textarea_field( wp_unslash( (string) $body ) );
				}
			}
		}
		update_option( 'nashir_social_templates', $templates );
		add_settings_error( 'nashir', 'social', __( 'حُفظت القوالب. ربط الحسابات يتم من لوحة PublisherWP.', 'nashir' ), 'updated' );
	}

	public function render(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		if ( ! Nashir_Plugin::licensed() ) {
			echo '<div class="wrap"><div class="notice notice-error"><p>' . esc_html__( 'يلزم تفعيل اشتراك PublisherWP لاستخدام المشاركة الاجتماعية على هذا الموقع.', 'nashir' ) . '</p></div></div>';
			return;
		}
		$saved = get_option( 'nashir_social_templates', array() );
		$saved = is_array( $saved ) ? $saved : array();
		$app   = untrailingslashit( (string) get_option( 'nashir_app_url', '' ) );
		settings_errors( 'nashir' );
		echo '<div class="wrap nashir-wrap"><h1>' . esc_html__( 'قوالب المشاركة', 'nashir' ) . '</h1>';
		echo '<p>' . esc_html__( 'استخدم {title} و{url} و{excerpt}. أسرار التطبيقات تُحفظ في حساب PublisherWP لا في كل موقع.', 'nashir' ) . '</p>';
		if ( $app ) {
			echo '<p><a class="button" href="' . esc_url( $app . '/app/social' ) . '" target="_blank" rel="noopener">' . esc_html__( 'ربط الحسابات في PublisherWP', 'nashir' ) . '</a></p>';
		}
		echo '<form method="post">';
		wp_nonce_field( 'nashir_social' );
		foreach ( self::platforms() as $key => $label ) {
			$body = isset( $saved[ $key ] ) ? (string) $saved[ $key ] : '{title} {url}';
			echo '<p><label>' . esc_html( $label ) . '</label><br><textarea name="nashir_tpl[' . esc_attr( $key ) . ']" rows="3" class="large-text">' . esc_textarea( $body ) . '</textarea></p>';
		}
		echo '<p><button class="button button-primary" name="nashir_social_save" value="1">' . esc_html__( 'حفظ القوالب', 'nashir' ) . '</button></p>';
		echo '</form></div>';
	}

	public function on_publish( string $new, string $old, WP_Post $post ): void {
		if ( 'publish' !== $new || 'publish' === $old ) {
			return;
		}
		if ( ! in_array( $post->post_type, Nashir_Plugin::allowed_types(), true ) ) {
			return;
		}
		if ( ! Nashir_Plugin::connected() ) {
			return;
		}

		$templates = get_option( 'nashir_social_templates', array() );
		if ( ! is_array( $templates ) || $templates === array() ) {
			return;
		}

		Nashir_Client::sync(
			array(
				'posts' => array(
					array(
						'wp_post_id'   => (int) $post->ID,
						'title'        => get_the_title( $post ),
						'status'       => $post->post_status,
						'post_type'    => $post->post_type,
						'permalink'    => get_permalink( $post ),
						'scheduled_at' => null,
						'published_at' => gmdate( 'c' ),
					),
				),
			)
		);
	}
}
