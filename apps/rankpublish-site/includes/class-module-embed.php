<?php
/**
 * Embed upstream SchedulePress / ThinkRank admin UIs inside RankPublish Core pages.
 *
 * @package RankPublishSite
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Iframe tabs for the four GPL source plugins on the dev stack.
 */
final class RankPublish_Site_Module_Embed {

	public const QUERY_FLAG = 'rpsite_embed';

	/**
	 * Register embed frame chrome (minimal wp-admin inside iframe).
	 */
	public function init(): void {
		add_filter( 'admin_body_class', array( $this, 'embed_body_class' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'embed_frame_assets' ) );
	}

	/**
	 * @param string $classes Body classes.
	 */
	public function embed_body_class( string $classes ): string {
		if ( $this->is_embed_request() ) {
			$classes .= ' rpsite-embed-frame';
		}
		return $classes;
	}

	/**
	 * @param string $hook Admin hook.
	 */
	public function embed_frame_assets( string $hook ): void {
		unset( $hook );
		if ( ! $this->is_embed_request() ) {
			return;
		}
		wp_enqueue_style(
			'rankpublish-site-admin',
			RPSITE_URL . 'assets/admin.css',
			array(),
			RPSITE_VERSION
		);
		wp_add_inline_style(
			'rankpublish-site-admin',
			'body.rpsite-embed-frame #adminmenuback,body.rpsite-embed-frame #adminmenuwrap,body.rpsite-embed-frame #wpadminbar,body.rpsite-embed-frame #wpfooter{display:none!important}body.rpsite-embed-frame #wpcontent,body.rpsite-embed-frame #wpbody-content{margin-left:0!important;padding:16px 20px 24px!important}body.rpsite-embed-frame .notice,body.rpsite-embed-frame .update-nag{margin:0 0 12px}'
		);
	}

	/**
	 * @return list<array{id: string, label: string, page: string, plugin: string, pro: bool}>
	 */
	public static function scheduler_panels(): array {
		$panels = array();

		if ( self::schedule_stack_ready() ) {
			$panels[] = array(
				'id'     => 'schedulepress',
				'label'  => __( 'SchedulePress', 'rankpublish-site' ),
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
				'id'     => 'schedulepress-pro',
				'label'  => __( 'SchedulePress Pro', 'rankpublish-site' ),
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
				'id'     => 'thinkrank',
				'label'  => __( 'ThinkRank', 'rankpublish-site' ),
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
				'id'     => 'thinkrank-pro',
				'label'  => __( 'ThinkRank Pro', 'rankpublish-site' ),
				'page'   => 'thinkrank',
				'plugin' => 'thinkrank-pro',
				'pro'    => true,
			);
		}

		return $panels;
	}

	/**
	 * @param list<array{id: string, label: string, page: string, plugin: string, pro: bool}> $panels Panels.
	 * @param string                                                                          $context scheduler|seo.
	 */
	public static function render_workspace( array $panels, string $context ): void {
		if ( array() === $panels ) {
			self::render_missing_stack( $context );
			return;
		}

		$active = isset( $_GET['embed'] ) ? sanitize_key( (string) wp_unslash( $_GET['embed'] ) ) : '';
		if ( '' === $active || ! self::panel_exists( $panels, $active ) ) {
			$active = (string) $panels[0]['id'];
		}

		echo '<section class="rpsite-os-card rpsite-os-card--flush rpsite-os-embed-wrap">';
		self::render_plugin_status( $context );
		echo '<div class="rpsite-os-embed-tabs" role="tablist" aria-label="' . esc_attr__( 'Module views', 'rankpublish-site' ) . '">';
		foreach ( $panels as $panel ) {
			$url   = self::host_url( (string) $panel['id'] );
			$is_on = $active === $panel['id'];
			printf(
				'<a class="rpsite-os-embed-tab%s" role="tab" aria-selected="%s" href="%s"><span>%s</span>%s</a>',
				$is_on ? ' is-active' : '',
				$is_on ? 'true' : 'false',
				esc_url( $url ),
				esc_html( (string) $panel['label'] ),
				! empty( $panel['pro'] ) ? '<em class="rpsite-os-embed-tab__pro">Pro</em>' : ''
			);
		}
		echo '</div>';

		foreach ( $panels as $panel ) {
			if ( $active !== $panel['id'] ) {
				continue;
			}
			$src = self::iframe_url( (string) $panel['page'] );
			printf(
				'<iframe class="rpsite-os-embed-frame" title="%s" src="%s" loading="lazy"></iframe>',
				esc_attr( (string) $panel['label'] ),
				esc_url( $src )
			);
		}

		echo '</section>';
	}

	/**
	 * @param string $context Context key.
	 */
	private static function render_missing_stack( string $context ): void {
		$dev_url = admin_url( 'admin.php?page=rankpublish-core-stack' );
		$msg     = 'scheduler' === $context
			? __( 'Activate SchedulePress and SchedulePress Pro on this site to load the scheduler interfaces here.', 'rankpublish-site' )
			: __( 'Activate ThinkRank and ThinkRank Pro on this site to load the SEO interfaces here.', 'rankpublish-site' );

		echo '<section class="rpsite-os-card"><div class="rpsite-os-empty">';
		echo '<strong>' . esc_html__( 'Upstream plugins not active', 'rankpublish-site' ) . '</strong>';
		echo '<p>' . esc_html( $msg ) . '</p>';
		if ( RankPublish_Site_Admin_Os::is_dev_mode() ) {
			printf(
				'<p><a class="rpsite-os-btn rpsite-os-btn--outline" href="%s">%s</a></p>',
				esc_url( $dev_url ),
				esc_html__( 'Open dev stack', 'rankpublish-site' )
			);
		}
		echo '</div></section>';
	}

	/**
	 * @param string $context scheduler|seo.
	 */
	private static function render_plugin_status( string $context ): void {
		$plugins = 'scheduler' === $context
			? array(
				'wp-scheduled-posts/wp-scheduled-posts.php'         => 'SchedulePress',
				'wp-scheduled-posts-pro/wp-scheduled-posts-pro.php' => 'SchedulePress Pro',
			)
			: array(
				'thinkrank/thinkrank.php'         => 'ThinkRank',
				'thinkrank-pro/thinkrank-pro.php' => 'ThinkRank Pro',
			);

		echo '<div class="rpsite-os-embed-status">';
		foreach ( $plugins as $basename => $label ) {
			$on = self::plugin_active( $basename ) || self::merged_product_active();
			printf(
				'<span class="rpsite-os-pill rpsite-os-pill--%1$s">%2$s · %3$s</span>',
				$on ? 'succeeded' : 'failed',
				esc_html( $label ),
				$on ? esc_html__( 'Active', 'rankpublish-site' ) : esc_html__( 'Inactive', 'rankpublish-site' )
			);
		}
		echo '</div>';
	}

	/**
	 * @param list<array{id: string, label: string, page: string, plugin: string, pro: bool}> $panels Panels.
	 * @param string                                                                          $id     Panel id.
	 */
	private static function panel_exists( array $panels, string $id ): bool {
		foreach ( $panels as $panel ) {
			if ( $panel['id'] === $id ) {
				return true;
			}
		}
		return false;
	}

	private static function host_url( string $panel_id ): string {
		$page = isset( $_GET['page'] ) ? sanitize_key( (string) wp_unslash( $_GET['page'] ) ) : RankPublish_Site_Admin_Os::SLUG;
		return add_query_arg(
			array(
				'page'  => $page,
				'embed' => $panel_id,
			),
			admin_url( 'admin.php' )
		);
	}

	private static function iframe_url( string $wp_page ): string {
		return add_query_arg(
			array(
				'page'         => $wp_page,
				self::QUERY_FLAG => '1',
			),
			admin_url( 'admin.php' )
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

	private function is_embed_request(): bool {
		return isset( $_GET[ self::QUERY_FLAG ] ) && '1' === (string) wp_unslash( $_GET[ self::QUERY_FLAG ] );
	}
}
