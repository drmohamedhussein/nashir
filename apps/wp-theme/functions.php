<?php
/**
 * PublisherWP official theme.
 *
 * @package PublisherWP
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function nashir_locale(): string {
	$lang = isset( $_GET['lang'] ) ? sanitize_key( (string) wp_unslash( $_GET['lang'] ) ) : '';
	if ( in_array( $lang, array( 'ar', 'en' ), true ) ) {
		setcookie( 'nashir_lang', $lang, time() + YEAR_IN_SECONDS, COOKIEPATH ?: '/', COOKIE_DOMAIN, is_ssl(), true );
		$_COOKIE['nashir_lang'] = $lang;
		return $lang;
	}
	if ( isset( $_COOKIE['nashir_lang'] ) && in_array( $_COOKIE['nashir_lang'], array( 'ar', 'en' ), true ) ) {
		return (string) $_COOKIE['nashir_lang'];
	}
	return 'en';
}

require_once get_template_directory() . '/includes/i18n.php';
require_once get_template_directory() . '/includes/mocks.php';

function nashir_setup(): void {
	add_theme_support( 'title-tag' );
	add_theme_support( 'post-thumbnails' );
	add_theme_support( 'html5', array( 'search-form', 'comment-form', 'gallery', 'caption', 'style', 'script' ) );
}
add_action( 'after_setup_theme', 'nashir_setup' );

function nashir_assets(): void {
	$ver = (string) wp_get_theme()->get( 'Version' );
	wp_enqueue_style( 'nashir-font', 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap', array(), null );
	wp_enqueue_style( 'nashir-style', get_stylesheet_uri(), array( 'nashir-font' ), $ver );
	wp_enqueue_script( 'nashir-theme', get_template_directory_uri() . '/assets/theme.js', array(), $ver, true );
}
add_action( 'wp_enqueue_scripts', 'nashir_assets' );

function nashir_trim_core_styles(): void {
	wp_dequeue_style( 'wp-block-library' );
	wp_dequeue_style( 'global-styles' );
	wp_dequeue_style( 'classic-theme-styles' );
}
add_action( 'wp_enqueue_scripts', 'nashir_trim_core_styles', 100 );

function nashir_language_attributes(): string {
	$lang = nashir_locale();
	return 'lang="' . esc_attr( $lang ) . '" dir="' . esc_attr( 'en' === $lang ? 'ltr' : 'rtl' ) . '"';
}
add_filter( 'language_attributes', 'nashir_language_attributes' );

function nashir_plugin_zip_url(): string {
	$path = WP_CONTENT_DIR . '/uploads/nashir/nashir.zip';
	return file_exists( $path ) ? content_url( 'uploads/nashir/nashir.zip' ) : home_url( '/download/' );
}

function nashir_cloud_url(): string {
	return untrailingslashit( (string) get_option( 'nashir_cloud_url', '' ) );
}

function nashir_art( string $file ): string {
	$rel = '/assets/art/' . ltrim( $file, '/' );
	if ( ! file_exists( get_template_directory() . $rel ) ) {
		return '';
	}
	return get_template_directory_uri() . $rel;
}

function nashir_customizer( WP_Customize_Manager $wp_customize ): void {
	$wp_customize->add_section( 'nashir_cloud', array( 'title' => 'PublisherWP cloud' ) );
	$wp_customize->add_setting( 'nashir_cloud_url', array( 'type' => 'option', 'sanitize_callback' => 'esc_url_raw' ) );
	$wp_customize->add_control(
		'nashir_cloud_url',
		array(
			'label'   => 'PublisherWP app URL',
			'section' => 'nashir_cloud',
			'type'    => 'url',
		)
	);
}
add_action( 'customize_register', 'nashir_customizer' );

/**
 * @return array<int, array<string, string>>
 */
function nashir_platforms(): array {
	return array(
		array( 'name' => 'Facebook', 'copy' => nashir_t( 'pfb' ) ),
		array( 'name' => 'X', 'copy' => nashir_t( 'px' ) ),
		array( 'name' => 'LinkedIn', 'copy' => nashir_t( 'pli' ) ),
		array( 'name' => 'Pinterest', 'copy' => nashir_t( 'ppi' ) ),
		array( 'name' => 'Instagram', 'copy' => nashir_t( 'pig' ) ),
		array( 'name' => 'Medium', 'copy' => nashir_t( 'pmd' ) ),
		array( 'name' => 'Threads', 'copy' => nashir_t( 'pth' ) ),
		array( 'name' => 'Google Business', 'copy' => nashir_t( 'pgb' ) ),
	);
}
