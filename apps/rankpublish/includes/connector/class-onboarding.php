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
	 * Render onboarding steps above Cloud Connect form.
	 */
	public static function render_welcome(): void {
		$cloud = self::default_app_url();
		?>
		<div class="rankpublish-onboarding">
			<h2><?php esc_html_e( 'Welcome to RankPublish', 'rankpublish' ); ?></h2>
			<p><?php esc_html_e( 'Connect this WordPress site to your RankPublish account. Each site gets its own workspace, tied to your subscription.', 'rankpublish' ); ?></p>
			<ol class="rankpublish-onboarding__steps">
				<li>
					<strong><?php esc_html_e( 'Create or sign in', 'rankpublish' ); ?></strong>
					—
					<a href="<?php echo esc_url( $cloud . '/register' ); ?>" target="_blank" rel="noopener noreferrer"><?php esc_html_e( 'Register', 'rankpublish' ); ?></a>
					<?php esc_html_e( 'or', 'rankpublish' ); ?>
					<a href="<?php echo esc_url( $cloud . '/login' ); ?>" target="_blank" rel="noopener noreferrer"><?php esc_html_e( 'Sign in', 'rankpublish' ); ?></a>
				</li>
				<li>
					<strong><?php esc_html_e( '7-day free trial', 'rankpublish' ); ?></strong>
					— <?php esc_html_e( 'New accounts start on trial. Then $9.99/month or $99/year per site.', 'rankpublish' ); ?>
				</li>
				<li>
					<strong><?php esc_html_e( 'Pair this site', 'rankpublish' ); ?></strong>
					— <?php esc_html_e( 'In RankPublish open Getting Started, create a pairing code, paste it below.', 'rankpublish' ); ?>
					<a href="<?php echo esc_url( $cloud . '/app/getting-started' ); ?>" target="_blank" rel="noopener noreferrer"><?php esc_html_e( 'Open Getting Started', 'rankpublish' ); ?></a>
				</li>
			</ol>
		</div>
		<?php
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
