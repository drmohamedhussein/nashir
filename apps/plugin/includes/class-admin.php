<?php
/**
 * Admin settings screen: connect this site to a Nashir account.
 *
 * @package Nashir
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * WordPress admin UI.
 */
final class Nashir_Admin {

	public function register(): void {
		add_action( 'admin_menu', array( $this, 'menu' ) );
		add_action( 'admin_init', array( $this, 'handle' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'assets' ) );
	}

	public function menu(): void {
		add_menu_page(
			__( 'ناشر', 'nashir' ),
			__( 'ناشر', 'nashir' ),
			'manage_options',
			'nashir',
			array( $this, 'render' ),
			'dashicons-calendar-alt',
			26
		);
	}

	public function assets( string $hook ): void {
		if ( 'toplevel_page_nashir' !== $hook ) {
			return;
		}

		wp_enqueue_style(
			'nashir-admin',
			NASHIR_URL . 'assets/admin.css',
			array(),
			NASHIR_VERSION
		);
	}

	public function handle(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		if ( isset( $_POST['nashir_disconnect'] ) ) {
			check_admin_referer( 'nashir_disconnect' );
			delete_option( 'nashir_site_id' );
			delete_option( 'nashir_signing_secret' );
			delete_option( 'nashir_api_key' );
			add_settings_error( 'nashir', 'disconnected', __( 'تم فصل الموقع عن ناشر.', 'nashir' ), 'updated' );
			return;
		}

		if ( ! isset( $_POST['nashir_connect'] ) ) {
			return;
		}

		check_admin_referer( 'nashir_connect' );

		$app_url = isset( $_POST['nashir_app_url'] ) ? esc_url_raw( wp_unslash( (string) $_POST['nashir_app_url'] ) ) : '';
		$code    = isset( $_POST['nashir_code'] ) ? sanitize_text_field( wp_unslash( (string) $_POST['nashir_code'] ) ) : '';

		$result = Nashir_Client::pair( $app_url, $code );
		if ( is_wp_error( $result ) ) {
			add_settings_error( 'nashir', 'connect', $result->get_error_message() );
			return;
		}

		update_option( 'nashir_app_url', untrailingslashit( $app_url ) );
		update_option( 'nashir_site_id', sanitize_text_field( (string) ( $result['site_id'] ?? '' ) ) );
		update_option( 'nashir_api_key', sanitize_text_field( (string) ( $result['api_key'] ?? '' ) ) );
		update_option( 'nashir_signing_secret', sanitize_text_field( (string) ( $result['signing_secret'] ?? '' ) ) );

		add_settings_error( 'nashir', 'connected', __( 'تم ربط الموقع بناشر بنجاح.', 'nashir' ), 'updated' );
	}

	public function render(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$connected = (string) get_option( 'nashir_site_id', '' ) !== '';
		$app_url   = (string) get_option( 'nashir_app_url', 'http://localhost:3000' );
		$site_id   = (string) get_option( 'nashir_site_id', '' );

		echo '<div class="wrap nashir-wrap">';
		echo '<h1>' . esc_html__( 'ناشر', 'nashir' ) . '</h1>';
		settings_errors( 'nashir' );

		if ( $connected ) {
			$this->render_connected( $app_url, $site_id );
		} else {
			$this->render_connect_form( $app_url );
		}

		echo '</div>';
	}

	private function render_connected( string $app_url, string $site_id ): void {
		$calendar = untrailingslashit( $app_url ) . '/app/calendar';
		?>
		<div class="nashir-card">
			<p class="nashir-status is-connected"><?php esc_html_e( 'الموقع مربوط بحساب ناشر.', 'nashir' ); ?></p>
			<p>
				<strong><?php esc_html_e( 'معرّف الموقع', 'nashir' ); ?>:</strong>
				<code><?php echo esc_html( $site_id ); ?></code>
			</p>
			<p>
				<a class="button button-primary" href="<?php echo esc_url( $calendar ); ?>" target="_blank" rel="noopener noreferrer">
					<?php esc_html_e( 'فتح التقويم في ناشر', 'nashir' ); ?>
				</a>
			</p>
			<form method="post">
				<?php wp_nonce_field( 'nashir_disconnect' ); ?>
				<button type="submit" name="nashir_disconnect" class="button" value="1">
					<?php esc_html_e( 'فصل الربط', 'nashir' ); ?>
				</button>
			</form>
		</div>
		<?php
	}

	private function render_connect_form( string $app_url ): void {
		?>
		<div class="nashir-card">
			<p><?php esc_html_e( 'أنشئ رمز ربط من لوحة ناشر، ثم الصقه هنا لربط هذا الموقع بحسابك.', 'nashir' ); ?></p>
			<form method="post" class="nashir-form">
				<?php wp_nonce_field( 'nashir_connect' ); ?>
				<p>
					<label for="nashir_app_url"><?php esc_html_e( 'رابط تطبيق ناشر', 'nashir' ); ?></label>
					<input type="url" class="regular-text" id="nashir_app_url" name="nashir_app_url" value="<?php echo esc_attr( $app_url ); ?>" required>
				</p>
				<p>
					<label for="nashir_code"><?php esc_html_e( 'رمز الربط', 'nashir' ); ?></label>
					<input type="text" class="regular-text" id="nashir_code" name="nashir_code" maxlength="6" autocomplete="off" required>
				</p>
				<p>
					<button type="submit" name="nashir_connect" class="button button-primary" value="1">
						<?php esc_html_e( 'ربط الموقع', 'nashir' ); ?>
					</button>
				</p>
			</form>
		</div>
		<?php
	}
}
