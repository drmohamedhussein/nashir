<?php
/**
 * Customer-site engine chrome for SchedulePress and ThinkRank.
 *
 * These engines belong to this WordPress origin. RankPublish HQ is never the customer path.
 *
 * @package RankPublish
 */

declare(strict_types=1);

namespace RankPublish\Connector;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Banner and optional wrap around local publishing / SEO engines.
 */
final class Engine_Shell {

	public const FLAG = 'rp_os';

	/**
	 * @var bool
	 */
	private static $buffer_attached = false;

	public function register(): void {
		add_action( 'admin_notices', array( $this, 'banner' ), 1 );
		add_action( 'current_screen', array( $this, 'maybe_wrap' ), 1 );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue' ) );
		add_filter( 'admin_body_class', array( $this, 'body_class' ) );
	}

	public function banner(): void {
		if ( ! self::is_engine_page() ) {
			return;
		}

		$home = home_url();
		echo '<div class="notice notice-info rankpublish-engine-banner"><p>';
		echo esc_html(
			sprintf(
				/* translators: %s: this site home URL */
				__( 'These RankPublish engines run on this WordPress site (%s). This is not RankPublish HQ. Cloud calendar and SEO lists stay in your RankPublish account.', 'rankpublish' ),
				$home
			)
		);
		echo '</p></div>';
	}

	public function maybe_wrap(): void {
		if ( wp_doing_ajax() || ! self::is_wrapped_request() || ! self::is_engine_page() ) {
			return;
		}
		$this->attach_output_buffer();
	}

	/**
	 * @param string $classes Admin body classes.
	 */
	public function body_class( string $classes ): string {
		if ( self::is_engine_page() ) {
			$classes .= ' rankpublish-engine-shell';
		}
		if ( self::is_wrapped_request() ) {
			$classes .= ' rankpublish-engine-shell--wrap';
		}
		return $classes;
	}

	public function enqueue(): void {
		if ( ! self::is_engine_page() || ! defined( 'RANKPUBLISH_URL' ) ) {
			return;
		}

		$version = defined( 'RANKPUBLISH_VERSION' ) ? RANKPUBLISH_VERSION : RANKPUBLISH_CONNECTOR_VERSION;
		wp_enqueue_style(
			'rankpublish-engine-shell',
			RANKPUBLISH_URL . 'assets/engine-shell.css',
			array(),
			$version
		);
	}

	private function attach_output_buffer(): void {
		if ( self::$buffer_attached ) {
			return;
		}

		$hook = isset( $GLOBALS['hook_suffix'] ) ? (string) $GLOBALS['hook_suffix'] : '';
		if ( '' === $hook ) {
			$hook = isset( $GLOBALS['page_hook'] ) ? (string) $GLOBALS['page_hook'] : '';
		}
		if ( '' === $hook ) {
			return;
		}

		self::$buffer_attached = true;
		add_action( $hook, array( self::class, 'buffer_start' ), 0 );
		add_action( $hook, array( self::class, 'buffer_finish' ), PHP_INT_MAX );
	}

	public static function buffer_start(): void {
		ob_start();
	}

	public static function buffer_finish(): void {
		$content = ob_get_clean();
		if ( ! is_string( $content ) ) {
			$content = '';
		}

		$page  = isset( $_GET['page'] ) ? sanitize_key( (string) wp_unslash( $_GET['page'] ) ) : '';
		$tabs  = self::tabs_for_page( $page );
		$home  = home_url();

		echo '<div class="rp-engine-shell">';
		echo '<div class="rp-engine-shell__bar">';
		echo '<strong>' . esc_html__( 'RankPublish engines', 'rankpublish' ) . '</strong>';
		echo '<span>' . esc_html(
			sprintf(
				/* translators: %s: this site home URL */
				__( 'Running on %s — not RankPublish HQ.', 'rankpublish' ),
				$home
			)
		) . '</span>';
		echo '</div>';
		if ( array() !== $tabs ) {
			echo '<nav class="rp-engine-shell__tabs">';
			foreach ( $tabs as $tab ) {
				$url    = add_query_arg(
					array(
						'page'       => $tab['page'],
						self::FLAG   => '1',
					),
					admin_url( 'admin.php' )
				);
				$active = $page === $tab['page'] ? ' is-active' : '';
				echo '<a class="' . esc_attr( $active ) . '" href="' . esc_url( $url ) . '">' . esc_html( $tab['label'] ) . '</a>';
			}
			echo '</nav>';
		}
		echo '<div class="rp-engine-shell__body">';
		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- upstream admin HTML.
		echo $content;
		echo '</div></div>';
	}

	public static function is_wrapped_request(): bool {
		return isset( $_GET[ self::FLAG ] ) && '1' === (string) wp_unslash( $_GET[ self::FLAG ] );
	}

	public static function is_engine_page(): bool {
		$page = isset( $_GET['page'] ) ? sanitize_key( (string) wp_unslash( $_GET['page'] ) ) : '';
		return in_array( $page, self::engine_pages(), true );
	}

	/**
	 * @return list<string>
	 */
	private static function engine_pages(): array {
		return array(
			'schedulepress',
			'schedulepress-calendar',
			'thinkrank',
			'thinkrank-essential-seo',
			'thinkrank-ai-tools',
			'thinkrank-usages',
			'thinkrank-settings',
			'thinkrank-license',
			'thinkrank-migration',
		);
	}

	/**
	 * @return list<array{label: string, page: string}>
	 */
	private static function tabs_for_page( string $page ): array {
		$publish = array(
			array(
				'label' => __( 'Scheduler', 'rankpublish' ),
				'page'  => 'schedulepress',
			),
			array(
				'label' => __( 'Calendar', 'rankpublish' ),
				'page'  => 'schedulepress-calendar',
			),
		);
		$seo     = array(
			array(
				'label' => __( 'SEO Dashboard', 'rankpublish' ),
				'page'  => 'thinkrank',
			),
			array(
				'label' => __( 'Essential SEO', 'rankpublish' ),
				'page'  => 'thinkrank-essential-seo',
			),
			array(
				'label' => __( 'AI Tools', 'rankpublish' ),
				'page'  => 'thinkrank-ai-tools',
			),
			array(
				'label' => __( 'Usages', 'rankpublish' ),
				'page'  => 'thinkrank-usages',
			),
			array(
				'label' => __( 'SEO Settings', 'rankpublish' ),
				'page'  => 'thinkrank-settings',
			),
			array(
				'label' => __( 'Account', 'rankpublish' ),
				'page'  => 'thinkrank-license',
			),
		);

		if ( str_starts_with( $page, 'schedulepress' ) ) {
			return $publish;
		}
		if ( str_starts_with( $page, 'thinkrank' ) ) {
			return $seo;
		}
		return array();
	}
}
