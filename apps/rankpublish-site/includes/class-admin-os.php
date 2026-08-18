<?php
/**
 * RankPublish Publishing OS — wp-admin control shell.
 *
 * Visual language follows the RankPublish SaaS workspace. This is a local
 * operator surface for the RankPublish site, not a copy of third-party plugin UIs.
 *
 * @package RankPublishSite
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Shell, navigation, and workspace snapshot for Site Core admin.
 */
final class RankPublish_Site_Admin_Os {

	public const SLUG = 'rankpublish-core';

	/**
	 * @var array<string, mixed>|null
	 */
	private static $snapshot = null;

	public static function is_dev_mode(): bool {
		$settings = RankPublish_Site_Merge_Registry::settings();
		return ! empty( $settings['dev_stack_mode'] );
	}

	/**
	 * @return array<string, array<string, string>>
	 */
	public static function nav(): array {
		$s   = self::SLUG;
		$nav = array(
			'workspace' => array(
				$s                 => __( 'Overview', 'rankpublish-site' ),
				$s . '-sites'      => __( 'Connected sites', 'rankpublish-site' ),
				$s . '-scheduler'  => __( 'Scheduler', 'rankpublish-site' ),
				$s . '-seo'        => __( 'SEO', 'rankpublish-site' ),
				$s . '-activity'   => __( 'Activity', 'rankpublish-site' ),
			),
			'manage'    => array(
				$s . '-team'     => __( 'Team', 'rankpublish-site' ),
				$s . '-billing'  => __( 'Billing', 'rankpublish-site' ),
				$s . '-settings' => __( 'Settings', 'rankpublish-site' ),
			),
		);
		if ( self::is_dev_mode() ) {
			$nav['core'] = array(
				$s . '-merge'      => __( 'Merge audit', 'rankpublish-site' ),
				$s . '-stack'      => __( 'Dev stack', 'rankpublish-site' ),
				$s . '-connectors' => __( 'Packages', 'rankpublish-site' ),
			);
		}
		return $nav;
	}

	public static function url( string $page ): string {
		return admin_url( 'admin.php?page=' . $page );
	}

	public static function current_page(): string {
		if ( class_exists( 'RankPublish_Site_Module_Embed', false ) && RankPublish_Site_Module_Embed::is_os_wrapped_request() && isset( $_GET['rpsite_ctx'] ) ) {
			$ctx = sanitize_key( (string) wp_unslash( $_GET['rpsite_ctx'] ) );
			if ( in_array( $ctx, array( 'scheduler', 'seo' ), true ) ) {
				return self::SLUG . '-' . $ctx;
			}
		}
		$page = isset( $_GET['page'] ) ? sanitize_key( (string) wp_unslash( $_GET['page'] ) ) : '';
		return str_starts_with( $page, self::SLUG ) ? $page : self::SLUG;
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function snapshot(): array {
		if ( null !== self::$snapshot ) {
			return self::$snapshot;
		}

		if ( ! function_exists( 'get_plugins' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		$user     = wp_get_current_user();
		$name     = (string) $user->display_name;
		$email    = (string) $user->user_email;
		$blog     = (string) get_bloginfo( 'name' );
		$home     = home_url();
		$cloud    = rpsite_cloud_url();
		$counts   = wp_count_posts( 'post' );
		$future   = (int) ( $counts->future ?? 0 );
		$draft    = (int) ( $counts->draft ?? 0 );
		$publish  = (int) ( $counts->publish ?? 0 );
		$audit    = ( new RankPublish_Site_Merge_Audit() )->last_audit();
		$bridge   = RankPublish_Site_Connector_Packages::bridge_zip_url();
		$product  = RankPublish_Site_Connector_Packages::product_zip_url();
		$connected = self::local_site_status();

		$data = array(
			'page'           => self::current_page(),
			'workspace_name' => $blog . ' Workspace',
			'workspace_initial' => strtoupper( substr( $blog !== '' ? $blog : 'R', 0, 1 ) ),
			'user_name'      => $name !== '' ? $name : $email,
			'user_email'     => $email,
			'user_initial'   => strtoupper( substr( ( $name !== '' ? $name : $email ) !== '' ? ( $name !== '' ? $name : $email ) : 'U', 0, 1 ) ),
			'cloud_url'      => $cloud,
			'account_url'    => $cloud . '/app',
			'billing_url'    => $cloud . '/app/billing',
			'guide_url'      => home_url( '/guide/' ),
			'logout_url'     => wp_logout_url( admin_url() ),
			'wp_admin_url'   => admin_url(),
			'invite_url'     => admin_url( 'user-new.php' ),
			'site'           => array(
				'name'   => $blog !== '' ? $blog : 'RankPublish',
				'url'    => $home,
				'status' => $connected,
				'worker' => 'platform',
			),
			'counts'         => array(
				'sites'     => 0,
				'scheduled' => $future,
				'pending'   => 0,
				'drafts'    => $draft,
				'published' => $publish,
				'active'    => 0,
				'awaiting'  => 0,
			),
			'plan'           => array(
				'name'         => 'RankPublish',
				'price_month'  => '$9.99',
				'price_year'   => '$99',
				'trial_days'   => 7,
				'site_limit'   => 1,
				'sites_used'   => 0,
			),
			'bridge_zip'     => $bridge,
			'product_zip'    => $product,
			'connect_endpoint' => $cloud . '/api/rankpublish/bridge/connect',
			'members'        => self::members(),
			'activity'       => self::activity( $audit, $future ),
			'calendar'       => self::calendar(),
			'posts'          => self::content_posts(),
			'queue'          => self::schedule_queue(),
			'audit'          => $audit,
			'core_version'   => RPSITE_VERSION,
			'product_version' => RankPublish_Site_Merge_Registry::product_version(),
		);

		self::$snapshot = $data;
		return $data;
	}

	public static function start( string $page = '' ): void {
		$ctx  = self::snapshot();
		if ( '' !== $page ) {
			$ctx['page'] = $page;
		}
		$nav = self::nav();
		echo '<div class="rpsite-os" dir="' . esc_attr( is_rtl() ? 'rtl' : 'ltr' ) . '">';
		echo '<div class="rpsite-os-scrim" data-rpsite-sidebar-close hidden></div>';
		self::render_sidebar( $ctx, $nav );
		echo '<div class="rpsite-os-main">';
		self::render_topbar( $ctx );
		echo '<div class="rpsite-os-body">';
	}

	public static function end(): void {
		$ctx = self::snapshot();
		echo '</div></div>';
		self::render_connect_modal( $ctx );
		echo '</div>';
	}

	/**
	 * @param array<string, mixed>                                           $ctx Context.
	 * @param array<string, array<string, string>>                           $nav Nav groups.
	 */
	private static function render_sidebar( array $ctx, array $nav ): void {
		$page = (string) $ctx['page'];
		?>
		<aside class="rpsite-os-sidebar">
			<a class="rpsite-os-brand" href="<?php echo esc_url( self::url( self::SLUG ) ); ?>">
				<img class="rpsite-os-brand__logo" src="<?php echo esc_url( RankPublish_Site_Branding::url( 'logo-menu.svg' ) ); ?>" width="36" height="36" alt="" />
				<span class="rpsite-os-brand__text">
					<strong>RankPublish</strong>
					<em><?php esc_html_e( 'Publishing OS', 'rankpublish-site' ); ?></em>
				</span>
			</a>

			<div class="rpsite-os-workspace" data-rpsite-menu="workspace">
				<button type="button" class="rpsite-os-workspace__btn" data-rpsite-toggle="workspace">
					<span class="rpsite-os-avatar rpsite-os-avatar--gold"><?php echo esc_html( (string) $ctx['workspace_initial'] ); ?></span>
					<span class="rpsite-os-workspace__name"><?php echo esc_html( (string) $ctx['workspace_name'] ); ?></span>
					<?php echo self::icon( 'chevron' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
				</button>
				<div class="rpsite-os-pop">
					<p><?php esc_html_e( 'Switch workspace', 'rankpublish-site' ); ?></p>
					<div class="rpsite-os-pop__row is-current">
						<span class="rpsite-os-avatar rpsite-os-avatar--gold"><?php echo esc_html( (string) $ctx['workspace_initial'] ); ?></span>
						<span><?php echo esc_html( (string) $ctx['workspace_name'] ); ?></span>
						<em><?php esc_html_e( 'Current', 'rankpublish-site' ); ?></em>
					</div>
				</div>
			</div>

			<?php foreach ( $nav as $group => $items ) : ?>
				<p class="rpsite-os-kicker"><?php echo esc_html( self::group_label( $group ) ); ?></p>
				<nav class="rpsite-os-nav">
					<?php foreach ( $items as $slug => $label ) : ?>
						<a class="<?php echo $slug === $page ? 'is-active' : ''; ?>" href="<?php echo esc_url( self::url( $slug ) ); ?>">
							<?php echo self::icon( self::nav_icon( $slug ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
							<span><?php echo esc_html( $label ); ?></span>
						</a>
					<?php endforeach; ?>
				</nav>
			<?php endforeach; ?>

			<div class="rpsite-os-sidebar__foot">
				<div class="rpsite-os-help">
					<?php echo self::icon( 'help' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
					<p><strong><?php esc_html_e( 'Need a hand?', 'rankpublish-site' ); ?></strong></p>
					<p><?php esc_html_e( 'Review the Worker & Sync Bridge guide before connecting a production site.', 'rankpublish-site' ); ?></p>
					<a href="<?php echo esc_url( (string) $ctx['guide_url'] ); ?>"><?php esc_html_e( 'Open guide', 'rankpublish-site' ); ?></a>
				</div>
				<div class="rpsite-os-user" data-rpsite-menu="user">
					<button type="button" class="rpsite-os-user__btn" data-rpsite-toggle="user">
						<span class="rpsite-os-avatar rpsite-os-avatar--user"><?php echo esc_html( (string) $ctx['user_initial'] ); ?></span>
						<span>
							<strong><?php echo esc_html( (string) $ctx['user_name'] ); ?></strong>
							<em><?php echo esc_html( (string) $ctx['user_email'] ); ?></em>
						</span>
						<?php echo self::icon( 'settings' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
					</button>
					<div class="rpsite-os-pop rpsite-os-pop--up">
						<p><?php esc_html_e( 'Account', 'rankpublish-site' ); ?></p>
						<a href="<?php echo esc_url( (string) $ctx['wp_admin_url'] ); ?>"><?php esc_html_e( 'WordPress admin', 'rankpublish-site' ); ?></a>
						<a href="<?php echo esc_url( (string) $ctx['logout_url'] ); ?>" class="is-danger"><?php esc_html_e( 'Sign out', 'rankpublish-site' ); ?></a>
					</div>
				</div>
			</div>
		</aside>
		<?php
	}

	/**
	 * @param array<string, mixed> $ctx Context.
	 */
	private static function render_topbar( array $ctx ): void {
		?>
		<header class="rpsite-os-top">
			<div class="rpsite-os-top__left">
				<button type="button" class="rpsite-os-burger" data-rpsite-sidebar-toggle aria-expanded="false" aria-label="<?php esc_attr_e( 'Open navigation', 'rankpublish-site' ); ?>">
					<?php echo self::icon( 'menu' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
				</button>
				<div>
					<p><?php esc_html_e( 'Workspace', 'rankpublish-site' ); ?></p>
					<strong><?php echo esc_html( (string) $ctx['workspace_name'] ); ?></strong>
				</div>
			</div>
			<div class="rpsite-os-status">
				<span></span>
				<?php esc_html_e( 'Systems operational', 'rankpublish-site' ); ?>
			</div>
		</header>
		<?php
	}

	/**
	 * @param array<string, mixed> $ctx Context.
	 */
	private static function render_connect_modal( array $ctx ): void {
		$site = is_array( $ctx['site'] ) ? $ctx['site'] : array();
		?>
		<div class="rpsite-os-modal" data-rpsite-modal="connect" hidden>
			<div class="rpsite-os-modal__backdrop" data-rpsite-close="connect"></div>
			<div class="rpsite-os-modal__panel" role="dialog" aria-labelledby="rpsite-connect-title">
				<div class="rpsite-os-modal__head">
					<span class="rpsite-os-icon-blob"><?php echo self::icon( 'link' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></span>
					<div>
						<h2 id="rpsite-connect-title"><?php esc_html_e( 'Connect a WordPress site', 'rankpublish-site' ); ?></h2>
						<p><?php esc_html_e( 'A secure one-time handoff between your site and RankPublish.', 'rankpublish-site' ); ?></p>
					</div>
					<div class="rpsite-os-progress"><span></span><span></span></div>
				</div>
				<div class="rpsite-os-modal__body">
					<label>
						<span><?php esc_html_e( 'Site name', 'rankpublish-site' ); ?></span>
						<input type="text" value="<?php echo esc_attr( (string) ( $site['name'] ?? '' ) ); ?>" readonly />
					</label>
					<label>
						<span><?php esc_html_e( 'WordPress URL', 'rankpublish-site' ); ?></span>
						<input type="url" value="<?php echo esc_attr( (string) ( $site['url'] ?? '' ) ); ?>" readonly />
						<em><?php esc_html_e( 'This must match the canonical, publicly reachable address of the WordPress site.', 'rankpublish-site' ); ?></em>
					</label>
					<label>
						<span><?php esc_html_e( 'RankPublish endpoint', 'rankpublish-site' ); ?></span>
						<div class="rpsite-os-copyrow">
							<code><?php echo esc_html( (string) $ctx['connect_endpoint'] ); ?></code>
							<button type="button" class="rpsite-os-btn rpsite-os-btn--outline" data-rpsite-copy="<?php echo esc_attr( (string) $ctx['connect_endpoint'] ); ?>">
								<?php echo self::icon( 'copy' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
								<?php esc_html_e( 'Copy', 'rankpublish-site' ); ?>
							</button>
						</div>
					</label>
					<div class="rpsite-os-modal__actions">
						<button type="button" class="rpsite-os-btn rpsite-os-btn--ghost" data-rpsite-close="connect"><?php esc_html_e( 'Cancel', 'rankpublish-site' ); ?></button>
						<a class="rpsite-os-btn rpsite-os-btn--primary" href="<?php echo esc_url( (string) $ctx['account_url'] ); ?>">
							<?php esc_html_e( 'Continue in RankPublish', 'rankpublish-site' ); ?>
							<?php echo self::icon( 'arrow' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
						</a>
					</div>
					<p class="rpsite-os-note"><?php esc_html_e( 'A connection token is a short-lived secret created only after someone is signed into the RankPublish account. Site Core cannot invent that token here — a number typed in WordPress would not be trusted. Continue in RankPublish to issue the token, then paste it into the customer site Connector. Site Core stays the control surface; the account only signs the handshake.', 'rankpublish-site' ); ?></p>
				</div>
			</div>
		</div>
		<?php
	}

	public static function heading( string $eyebrow, string $title, string $description, string $action_html = '' ): void {
		?>
		<div class="rpsite-os-heading">
			<div>
				<p class="rpsite-os-eyebrow"><?php echo esc_html( $eyebrow ); ?></p>
				<h1><?php echo esc_html( $title ); ?></h1>
				<p class="rpsite-os-lede"><?php echo esc_html( $description ); ?></p>
			</div>
			<?php echo $action_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
		</div>
		<?php
	}

	public static function connect_button(): string {
		return '<button type="button" class="rpsite-os-btn rpsite-os-btn--primary" data-rpsite-open="connect">'
			. self::icon( 'plus' )
			. esc_html__( 'Connect a site', 'rankpublish-site' )
			. '</button>';
	}

	public static function status_badge( string $status ): void {
		$labels = array(
			'pending'      => __( 'pending', 'rankpublish-site' ),
			'running'      => __( 'running', 'rankpublish-site' ),
			'succeeded'    => __( 'succeeded', 'rankpublish-site' ),
			'failed'       => __( 'failed', 'rankpublish-site' ),
			'connected'    => __( 'connected', 'rankpublish-site' ),
			'disconnected' => __( 'disconnected', 'rankpublish-site' ),
			'platform'     => __( 'platform HQ', 'rankpublish-site' ),
		);
		printf(
			'<span class="rpsite-os-pill rpsite-os-pill--%1$s">%2$s</span>',
			esc_attr( sanitize_html_class( $status ) ),
			esc_html( $labels[ $status ] ?? $status )
		);
	}

	public static function icon( string $name ): string {
		$icons = array(
			'overview'  => 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z',
			'sites'     => 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
			'scheduler' => 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
			'seo'       => 'M11 5a6 6 0 1 0 3.5 10.7L21 22',
			'activity'  => 'M22 12h-4l-3 9L9 3l-3 9H2',
			'team'      => 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3.13a4 4 0 0 1 0 7.75M8 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
			'billing'   => 'M2 7h20v12H2zM2 11h20M6 15h4',
			'merge'     => 'M8 3v12M16 9v12M8 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM16 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
			'stack'     => 'M12 2 2 7l10 5 10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
			'packages'  => 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z',
			'settings'  => 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1z',
			'help'      => 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4M12 17h.01',
			'plus'      => 'M12 5v14M5 12h14',
			'arrow'     => 'M5 12h14M13 6l6 6-6 6',
			'globe'     => 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20',
			'calendar'  => 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
			'bolt'      => 'M13 2 3 14h9l-1 8 10-12h-9z',
			'shield'    => 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
			'key'       => 'M21 2l-2 2m-7.6 7.6A5 5 0 1 1 8 8l8 8 3-3-8-8',
			'check'     => 'M20 6 9 17l-5-5',
			'spark'     => 'M12 3v4M12 17v4M4.2 6.2l2.8 2.8M17 15l2.8 2.8M3 12h4M17 12h4M4.2 17.8 7 15M17 9l2.8-2.8',
			'copy'      => 'M8 8h12v12H8zM4 16V4h12',
			'external'  => 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3',
			'refresh'   => 'M23 4v6h-6M1 20v-6h6M3.5 9a9 9 0 0 1 14.8-3.4L23 10M1 14l4.7 4.4A9 9 0 0 0 20.5 15',
			'mail'      => 'M4 4h16v16H4zM4 4l8 8 8-8',
			'chevron'   => 'M6 9l6 6 6-6',
			'link'      => 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71',
			'clock'     => 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
			'menu'      => 'M4 6h16M4 12h16M4 18h16',
		);
		$d = $icons[ $name ] ?? $icons['overview'];
		return '<svg class="rpsite-os-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' . esc_attr( $d ) . '"/></svg>';
	}

	private static function nav_icon( string $slug ): string {
		$map = array(
			self::SLUG                 => 'overview',
			self::SLUG . '-sites'      => 'sites',
			self::SLUG . '-scheduler'  => 'scheduler',
			self::SLUG . '-seo'        => 'seo',
			self::SLUG . '-activity'   => 'activity',
			self::SLUG . '-team'       => 'team',
			self::SLUG . '-billing'    => 'billing',
			self::SLUG . '-merge'      => 'merge',
			self::SLUG . '-stack'      => 'stack',
			self::SLUG . '-connectors' => 'packages',
			self::SLUG . '-settings'   => 'settings',
		);
		return $map[ $slug ] ?? 'overview';
	}

	private static function group_label( string $group ): string {
		$labels = array(
			'workspace' => __( 'Workspace', 'rankpublish-site' ),
			'manage'    => __( 'Manage', 'rankpublish-site' ),
			'core'      => __( 'Core', 'rankpublish-site' ),
		);
		return $labels[ $group ] ?? $group;
	}

	private static function local_site_status(): string {
		return rpsite_is_platform() ? 'platform' : 'disconnected';
	}

	/**
	 * @return list<array<string, string>>
	 */
	private static function members(): array {
		$users = get_users(
			array(
				'capability' => 'edit_posts',
				'orderby'    => 'registered',
				'number'     => 20,
			)
		);
		$rows  = array();
		foreach ( $users as $user ) {
			$roles = $user->roles;
			$role  = in_array( 'administrator', $roles, true ) ? 'owner' : ( (string) ( $roles[0] ?? 'member' ) );
			$rows[] = array(
				'name'  => (string) $user->display_name,
				'email' => (string) $user->user_email,
				'role'  => $role,
			);
		}
		return $rows;
	}

	/**
	 * @param array<string, mixed>|null $audit Audit payload.
	 * @return list<array<string, string>>
	 */
	private static function activity( $audit, int $future ): array {
		$events = array(
			array(
				'title'  => __( 'RankPublish Site Core is active', 'rankpublish-site' ),
				'detail' => sprintf(
					/* translators: %s: plugin version */
					__( 'This WordPress site is running RankPublish Site Core %s.', 'rankpublish-site' ),
					RPSITE_VERSION
				),
				'status' => 'succeeded',
				'when'   => wp_date( 'M j, g:i A' ),
			),
		);

		if ( is_array( $audit ) && ! empty( $audit['audited_at'] ) ) {
			$events[] = array(
				'title'  => __( 'Merge audit recorded', 'rankpublish-site' ),
				'detail' => __( 'Upstream module comparison was stored for this workspace.', 'rankpublish-site' ),
				'status' => 'succeeded',
				'when'   => (string) $audit['audited_at'],
			);
		}

		if ( $future > 0 ) {
			$events[] = array(
				'title'  => __( 'Scheduled posts waiting', 'rankpublish-site' ),
				'detail' => sprintf(
					/* translators: %d: count */
					_n( '%d post is scheduled in WordPress.', '%d posts are scheduled in WordPress.', $future, 'rankpublish-site' ),
					$future
				),
				'status' => 'pending',
				'when'   => wp_date( 'M j, g:i A' ),
			);
		}

		return $events;
	}

	/**
	 * @return array<string, mixed>
	 */
	private static function calendar(): array {
		$year  = isset( $_GET['y'] ) ? (int) $_GET['y'] : (int) wp_date( 'Y' );
		$month = isset( $_GET['m'] ) ? (int) $_GET['m'] : (int) wp_date( 'n' );
		if ( $month < 1 || $month > 12 ) {
			$month = (int) wp_date( 'n' );
		}
		$start     = new DateTimeImmutable( sprintf( '%04d-%02d-01', $year, $month ) );
		$days_in   = (int) $start->format( 't' );
		$weekday   = (int) $start->format( 'w' );
		$prev      = $start->modify( '-1 month' );
		$next      = $start->modify( '+1 month' );
		$from      = $start->format( 'Y-m-d 00:00:00' );
		$to        = $start->modify( 'last day of this month' )->format( 'Y-m-d 23:59:59' );

		$posts = get_posts(
			array(
				'post_type'      => 'post',
				'post_status'    => array( 'future', 'draft', 'publish' ),
				'posts_per_page' => 100,
				'date_query'     => array(
					array(
						'column'    => 'post_date',
						'after'     => $from,
						'before'    => $to,
						'inclusive' => true,
					),
				),
			)
		);

		$by_day = array();
		foreach ( $posts as $post ) {
			$day = (int) get_the_date( 'j', $post );
			$by_day[ $day ][] = array(
				'id'     => $post->ID,
				'status' => $post->post_status,
				'title'  => get_the_title( $post ),
			);
		}

		return array(
			'label'   => $start->format( 'F Y' ),
			'year'    => $year,
			'month'   => $month,
			'weekday' => $weekday,
			'days_in' => $days_in,
			'today'   => ( (int) wp_date( 'n' ) === $month && (int) wp_date( 'Y' ) === $year ) ? (int) wp_date( 'j' ) : 0,
			'prev'    => add_query_arg(
				array(
					'page' => self::SLUG . '-scheduler',
					'y'    => $prev->format( 'Y' ),
					'm'    => $prev->format( 'n' ),
				),
				admin_url( 'admin.php' )
			),
			'next'    => add_query_arg(
				array(
					'page' => self::SLUG . '-scheduler',
					'y'    => $next->format( 'Y' ),
					'm'    => $next->format( 'n' ),
				),
				admin_url( 'admin.php' )
			),
			'by_day'  => $by_day,
			'has_posts' => array() !== $posts,
		);
	}

	/**
	 * @return list<array<string, string>>
	 */
	private static function content_posts(): array {
		$posts = get_posts(
			array(
				'post_type'      => 'post',
				'post_status'    => array( 'publish', 'draft', 'future' ),
				'posts_per_page' => 20,
			)
		);
		$rows  = array();
		foreach ( $posts as $post ) {
			$rows[] = array(
				'id'      => (string) $post->ID,
				'title'   => get_the_title( $post ),
				'status'  => $post->post_status,
				'excerpt' => wp_trim_words( wp_strip_all_tags( (string) $post->post_excerpt !== '' ? $post->post_excerpt : $post->post_content ), 24 ),
				'edit'    => get_edit_post_link( $post->ID, 'raw' ) ?: admin_url( 'post.php?post=' . $post->ID . '&action=edit' ),
			);
		}
		return $rows;
	}

	/**
	 * @return list<array<string, string>>
	 */
	private static function schedule_queue(): array {
		$posts = get_posts(
			array(
				'post_type'      => 'post',
				'post_status'    => 'future',
				'posts_per_page' => 10,
				'orderby'        => 'date',
				'order'          => 'ASC',
			)
		);
		$rows  = array();
		foreach ( $posts as $post ) {
			$rows[] = array(
				'title'  => get_the_title( $post ),
				'when'   => get_the_date( 'M j, Y g:i A', $post ),
				'status' => 'pending',
				'edit'   => get_edit_post_link( $post->ID, 'raw' ) ?: '',
			);
		}
		return $rows;
	}
}
