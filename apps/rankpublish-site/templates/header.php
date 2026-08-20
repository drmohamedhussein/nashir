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

$lang        = rpsite_locale();
$cloud       = rpsite_cloud_url();
$os_home     = is_front_page();
$start       = $cloud ? $cloud . '/register' : rpsite_plugin_zip_url();
$login       = $cloud ? $cloud . '/login' : '';
$body_os     = $os_home ? ' rp-os' : ' rp-os-inner';
$mkt         = class_exists( 'RankPublish_Site_Marketing' ) ? RankPublish_Site_Marketing::get() : array();
$show_promo  = ! $os_home && ! empty( $mkt['promo_enabled'] );
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
<?php if ( $show_promo ) : ?>
<div class="promo-bar">
	<?php echo esc_html( rpsite_t( 'promo' ) ); ?>
	<a href="<?php echo esc_url( $start ); ?>"><?php echo esc_html( rpsite_t( 'cta_start' ) ); ?></a>
</div>
<?php endif; ?>
<header class="site-header<?php echo $os_home ? ' os-header' : ''; ?>">
	<div class="wrap inner">
		<a class="brand os-brand" href="<?php echo esc_url( home_url( '/' ) ); ?>">
			<img class="brand-logo" src="<?php echo esc_url( rpsite_logo_url() ); ?>" width="36" height="36" alt="<?php echo esc_attr( rpsite_t( 'brand' ) ); ?>" />
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
				<a href="<?php echo esc_url( home_url( '/features/' ) ); ?>"><?php echo esc_html( rpsite_t( 'nav_features' ) ); ?></a>
				<a href="<?php echo esc_url( home_url( '/pricing/' ) ); ?>"><?php echo esc_html( rpsite_t( 'nav_pricing' ) ); ?></a>
				<a href="<?php echo esc_url( home_url( '/download/' ) ); ?>"><?php echo esc_html( rpsite_t( 'nav_plugin' ) ); ?></a>
				<a href="<?php echo esc_url( home_url( '/guide/' ) ); ?>"><?php echo esc_html( rpsite_t( 'nav_guide' ) ); ?></a>
			<?php endif; ?>
		</nav>
		<div class="nav-end">
			<?php if ( $login ) : ?>
				<a class="os-login" href="<?php echo esc_url( $login ); ?>"><?php echo esc_html( rpsite_t( 'cta_login' ) ); ?></a>
			<?php endif; ?>
			<a class="btn <?php echo $os_home ? 'btn-os' : 'btn-sky'; ?>" href="<?php echo esc_url( $start ); ?>"><?php echo esc_html( rpsite_t( 'cta_started' ) ); ?></a>
			<span class="lang-switch" aria-label="Language">
				<a class="lang<?php echo 'en' === $lang ? ' is-active' : ''; ?>" href="<?php echo esc_url( add_query_arg( 'lang', 'en' ) ); ?>">EN</a>
				<span class="lang-sep">/</span>
				<a class="lang<?php echo 'ar' === $lang ? ' is-active' : ''; ?>" href="<?php echo esc_url( add_query_arg( 'lang', 'ar' ) ); ?>">عربي</a>
			</span>
		</div>
	</div>
</header>
<main>
