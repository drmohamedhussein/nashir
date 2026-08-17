<?php
/**
 * Header.
 *
 * @package PublisherWP
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$lang  = nashir_locale();
$cloud = nashir_cloud_url();
?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta name="description" content="<?php echo esc_attr( nashir_t( 'hero_body' ) ); ?>">
	<?php wp_head(); ?>
</head>
<body <?php body_class( 'nashir' ); ?>>
<?php wp_body_open(); ?>
<div class="promo-bar">
	<?php echo esc_html( nashir_t( 'promo' ) ); ?>
	<?php if ( $cloud ) : ?>
		<a href="<?php echo esc_url( $cloud . '/register' ); ?>"><?php echo esc_html( nashir_t( 'cta_start' ) ); ?></a>
	<?php endif; ?>
</div>
<header class="site-header">
	<div class="wrap inner">
		<a class="brand" href="<?php echo esc_url( home_url( '/' ) ); ?>">
			<img src="<?php echo esc_url( get_template_directory_uri() . '/assets/logo.svg' ); ?>" alt="">
			PublisherWP
		</a>
		<nav class="nav-center" aria-label="<?php echo esc_attr( nashir_t( 'brand' ) ); ?>">
			<a href="<?php echo esc_url( home_url( '/#features' ) ); ?>"><?php echo esc_html( nashir_t( 'nav_features' ) ); ?></a>
			<a href="<?php echo esc_url( home_url( '/pricing/' ) ); ?>"><?php echo esc_html( nashir_t( 'nav_pricing' ) ); ?></a>
			<a href="<?php echo esc_url( get_permalink( get_option( 'page_for_posts' ) ) ?: home_url( '/blog/' ) ); ?>"><?php echo esc_html( nashir_t( 'nav_blog' ) ); ?></a>
			<a href="<?php echo esc_url( home_url( '/about/' ) ); ?>"><?php echo esc_html( nashir_t( 'nav_company' ) ); ?></a>
		</nav>
		<div class="nav-end">
			<?php if ( $cloud ) : ?>
				<a href="<?php echo esc_url( $cloud . '/login' ); ?>"><?php echo esc_html( nashir_t( 'cta_login' ) ); ?></a>
			<?php endif; ?>
			<a class="btn btn-gradient" href="<?php echo esc_url( $cloud ? $cloud . '/register' : nashir_plugin_zip_url() ); ?>"><?php echo esc_html( nashir_t( 'cta_started' ) ); ?></a>
			<a class="lang" href="<?php echo esc_url( add_query_arg( 'lang', 'en' === $lang ? 'ar' : 'en' ) ); ?>"><?php echo 'en' === $lang ? 'عربي' : 'EN'; ?></a>
		</div>
	</div>
</header>
<main>
