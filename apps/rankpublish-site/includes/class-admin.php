<?php
/**
 * RankPublish Site Core — wp-admin Publishing OS.
 *
 * @package RankPublishSite
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Admin UI for the RankPublish operator surface.
 */
final class RankPublish_Site_Admin {

	private const MENU_SLUG = 'rankpublish-core';

	/**
	 * Register hooks.
	 */
	public function init(): void {
		add_action( 'admin_menu', array( $this, 'register_menu' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_assets' ) );
		add_filter( 'admin_body_class', array( $this, 'body_class' ) );
		add_action( 'admin_head', array( $this, 'suppress_upstream_license_notices' ) );
		add_filter( 'screen_options_show_screen', array( $this, 'hide_screen_options' ), 10, 2 );
		add_action( 'admin_post_rpsite_run_audit', array( $this, 'handle_run_audit' ) );
		add_action( 'admin_post_rpsite_save_settings', array( $this, 'handle_save_settings' ) );
		add_action( 'admin_post_rpsite_save_versions', array( $this, 'handle_save_versions' ) );
		add_action( 'admin_post_rpsite_clear_dismissals', array( $this, 'handle_clear_dismissals' ) );
	}

	/**
	 * @param string $classes Body classes.
	 */
	public function body_class( string $classes ): string {
		return $this->is_os_page() ? trim( $classes . ' rpsite-os' ) : $classes;
	}

	/**
	 * @param bool      $show   Whether to show screen options.
	 * @param WP_Screen $screen Current screen.
	 */
	public function hide_screen_options( bool $show, $screen ): bool {
		unset( $screen );
		return $this->is_os_page() ? false : $show;
	}

	/**
	 * Register top-level Core menu and OS pages.
	 */
	public function register_menu(): void {
		$cap  = 'manage_options';
		$icon = RankPublish_Site_Branding::url( 'logo-menu.svg' );

		add_menu_page(
			__( 'RankPublish Core', 'rankpublish-site' ),
			__( 'RankPublish Core', 'rankpublish-site' ),
			$cap,
			self::MENU_SLUG,
			array( $this, 'render_overview' ),
			$icon,
			3
		);

		$pages = array(
			self::MENU_SLUG                 => array( __( 'Overview', 'rankpublish-site' ), 'render_overview' ),
			self::MENU_SLUG . '-sites'      => array( __( 'Connected sites', 'rankpublish-site' ), 'render_sites' ),
			self::MENU_SLUG . '-scheduler'  => array( __( 'Scheduler', 'rankpublish-site' ), 'render_scheduler' ),
			self::MENU_SLUG . '-seo'        => array( __( 'SEO', 'rankpublish-site' ), 'render_seo' ),
			self::MENU_SLUG . '-activity'   => array( __( 'Activity', 'rankpublish-site' ), 'render_activity' ),
			self::MENU_SLUG . '-team'       => array( __( 'Team', 'rankpublish-site' ), 'render_team' ),
			self::MENU_SLUG . '-billing'    => array( __( 'Billing', 'rankpublish-site' ), 'render_billing' ),
			self::MENU_SLUG . '-merge'      => array( __( 'Merge audit', 'rankpublish-site' ), 'render_merge' ),
			self::MENU_SLUG . '-stack'      => array( __( 'Dev stack', 'rankpublish-site' ), 'render_stack' ),
			self::MENU_SLUG . '-connectors' => array( __( 'Packages', 'rankpublish-site' ), 'render_connectors' ),
			self::MENU_SLUG . '-settings'   => array( __( 'Settings', 'rankpublish-site' ), 'render_settings' ),
		);

		foreach ( $pages as $slug => $item ) {
			add_submenu_page( self::MENU_SLUG, $item[0], $item[0], $cap, $slug, array( $this, $item[1] ) );
		}

		if ( ! RankPublish_Site_Admin_Os::is_dev_mode() ) {
			remove_submenu_page( self::MENU_SLUG, self::MENU_SLUG . '-merge' );
			remove_submenu_page( self::MENU_SLUG, self::MENU_SLUG . '-stack' );
			remove_submenu_page( self::MENU_SLUG, self::MENU_SLUG . '-connectors' );
		}
	}

	/**
	 * @param string $hook Admin hook.
	 */
	public function enqueue_assets( string $hook ): void {
		if ( ! str_contains( $hook, 'rankpublish-core' ) ) {
			return;
		}

		wp_enqueue_style(
			'rankpublish-site-admin',
			RPSITE_URL . 'assets/admin.css',
			array(),
			RPSITE_VERSION
		);
		wp_enqueue_script(
			'rankpublish-site-admin',
			RPSITE_URL . 'assets/admin.js',
			array(),
			RPSITE_VERSION,
			true
		);
		self::localize_admin_script();
	}

	public static function localize_admin_script(): void {
		$host = wp_parse_url( home_url(), PHP_URL_HOST );
		wp_localize_script(
			'rankpublish-site-admin',
			'rpsiteAdmin',
			array(
				'copied'       => __( 'Copied', 'rankpublish-site' ),
				'copyFailed'   => __( 'Could not copy', 'rankpublish-site' ),
				'invalidWpUrl' => __( 'Enter a valid WordPress URL, including https://', 'rankpublish-site' ),
				'hqUrlBlocked' => __( 'This is the RankPublish HQ site. Enter the customer WordPress URL instead.', 'rankpublish-site' ),
				'hqHost'       => is_string( $host ) ? strtolower( $host ) : '',
			)
		);
	}

	public function handle_run_audit(): void {
		$this->require_dev_tools();
		$this->guard_post( 'rpsite_run_audit' );
		( new RankPublish_Site_Merge_Audit() )->run_all();
		wp_safe_redirect( admin_url( 'admin.php?page=' . self::MENU_SLUG . '-merge&audited=1' ) );
		exit;
	}

	public function handle_save_settings(): void {
		$this->guard_post( 'rpsite_save_settings' );

		$cloud = isset( $_POST['cloud_url'] ) ? esc_url_raw( wp_unslash( (string) $_POST['cloud_url'] ) ) : '';
		if ( '' === $cloud ) {
			$cloud = 'https://nashir.satest.top';
		}

		RankPublish_Site_Merge_Registry::save_settings(
			array(
				'cloud_url'        => $cloud,
				'branding_enabled' => ! empty( $_POST['branding_enabled'] ),
				'dev_stack_mode'   => ! empty( $_POST['dev_stack_mode'] ),
			)
		);

		wp_safe_redirect( admin_url( 'admin.php?page=' . self::MENU_SLUG . '-settings&saved=1' ) );
		exit;
	}

	public function handle_save_versions(): void {
		$this->require_dev_tools();
		$this->guard_post( 'rpsite_save_versions' );

		$versions = array();
		foreach ( RankPublish_Site_Merge_Registry::modules() as $module ) {
			$key = (string) ( $module['basename'] ?? '' );
			if ( '' === $key ) {
				continue;
			}
			// phpcs:ignore WordPress.Security.NonceVerification.Missing -- verified in guard_post.
			$val = isset( $_POST[ 'version_' . md5( $key ) ] )
				? sanitize_text_field( wp_unslash( (string) $_POST[ 'version_' . md5( $key ) ] ) )
				: '';
			if ( '' !== $val ) {
				$versions[ $key ] = $val;
			}
		}

		RankPublish_Site_Merge_Registry::save_merged_versions( $versions );
		wp_safe_redirect( admin_url( 'admin.php?page=' . self::MENU_SLUG . '-settings&versions=1' ) );
		exit;
	}

	public function handle_clear_dismissals(): void {
		$this->require_dev_tools();
		$this->guard_post( 'rpsite_clear_dismissals' );
		delete_option( 'rankpublish_site_update_watch_dismiss' );
		wp_safe_redirect( admin_url( 'admin.php?page=' . self::MENU_SLUG . '&cleared=1' ) );
		exit;
	}

	/**
	 * @param string $action Action name for nonce.
	 */
	private function guard_post( string $action ): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Forbidden', 'rankpublish-site' ) );
		}
		check_admin_referer( $action );
	}

	public function render_overview(): void {
		$ctx    = $this->ctx();
		$counts = is_array( $ctx['counts'] ?? null ) ? $ctx['counts'] : array();
		$plan   = is_array( $ctx['plan'] ?? null ) ? $ctx['plan'] : array();
		$site   = is_array( $ctx['site'] ?? null ) ? $ctx['site'] : array();
		$steps  = array(
			array(
				'done'   => 'connected' === ( $site['status'] ?? '' ),
				'title'  => __( 'Connect a WordPress site', 'rankpublish-site' ),
				'detail' => __( 'Use a secure, time-limited token from the RankPublish account to establish the bridge.', 'rankpublish-site' ),
			),
			array(
				'done'   => ( (int) ( $counts['published'] ?? 0 ) + (int) ( $counts['drafts'] ?? 0 ) + (int) ( $counts['scheduled'] ?? 0 ) ) > 0,
				'title'  => __( 'Synchronize content', 'rankpublish-site' ),
				'detail' => __( 'Posts on this WordPress site appear in Scheduler and SEO once they exist.', 'rankpublish-site' ),
			),
			array(
				'done'   => (int) ( $counts['scheduled'] ?? 0 ) > 0,
				'title'  => __( 'Run publishing operations', 'rankpublish-site' ),
				'detail' => __( 'Schedule and optimize from RankPublish, then finish edits in WordPress.', 'rankpublish-site' ),
			),
		);

		$this->shell_start( self::MENU_SLUG );
		if ( isset( $_GET['cleared'] ) ) {
			$this->notice( __( 'Merge watch dismissals cleared.', 'rankpublish-site' ), 'success' );
		}

		RankPublish_Site_Admin_Os::heading(
			__( 'Workspace overview', 'rankpublish-site' ),
			__( 'Publishing, with a clear signal.', 'rankpublish-site' ),
			__( 'Monitor this WordPress site, scheduled content, and command status from one calm control surface.', 'rankpublish-site' ),
			RankPublish_Site_Admin_Os::connect_button()
		);
		?>
		<div class="rpsite-os-stats">
			<?php
			$this->stat_card( __( 'Connected sites', 'rankpublish-site' ), (string) (int) ( $counts['sites'] ?? 0 ), sprintf( __( '%1$d allowed on the RankPublish plan', 'rankpublish-site' ), (int) ( $plan['site_limit'] ?? 1 ) ), 'globe', 'sky' );
			$this->stat_card( __( 'Scheduled content', 'rankpublish-site' ), (string) (int) ( $counts['scheduled'] ?? 0 ), __( 'Items awaiting their publish window', 'rankpublish-site' ), 'calendar', 'violet' );
			$this->stat_card( __( 'Queued operations', 'rankpublish-site' ), (string) (int) ( $counts['pending'] ?? 0 ), __( 'Pending Worker actions — none until workers are provisioned', 'rankpublish-site' ), 'activity', 'amber' );
			?>
		</div>

		<div class="rpsite-os-split">
			<section class="rpsite-os-card">
				<div class="rpsite-os-card__head">
					<div>
						<h2><?php esc_html_e( 'Your operating rhythm', 'rankpublish-site' ); ?></h2>
						<p><?php esc_html_e( 'A short path to a connected, active workspace.', 'rankpublish-site' ); ?></p>
					</div>
					<?php echo RankPublish_Site_Admin_Os::icon( 'clock' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
				</div>
				<ol class="rpsite-os-steps">
					<?php foreach ( $steps as $index => $step ) : ?>
						<li>
							<span class="<?php echo ! empty( $step['done'] ) ? 'is-done' : ''; ?>">
								<?php
								if ( ! empty( $step['done'] ) ) {
									echo RankPublish_Site_Admin_Os::icon( 'check' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
								} else {
									echo esc_html( (string) ( $index + 1 ) );
								}
								?>
							</span>
							<div>
								<strong><?php echo esc_html( (string) $step['title'] ); ?></strong>
								<p><?php echo esc_html( (string) $step['detail'] ); ?></p>
							</div>
						</li>
					<?php endforeach; ?>
				</ol>
			</section>

			<section class="rpsite-os-card rpsite-os-card--dark">
				<p class="rpsite-os-kicker-light"><?php esc_html_e( 'Current subscription', 'rankpublish-site' ); ?></p>
				<div class="rpsite-os-card__head">
					<h2><?php echo esc_html( (string) ( $plan['name'] ?? 'RankPublish' ) ); ?></h2>
					<?php echo RankPublish_Site_Admin_Os::icon( 'spark' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
				</div>
				<p><?php esc_html_e( '$9.99 / month or $99 / year per site, with a 7-day trial.', 'rankpublish-site' ); ?></p>
				<hr />
				<div class="rpsite-os-card__foot">
					<div>
						<p><?php esc_html_e( 'Site capacity', 'rankpublish-site' ); ?></p>
						<strong><?php echo esc_html( (int) ( $plan['sites_used'] ?? 1 ) . ' of ' . (int) ( $plan['site_limit'] ?? 1 ) ); ?> <?php esc_html_e( 'sites', 'rankpublish-site' ); ?></strong>
					</div>
					<a class="rpsite-os-btn rpsite-os-btn--ghost-light" href="<?php echo esc_url( RankPublish_Site_Admin_Os::url( self::MENU_SLUG . '-billing' ) ); ?>"><?php esc_html_e( 'Manage plan', 'rankpublish-site' ); ?></a>
				</div>
			</section>
		</div>

		<section class="rpsite-os-card">
			<div class="rpsite-os-card__head">
				<div>
					<h2><?php esc_html_e( 'Recent activity', 'rankpublish-site' ); ?></h2>
					<p><?php esc_html_e( 'An auditable record of the actions in this workspace.', 'rankpublish-site' ); ?></p>
				</div>
				<a class="rpsite-os-link" href="<?php echo esc_url( RankPublish_Site_Admin_Os::url( self::MENU_SLUG . '-activity' ) ); ?>">
					<?php esc_html_e( 'View all', 'rankpublish-site' ); ?>
					<?php echo RankPublish_Site_Admin_Os::icon( 'arrow' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
				</a>
			</div>
			<?php $this->activity_list( is_array( $ctx['activity'] ?? null ) ? $ctx['activity'] : array() ); ?>
		</section>
		<?php
		$this->shell_end();
	}

	public function render_sites(): void {
		$ctx = $this->ctx();

		$this->shell_start( self::MENU_SLUG . '-sites' );
		RankPublish_Site_Admin_Os::heading(
			__( 'WordPress integration', 'rankpublish-site' ),
			__( 'Connected sites', 'rankpublish-site' ),
			__( 'Customer WordPress sites appear in RankPublish Cloud when users register, subscribe, and pair the rankpublish plugin — not by pairing this platform site.', 'rankpublish-site' ),
			'<a class="rpsite-os-btn rpsite-os-btn--primary" href="' . esc_url( rpsite_cloud_url() . '/app' ) . '">' . esc_html__( 'RankPublish Cloud', 'rankpublish-site' ) . '</a>'
		);
		RankPublish_Site_Workspace::render_operator_sites( $ctx );
		$this->shell_end();
	}

	public function render_scheduler(): void {
		$this->shell_start( self::MENU_SLUG . '-scheduler' );
		RankPublish_Site_Admin_Os::heading(
			__( 'Scheduler', 'rankpublish-site' ),
			__( 'Publishing workspace', 'rankpublish-site' ),
			__( 'Plan, schedule, and publish content with RankPublish.', 'rankpublish-site' )
		);
		RankPublish_Site_Module_Embed::render_missing_stack( 'scheduler' );
		$this->shell_end();
	}

	public function render_seo(): void {
		$this->shell_start( self::MENU_SLUG . '-seo' );
		RankPublish_Site_Admin_Os::heading(
			__( 'SEO', 'rankpublish-site' ),
			__( 'Search workspace', 'rankpublish-site' ),
			__( 'Optimize metadata and rankings with RankPublish.', 'rankpublish-site' )
		);
		RankPublish_Site_Module_Embed::render_missing_stack( 'seo' );
		$this->shell_end();
	}

	/**
	 * Hide upstream SchedulePress / ThinkRank license banners inside Publishing OS.
	 */
	public function suppress_upstream_license_notices(): void {
		if ( ! $this->is_os_page() ) {
			return;
		}
		echo '<style id="rpsite-hide-upstream-licenses">';
		echo 'body.rpsite-os .wpdeveloper-licensing-notice,body.rpsite-os .wpdeveloper-licensing-notice-wrap{display:none!important}';
		echo '</style>';
	}

	public function render_activity(): void {
		$ctx      = $this->ctx();
		$activity = is_array( $ctx['activity'] ?? null ) ? $ctx['activity'] : array();
		$queue    = is_array( $ctx['queue'] ?? null ) ? $ctx['queue'] : array();

		$this->shell_start( self::MENU_SLUG . '-activity' );
		RankPublish_Site_Admin_Os::heading(
			__( 'Command center', 'rankpublish-site' ),
			__( 'Activity & operations', 'rankpublish-site' ),
			__( 'Commands use pending, running, succeeded, or failed. There is no live Worker fleet on this site yet.', 'rankpublish-site' )
		);
		?>
		<div class="rpsite-os-split">
			<section class="rpsite-os-card">
				<div class="rpsite-os-card__head">
					<div>
						<h2><?php esc_html_e( 'Activity log', 'rankpublish-site' ); ?></h2>
						<p><?php esc_html_e( 'The durable timeline for this workspace.', 'rankpublish-site' ); ?></p>
					</div>
				</div>
				<?php $this->activity_list( $activity ); ?>
			</section>
			<section class="rpsite-os-card">
				<div class="rpsite-os-card__head">
					<div>
						<h2><?php esc_html_e( 'Operation queue', 'rankpublish-site' ); ?></h2>
						<p><?php esc_html_e( 'Worker commands and their execution state.', 'rankpublish-site' ); ?></p>
					</div>
				</div>
				<?php if ( array() === $queue ) : ?>
					<?php $this->empty_state( 'activity', __( 'No queued operations', 'rankpublish-site' ), __( 'Scheduled posts and future Worker commands will appear here.', 'rankpublish-site' ), true ); ?>
				<?php else : ?>
					<ul class="rpsite-os-queue">
						<?php foreach ( $queue as $item ) : ?>
							<li>
								<div>
									<strong><?php echo esc_html( (string) ( $item['title'] ?? '' ) ); ?></strong>
									<p><?php echo esc_html( (string) ( $item['when'] ?? '' ) ); ?></p>
								</div>
								<?php RankPublish_Site_Admin_Os::status_badge( (string) ( $item['status'] ?? 'pending' ) ); ?>
							</li>
						<?php endforeach; ?>
					</ul>
				<?php endif; ?>
			</section>
		</div>
		<?php
		$this->shell_end();
	}

	public function render_team(): void {
		$ctx     = $this->ctx();
		$members = is_array( $ctx['members'] ?? null ) ? $ctx['members'] : array();
		$invite  = '<a class="rpsite-os-btn rpsite-os-btn--primary" href="' . esc_url( (string) $ctx['invite_url'] ) . '">'
			. RankPublish_Site_Admin_Os::icon( 'mail' )
			. esc_html__( 'Invite member', 'rankpublish-site' )
			. '</a>';

		$this->shell_start( self::MENU_SLUG . '-team' );
		RankPublish_Site_Admin_Os::heading(
			__( 'Workspace access', 'rankpublish-site' ),
			__( 'Your team', 'rankpublish-site' ),
			__( 'WordPress users who can edit posts appear here. Invite teammates with Users → Add New.', 'rankpublish-site' ),
			$invite
		);
		?>
		<div class="rpsite-os-split">
			<section class="rpsite-os-card rpsite-os-card--flush">
				<div class="rpsite-os-card__head rpsite-os-card__head--pad">
					<div>
						<h2><?php esc_html_e( 'Members', 'rankpublish-site' ); ?></h2>
						<p><?php esc_html_e( 'Administrators are shown as owners of this WordPress site.', 'rankpublish-site' ); ?></p>
					</div>
				</div>
				<ul class="rpsite-os-members">
					<?php foreach ( $members as $member ) : ?>
						<li>
							<span class="rpsite-os-avatar rpsite-os-avatar--user"><?php echo esc_html( strtoupper( substr( (string) ( $member['name'] ?? 'U' ), 0, 1 ) ) ); ?></span>
							<div>
								<strong><?php echo esc_html( (string) ( $member['name'] ?? '' ) ); ?></strong>
								<p><?php echo esc_html( (string) ( $member['email'] ?? '' ) ); ?></p>
							</div>
							<span class="rpsite-os-pill rpsite-os-pill--neutral"><?php echo esc_html( (string) ( $member['role'] ?? 'member' ) ); ?></span>
						</li>
					<?php endforeach; ?>
				</ul>
			</section>
			<section class="rpsite-os-card">
				<div class="rpsite-os-card__head">
					<div>
						<h2><?php esc_html_e( 'Pending invitations', 'rankpublish-site' ); ?></h2>
						<p><?php esc_html_e( 'WordPress does not keep a RankPublish invite queue. Use Add New User for access.', 'rankpublish-site' ); ?></p>
					</div>
				</div>
				<?php $this->empty_state( 'team', __( 'No pending invitations', 'rankpublish-site' ), __( 'Invite an editor, reviewer, or administrator from WordPress users.', 'rankpublish-site' ), true ); ?>
			</section>
		</div>
		<?php
		$this->shell_end();
	}

	public function render_billing(): void {
		$ctx  = $this->ctx();
		$plan = is_array( $ctx['plan'] ?? null ) ? $ctx['plan'] : array();

		$this->shell_start( self::MENU_SLUG . '-billing' );
		RankPublish_Site_Admin_Os::heading(
			__( 'Billing & entitlements', 'rankpublish-site' ),
			__( 'A plan that matches your operating scope.', 'rankpublish-site' ),
			__( 'Locked public price: $9.99 per month or $99 per year, per site, with a 7-day trial. Card billing lives in the RankPublish account.', 'rankpublish-site' )
		);
		?>
		<div class="rpsite-os-split rpsite-os-split--billing">
			<section class="rpsite-os-card rpsite-os-card--dark">
				<p class="rpsite-os-kicker-light"><?php esc_html_e( 'Current plan', 'rankpublish-site' ); ?></p>
				<h2><?php echo esc_html( (string) ( $plan['name'] ?? 'RankPublish' ) ); ?></h2>
				<p><?php esc_html_e( '$9.99 / month or $99 / year per connected site, with a 7-day trial.', 'rankpublish-site' ); ?></p>
				<div class="rpsite-os-meter">
					<div>
						<span><?php esc_html_e( 'Connected sites', 'rankpublish-site' ); ?></span>
						<strong><?php echo esc_html( (int) ( $plan['sites_used'] ?? 1 ) . ' / ' . (int) ( $plan['site_limit'] ?? 1 ) ); ?></strong>
					</div>
					<div class="rpsite-os-meter__bar"><span style="width:100%"></span></div>
				</div>
				<div class="rpsite-os-card__foot">
					<div>
						<p><?php esc_html_e( 'Trial', 'rankpublish-site' ); ?></p>
						<strong><?php esc_html_e( '7 days per site', 'rankpublish-site' ); ?></strong>
					</div>
					<span class="rpsite-os-pill rpsite-os-pill--running"><?php esc_html_e( 'preview', 'rankpublish-site' ); ?></span>
				</div>
				<a class="rpsite-os-btn rpsite-os-btn--light" href="<?php echo esc_url( (string) $ctx['billing_url'] ); ?>">
					<?php esc_html_e( 'Manage subscription', 'rankpublish-site' ); ?>
					<?php echo RankPublish_Site_Admin_Os::icon( 'external' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
				</a>
			</section>
			<section class="rpsite-os-card">
				<div class="rpsite-os-card__head">
					<div>
						<h2><?php esc_html_e( 'Included entitlements', 'rankpublish-site' ); ?></h2>
						<p><?php esc_html_e( 'These are the public RankPublish seat limits for this WordPress site.', 'rankpublish-site' ); ?></p>
					</div>
				</div>
				<ul class="rpsite-os-ents">
					<li>
						<span class="rpsite-os-icon-blob rpsite-os-icon-blob--ok"><?php echo RankPublish_Site_Admin_Os::icon( 'check' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></span>
						<div>
							<strong><?php esc_html_e( 'One site per seat', 'rankpublish-site' ); ?></strong>
							<p><?php esc_html_e( 'Each paid or trial seat covers a single WordPress site.', 'rankpublish-site' ); ?></p>
						</div>
					</li>
					<li>
						<span class="rpsite-os-icon-blob rpsite-os-icon-blob--ok"><?php echo RankPublish_Site_Admin_Os::icon( 'check' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></span>
						<div>
							<strong><?php esc_html_e( 'Scheduler & SEO lists', 'rankpublish-site' ); ?></strong>
							<p><?php esc_html_e( 'Calendar and post metadata editing through WordPress.', 'rankpublish-site' ); ?></p>
						</div>
					</li>
					<li>
						<span class="rpsite-os-icon-blob rpsite-os-icon-blob--ok"><?php echo RankPublish_Site_Admin_Os::icon( 'check' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></span>
						<div>
							<strong><?php esc_html_e( 'Bridge handshake', 'rankpublish-site' ); ?></strong>
							<p><?php esc_html_e( 'One-time tokens are created in RankPublish SaaS, then pasted into WordPress.', 'rankpublish-site' ); ?></p>
						</div>
					</li>
				</ul>
			</section>
		</div>

		<section class="rpsite-os-card">
			<div class="rpsite-os-card__head">
				<h2><?php esc_html_e( 'Available plans', 'rankpublish-site' ); ?></h2>
			</div>
			<div class="rpsite-os-plans">
				<article class="rpsite-os-plan is-current">
					<div>
						<strong><?php esc_html_e( 'Monthly', 'rankpublish-site' ); ?></strong>
						<span class="rpsite-os-pill rpsite-os-pill--running"><?php esc_html_e( 'Current', 'rankpublish-site' ); ?></span>
					</div>
					<p><?php esc_html_e( '$9.99 / month · 1 site', 'rankpublish-site' ); ?></p>
					<a class="rpsite-os-btn rpsite-os-btn--outline" href="<?php echo esc_url( (string) $ctx['billing_url'] ); ?>"><?php esc_html_e( 'Selected plan', 'rankpublish-site' ); ?></a>
				</article>
				<article class="rpsite-os-plan">
					<div>
						<strong><?php esc_html_e( 'Yearly', 'rankpublish-site' ); ?></strong>
					</div>
					<p><?php esc_html_e( '$99 / year · 1 site', 'rankpublish-site' ); ?></p>
					<a class="rpsite-os-btn rpsite-os-btn--outline" href="<?php echo esc_url( (string) $ctx['billing_url'] ); ?>"><?php esc_html_e( 'Request change', 'rankpublish-site' ); ?></a>
				</article>
			</div>
		</section>
		<p class="rpsite-os-footnote">
			<?php esc_html_e( 'Need more site capacity now?', 'rankpublish-site' ); ?>
			<a href="<?php echo esc_url( RankPublish_Site_Admin_Os::url( self::MENU_SLUG . '-sites' ) ); ?>"><?php esc_html_e( 'Review connected sites', 'rankpublish-site' ); ?></a>
		</p>
		<?php
		$this->shell_end();
	}

	public function render_merge(): void {
		$this->require_dev_tools();
		$this->shell_start( self::MENU_SLUG . '-merge' );
		RankPublish_Site_Admin_Os::heading(
			__( 'Core', 'rankpublish-site' ),
			__( 'Merge audit', 'rankpublish-site' ),
			__( 'Compare upstream plugins with rankpublish/modules/* on this server.', 'rankpublish-site' )
		);

		if ( isset( $_GET['audited'] ) ) {
			$this->notice( __( 'Audit completed.', 'rankpublish-site' ), 'success' );
		}

		$audit = ( new RankPublish_Site_Merge_Audit() )->last_audit();
		if ( ! $audit ) {
			?>
			<section class="rpsite-os-card">
				<p><?php esc_html_e( 'No audit yet. Run an audit to compare upstream plugins with rankpublish/modules/* on this server.', 'rankpublish-site' ); ?></p>
				<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
					<?php wp_nonce_field( 'rpsite_run_audit' ); ?>
					<input type="hidden" name="action" value="rpsite_run_audit" />
					<button type="submit" class="rpsite-os-btn rpsite-os-btn--primary"><?php esc_html_e( 'Run audit', 'rankpublish-site' ); ?></button>
				</form>
			</section>
			<?php
			$this->shell_end();
			return;
		}

		printf(
			'<p class="rpsite-os-meta">%s</p>',
			esc_html(
				sprintf(
					/* translators: %s: ISO datetime */
					__( 'Last audit: %s', 'rankpublish-site' ),
					(string) ( $audit['audited_at'] ?? '' )
				)
			)
		);
		?>
		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="rpsite-os-inline">
			<?php wp_nonce_field( 'rpsite_run_audit' ); ?>
			<input type="hidden" name="action" value="rpsite_run_audit" />
			<button type="submit" class="rpsite-os-btn rpsite-os-btn--outline"><?php esc_html_e( 'Re-run audit', 'rankpublish-site' ); ?></button>
		</form>

		<?php foreach ( (array) ( $audit['modules'] ?? array() ) as $row ) : ?>
			<section class="rpsite-os-card">
				<div class="rpsite-os-card__head">
					<h2><?php echo esc_html( (string) ( $row['label'] ?? '' ) ); ?></h2>
					<?php $this->badge( (string) ( $row['status'] ?? 'unknown' ) ); ?>
				</div>
				<?php if ( ! empty( $row['message'] ) ) : ?>
					<p><?php echo esc_html( (string) $row['message'] ); ?></p>
				<?php else : ?>
					<ul class="rpsite-os-stats-list">
						<li><?php printf( esc_html__( 'Identical files: %d', 'rankpublish-site' ), (int) ( $row['summary']['same'] ?? 0 ) ); ?></li>
						<li><?php printf( esc_html__( 'Expected embed hooks: %d', 'rankpublish-site' ), (int) ( $row['summary']['expected_diff'] ?? 0 ) ); ?></li>
						<li><?php printf( esc_html__( 'Needs review: %d', 'rankpublish-site' ), (int) ( $row['summary']['unexpected'] ?? 0 ) ); ?></li>
					</ul>
					<p class="rpsite-os-meta">
						<?php
						printf(
							esc_html__( 'Upstream %1$s · Merged baseline %2$s', 'rankpublish-site' ),
							esc_html( (string) ( $row['upstream_version'] ?? '—' ) ),
							esc_html( (string) ( $row['merged_version'] ?? '—' ) )
						);
						?>
					</p>
					<?php if ( ! empty( $row['unexpected'] ) ) : ?>
						<details>
							<summary><?php esc_html_e( 'Unexpected diffs (port to rankpublish)', 'rankpublish-site' ); ?></summary>
							<ul class="rpsite-os-files">
								<?php foreach ( (array) $row['unexpected'] as $item ) : ?>
									<li><code><?php echo esc_html( (string) ( $item['path'] ?? '' ) ); ?></code></li>
								<?php endforeach; ?>
							</ul>
						</details>
					<?php endif; ?>
					<?php if ( ! empty( $row['expected_diff'] ) ) : ?>
						<details>
							<summary><?php esc_html_e( 'Expected RankPublish embed hooks', 'rankpublish-site' ); ?></summary>
							<ul class="rpsite-os-files">
								<?php foreach ( (array) $row['expected_diff'] as $path ) : ?>
									<li><code><?php echo esc_html( (string) $path ); ?></code></li>
								<?php endforeach; ?>
							</ul>
						</details>
					<?php endif; ?>
				<?php endif; ?>
			</section>
		<?php endforeach; ?>

		<section class="rpsite-os-card">
			<h3><?php esc_html_e( 'CLI audit (all modules + staging)', 'rankpublish-site' ); ?></h3>
			<p><?php esc_html_e( 'From the RankPublish repository on your dev machine:', 'rankpublish-site' ); ?></p>
			<pre class="rpsite-os-code">node deploy/contabo/audit-staging-all.cjs</pre>
			<p class="rpsite-os-meta"><?php esc_html_e( 'Requires the repository SSH environment variables. Writes deploy/contabo/reports/*.json', 'rankpublish-site' ); ?></p>
		</section>
		<?php
		$this->shell_end();
	}

	public function render_stack(): void {
		$this->require_dev_tools();
		$this->shell_start( self::MENU_SLUG . '-stack' );
		RankPublish_Site_Admin_Os::heading(
			__( 'Core', 'rankpublish-site' ),
			__( 'Dev stack', 'rankpublish-site' ),
			__( 'Official / experimental sites should run the four upstream plugins + Site Core. Customers run rankpublish only.', 'rankpublish-site' )
		);

		if ( ! function_exists( 'get_plugins' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		$recommended = array(
			'rankpublish-site/rankpublish-site.php'           => __( 'RankPublish Site Core (this plugin)', 'rankpublish-site' ),
			'wp-scheduled-posts/wp-scheduled-posts.php'         => __( 'SchedulePress (upstream)', 'rankpublish-site' ),
			'wp-scheduled-posts-pro/wp-scheduled-posts-pro.php' => __( 'SchedulePress Pro (upstream)', 'rankpublish-site' ),
			'thinkrank/thinkrank.php'                           => __( 'ThinkRank (upstream)', 'rankpublish-site' ),
			'thinkrank-pro/thinkrank-pro.php'                   => __( 'ThinkRank Pro (upstream)', 'rankpublish-site' ),
		);
		$avoid = array(
			'rankpublish/rankpublish.php' => __( 'Product plugin — disable on dev/marketing stack to avoid duplicate menus', 'rankpublish-site' ),
		);
		?>
		<section class="rpsite-os-card">
			<h2><?php esc_html_e( 'Recommended active', 'rankpublish-site' ); ?></h2>
			<table class="rpsite-os-table">
				<thead><tr><th><?php esc_html_e( 'Plugin', 'rankpublish-site' ); ?></th><th><?php esc_html_e( 'Status', 'rankpublish-site' ); ?></th></tr></thead>
				<tbody>
					<?php foreach ( $recommended as $basename => $label ) : ?>
						<tr>
							<td><?php echo esc_html( $label ); ?></td>
							<td><?php $this->active_badge( is_plugin_active( $basename ) ); ?></td>
						</tr>
					<?php endforeach; ?>
				</tbody>
			</table>
		</section>
		<section class="rpsite-os-card">
			<h2><?php esc_html_e( 'Should be inactive on dev stack', 'rankpublish-site' ); ?></h2>
			<table class="rpsite-os-table">
				<tbody>
					<?php foreach ( $avoid as $basename => $label ) : ?>
						<tr>
							<td><?php echo esc_html( $label ); ?></td>
							<td><?php $this->active_badge( is_plugin_active( $basename ), true ); ?></td>
						</tr>
					<?php endforeach; ?>
				</tbody>
			</table>
		</section>
		<?php
		$this->shell_end();
	}

	public function render_connectors(): void {
		$this->require_dev_tools();
		$this->shell_start( self::MENU_SLUG . '-connectors' );
		RankPublish_Site_Admin_Os::heading(
			__( 'Core', 'rankpublish-site' ),
			__( 'Connector packages', 'rankpublish-site' ),
			__( 'Customer WordPress sites connect to RankPublish via the product plugin (recommended) or the lightweight Bridge.', 'rankpublish-site' )
		);

		if ( isset( $_GET['built'] ) ) {
			$this->notice( __( 'RankPublish Bridge zip rebuilt.', 'rankpublish-site' ), 'success' );
		}
		if ( ! empty( $_GET['error'] ) ) {
			$this->notice( sanitize_text_field( wp_unslash( (string) $_GET['error'] ) ), 'error' );
		}

		$bridge_url  = RankPublish_Site_Connector_Packages::bridge_zip_url();
		$product_url = RankPublish_Site_Connector_Packages::product_zip_url();
		$cloud       = rpsite_cloud_url();
		?>
		<section class="rpsite-os-card">
			<h2><?php esc_html_e( 'RankPublish product plugin', 'rankpublish-site' ); ?></h2>
			<p><?php esc_html_e( 'Merged ThinkRank + SchedulePress + Cloud Connect (rankpublish/v1).', 'rankpublish-site' ); ?></p>
			<?php if ( $product_url ) : ?>
				<p><a class="rpsite-os-btn rpsite-os-btn--primary" href="<?php echo esc_url( $product_url ); ?>"><?php esc_html_e( 'Download rankpublish.zip', 'rankpublish-site' ); ?></a></p>
			<?php else : ?>
				<p class="rpsite-os-meta"><?php esc_html_e( 'Place rankpublish.zip in wp-content/uploads/rankpublish/ (deploy script or Local sync).', 'rankpublish-site' ); ?></p>
			<?php endif; ?>
		</section>
		<section class="rpsite-os-card">
			<h2><?php esc_html_e( 'RankPublish Bridge', 'rankpublish-site' ); ?></h2>
			<p><?php esc_html_e( 'Minimal connector — one-time token handshake only. Tokens are issued in the RankPublish account.', 'rankpublish-site' ); ?></p>
			<p class="rpsite-os-meta"><?php printf( esc_html__( 'Default cloud: %s', 'rankpublish-site' ), esc_html( $cloud ) ); ?></p>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="rpsite-os-inline">
				<?php wp_nonce_field( 'rpsite_build_bridge_zip' ); ?>
				<input type="hidden" name="action" value="rpsite_build_bridge_zip" />
				<button type="submit" class="rpsite-os-btn rpsite-os-btn--outline"><?php esc_html_e( 'Rebuild bridge zip', 'rankpublish-site' ); ?></button>
				<?php if ( $bridge_url ) : ?>
					<a class="rpsite-os-btn rpsite-os-btn--primary" href="<?php echo esc_url( $bridge_url ); ?>"><?php esc_html_e( 'Download rankpublish-bridge.zip', 'rankpublish-site' ); ?></a>
				<?php endif; ?>
			</form>
		</section>
		<section class="rpsite-os-card">
			<h3><?php esc_html_e( 'Architecture', 'rankpublish-site' ); ?></h3>
			<p><?php esc_html_e( 'See docs/worker-sync-architecture.md in this plugin for Bridge vs product connector paths.', 'rankpublish-site' ); ?></p>
		</section>
		<?php
		$this->shell_end();
	}

	public function render_settings(): void {
		$this->shell_start( self::MENU_SLUG . '-settings' );
		RankPublish_Site_Admin_Os::heading(
			__( 'Core', 'rankpublish-site' ),
			__( 'Settings', 'rankpublish-site' ),
			__( 'Cloud URL, branding, and development mode for this RankPublish site.', 'rankpublish-site' )
		);

		$settings = RankPublish_Site_Merge_Registry::settings();

		if ( isset( $_GET['saved'] ) ) {
			$this->notice( __( 'Settings saved.', 'rankpublish-site' ), 'success' );
		}
		if ( isset( $_GET['versions'] ) ) {
			$this->notice( __( 'Merged versions updated.', 'rankpublish-site' ), 'success' );
		}
		?>
		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="rpsite-os-card">
			<h2><?php esc_html_e( 'Core settings', 'rankpublish-site' ); ?></h2>
			<?php wp_nonce_field( 'rpsite_save_settings' ); ?>
			<input type="hidden" name="action" value="rpsite_save_settings" />
			<table class="rpsite-os-form">
				<tr>
					<th><label for="rpsite-cloud-url"><?php esc_html_e( 'Cloud URL', 'rankpublish-site' ); ?></label></th>
					<td><input name="cloud_url" id="rpsite-cloud-url" type="url" value="<?php echo esc_attr( (string) $settings['cloud_url'] ); ?>" /></td>
				</tr>
				<tr>
					<th><?php esc_html_e( 'Admin branding', 'rankpublish-site' ); ?></th>
					<td><label><input type="checkbox" name="branding_enabled" value="1" <?php checked( ! empty( $settings['branding_enabled'] ) ); ?> /> <?php esc_html_e( 'Replace upstream logos with RankPublish on admin screens', 'rankpublish-site' ); ?></label></td>
				</tr>
				<tr>
					<th><?php esc_html_e( 'Dev stack mode', 'rankpublish-site' ); ?></th>
					<td><label><input type="checkbox" name="dev_stack_mode" value="1" <?php checked( ! empty( $settings['dev_stack_mode'] ) ); ?> /> <?php esc_html_e( 'Development mode: show merge audit, stack, and connector packages in RankPublish', 'rankpublish-site' ); ?></label></td>
				</tr>
			</table>
			<button type="submit" class="rpsite-os-btn rpsite-os-btn--primary"><?php esc_html_e( 'Save settings', 'rankpublish-site' ); ?></button>
		</form>
		<?php if ( RankPublish_Site_Admin_Os::is_dev_mode() ) : ?>
		<?php $versions = RankPublish_Site_Merge_Registry::merged_versions(); ?>
		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="rpsite-os-card">
			<h2><?php esc_html_e( 'Merged versions baseline', 'rankpublish-site' ); ?></h2>
			<p class="rpsite-os-meta"><?php esc_html_e( 'Update after you port an upstream release into rankpublish/modules/*.', 'rankpublish-site' ); ?></p>
			<?php wp_nonce_field( 'rpsite_save_versions' ); ?>
			<input type="hidden" name="action" value="rpsite_save_versions" />
			<table class="rpsite-os-form">
				<?php foreach ( RankPublish_Site_Merge_Registry::modules() as $module ) : ?>
					<?php $key = (string) $module['basename']; ?>
					<tr>
						<th><label for="v-<?php echo esc_attr( md5( $key ) ); ?>"><?php echo esc_html( (string) $module['label'] ); ?></label></th>
						<td>
							<input
								name="version_<?php echo esc_attr( md5( $key ) ); ?>"
								id="v-<?php echo esc_attr( md5( $key ) ); ?>"
								type="text"
								value="<?php echo esc_attr( $versions[ $key ] ?? '' ); ?>"
								placeholder="0.0.0"
							/>
						</td>
					</tr>
				<?php endforeach; ?>
			</table>
			<button type="submit" class="rpsite-os-btn rpsite-os-btn--outline"><?php esc_html_e( 'Save merged versions', 'rankpublish-site' ); ?></button>
		</form>

		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="rpsite-os-card">
			<h2><?php esc_html_e( 'Merge watch', 'rankpublish-site' ); ?></h2>
			<?php wp_nonce_field( 'rpsite_clear_dismissals' ); ?>
			<input type="hidden" name="action" value="rpsite_clear_dismissals" />
			<p><?php esc_html_e( 'Clear dismissed upstream update alerts so they show again in wp-admin.', 'rankpublish-site' ); ?></p>
			<button type="submit" class="rpsite-os-btn rpsite-os-btn--danger"><?php esc_html_e( 'Clear dismissals', 'rankpublish-site' ); ?></button>
		</form>
		<?php endif; ?>
		<?php
		$this->shell_end();
	}

	private function require_dev_tools(): void {
		if ( RankPublish_Site_Admin_Os::is_dev_mode() ) {
			return;
		}
		wp_safe_redirect( admin_url( 'admin.php?page=' . self::MENU_SLUG ) );
		exit;
	}

	/**
	 * @return array<string, mixed>
	 */
	private function ctx(): array {
		return RankPublish_Site_Admin_Os::snapshot();
	}

	private function shell_start( string $page ): void {
		RankPublish_Site_Admin_Os::start( $page );
	}

	private function shell_end(): void {
		RankPublish_Site_Admin_Os::end();
	}

	private function is_os_page(): bool {
		$page = isset( $_GET['page'] ) ? sanitize_key( (string) wp_unslash( $_GET['page'] ) ) : '';
		return str_starts_with( $page, self::MENU_SLUG );
	}

	private function notice( string $text, string $type = 'info' ): void {
		printf(
			'<div class="rpsite-os-notice rpsite-os-notice--%1$s"><p>%2$s</p></div>',
			esc_attr( $type ),
			esc_html( $text )
		);
	}

	private function badge( string $status ): void {
		$labels = array(
			'ok'       => __( 'In sync', 'rankpublish-site' ),
			'ok_hooks' => __( 'OK (embed hooks only)', 'rankpublish-site' ),
			'action'   => __( 'Action needed', 'rankpublish-site' ),
			'missing'  => __( 'Missing dirs', 'rankpublish-site' ),
			'none'     => __( 'Not audited', 'rankpublish-site' ),
			'unknown'  => __( 'Unknown', 'rankpublish-site' ),
		);
		$map = array(
			'ok'       => 'succeeded',
			'ok_hooks' => 'succeeded',
			'action'   => 'failed',
			'missing'  => 'failed',
			'none'     => 'pending',
			'unknown'  => 'pending',
		);
		printf(
			'<span class="rpsite-os-pill rpsite-os-pill--%1$s">%2$s</span>',
			esc_attr( $map[ $status ] ?? 'pending' ),
			esc_html( $labels[ $status ] ?? $status )
		);
	}

	private function active_badge( bool $active, bool $invert = false ): void {
		$good = $invert ? ! $active : $active;
		printf(
			'<span class="rpsite-os-pill rpsite-os-pill--%1$s">%2$s</span>',
			$good ? 'succeeded' : 'failed',
			$active ? esc_html__( 'Active', 'rankpublish-site' ) : esc_html__( 'Inactive', 'rankpublish-site' )
		);
	}

	private function stat_card( string $label, string $value, string $helper, string $icon, string $tone ): void {
		?>
		<article class="rpsite-os-card rpsite-os-stat">
			<div>
				<p><?php echo esc_html( $label ); ?></p>
				<strong><?php echo esc_html( $value ); ?></strong>
			</div>
			<span class="rpsite-os-icon-blob rpsite-os-icon-blob--<?php echo esc_attr( $tone ); ?>"><?php echo RankPublish_Site_Admin_Os::icon( $icon ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></span>
			<em><?php echo esc_html( $helper ); ?></em>
		</article>
		<?php
	}

	private function mini_stat( string $label, int $value, string $detail, string $icon ): void {
		?>
		<article class="rpsite-os-card rpsite-os-mini">
			<div>
				<p><?php echo esc_html( $label ); ?></p>
				<strong><?php echo esc_html( (string) $value ); ?></strong>
			</div>
			<?php echo RankPublish_Site_Admin_Os::icon( $icon ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
			<em><?php echo esc_html( $detail ); ?></em>
		</article>
		<?php
	}

	/**
	 * @param list<array<string, string>> $events Events.
	 */
	private function activity_list( array $events ): void {
		if ( array() === $events ) {
			$this->empty_state( 'activity', __( 'No activity yet', 'rankpublish-site' ), __( 'Connection and operation events will appear here as this workspace becomes active.', 'rankpublish-site' ), true );
			return;
		}
		echo '<ul class="rpsite-os-activity">';
		foreach ( $events as $event ) {
			$status = (string) ( $event['status'] ?? 'pending' );
			echo '<li>';
			printf( '<span class="rpsite-os-activity__dot rpsite-os-activity__dot--%s">', esc_attr( $status ) );
			echo RankPublish_Site_Admin_Os::icon( 'activity' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			echo '</span><div><div class="rpsite-os-activity__title"><strong>' . esc_html( (string) ( $event['title'] ?? '' ) ) . '</strong>';
			RankPublish_Site_Admin_Os::status_badge( $status );
			echo '</div><p>' . esc_html( (string) ( $event['detail'] ?? '' ) ) . '</p></div>';
			echo '<time>' . esc_html( (string) ( $event['when'] ?? '' ) ) . '</time></li>';
		}
		echo '</ul>';
	}

	private function empty_state( string $icon, string $title, string $detail, bool $compact = false ): void {
		printf( '<div class="rpsite-os-empty%s">', $compact ? ' is-compact' : '' );
		echo '<span class="rpsite-os-icon-blob rpsite-os-icon-blob--sky">' . RankPublish_Site_Admin_Os::icon( $icon ) . '</span>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		echo '<strong>' . esc_html( $title ) . '</strong>';
		echo '<p>' . esc_html( $detail ) . '</p></div>';
	}

	private function post_pill( string $status ): string {
		$map = array(
			'publish' => 'succeeded',
			'future'  => 'running',
			'draft'   => 'pending',
		);
		return $map[ $status ] ?? 'pending';
	}

	/**
	 * @param array<string, mixed> $cal Calendar payload.
	 */
	private function render_calendar( array $cal ): void {
		$weekday = (int) ( $cal['weekday'] ?? 0 );
		$days_in = (int) ( $cal['days_in'] ?? 30 );
		$today   = (int) ( $cal['today'] ?? 0 );
		$by_day  = is_array( $cal['by_day'] ?? null ) ? $cal['by_day'] : array();
		$days    = array( 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat' );
		?>
		<section class="rpsite-os-card rpsite-os-card--flush rpsite-os-cal">
			<div class="rpsite-os-cal__bar">
				<div class="rpsite-os-cal__nav">
					<a class="rpsite-os-btn rpsite-os-btn--icon" href="<?php echo esc_url( (string) ( $cal['prev'] ?? '' ) ); ?>" aria-label="<?php esc_attr_e( 'Previous month', 'rankpublish-site' ); ?>">&lsaquo;</a>
					<strong><?php echo esc_html( (string) ( $cal['label'] ?? '' ) ); ?></strong>
					<a class="rpsite-os-btn rpsite-os-btn--icon" href="<?php echo esc_url( (string) ( $cal['next'] ?? '' ) ); ?>" aria-label="<?php esc_attr_e( 'Next month', 'rankpublish-site' ); ?>">&rsaquo;</a>
				</div>
				<div class="rpsite-os-cal__legend">
					<span class="is-sched"></span><?php esc_html_e( 'Scheduled', 'rankpublish-site' ); ?>
					<span class="is-draft"></span><?php esc_html_e( 'Draft', 'rankpublish-site' ); ?>
				</div>
			</div>
			<div class="rpsite-os-cal__grid">
				<?php foreach ( $days as $day ) : ?>
					<div class="rpsite-os-cal__dow"><?php echo esc_html( $day ); ?></div>
				<?php endforeach; ?>
				<?php
				for ( $i = 0; $i < 42; $i++ ) {
					$d        = $i - $weekday + 1;
					$in_month = $d >= 1 && $d <= $days_in;
					$items    = $in_month && isset( $by_day[ $d ] ) && is_array( $by_day[ $d ] ) ? $by_day[ $d ] : array();
					$is_today = $in_month && $today === $d;
					printf(
						'<div class="rpsite-os-cal__cell%s">',
						$in_month ? '' : ' is-out'
					);
					if ( $in_month ) {
						printf(
							'<span class="rpsite-os-cal__num%s">%s</span>',
							$is_today ? ' is-today' : '',
							esc_html( (string) $d )
						);
						$shown = 0;
						foreach ( $items as $item ) {
							if ( $shown >= 2 ) {
								break;
							}
							$title  = (string) ( $item['title'] ?? '' );
							$status = (string) ( $item['status'] ?? '' );
							$edit   = isset( $item['id'] ) ? get_edit_post_link( (int) $item['id'], 'raw' ) : '';
							$class  = 'future' === $status ? 'is-sched' : ( 'draft' === $status ? 'is-draft' : 'is-pub' );
							if ( $edit ) {
								printf(
									'<a class="rpsite-os-cal__item %1$s" href="%2$s">%3$s</a>',
									esc_attr( $class ),
									esc_url( $edit ),
									esc_html( $title )
								);
							} else {
								printf( '<span class="rpsite-os-cal__item %1$s">%2$s</span>', esc_attr( $class ), esc_html( $title ) );
							}
							++$shown;
						}
						if ( count( $items ) > 2 ) {
							printf( '<p class="rpsite-os-cal__more">+%d</p>', count( $items ) - 2 );
						}
					}
					echo '</div>';
				}
				?>
			</div>
		</section>
		<?php
		if ( empty( $cal['has_posts'] ) ) {
			echo '<section class="rpsite-os-card rpsite-os-card--dash">';
			$this->empty_state(
				'calendar',
				__( 'Your calendar is waiting for content', 'rankpublish-site' ),
				__( 'Create or schedule a WordPress post this month to see it on the calendar.', 'rankpublish-site' )
			);
			echo '</section>';
		}
	}
}
