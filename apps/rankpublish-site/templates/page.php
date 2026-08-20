<?php
/**
 * Inner marketing pages — OS-consistent layout.
 *
 * @package RankPublishSite
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require RPSITE_PATH . 'templates/header.php';
$slug  = (string) get_post_field( 'post_name', get_queried_object_id() );
$cloud = rpsite_cloud_url();
$start = $cloud ? $cloud . '/register' : rpsite_plugin_zip_url();

/**
 * Page hero copy.
 *
 * @return array{0:string,1:string,2:string}
 */
$hero = static function ( string $slug ): array {
	switch ( $slug ) {
		case 'pricing':
			return array( rpsite_t( 'price_k' ), rpsite_t( 'price_h' ), rpsite_t( 'trial' ) );
		case 'features':
			return array( rpsite_t( 'features_k' ), rpsite_t( 'nav_features' ), rpsite_t( 'features_h' ) );
		case 'social':
			return array( rpsite_t( 'social_k' ), rpsite_t( 'nav_social' ), rpsite_t( 'social_b' ) );
		case 'download':
			return array( rpsite_t( 'nav_plugin' ), rpsite_t( 'dl_steps_h' ), rpsite_t( 'how1b' ) );
		case 'guide':
			return array( 'RankPublish', rpsite_t( 'nav_guide' ), rpsite_t( 'how_os_h' ) );
		case 'faq':
			return array( rpsite_t( 'nav_faq' ), rpsite_t( 'nav_faq' ), rpsite_t( 'features_h' ) );
		case 'about':
			return array( rpsite_t( 'nav_about' ), rpsite_t( 'brand' ), rpsite_t( 'tagline' ) );
		case 'changelog':
			return array( rpsite_t( 'changelog' ), rpsite_t( 'changelog' ), rpsite_t( 'os_sub' ) );
		case 'contact':
			return array( rpsite_t( 'contact' ), rpsite_t( 'contact_h' ), rpsite_t( 'contact_b' ) );
		case 'calendar':
			return array( rpsite_t( 'f1k' ), rpsite_t( 'f1t' ), rpsite_t( 'f1b' ) );
		case 'scheduling':
			return array( rpsite_t( 'f2k' ), rpsite_t( 'f2t' ), rpsite_t( 'f2b' ) );
		case 'security':
			return array( rpsite_t( 'sec_k' ), rpsite_t( 'sec_h' ), rpsite_t( 'sec_b' ) );
		case 'integrations':
			return array( rpsite_t( 'int_k' ), rpsite_t( 'int_h' ), rpsite_t( 'tools_h' ) );
		case 'privacy':
			return array( rpsite_t( 'privacy' ), rpsite_t( 'privacy' ), '' );
		case 'terms':
			return array( rpsite_t( 'terms' ), rpsite_t( 'terms' ), '' );
		default:
			return array( '', get_the_title(), '' );
	}
};

list( $kicker, $title, $lead ) = $hero( $slug );
?>
<section class="page-hero os-page-hero">
	<div class="wrap">
		<?php if ( $kicker ) : ?>
			<p class="os-pill"><?php echo esc_html( $kicker ); ?></p>
		<?php endif; ?>
		<h1><?php echo esc_html( $title ); ?></h1>
		<?php if ( $lead ) : ?>
			<p class="os-lead"><?php echo esc_html( $lead ); ?></p>
		<?php endif; ?>
	</div>
</section>

<article class="wrap prose os-page-body">
<?php
switch ( $slug ) {
	case 'pricing':
		echo '<div class="os-plans" style="margin-top:8px">';
		echo '<article class="reveal"><h3>' . esc_html( rpsite_t( 'monthly' ) ) . '</h3><div class="price">' . esc_html( rpsite_t( 'mprice' ) ) . '</div><p class="muted">' . esc_html( rpsite_t( 'per_site' ) ) . '</p><ul class="checks">';
		foreach ( array( 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8' ) as $item ) {
			echo '<li>' . esc_html( rpsite_t( $item ) ) . '</li>';
		}
		echo '</ul><a class="btn btn-ink" href="' . esc_url( $start ) . '">' . esc_html( rpsite_t( 'choose_plan' ) ) . '</a></article>';
		echo '<article class="reveal featured"><span class="badge">' . esc_html( rpsite_t( 'popular' ) ) . '</span><h3>' . esc_html( rpsite_t( 'yearly' ) ) . '</h3><div class="price">' . esc_html( rpsite_t( 'yprice' ) ) . '</div><p class="muted">' . esc_html( rpsite_t( 'per_site' ) ) . ' · ' . esc_html( rpsite_t( 'save_badge' ) ) . '</p><ul class="checks">';
		foreach ( array( 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8' ) as $item ) {
			echo '<li>' . esc_html( rpsite_t( $item ) ) . '</li>';
		}
		echo '</ul><a class="btn btn-sky" href="' . esc_url( $start ) . '">' . esc_html( rpsite_t( 'choose_plan' ) ) . '</a></article>';
		echo '</div>';
		break;

	case 'features':
		echo '<div class="os-feature-grid">';
		foreach ( array( 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8' ) as $k ) {
			echo '<article class="os-feature-card reveal"><p class="os-kicker">' . esc_html( rpsite_t( $k . 'k' ) ) . '</p><h2>' . esc_html( rpsite_t( $k . 't' ) ) . '</h2><p class="muted">' . esc_html( rpsite_t( $k . 'b' ) ) . '</p></article>';
		}
		echo '</div>';
		echo '<div class="cta-finale reveal" style="margin-top:48px"><h2>' . esc_html( rpsite_t( 'bottom_h' ) ) . '</h2><p class="muted">' . esc_html( rpsite_t( 'bottom_b' ) ) . '</p><div class="actions"><a class="btn btn-sky" href="' . esc_url( $start ) . '">' . esc_html( rpsite_t( 'cta_started' ) ) . '</a><a class="btn btn-ghost" href="' . esc_url( home_url( '/download/' ) ) . '">' . esc_html( rpsite_t( 'cta_download' ) ) . '</a></div></div>';
		break;

	case 'calendar':
		echo '<p class="lead">' . esc_html( rpsite_t( 'prod_cal_b' ) ) . '</p>';
		echo '<ul class="checks" style="margin:20px 0 28px">';
		foreach ( array( 'prod_cal_1', 'prod_cal_2', 'prod_cal_3', 'p1', 'p2' ) as $item ) {
			echo '<li>' . esc_html( rpsite_t( $item ) ) . '</li>';
		}
		echo '</ul>';
		rpsite_mock_calendar();
		break;

	case 'scheduling':
		echo '<div class="os-feature-grid">';
		foreach ( array( 'f2', 'f5', 'f6' ) as $k ) {
			echo '<article class="os-feature-card reveal"><p class="os-kicker">' . esc_html( rpsite_t( $k . 'k' ) ) . '</p><h2>' . esc_html( rpsite_t( $k . 't' ) ) . '</h2><p class="muted">' . esc_html( rpsite_t( $k . 'b' ) ) . '</p></article>';
		}
		echo '</div>';
		break;

	case 'social':
		echo '<div class="os-feature-grid">';
		foreach ( rpsite_platforms() as $platform ) {
			echo '<article class="os-feature-card reveal"><h2>' . esc_html( $platform['name'] ) . '</h2><p class="muted">' . esc_html( $platform['copy'] ) . '</p></article>';
		}
		echo '</div>';
		break;

	case 'download':
		echo '<ol class="os-steps-list">';
		echo '<li><strong>01</strong><span>' . esc_html( rpsite_t( 'how1b' ) ) . '</span></li>';
		echo '<li><strong>02</strong><span>' . esc_html( rpsite_t( 'how2b' ) ) . '</span></li>';
		echo '<li><strong>03</strong><span>' . esc_html( rpsite_t( 'how3b' ) ) . '</span></li>';
		echo '</ol>';
		echo '<p style="margin-top:28px"><a class="btn btn-sky" href="' . esc_url( rpsite_plugin_zip_url() ) . '">' . esc_html( rpsite_t( 'cta_download' ) ) . '</a> ';
		echo '<a class="btn btn-ghost" href="' . esc_url( $start ) . '">' . esc_html( rpsite_t( 'cta_workspace' ) ) . '</a></p>';
		break;

	case 'guide':
		rpsite_render_user_guide();
		break;

	case 'faq':
		echo '<div class="faq os-faq">';
		foreach ( RankPublish_Site_Marketing::faq() as $row ) {
			echo '<details class="reveal"><summary>' . esc_html( $row['q'] ) . '</summary><p>' . esc_html( $row['a'] ) . '</p></details>';
		}
		echo '</div>';
		break;

	case 'about':
		echo '<p class="lead">' . esc_html( rpsite_t( 'about_lead' ) ) . '</p>';
		echo '<div class="use-grid" style="margin-top:28px">';
		foreach ( array( '1', '2', '3' ) as $n ) {
			echo '<article class="use-card reveal"><div class="avatar">' . esc_html( $n ) . '</div><h3>' . esc_html( rpsite_t( 'who' . $n . 't' ) ) . '</h3><p class="muted">' . esc_html( rpsite_t( 'who' . $n . 'b' ) ) . '</p></article>';
		}
		echo '</div>';
		break;

	case 'changelog':
		foreach ( RankPublish_Site_Marketing::changelog() as $row ) {
			echo '<article class="os-feature-card reveal" style="margin-bottom:16px"><h2>' . esc_html( $row['version'] ) . '</h2><p class="muted">' . esc_html( $row['body'] ) . '</p></article>';
		}
		break;

	case 'contact':
		$status = isset( $_GET['contact'] ) ? sanitize_key( (string) wp_unslash( $_GET['contact'] ) ) : '';
		if ( 'sent' === $status ) {
			echo '<p class="os-notice ok">' . esc_html( rpsite_t( 'contact_sent' ) ) . '</p>';
		} elseif ( 'fail' === $status ) {
			echo '<p class="os-notice err">' . esc_html( rpsite_t( 'contact_fail' ) ) . '</p>';
		}
		echo '<form class="os-contact-form reveal" method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '">';
		wp_nonce_field( 'rpsite_contact' );
		echo '<input type="hidden" name="action" value="rpsite_contact" />';
		echo '<label>' . esc_html( rpsite_t( 'name' ) ) . '<input type="text" name="rp_name" required maxlength="120" /></label>';
		echo '<label>' . esc_html( rpsite_t( 'email' ) ) . '<input type="email" name="rp_email" required maxlength="200" /></label>';
		echo '<label>' . esc_html( rpsite_t( 'message' ) ) . '<textarea name="rp_message" rows="6" required maxlength="4000"></textarea></label>';
		echo '<button type="submit" class="btn btn-sky">' . esc_html( rpsite_t( 'send' ) ) . '</button>';
		echo '</form>';
		break;

	case 'security':
		echo '<div class="os-feature-grid">';
		$items = array(
			array( rpsite_t( 'f7k' ), rpsite_t( 'f7t' ), rpsite_t( 'f7b' ) ),
			array( rpsite_t( 'sec_k' ), rpsite_t( 'sec_h' ), rpsite_t( 'sec_b' ) ),
			array( rpsite_t( 'prod_cloud_k' ), rpsite_t( 'prod_cloud_1' ), rpsite_t( 'prod_cloud_b' ) ),
		);
		foreach ( $items as $item ) {
			echo '<article class="os-feature-card reveal"><p class="os-kicker">' . esc_html( $item[0] ) . '</p><h2>' . esc_html( $item[1] ) . '</h2><p class="muted">' . esc_html( $item[2] ) . '</p></article>';
		}
		echo '</div>';
		break;

	case 'integrations':
		echo '<div class="tool-grid">';
		$tools = array(
			array( 'g1', 'gutenberg' ),
			array( 'g2', 'classic' ),
			array( 'g3', 'elementor' ),
			array( 'g4', 'seo-ui' ),
			array( 'g5', 'ai' ),
			array( 'g6', 'schema' ),
			array( 'g7', 'rank' ),
			array( 'g8', 'redirect' ),
		);
		$tones = array( 't1', 't2', 't3', 't4', 't5', 't6', 't7', 't8' );
		foreach ( $tools as $index => $tool ) {
			echo '<article class="tool-card reveal"><div class="tool-banner ' . esc_attr( $tones[ $index ] ) . '" aria-hidden="true">';
			echo rpsite_illu( $tool[1] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			echo '</div><div class="tool-body"><h3>' . esc_html( rpsite_t( $tool[0] . 't' ) ) . '</h3><p class="muted">' . esc_html( rpsite_t( $tool[0] . 'b' ) ) . '</p></div></article>';
		}
		echo '</div>';
		break;

	case 'privacy':
		echo '<article class="os-feature-card"><p>' . esc_html( rpsite_t( 'privacy_body' ) ) . '</p></article>';
		break;

	case 'terms':
		echo '<article class="os-feature-card"><p>' . esc_html( rpsite_t( 'terms_body' ) ) . '</p></article>';
		break;

	default:
		while ( have_posts() ) {
			the_post();
			echo '<article class="os-feature-card">';
			the_content();
			echo '</article>';
		}
}
?>
</article>
<?php
require RPSITE_PATH . 'templates/footer.php';
