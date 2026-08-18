<?php
/**
 * Marketing header.
 *
 * @package RankPublishSite
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$lang     = rpsite_locale();
$cloud    = rpsite_cloud_url();
$os_home  = is_front_page();
$start    = $cloud ? $cloud . '/register' : rpsite_plugin_zip_url();
$login    = $cloud ? $cloud . '/login' : '';
$toggle   = add_query_arg( 'lang', 'en' === $lang ? 'ar' : 'en' );
$body_os  = $os_home ? ' rp-os' : '';
?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta name="description" content="<?php echo esc_attr( rpsite_t( 'hero_body' ) ); ?>">
	<?php wp_head(); ?>
</head>
<body <?php body_class( 'rankpublish-site' . $body_os ); ?>>
<?php wp_body_open(); ?>
<?php if ( ! $os_home ) : ?>
<div class="promo-bar">
	<?php echo esc_html( rpsite_t( 'promo' ) ); ?>
	<a href="<?php echo esc_url( $start ); ?>"><?php echo esc_html( rpsite_t( 'cta_start' ) ); ?></a>
</div>
<?php endif; ?>
<header class="site-header<?php echo $os_home ? ' os-header' : ''; ?>">
	<div class="wrap inner">
		<a class="brand os-brand" href="<?php echo esc_url( home_url( '/' ) ); ?>">
			<span class="os-mark" aria-hidden="true">R</span>
			<span class="os-wordmark">
				<span class="os-name"><?php echo esc_html( rpsite_t( 'brand' ) ); ?></span>
				<span class="os-sub"><?php echo esc_html( rpsite_t( 'os_sub' ) ); ?></span>
			</span>
		</a>
		<nav class="nav-center" aria-label="<?php echo esc_attr( rpsite_t( 'brand' ) ); ?>">
			<?php if ( $os_home ) : ?>
				<a href="#products"><?php echo esc_html( rpsite_t( 'nav_products' ) ); ?></a>
				<a href="#workflow"><?php echo esc_html( rpsite_t( 'nav_how' ) ); ?></a>
				<a href="#plans"><?php echo esc_html( rpsite_t( 'nav_pricing' ) ); ?></a>
			<?php else : ?>
				<a href="<?php echo esc_url( home_url( '/#products' ) ); ?>"><?php echo esc_html( rpsite_t( 'nav_products' ) ); ?></a>
				<a href="<?php echo esc_url( home_url( '/#workflow' ) ); ?>"><?php echo esc_html( rpsite_t( 'nav_how' ) ); ?></a>
				<a href="<?php echo esc_url( home_url( '/pricing/' ) ); ?>"><?php echo esc_html( rpsite_t( 'nav_pricing' ) ); ?></a>
				<a href="<?php echo esc_url( get_permalink( (int) get_option( 'page_for_posts' ) ) ?: home_url( '/blog/' ) ); ?>"><?php echo esc_html( rpsite_t( 'nav_blog' ) ); ?></a>
			<?php endif; ?>
		</nav>
		<div class="nav-end">
			<?php if ( $login ) : ?>
				<a class="os-login" href="<?php echo esc_url( $login ); ?>"><?php echo esc_html( rpsite_t( 'cta_login' ) ); ?></a>
			<?php endif; ?>
			<a class="btn <?php echo $os_home ? 'btn-os' : 'btn-gradient'; ?>" href="<?php echo esc_url( $start ); ?>"><?php echo esc_html( rpsite_t( 'cta_started' ) ); ?></a>
			<a class="lang" href="<?php echo esc_url( $toggle ); ?>"><?php echo 'en' === $lang ? 'عربي' : 'EN'; ?></a>
		</div>
	</div>
</header>
<main>
