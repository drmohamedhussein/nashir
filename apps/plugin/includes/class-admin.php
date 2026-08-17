<?php
/**
 * Admin settings: license login, calendar entry, disconnect.
 *
 * @package PublisherWP
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
			__( 'PublisherWP', 'nashir' ),
			__( 'PublisherWP', 'nashir' ),
			'edit_posts',
			'nashir',
			array( $this, 'render' ),
			'dashicons-calendar-alt',
			26
		);
	}

	public function assets( string $hook ): void {
		if ( false === strpos( $hook, 'nashir' ) ) {
			return;
		}

		wp_enqueue_style( 'nashir-admin', NASHIR_URL . 'assets/admin.css', array(), NASHIR_VERSION );
		wp_enqueue_script( 'nashir-calendar', NASHIR_URL . 'assets/calendar.js', array(), NASHIR_VERSION, true );
		wp_localize_script(
			'nashir-calendar',
			'nashirCalendar',
			array(
				'ajax'  => admin_url( 'admin-ajax.php' ),
				'nonce' => wp_create_nonce( 'nashir_calendar' ),
			)
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
			delete_option( 'nashir_plan' );
			add_settings_error( 'nashir', 'disconnected', __( 'تم فصل الموقع عن PublisherWP.', 'nashir' ), 'updated' );
			return;
		}

		if ( isset( $_POST['nashir_activate'] ) ) {
			check_admin_referer( 'nashir_activate' );
			if ( Nashir_License::is_vendor_site() ) {
				add_settings_error( 'nashir', 'vendor', __( 'موقع PublisherWP الرسمي مرخّص محلياً ولا يحتاج تفعيل سحابي.', 'nashir' ), 'updated' );
				return;
			}
			$app_url  = isset( $_POST['nashir_app_url'] ) ? esc_url_raw( wp_unslash( (string) $_POST['nashir_app_url'] ) ) : '';
			$email    = isset( $_POST['nashir_email'] ) ? sanitize_email( wp_unslash( (string) $_POST['nashir_email'] ) ) : '';
			$password = isset( $_POST['nashir_password'] ) ? (string) wp_unslash( $_POST['nashir_password'] ) : '';
			$this->store_result( Nashir_Client::activate( $app_url, $email, $password ), $app_url );
			return;
		}

		if ( isset( $_POST['nashir_connect'] ) ) {
			check_admin_referer( 'nashir_connect' );
			$app_url = isset( $_POST['nashir_app_url'] ) ? esc_url_raw( wp_unslash( (string) $_POST['nashir_app_url'] ) ) : '';
			$code    = isset( $_POST['nashir_code'] ) ? sanitize_text_field( wp_unslash( (string) $_POST['nashir_code'] ) ) : '';
			$this->store_result( Nashir_Client::pair( $app_url, $code ), $app_url );
		}
	}

	/**
	 * @param array<string, mixed>|WP_Error $result
	 */
	private function store_result( $result, string $app_url ): void {
		if ( is_wp_error( $result ) ) {
			add_settings_error( 'nashir', 'connect', $result->get_error_message() );
			return;
		}

		update_option( 'nashir_app_url', untrailingslashit( $app_url ) );
		update_option( 'nashir_site_id', sanitize_text_field( (string) ( $result['site_id'] ?? '' ) ) );
		update_option( 'nashir_api_key', sanitize_text_field( (string) ( $result['api_key'] ?? '' ) ) );
		update_option( 'nashir_signing_secret', sanitize_text_field( (string) ( $result['signing_secret'] ?? '' ) ) );
		if ( isset( $result['plan'] ) ) {
			update_option( 'nashir_plan', wp_json_encode( $result['plan'] ) );
		}
		add_settings_error( 'nashir', 'connected', __( 'تم تفعيل PublisherWP لهذا الموقع.', 'nashir' ), 'updated' );
	}

	public function render(): void {
		if ( ! current_user_can( 'edit_posts' ) ) {
			return;
		}

		$app_url = (string) get_option( 'nashir_app_url', '' );
		$site_id = (string) get_option( 'nashir_site_id', '' );

		echo '<div class="wrap nashir-wrap">';
		echo '<h1>' . esc_html__( 'PublisherWP', 'nashir' ) . '</h1>';
		settings_errors( 'nashir' );

		if ( Nashir_License::is_vendor_site() ) {
			$this->render_vendor();
		} elseif ( Nashir_Plugin::licensed() ) {
			$this->render_connected( $app_url, $site_id );
		} else {
			$this->render_login_form( $app_url );
		}

		echo '</div>';
	}

	private function render_vendor(): void {
		?>
		<div class="nashir-card">
			<p class="nashir-status is-connected"><?php esc_html_e( 'موقع PublisherWP الرسمي: الترخيص مفعّل محلياً. كل التقويم والجدولة والمشاركة تعمل هنا دون الاتصال بـ 127.0.0.1.', 'nashir' ); ?></p>
			<p><?php esc_html_e( 'مواقع الزبائن الأخرى تحتاج تسجيلاً بحساب PublisherWP واشتراكاً نشطاً.', 'nashir' ); ?></p>
			<p>
				<a class="button button-primary" href="<?php echo esc_url( admin_url( 'admin.php?page=nashir-calendar' ) ); ?>"><?php esc_html_e( 'فتح التقويم', 'nashir' ); ?></a>
				<a class="button" href="<?php echo esc_url( admin_url( 'admin.php?page=nashir-schedule' ) ); ?>"><?php esc_html_e( 'الجدولة', 'nashir' ); ?></a>
				<a class="button" href="<?php echo esc_url( admin_url( 'admin.php?page=nashir-social' ) ); ?>"><?php esc_html_e( 'اجتماعي', 'nashir' ); ?></a>
			</p>
		</div>
		<?php
	}

	private function render_connected( string $app_url, string $site_id ): void {
		$calendar = untrailingslashit( $app_url ) . '/app/calendar';
		$plan     = json_decode( (string) get_option( 'nashir_plan', '{}' ), true );
		?>
		<div class="nashir-card">
			<p class="nashir-status is-connected"><?php esc_html_e( 'الترخيص نشط لهذا الموقع.', 'nashir' ); ?></p>
			<p>
				<strong><?php esc_html_e( 'معرّف الموقع', 'nashir' ); ?>:</strong>
				<code><?php echo esc_html( $site_id ); ?></code>
			</p>
			<?php if ( is_array( $plan ) && isset( $plan['status'] ) ) : ?>
				<p>
					<strong><?php esc_html_e( 'الخطة', 'nashir' ); ?>:</strong>
					<?php echo esc_html( (string) $plan['status'] . ' / ' . (string) ( $plan['interval'] ?? '' ) ); ?>
				</p>
			<?php endif; ?>
			<p>
				<a class="button button-primary" href="<?php echo esc_url( admin_url( 'admin.php?page=nashir-calendar' ) ); ?>">
					<?php esc_html_e( 'التقويم في ووردبريس', 'nashir' ); ?>
				</a>
				<a class="button" href="<?php echo esc_url( $calendar ); ?>" target="_blank" rel="noopener noreferrer">
					<?php esc_html_e( 'التقويم في حساب PublisherWP', 'nashir' ); ?>
				</a>
			</p>
			<?php if ( current_user_can( 'manage_options' ) ) : ?>
			<form method="post">
				<?php wp_nonce_field( 'nashir_disconnect' ); ?>
				<button type="submit" name="nashir_disconnect" class="button" value="1">
					<?php esc_html_e( 'فصل الربط', 'nashir' ); ?>
				</button>
			</form>
			<?php endif; ?>
		</div>
		<?php
	}

	private function render_login_form( string $app_url ): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			echo '<p>' . esc_html__( 'اطلب من مدير الموقع تسجيل الدخول إلى حساب PublisherWP لتفعيل الترخيص.', 'nashir' ) . '</p>';
			return;
		}
		?>
		<div class="nashir-card">
			<p><?php esc_html_e( 'سجّل الدخول بحساب PublisherWP. الترخيص يُفعَّل فقط إذا كان هناك اشتراك نشط (أو مقعد تجريبي) لهذا الموقع.', 'nashir' ); ?></p>
			<form method="post" class="nashir-form">
				<?php wp_nonce_field( 'nashir_activate' ); ?>
				<p>
					<label for="nashir_app_url"><?php esc_html_e( 'رابط تطبيق PublisherWP', 'nashir' ); ?></label>
					<input type="url" class="regular-text" id="nashir_app_url" name="nashir_app_url" value="<?php echo esc_attr( $app_url ); ?>" placeholder="https://app.getnashir.com" required>
				</p>
				<p>
					<label for="nashir_email"><?php esc_html_e( 'البريد', 'nashir' ); ?></label>
					<input type="email" class="regular-text" id="nashir_email" name="nashir_email" required>
				</p>
				<p>
					<label for="nashir_password"><?php esc_html_e( 'كلمة المرور', 'nashir' ); ?></label>
					<input type="password" class="regular-text" id="nashir_password" name="nashir_password" required>
				</p>
				<p>
					<button type="submit" name="nashir_activate" class="button button-primary" value="1">
						<?php esc_html_e( 'تفعيل الترخيص', 'nashir' ); ?>
					</button>
				</p>
			</form>
		</div>
		<details class="nashir-card">
			<summary><?php esc_html_e( 'ربط برمز قصير (اختياري)', 'nashir' ); ?></summary>
			<form method="post" class="nashir-form">
				<?php wp_nonce_field( 'nashir_connect' ); ?>
				<input type="hidden" name="nashir_app_url" value="<?php echo esc_attr( $app_url ); ?>">
				<p>
					<label for="nashir_code"><?php esc_html_e( 'رمز الربط', 'nashir' ); ?></label>
					<input type="text" class="regular-text" id="nashir_code" name="nashir_code" maxlength="6" autocomplete="off">
				</p>
				<p>
					<button type="submit" name="nashir_connect" class="button" value="1">
						<?php esc_html_e( 'ربط بالرمز', 'nashir' ); ?>
					</button>
				</p>
			</form>
		</details>
		<?php
	}
}
