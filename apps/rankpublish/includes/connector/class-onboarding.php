<?php
/**
 * RankPublish plugin onboarding — activation redirect and setup wizard.
 *
 * @package RankPublish
 */

declare(strict_types=1);

namespace RankPublish\Connector;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Guides site owners through account registration, trial, and pairing.
 */
final class Onboarding {

	private const TRANSIENT = 'rankpublish_show_onboarding';

	public static function register(): void {
		add_action( 'admin_init', array( self::class, 'maybe_mark_install' ), 1 );
		add_action( 'admin_init', array( self::class, 'maybe_redirect' ), 5 );
	}

	/**
	 * Call from merged plugin activation hook when available.
	 */
	public static function flag_onboarding(): void {
		set_transient( self::TRANSIENT, '1', DAY_IN_SECONDS );
	}

	public static function maybe_mark_install(): void {
		if ( get_option( 'rankpublish_install_mark' ) ) {
			return;
		}
		update_option( 'rankpublish_install_mark', (string) time(), false );
		if ( ! Rest::is_connected() ) {
			self::flag_onboarding();
		}
	}

	public static function maybe_redirect(): void {
		if ( ! is_admin() || wp_doing_ajax() || ! current_user_can( 'manage_options' ) ) {
			return;
		}
		if ( Rest::is_connected() ) {
			delete_transient( self::TRANSIENT );
			return;
		}
		if ( ! get_transient( self::TRANSIENT ) ) {
			return;
		}

		$page = isset( $_GET['page'] ) ? sanitize_key( (string) wp_unslash( $_GET['page'] ) ) : '';
		if ( in_array( $page, array( 'rankpublish-cloud', 'rankpublish-scheduler', 'rankpublish-seo' ), true ) ) {
			return;
		}

		wp_safe_redirect( admin_url( 'admin.php?page=rankpublish-cloud&welcome=1' ) );
		exit;
	}

	/**
	 * ThinkRank-style connection wizard for Cloud Connect.
	 */
	public static function render_wizard( bool $connected, string $app_url, string $site_id, string $health ): void {
		$cloud = self::default_app_url();
		$logo  = defined( 'RANKPUBLISH_URL' ) ? RANKPUBLISH_URL . 'assets/logo.svg' : '';
		$notices = get_settings_errors( 'rankpublish_cloud' );
		?>
		<div class="rp-wizard">
			<div class="rp-wizard__panel">
				<nav class="rp-wizard__stepper-card" aria-label="<?php esc_attr_e( 'Connection steps', 'rankpublish' ); ?>">
					<ol class="rp-wizard__stepper">
						<li class="rp-wizard__step<?php echo $connected ? ' is-complete' : ''; ?>">
							<a class="rp-wizard__step-button" href="<?php echo esc_url( $cloud . '/register' ); ?>" target="_blank" rel="noopener noreferrer">
								<span class="rp-wizard__step-marker">1</span>
								<span class="rp-wizard__step-label"><?php esc_html_e( 'Account', 'rankpublish' ); ?></span>
							</a>
						</li>
						<li class="rp-wizard__step<?php echo $connected ? ' is-complete' : ''; ?>">
							<span class="rp-wizard__step-button" aria-hidden="true">
								<span class="rp-wizard__step-marker">2</span>
								<span class="rp-wizard__step-label"><?php esc_html_e( 'Trial', 'rankpublish' ); ?></span>
							</span>
						</li>
						<li class="rp-wizard__step<?php echo $connected ? ' is-complete' : ' is-active'; ?>">
							<span class="rp-wizard__step-button">
								<span class="rp-wizard__step-marker"><?php echo $connected ? '✓' : '3'; ?></span>
								<span class="rp-wizard__step-label"><?php esc_html_e( 'Connect', 'rankpublish' ); ?></span>
							</span>
						</li>
					</ol>
				</nav>

				<header class="rp-wizard__header">
					<?php if ( '' !== $logo ) : ?>
						<img class="rp-wizard__logo" src="<?php echo esc_url( $logo ); ?>" alt="RankPublish" width="40" height="40" />
					<?php endif; ?>
					<p class="rp-wizard__eyebrow"><?php esc_html_e( 'RankPublish Cloud', 'rankpublish' ); ?></p>
					<h1 class="rp-wizard__title">
						<?php
						echo $connected
							? esc_html__( 'This site is connected', 'rankpublish' )
							: esc_html__( 'Connect this WordPress site', 'rankpublish' );
						?>
					</h1>
					<p class="rp-wizard__subtitle">
						<?php
						echo $connected
							? esc_html__( 'SEO, scheduling, and publishing stay on this WordPress install. Your RankPublish account holds billing, extra sites, and the synced workspace.', 'rankpublish' )
							: esc_html__( 'Create an account, start the 7-day trial, then paste a pairing code to activate this site. Each site gets its own workspace, tied to your subscription.', 'rankpublish' );
						?>
					</p>
				</header>

				<div class="rp-wizard__divider"></div>

				<div class="rp-wizard__body">
					<?php foreach ( $notices as $notice ) : ?>
						<?php
						$type    = (string) ( $notice['type'] ?? 'error' );
						$success = in_array( $type, array( 'updated', 'success' ), true );
						?>
						<div class="rp-wizard__notice rp-wizard__notice--<?php echo $success ? 'success' : 'error'; ?>" role="status">
							<span class="rp-wizard__notice-text"><?php echo esc_html( (string) ( $notice['message'] ?? '' ) ); ?></span>
						</div>
					<?php endforeach; ?>

					<?php if ( $connected ) : ?>
						<ul class="rp-wizard__status-grid">
							<li class="rp-wizard__status-item">
								<span class="rp-wizard__status-badge" aria-hidden="true">✓</span>
								<div class="rp-wizard__status-text">
									<span class="rp-wizard__status-title"><?php esc_html_e( 'Cloud connection', 'rankpublish' ); ?></span>
									<span class="rp-wizard__status-detail"><?php esc_html_e( 'This WordPress site is paired with RankPublish Cloud.', 'rankpublish' ); ?></span>
								</div>
							</li>
							<li class="rp-wizard__status-item">
								<span class="rp-wizard__status-badge" aria-hidden="true">✓</span>
								<div class="rp-wizard__status-text">
									<span class="rp-wizard__status-title"><?php esc_html_e( 'Site ID', 'rankpublish' ); ?></span>
									<span class="rp-wizard__status-detail"><code><?php echo esc_html( $site_id ); ?></code></span>
								</div>
							</li>
							<li class="rp-wizard__status-item">
								<span class="rp-wizard__status-badge" aria-hidden="true">✓</span>
								<div class="rp-wizard__status-text">
									<span class="rp-wizard__status-title"><?php esc_html_e( 'Connector REST', 'rankpublish' ); ?></span>
									<span class="rp-wizard__status-detail"><code><?php echo esc_url( $health ); ?></code></span>
								</div>
							</li>
							<li class="rp-wizard__status-item">
								<span class="rp-wizard__status-badge" aria-hidden="true">✓</span>
								<div class="rp-wizard__status-text">
									<span class="rp-wizard__status-title"><?php esc_html_e( 'Trial & billing', 'rankpublish' ); ?></span>
									<span class="rp-wizard__status-detail"><?php esc_html_e( '7-day trial, then $9.99/month or $99/year per site — managed in RankPublish Cloud.', 'rankpublish' ); ?></span>
								</div>
							</li>
						</ul>
					<?php else : ?>
						<div class="rp-wizard__cols">
							<a class="rp-wizard__group" href="<?php echo esc_url( $cloud . '/register' ); ?>" target="_blank" rel="noopener noreferrer">
								<span class="rp-wizard__row-icon" aria-hidden="true">+</span>
								<span class="rp-wizard__group-head">
									<span class="rp-wizard__group-title"><?php esc_html_e( 'Create an account', 'rankpublish' ); ?></span>
									<span class="rp-wizard__group-sub"><?php esc_html_e( 'Register in RankPublish Cloud. New accounts start a 7-day free trial.', 'rankpublish' ); ?></span>
								</span>
							</a>
							<a class="rp-wizard__group" href="<?php echo esc_url( $cloud . '/login' ); ?>" target="_blank" rel="noopener noreferrer">
								<span class="rp-wizard__row-icon" aria-hidden="true">→</span>
								<span class="rp-wizard__group-head">
									<span class="rp-wizard__group-title"><?php esc_html_e( 'Sign in', 'rankpublish' ); ?></span>
									<span class="rp-wizard__group-sub"><?php esc_html_e( 'Already subscribed? Open Getting Started and create a pairing code.', 'rankpublish' ); ?></span>
								</span>
							</a>
						</div>

						<div class="rp-wizard__row-card rp-wizard__row-card--trial">
							<div class="rp-wizard__row-main">
								<span class="rp-wizard__row-icon" aria-hidden="true">7</span>
								<div class="rp-wizard__row-text">
									<span class="rp-wizard__row-title"><?php esc_html_e( '7-day free trial', 'rankpublish' ); ?></span>
									<span class="rp-wizard__row-detail"><?php esc_html_e( 'Then $9.99/month or $99/year per connected WordPress site.', 'rankpublish' ); ?></span>
								</div>
							</div>
						</div>

						<form method="post" class="rp-wizard__form rankpublish-cloud-form">
							<?php wp_nonce_field( 'rankpublish_connect' ); ?>
							<label class="rp-wizard__field" for="rankpublish_code">
								<span><?php esc_html_e( 'Pairing code', 'rankpublish' ); ?></span>
								<input
									name="rankpublish_code"
									id="rankpublish_code"
									type="text"
									class="rp-wizard__code"
									maxlength="6"
									pattern="[A-Za-z0-9]{6}"
									autocomplete="off"
									spellcheck="false"
									autocapitalize="characters"
									placeholder="ABC123"
									required
								/>
								<em><?php esc_html_e( 'Generate a 6-character code in RankPublish Cloud → Getting Started, then paste it here.', 'rankpublish' ); ?></em>
							</label>
							<label class="rp-wizard__field" for="rankpublish_app_url">
								<span><?php esc_html_e( 'Cloud app URL', 'rankpublish' ); ?></span>
								<input
									name="rankpublish_app_url"
									id="rankpublish_app_url"
									type="url"
									class="rp-wizard__input"
									value="<?php echo esc_attr( $app_url ); ?>"
									placeholder="https://nashir.satest.top"
									required
								/>
							</label>
							<div class="rp-wizard__footer">
								<a class="rp-wizard__skip" href="<?php echo esc_url( $cloud . '/app/getting-started' ); ?>" target="_blank" rel="noopener noreferrer">
									<?php esc_html_e( 'Open Getting Started', 'rankpublish' ); ?>
								</a>
								<button type="submit" name="rankpublish_connect" class="rp-wizard__btn rp-wizard__btn--primary" value="1">
									<?php esc_html_e( 'Connect site', 'rankpublish' ); ?>
								</button>
							</div>
						</form>
					<?php endif; ?>
				</div>

				<?php if ( $connected ) : ?>
					<div class="rp-wizard__footer">
						<form method="post">
							<?php wp_nonce_field( 'rankpublish_disconnect' ); ?>
							<button type="submit" name="rankpublish_disconnect" class="rp-wizard__btn rp-wizard__btn--danger" value="1">
								<?php esc_html_e( 'Disconnect', 'rankpublish' ); ?>
							</button>
						</form>
						<a class="rp-wizard__btn rp-wizard__btn--primary" href="<?php echo esc_url( $cloud . '/app' ); ?>" target="_blank" rel="noopener noreferrer">
							<?php esc_html_e( 'Open RankPublish Cloud', 'rankpublish' ); ?>
						</a>
					</div>
				<?php endif; ?>
			</div>
		</div>
		<?php
	}

	/**
	 * Render onboarding steps above Cloud Connect form.
	 */
	public static function render_welcome(): void {
		self::render_wizard( false, self::default_app_url(), '', rest_url( 'rankpublish/v1/health' ) );
	}

	public static function default_app_url(): string {
		$stored = (string) get_option( 'rankpublish_app_url', '' );
		if ( '' !== $stored ) {
			return untrailingslashit( $stored );
		}
		$host = (string) wp_parse_url( home_url(), PHP_URL_HOST );
		if ( $host && ( str_ends_with( $host, '.local' ) || 'localhost' === $host ) ) {
			return 'https://nashir.satest.top';
		}
		return 'https://nashir.satest.top';
	}
}
