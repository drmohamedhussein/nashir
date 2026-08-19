<?php
/**
 * RankPublish canonical branding (logos, license chrome, vendor link rewrite).
 *
 * @package RankPublishSite
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Applies RankPublish logos and license chrome on the official/dev stack.
 */
final class RankPublish_Site_Branding {

	/**
	 * @var string[]
	 */
	private const TEXT_DOMAINS = array(
		'wp-scheduled-posts',
		'wp-scheduled-posts-pro',
		'thinkrank',
		'thinkrank-pro',
	);

	/**
	 * @var string[]
	 */
	private const PLUGIN_FILES = array(
		'wp-scheduled-posts/wp-scheduled-posts.php',
		'wp-scheduled-posts-pro/wp-scheduled-posts-pro.php',
		'thinkrank/thinkrank.php',
		'thinkrank-pro/thinkrank-pro.php',
		'rankpublish/rankpublish.php',
	);

	/**
	 * Register hooks.
	 */
	public function init(): void {
		$settings = RankPublish_Site_Merge_Registry::settings();
		if ( empty( $settings['branding_enabled'] ) ) {
			return;
		}

		add_filter( 'plugins_url', array( $this, 'filter_upstream_logo_assets' ), 20, 2 );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_license_assets' ), 9 );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_admin_assets' ), 999 );
		add_action( 'admin_footer', array( $this, 'print_admin_assets_fallback' ), 1 );
		add_action( 'admin_menu', array( $this, 'rename_upstream_menus' ), 9999 );
		add_filter( 'admin_body_class', array( $this, 'body_class' ) );
		add_filter( 'gettext', array( $this, 'filter_gettext' ), 20, 3 );
		add_filter( 'plugin_row_meta', array( $this, 'filter_plugin_row_meta' ), 99, 2 );
		add_filter( 'plugin_action_links', array( $this, 'filter_plugin_action_links_all' ), 999, 2 );
		add_filter( 'wpsp_layout_tabs', array( $this, 'filter_license_tabs' ), 99 );

		foreach ( self::PLUGIN_FILES as $file ) {
			add_filter( 'plugin_action_links_' . $file, array( $this, 'filter_plugin_action_links' ), 999 );
		}
		if ( defined( 'RANKPUBLISH_BASENAME' ) ) {
			add_filter( 'plugin_action_links_' . RANKPUBLISH_BASENAME, array( $this, 'filter_plugin_action_links' ), 999 );
		}
	}

	/**
	 * Shared branding asset base URL.
	 */
	public static function url( string $file ): string {
		return RPSITE_URL . 'assets/branding/' . ltrim( $file, '/' ) . '?v=' . RPSITE_VERSION;
	}

	/**
	 * @param string $classes Admin body classes.
	 */
	public function body_class( string $classes ): string {
		return trim( $classes . ' rankpublish-site-branded' );
	}

	/**
	 * Redirect upstream logo asset URLs to RankPublish branding files.
	 *
	 * @param string $url  Full asset URL.
	 * @param string $path Relative path inside plugin.
	 */
	public function filter_upstream_logo_assets( string $url, string $path ): string {
		if ( ! is_admin() ) {
			return $url;
		}

		if ( preg_match( '#/(wpsp-logo(?:-full)?|wpsp-icon|wpps-icon|wpsp-dark|wpsp-el-editor-modal-logo|wpsp|thinkrank-logo|thinkrank-icon|rankpublish-menu|tr-logo)\.(svg|png)$#i', $path ) ) {
			if ( str_contains( $path, 'logo-full' ) || str_contains( $path, 'full' ) ) {
				return self::url( 'logo-full.svg' );
			}

			return self::url( 'logo-menu.svg' );
		}

		return $url;
	}

	/**
	 * Replace vendor names in admin copy.
	 *
	 * @param string $translation Translated text.
	 * @param string $text        Original text.
	 * @param string $domain      Text domain.
	 */
	public function filter_gettext( string $translation, string $text, string $domain ): string {
		if ( ! is_admin() || ! in_array( $domain, self::TEXT_DOMAINS, true ) ) {
			return $translation;
		}
		if ( preg_match( '/copyright|gpl[v\s-]|gnu general public|all rights reserved/i', $text . $translation ) ) {
			return $translation;
		}

		return str_replace(
			array( 'SchedulePress Pro', 'SchedulePress', 'ThinkRank Pro', 'ThinkRank', 'WP Scheduled Posts Pro', 'WP Scheduled Posts', 'WPDeveloper' ),
			array( 'RankPublish', 'RankPublish', 'RankPublish', 'RankPublish', 'RankPublish', 'RankPublish', 'RankPublish' ),
			$translation
		);
	}

	/**
	 * Rename leftover upstream top-level menus.
	 */
	public function rename_upstream_menus(): void {
		global $menu, $submenu;

		if ( is_array( $menu ) ) {
			foreach ( $menu as $index => $item ) {
				$slug = isset( $item[2] ) ? (string) $item[2] : '';
				if ( 'thinkrank' === $slug ) {
					$menu[ $index ][0] = __( 'RankPublish SEO', 'rankpublish-site' );
				}
				if ( 'schedulepress' === $slug ) {
					$menu[ $index ][0] = __( 'RankPublish Scheduler', 'rankpublish-site' );
				}
			}
		}

		if ( isset( $submenu['thinkrank'] ) && is_array( $submenu['thinkrank'] ) ) {
			foreach ( $submenu['thinkrank'] as $index => $item ) {
				$slug = isset( $item[2] ) ? explode( '&', (string) $item[2], 2 )[0] : '';
				if ( 'thinkrank-license' === $slug ) {
					$submenu['thinkrank'][ $index ][0] = __( 'Account / License', 'rankpublish-site' );
				}
			}
		}

		if ( isset( $submenu['schedulepress'] ) && is_array( $submenu['schedulepress'] ) ) {
			foreach ( $submenu['schedulepress'] as $index => $item ) {
				$label = isset( $item[0] ) ? wp_strip_all_tags( (string) $item[0] ) : '';
				if ( preg_match( '/license/i', $label ) ) {
					$submenu['schedulepress'][ $index ][0] = __( 'Account / License', 'rankpublish-site' );
				}
			}
		}
	}

	/**
	 * Catch-all for late "Go Pro" links on related plugin rows.
	 *
	 * @param string[] $links Plugin action links.
	 * @param string   $file  Plugin basename.
	 * @return string[]
	 */
	public function filter_plugin_action_links_all( array $links, string $file ): array {
		$ours = in_array( $file, self::PLUGIN_FILES, true )
			|| ( defined( 'RANKPUBLISH_BASENAME' ) && RANKPUBLISH_BASENAME === $file );
		if ( ! $ours ) {
			return $links;
		}
		return $this->filter_plugin_action_links( $links );
	}

	/**
	 * Strip vendor upsell links; replace duplicate Go Pro with one RankPublish account link.
	 *
	 * @param string[] $links Plugin action links.
	 * @return string[]
	 */
	public function filter_plugin_action_links( array $links ): array {
		$kept       = array();
		$had_vendor = false;
		foreach ( $links as $link ) {
			$html = (string) $link;
			if ( preg_match( '/RankPublish account/i', $html ) ) {
				$kept[] = $link;
				continue;
			}
			if ( preg_match( '/wpdeveloper\.com|schedulepress\.com|thinkrank\.ai/i', $html ) ) {
				$had_vendor = true;
				continue;
			}
			if ( preg_match( '/>\s*Go Pro\s*</i', $html ) ) {
				$had_vendor = true;
				continue;
			}
			$kept[] = $link;
		}

		if ( $had_vendor ) {
			$already = false;
			foreach ( $kept as $link ) {
				if ( preg_match( '/RankPublish account/i', (string) $link ) ) {
					$already = true;
					break;
				}
			}
			if ( ! $already ) {
				$cloud  = rpsite_cloud_url();
				$kept[] = '<a href="' . esc_url( $cloud . '/register' ) . '">' . esc_html__( 'RankPublish account', 'rankpublish-site' ) . '</a>';
			}
		}

		return $kept;
	}

	/**
	 * @param string[] $links Row meta links.
	 * @param string   $file  Plugin basename.
	 * @return string[]
	 */
	public function filter_plugin_row_meta( array $links, string $file ): array {
		$ours = in_array( $file, self::PLUGIN_FILES, true )
			|| ( defined( 'RANKPUBLISH_BASENAME' ) && RANKPUBLISH_BASENAME === $file );
		if ( ! $ours ) {
			return $links;
		}

		$kept = array();
		foreach ( $links as $link ) {
			if ( preg_match( '/wpdeveloper\.com|schedulepress\.com|thinkrank\.ai/i', (string) $link ) ) {
				continue;
			}
			$kept[] = $link;
		}

		return $kept;
	}

	/**
	 * Drop the WPDeveloper walkthrough video from the SchedulePress license tab.
	 *
	 * @param array<string, mixed> $tabs Layout tabs.
	 * @return array<string, mixed>
	 */
	public function filter_license_tabs( array $tabs ): array {
		if ( isset( $tabs['layout_license']['fields']['license_wrapper']['fields']['advance_video'] ) ) {
			unset( $tabs['layout_license']['fields']['license_wrapper']['fields']['advance_video'] );
		}
		return $tabs;
	}

	/**
	 * Load ThinkRank Pro license assets even if the page hook parent changed.
	 *
	 * @param string $hook_suffix Admin hook suffix.
	 */
	public function enqueue_license_assets( string $hook_suffix ): void {
		unset( $hook_suffix );
		$page = isset( $_GET['page'] ) ? sanitize_key( (string) wp_unslash( $_GET['page'] ) ) : '';
		if ( 'thinkrank-license' !== $page ) {
			return;
		}
		if ( wp_script_is( 'thinkrank-pro-license', 'enqueued' ) ) {
			return;
		}
		if ( ! defined( 'THINKRANK_PRO_PLUGIN_DIR' ) || ! defined( 'THINKRANK_PRO_PLUGIN_URL' ) ) {
			return;
		}

		$asset_file = THINKRANK_PRO_PLUGIN_DIR . 'assets/license.asset.php';
		if ( ! is_readable( $asset_file ) ) {
			return;
		}

		$asset = require $asset_file;
		if ( ! is_array( $asset ) ) {
			return;
		}

		wp_enqueue_style(
			'thinkrank-pro-license',
			THINKRANK_PRO_PLUGIN_URL . 'assets/license.css',
			array(),
			(string) ( $asset['version'] ?? '1' )
		);
		wp_enqueue_script(
			'thinkrank-pro-license',
			THINKRANK_PRO_PLUGIN_URL . 'assets/license.js',
			isset( $asset['dependencies'] ) && is_array( $asset['dependencies'] ) ? $asset['dependencies'] : array(),
			(string) ( $asset['version'] ?? '1' ),
			true
		);
	}

	/**
	 * Enqueue menu icon override + React admin overrides (late priority).
	 *
	 * @param string $hook_suffix Admin hook suffix.
	 */
	public function enqueue_admin_assets( string $hook_suffix ): void {
		unset( $hook_suffix );

		$icon  = esc_url( self::url( 'logo-menu.svg' ) );
		$cloud = rpsite_cloud_url();
		$css   = '
			#adminmenu .toplevel_page_schedulepress .wp-menu-image,
			#adminmenu .toplevel_page_thinkrank .wp-menu-image,
			#adminmenu .toplevel_page_rankpublish .wp-menu-image,
			#adminmenu .toplevel_page_rankpublish-core .wp-menu-image {
				background-image: url("' . $icon . '") !important;
				background-size: 20px 20px !important;
				background-repeat: no-repeat !important;
				background-position: center 6px !important;
			}
			#adminmenu .toplevel_page_schedulepress .wp-menu-image img,
			#adminmenu .toplevel_page_thinkrank .wp-menu-image img,
			#adminmenu .toplevel_page_rankpublish .wp-menu-image img,
			#adminmenu .toplevel_page_rankpublish-core .wp-menu-image img,
			#adminmenu .toplevel_page_schedulepress .wp-menu-image::before,
			#adminmenu .toplevel_page_thinkrank .wp-menu-image::before,
			#adminmenu .toplevel_page_rankpublish .wp-menu-image::before,
			#adminmenu .toplevel_page_rankpublish-core .wp-menu-image::before {
				display: none !important;
				width: 0 !important;
				height: 0 !important;
				padding: 0 !important;
				margin: 0 !important;
				overflow: hidden !important;
			}
		';

		wp_register_style( 'rankpublish-site-branding', false, array(), RPSITE_VERSION );
		wp_enqueue_style( 'rankpublish-site-branding' );
		wp_add_inline_style( 'rankpublish-site-branding', $css );

		wp_enqueue_style(
			'rankpublish-site-admin-overrides',
			self::url( 'admin-overrides.css' ),
			array(),
			RPSITE_VERSION
		);
		wp_enqueue_script(
			'rankpublish-site-admin-overrides',
			self::url( 'admin-overrides.js' ),
			array(),
			RPSITE_VERSION,
			true
		);
		wp_localize_script(
			'rankpublish-site-admin-overrides',
			'rankpublishSiteBrand',
			array(
				'logoUrl'      => self::url( 'logo.svg' ),
				'logoFullUrl'  => self::url( 'logo-full.svg' ),
				'name'         => 'RankPublish',
				'cloudUrl'     => $cloud,
				'plansUrl'     => $cloud . '/register',
				'guideUrl'     => $cloud . '/guide/',
				'isModuleWrap' => class_exists( 'RankPublish_Site_Module_Embed', false ) && RankPublish_Site_Module_Embed::is_os_wrapped_request(),
			)
		);
	}

	/**
	 * SchedulePress dequeues other admin scripts on its React settings screen.
	 */
	public function print_admin_assets_fallback(): void {
		if ( ! is_admin() ) {
			return;
		}
		if ( wp_script_is( 'rankpublish-site-admin-overrides', 'done' ) ) {
			return;
		}
		if ( ! wp_script_is( 'rankpublish-site-admin-overrides', 'registered' ) ) {
			return;
		}

		wp_print_styles( array( 'rankpublish-site-branding', 'rankpublish-site-admin-overrides' ) );
		wp_print_scripts( 'rankpublish-site-admin-overrides' );
	}
}
