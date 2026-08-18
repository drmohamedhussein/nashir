<?php
/**
 * Native RankPublish OS workspace for upstream SchedulePress / ThinkRank admin UIs.
 *
 * @package RankPublishSite
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Wraps upstream admin pages inside the Publishing OS shell (no iframe).
 */
final class RankPublish_Site_Module_Embed {

	public const OS_FLAG = 'rpsite_os';

	/**
	 * @var string|null
	 */
	private static $wrap_context = null;

	/**
	 * Register hooks.
	 */
	public function init(): void {
		add_action( 'admin_init', array( $this, 'maybe_redirect_core_module' ), 1 );
		add_action( 'admin_init', array( $this, 'register_native_wrap' ), 20 );
		add_filter( 'admin_body_class', array( $this, 'wrap_body_class' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_wrap_assets' ) );
	}

	/**
	 * Send Core scheduler/SEO menu items to the native upstream workspace.
	 */
	public function maybe_redirect_core_module(): void {
		if ( ! is_admin() || wp_doing_ajax() ) {
			return;
		}

		$page = isset( $_GET['page'] ) ? sanitize_key( (string) wp_unslash( $_GET['page'] ) ) : '';
		if ( ! in_array( $page, array( 'rankpublish-core-scheduler', 'rankpublish-core-seo' ), true ) ) {
			return;
		}

		$context = 'rankpublish-core-scheduler' === $page ? 'scheduler' : 'seo';
		$panels  = 'scheduler' === $context ? self::scheduler_panels() : self::seo_panels();
		if ( array() === $panels ) {
			return;
		}

		$active_id = isset( $_GET['embed'] ) ? sanitize_key( (string) wp_unslash( $_GET['embed'] ) ) : '';
		$target    = self::panel_page( $panels, $active_id );

		wp_safe_redirect(
			add_query_arg(
				array(
					'page'       => $target,
					self::OS_FLAG => '1',
					'rpsite_ctx' => $context,
				),
				admin_url( 'admin.php' )
			)
		);
		exit;
	}

	/**
	 * Buffer upstream admin output and render it inside the OS shell.
	 */
	public function register_native_wrap(): void {
		if ( ! self::is_os_wrapped_request() ) {
			return;
		}

		$page = isset( $_GET['page'] ) ? sanitize_key( (string) wp_unslash( $_GET['page'] ) ) : '';
		if ( ! self::is_upstream_admin_page( $page ) ) {
			return;
		}

		self::$wrap_context = isset( $_GET['rpsite_ctx'] ) ? sanitize_key( (string) wp_unslash( $_GET['rpsite_ctx'] ) ) : self::context_for_page( $page );

		add_action( 'load-' . $page, array( $this, 'attach_output_buffer' ) );
	}

	/**
	 * Wrap the upstream page callback output.
	 */
	public function attach_output_buffer(): void {
		$hook = isset( $GLOBALS['page_hook'] ) ? (string) $GLOBALS['page_hook'] : '';
		if ( '' === $hook ) {
			return;
		}

		add_action( $hook, array( self::class, 'buffer_start' ), 0 );
		add_action(
			$hook,
			function (): void {
				self::buffer_finish();
			},
			PHP_INT_MAX
		);
	}

	public static function buffer_start(): void {
		ob_start();
	}

	public static function buffer_finish(): void {
		$content = ob_get_clean();
		if ( ! is_string( $content ) ) {
			$content = '';
		}

		$context  = self::$wrap_context ?? 'scheduler';
		$core     = 'rankpublish-core-' . $context;
		$page     = isset( $_GET['page'] ) ? sanitize_key( (string) wp_unslash( $_GET['page'] ) ) : '';
		$panels   = 'scheduler' === $context ? self::scheduler_panels() : self::seo_panels();

		RankPublish_Site_Admin_Os::start( $core );
		self::render_heading( $context );
		self::render_tabs( $panels, $page, $context );
		echo '<div class="rpsite-module-native">';
		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- upstream admin HTML.
		echo $content;
		echo '</div>';
		RankPublish_Site_Admin_Os::end();
	}

	/**
	 * Missing-stack UI when upstream plugins are inactive.
	 *
	 * @param string $context scheduler|seo.
	 */
	public static function render_missing_stack( string $context ): void {
		echo '<section class="rpsite-os-card"><div class="rpsite-os-empty">';
		echo '<strong>' . esc_html__( 'RankPublish modules not active', 'rankpublish-site' ) . '</strong>';
		echo '<p>' . esc_html(
			'scheduler' === $context
				? __( 'Activate the RankPublish scheduler modules on this site to load the publishing workspace.', 'rankpublish-site' )
				: __( 'Activate the RankPublish SEO modules on this site to load the SEO workspace.', 'rankpublish-site' )
		) . '</p>';
		if ( RankPublish_Site_Admin_Os::is_dev_mode() ) {
			printf(
				'<p><a class="rpsite-os-btn rpsite-os-btn--outline" href="%s">%s</a></p>',
				esc_url( admin_url( 'admin.php?page=rankpublish-core-stack' ) ),
				esc_html__( 'Open dev stack', 'rankpublish-site' )
			);
		}
		echo '</div></section>';
	}

	/**
	 * @param string $context scheduler|seo.
	 */
	private static function render_heading( string $context ): void {
		if ( 'scheduler' === $context ) {
			RankPublish_Site_Admin_Os::heading(
				__( 'Scheduler', 'rankpublish-site' ),
				__( 'Publishing workspace', 'rankpublish-site' ),
				__( 'Plan, schedule, and publish content with RankPublish — calendar, queue, and pro automation in one workspace.', 'rankpublish-site' ),
				'<a class="rpsite-os-btn rpsite-os-btn--outline" href="' . esc_url( RankPublish_Site_Admin_Os::url( 'rankpublish-core-sites' ) ) . '">'
				. RankPublish_Site_Admin_Os::icon( 'globe' )
				. esc_html__( 'Manage sites', 'rankpublish-site' )
				. '</a>'
			);
			return;
		}

		RankPublish_Site_Admin_Os::heading(
			__( 'SEO', 'rankpublish-site' ),
			__( 'Search workspace', 'rankpublish-site' ),
			__( 'Optimize metadata, audits, and AI-assisted SEO with RankPublish — essential and pro tools in one workspace.', 'rankpublish-site' )
		);
	}

	/**
	 * @param list<array{id: string, label: string, page: string, plugin: string, pro: bool}> $panels  Panels.
	 * @param string                                                                          $active_page Active wp page slug.
	 * @param string                                                                          $context Context key.
	 */
	private static function render_tabs( array $panels, string $active_page, string $context ): void {
		if ( array() === $panels ) {
			return;
		}

		echo '<div class="rpsite-os-module-tabs" role="tablist" aria-label="' . esc_attr__( 'Module views', 'rankpublish-site' ) . '">';
		foreach ( $panels as $panel ) {
			$is_on = $active_page === (string) $panel['page'];
			$url   = add_query_arg(
				array(
					'page'       => (string) $panel['page'],
					self::OS_FLAG => '1',
					'rpsite_ctx' => $context,
				),
				admin_url( 'admin.php' )
			);
			printf(
				'<a class="rpsite-os-module-tab%s" role="tab" aria-selected="%s" href="%s"><span>%s</span>%s</a>',
				$is_on ? ' is-active' : '',
				$is_on ? 'true' : 'false',
				esc_url( $url ),
				esc_html( (string) $panel['label'] ),
				! empty( $panel['pro'] ) ? '<em class="rpsite-os-module-tab__pro">Pro</em>' : ''
			);
		}
		echo '</div>';
	}

	/**
	 * @return list<array{id: string, label: string, page: string, plugin: string, pro: bool}>
	 */
	public static function scheduler_panels(): array {
		$panels = array();

		if ( self::schedule_stack_ready() ) {
			$panels[] = array(
				'id'     => 'scheduler',
				'label'  => __( 'Scheduler', 'rankpublish-site' ),
				'page'   => 'schedulepress',
				'plugin' => 'wp-scheduled-posts',
				'pro'    => false,
			);
			$panels[] = array(
				'id'     => 'calendar',
				'label'  => __( 'Calendar', 'rankpublish-site' ),
				'page'   => 'schedulepress-calendar',
				'plugin' => 'wp-scheduled-posts',
				'pro'    => false,
			);
		}

		if ( self::schedule_pro_ready() ) {
			$panels[] = array(
				'id'     => 'scheduler-pro',
				'label'  => __( 'Automation Pro', 'rankpublish-site' ),
				'page'   => 'schedulepress',
				'plugin' => 'wp-scheduled-posts-pro',
				'pro'    => true,
			);
		}

		return $panels;
	}

	/**
	 * @return list<array{id: string, label: string, page: string, plugin: string, pro: bool}>
	 */
	public static function seo_panels(): array {
		$panels = array();

		if ( self::seo_stack_ready() ) {
			$panels[] = array(
				'id'     => 'seo-dashboard',
				'label'  => __( 'Dashboard', 'rankpublish-site' ),
				'page'   => 'thinkrank',
				'plugin' => 'thinkrank',
				'pro'    => false,
			);
			$panels[] = array(
				'id'     => 'essential-seo',
				'label'  => __( 'Essential SEO', 'rankpublish-site' ),
				'page'   => 'thinkrank-essential-seo',
				'plugin' => 'thinkrank',
				'pro'    => false,
			);
			$panels[] = array(
				'id'     => 'seo-settings',
				'label'  => __( 'SEO Settings', 'rankpublish-site' ),
				'page'   => 'thinkrank-settings',
				'plugin' => 'thinkrank',
				'pro'    => false,
			);
		}

		if ( self::seo_pro_ready() ) {
			$panels[] = array(
				'id'     => 'seo-pro',
				'label'  => __( 'SEO Pro', 'rankpublish-site' ),
				'page'   => 'thinkrank',
				'plugin' => 'thinkrank-pro',
				'pro'    => true,
			);
		}

		return $panels;
	}

	/**
	 * @param string $classes Body classes.
	 */
	public function wrap_body_class( string $classes ): string {
		if ( self::is_os_wrapped_request() ) {
			$classes .= ' rpsite-os rpsite-os-module-wrap rankpublish-site-branded';
		}
		return $classes;
	}

	/**
	 * @param string $hook Admin hook suffix.
	 */
	public function enqueue_wrap_assets( string $hook ): void {
		unset( $hook );
		if ( ! self::is_os_wrapped_request() ) {
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

		if ( class_exists( 'RankPublish_Site_Branding' ) ) {
			( new RankPublish_Site_Branding() )->enqueue_admin_assets( '' );
		}
	}

	public static function is_os_wrapped_request(): bool {
		return isset( $_GET[ self::OS_FLAG ] ) && '1' === (string) wp_unslash( $_GET[ self::OS_FLAG ] );
	}

	/**
	 * @param list<array{id: string, label: string, page: string, plugin: string, pro: bool}> $panels Panels.
	 * @param string                                                                          $panel_id Panel id.
	 */
	private static function panel_page( array $panels, string $panel_id ): string {
		foreach ( $panels as $panel ) {
			if ( $panel['id'] === $panel_id ) {
				return (string) $panel['page'];
			}
		}
		return (string) $panels[0]['page'];
	}

	private static function context_for_page( string $page ): string {
		return in_array( $page, array( 'schedulepress', 'schedulepress-calendar' ), true ) ? 'scheduler' : 'seo';
	}

	private static function is_upstream_admin_page( string $page ): bool {
		return in_array(
			$page,
			array(
				'schedulepress',
				'schedulepress-calendar',
				'thinkrank',
				'thinkrank-essential-seo',
				'thinkrank-settings',
				'thinkrank-ai-tools',
			),
			true
		);
	}

	private static function plugin_active( string $basename ): bool {
		if ( ! function_exists( 'is_plugin_active' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}
		return is_plugin_active( $basename );
	}

	private static function merged_product_active(): bool {
		return self::plugin_active( 'rankpublish/rankpublish.php' );
	}

	private static function schedule_stack_ready(): bool {
		return self::plugin_active( 'wp-scheduled-posts/wp-scheduled-posts.php' ) || self::merged_product_active();
	}

	private static function schedule_pro_ready(): bool {
		return self::plugin_active( 'wp-scheduled-posts-pro/wp-scheduled-posts-pro.php' ) || self::merged_product_active();
	}

	private static function seo_stack_ready(): bool {
		return self::plugin_active( 'thinkrank/thinkrank.php' ) || self::merged_product_active();
	}

	private static function seo_pro_ready(): bool {
		return self::plugin_active( 'thinkrank-pro/thinkrank-pro.php' ) || self::merged_product_active();
	}
}
