<?php
/**
 * RankPublish Site helpers.
 *
 * @package RankPublishSite
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Public locale (en|ar).
 */
function rpsite_locale(): string {
	$lang = isset( $_GET['lang'] ) ? sanitize_key( (string) wp_unslash( $_GET['lang'] ) ) : '';
	if ( in_array( $lang, array( 'ar', 'en' ), true ) ) {
		setcookie( 'rpsite_lang', $lang, time() + YEAR_IN_SECONDS, COOKIEPATH ?: '/', COOKIE_DOMAIN, is_ssl(), true );
		$_COOKIE['rpsite_lang'] = $lang;
		return $lang;
	}
	if ( isset( $_COOKIE['rpsite_lang'] ) && in_array( $_COOKIE['rpsite_lang'], array( 'ar', 'en' ), true ) ) {
		return (string) $_COOKIE['rpsite_lang'];
	}
	return 'en';
}

function rpsite_t( string $key ): string {
	$all = rpsite_i18n();
	if ( isset( $all[ $key ] ) ) {
		return $all[ $key ];
	}
	$en = rpsite_en();
	return $en[ $key ] ?? $key;
}

function rpsite_plugin_zip_url(): string {
	$path = WP_CONTENT_DIR . '/uploads/rankpublish/rankpublish.zip';
	return file_exists( $path ) ? content_url( 'uploads/rankpublish/rankpublish.zip' ) : home_url( '/download/' );
}

function rpsite_cloud_url(): string {
	$staging = 'https://nashir.satest.top';
	$host    = (string) wp_parse_url( home_url(), PHP_URL_HOST );
	$local   = $host && ( str_ends_with( $host, '.local' ) || 'localhost' === $host );

	$stored = untrailingslashit( (string) get_option( 'rankpublish_cloud_url', '' ) );
	if ( '' !== $stored ) {
		$stored_host = (string) wp_parse_url( $stored, PHP_URL_HOST );
		if ( $local && in_array( $stored_host, array( 'rankpublish.com', 'www.rankpublish.com' ), true ) ) {
			return $staging;
		}
		return $stored;
	}
	$settings = class_exists( 'RankPublish_Site_Merge_Registry' )
		? RankPublish_Site_Merge_Registry::settings()
		: array();
	$cloud = untrailingslashit( (string) ( $settings['cloud_url'] ?? '' ) );
	if ( '' !== $cloud ) {
		return $cloud;
	}
	return $local ? $staging : $staging;
}

function rpsite_logo_url(): string {
	return RPSITE_URL . 'assets/logo.svg';
}

function rpsite_art( string $file ): string {
	$rel = 'assets/art/' . ltrim( $file, '/' );
	if ( ! file_exists( RPSITE_PATH . $rel ) ) {
		return '';
	}
	return RPSITE_URL . $rel;
}

/**
 * @return array<int, array<string, string>>
 */
function rpsite_platforms(): array {
	return array(
		array( 'name' => 'Facebook', 'copy' => rpsite_t( 'pfb' ) ),
		array( 'name' => 'X', 'copy' => rpsite_t( 'px' ) ),
		array( 'name' => 'LinkedIn', 'copy' => rpsite_t( 'pli' ) ),
		array( 'name' => 'Pinterest', 'copy' => rpsite_t( 'ppi' ) ),
		array( 'name' => 'Instagram', 'copy' => rpsite_t( 'pig' ) ),
		array( 'name' => 'Medium', 'copy' => rpsite_t( 'pmd' ) ),
		array( 'name' => 'Threads', 'copy' => rpsite_t( 'pth' ) ),
		array( 'name' => 'Google Business', 'copy' => rpsite_t( 'pgb' ) ),
	);
}

/**
 * Marketing page slugs owned by this plugin.
 *
 * @return string[]
 */
function rpsite_page_slugs(): array {
	return array(
		'pricing',
		'features',
		'social',
		'download',
		'guide',
		'faq',
		'about',
		'changelog',
		'contact',
		'privacy',
		'terms',
		'calendar',
		'scheduling',
	);
}

function rpsite_is_marketing(): bool {
	if ( is_admin() ) {
		return false;
	}
	if ( is_front_page() || is_home() || is_singular( 'post' ) ) {
		return true;
	}
	if ( is_page() ) {
		$slug = get_post_field( 'post_name', get_queried_object_id() );
		return in_array( $slug, rpsite_page_slugs(), true );
	}
	return false;
}
