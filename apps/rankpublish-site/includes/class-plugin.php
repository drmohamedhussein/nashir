<?php
/**
 * RankPublish Site runtime.
 *
 * @package RankPublishSite
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Marketing site plugin.
 */
final class RankPublish_Site_Plugin {

	/**
	 * @var self|null
	 */
	private static $instance = null;

	public static function instance(): self {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	private function __construct() {}

	public function init(): void {
		add_action( 'init', array( $this, 'add_theme_supports' ), 1 );
		add_filter( 'document_title_parts', array( $this, 'document_title_parts' ) );
		add_filter( 'language_attributes', array( $this, 'language_attributes' ) );
		add_filter( 'template_include', array( $this, 'template_include' ), 99 );
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_assets' ), 5 );
		add_action( 'wp_enqueue_scripts', array( $this, 'dequeue_theme_chrome' ), 100 );
		add_action( 'customize_register', array( $this, 'customizer' ) );
		add_filter( 'show_admin_bar', array( $this, 'maybe_hide_admin_bar' ) );
	}

	public function add_theme_supports(): void {
		add_theme_support( 'title-tag' );
		add_theme_support( 'post-thumbnails' );
		add_theme_support( 'html5', array( 'search-form', 'comment-form', 'gallery', 'caption', 'style', 'script' ) );
	}

	/**
	 * @param array<string, string> $parts Title parts.
	 * @return array<string, string>
	 */
	public function document_title_parts( array $parts ): array {
		if ( rpsite_is_marketing() ) {
			$parts['site'] = 'RankPublish';
		}
		return $parts;
	}

	public function language_attributes(): string {
		$lang = rpsite_locale();
		return 'lang="' . esc_attr( $lang ) . '" dir="' . esc_attr( 'en' === $lang ? 'ltr' : 'rtl' ) . '"';
	}

	/**
	 * @param string $template Theme template.
	 */
	public function template_include( string $template ): string {
		if ( is_front_page() ) {
			return RPSITE_PATH . 'templates/home.php';
		}
		if ( is_home() ) {
			return RPSITE_PATH . 'templates/blog.php';
		}
		if ( is_singular( 'post' ) ) {
			return RPSITE_PATH . 'templates/single.php';
		}
		if ( is_page() ) {
			$slug = get_post_field( 'post_name', get_queried_object_id() );
			if ( in_array( $slug, rpsite_page_slugs(), true ) ) {
				return RPSITE_PATH . 'templates/page.php';
			}
		}
		return $template;
	}

	public function enqueue_assets(): void {
		if ( ! rpsite_is_marketing() ) {
			return;
		}
		wp_enqueue_style(
			'rpsite-font',
			'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Manrope:wght@500;600;700;800&display=swap',
			array(),
			null
		);
		wp_enqueue_style(
			'rpsite-style',
			RPSITE_URL . 'assets/site.css',
			array( 'rpsite-font' ),
			RPSITE_VERSION
		);
		wp_enqueue_script(
			'rpsite-theme',
			RPSITE_URL . 'assets/site.js',
			array(),
			RPSITE_VERSION,
			true
		);
	}

	public function dequeue_theme_chrome(): void {
		if ( ! rpsite_is_marketing() ) {
			return;
		}
		wp_dequeue_style( 'wp-block-library' );
		wp_dequeue_style( 'global-styles' );
		wp_dequeue_style( 'classic-theme-styles' );
		global $wp_styles;
		if ( ! $wp_styles ) {
			return;
		}
		foreach ( $wp_styles->queue as $handle ) {
			if ( empty( $wp_styles->registered[ $handle ]->src ) ) {
				continue;
			}
			$src = (string) $wp_styles->registered[ $handle ]->src;
			if ( false !== strpos( $src, '/themes/' ) ) {
				wp_dequeue_style( $handle );
			}
		}
	}

	/**
	 * Keep the WP admin bar for logged-in editors; hide for visitors on marketing pages.
	 *
	 * @param bool $show Current.
	 */
	public function maybe_hide_admin_bar( bool $show ): bool {
		return rpsite_is_marketing() ? false : $show;
	}

	public function customizer( WP_Customize_Manager $wp_customize ): void {
		$wp_customize->add_section( 'rankpublish_cloud', array( 'title' => 'RankPublish cloud' ) );
		$wp_customize->add_setting( 'rankpublish_cloud_url', array( 'type' => 'option', 'sanitize_callback' => 'esc_url_raw' ) );
		$wp_customize->add_control(
			'rankpublish_cloud_url',
			array(
				'label'   => 'RankPublish.com app URL (optional until SaaS)',
				'section' => 'rankpublish_cloud',
				'type'    => 'url',
			)
		);
	}

	public static function activate(): void {
		$existing = get_option( RankPublish_Site_Merge_Registry::OPTION_MERGED_VERSIONS, null );
		if ( null === $existing ) {
			RankPublish_Site_Merge_Registry::save_merged_versions(
				RankPublish_Site_Merge_Registry::merged_versions()
			);
		}

		$home_id = self::ensure_page( 'home', 'RankPublish', 'front' );
		foreach ( rpsite_page_slugs() as $slug ) {
			$title = ucfirst( str_replace( '-', ' ', $slug ) );
			self::ensure_page( $slug, $title, 'page' );
		}

		if ( $home_id ) {
			update_option( 'show_on_front', 'page' );
			update_option( 'page_on_front', $home_id );
		}

		$blog = get_page_by_path( 'blog' );
		if ( ! $blog ) {
			$blog_id = wp_insert_post(
				array(
					'post_title'  => 'Blog',
					'post_name'   => 'blog',
					'post_status' => 'publish',
					'post_type'   => 'page',
					'post_content'=> '',
				)
			);
			if ( $blog_id && ! is_wp_error( $blog_id ) ) {
				update_option( 'page_for_posts', (int) $blog_id );
			}
		} else {
			update_option( 'page_for_posts', (int) $blog->ID );
		}

		flush_rewrite_rules();
	}

	/**
	 * @return int Page ID.
	 */
	private static function ensure_page( string $slug, string $title, string $kind ): int {
		if ( 'front' === $kind ) {
			$existing = (int) get_option( 'page_on_front', 0 );
			if ( $existing && get_post_status( $existing ) ) {
				return $existing;
			}
		}
		$found = get_page_by_path( $slug );
		if ( $found instanceof WP_Post ) {
			return (int) $found->ID;
		}
		$id = wp_insert_post(
			array(
				'post_title'   => $title,
				'post_name'    => $slug,
				'post_status'  => 'publish',
				'post_type'    => 'page',
				'post_content' => '',
			)
		);
		return is_wp_error( $id ) ? 0 : (int) $id;
	}
}
