<?php
/**
 * Inner marketing pages.
 *
 * @package RankPublishSite
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require RPSITE_PATH . 'templates/header.php';
$slug  = get_post_field( 'post_name', get_queried_object_id() );
$en    = 'en' === rpsite_locale();
$cloud = rpsite_cloud_url();
$start = $cloud ? $cloud . '/register' : rpsite_plugin_zip_url();
?>
<div class="page-hero">
	<div class="wrap">
		<?php
		switch ( $slug ) {
			case 'pricing':
				echo '<p class="kicker">' . esc_html( rpsite_t( 'price_k' ) ) . '</p><h1>' . esc_html( rpsite_t( 'price_h' ) ) . '</h1><p class="muted">' . esc_html( rpsite_t( 'trial' ) ) . '</p>';
				break;
			case 'features':
				echo '<p class="kicker">' . esc_html( rpsite_t( 'features_k' ) ) . '</p><h1>' . esc_html( rpsite_t( 'nav_features' ) ) . '</h1><p class="lead">' . esc_html( rpsite_t( 'features_h' ) ) . '</p>';
				break;
			case 'social':
				echo '<p class="kicker">' . esc_html( rpsite_t( 'social_k' ) ) . '</p><h1>' . esc_html( rpsite_t( 'nav_social' ) ) . '</h1><p class="lead">' . esc_html( rpsite_t( 'social_b' ) ) . '</p>';
				break;
			case 'download':
				echo '<h1>' . esc_html( rpsite_t( 'nav_plugin' ) ) . '</h1><p class="lead">' . esc_html( rpsite_t( 'how1b' ) ) . '</p>';
				break;
			default:
				echo '<h1>' . esc_html( get_the_title() ) . '</h1>';
		}
		?>
	</div>
</div>
<article class="wrap prose">
<?php
switch ( $slug ) {
	case 'pricing':
		echo '<div class="pricing-row" style="max-width:none">';
		echo '<article class="price-card"><h3>' . esc_html( rpsite_t( 'monthly' ) ) . '</h3><div class="price">' . esc_html( rpsite_t( 'mprice' ) ) . '</div><p class="muted">' . esc_html( rpsite_t( 'per_site' ) ) . '</p><a class="btn btn-brand" href="' . esc_url( $start ) . '">' . esc_html( rpsite_t( 'choose_plan' ) ) . '</a></article>';
		echo '<article class="price-card featured"><span class="badge">' . esc_html( rpsite_t( 'popular' ) ) . '</span><h3>' . esc_html( rpsite_t( 'yearly' ) ) . '</h3><div class="price">' . esc_html( rpsite_t( 'yprice' ) ) . '</div><p class="muted">' . esc_html( rpsite_t( 'per_site' ) ) . '</p><a class="btn btn-white" href="' . esc_url( $start ) . '">' . esc_html( rpsite_t( 'choose_plan' ) ) . '</a></article>';
		echo '</div><ul class="checks">';
		foreach ( array( 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8' ) as $item ) {
			echo '<li>' . esc_html( rpsite_t( $item ) ) . '</li>';
		}
		echo '</ul>';
		break;

	case 'features':
		echo '<div class="grid-2">';
		foreach ( array( 'f1', 'f2', 'f3', 'f4', 'f5', 'f6' ) as $k ) {
			echo '<article class="card"><p class="kicker">' . esc_html( rpsite_t( $k . 'k' ) ) . '</p><h2>' . esc_html( rpsite_t( $k . 't' ) ) . '</h2><p class="muted">' . esc_html( rpsite_t( $k . 'b' ) ) . '</p></article>';
		}
		echo '</div>';
		break;

	case 'calendar':
		echo '<p class="lead">' . esc_html( rpsite_t( 'f1b' ) ) . '</p>';
		rpsite_mock_calendar();
		break;

	case 'scheduling':
		echo '<article class="card"><h2>' . esc_html( rpsite_t( 'f2t' ) ) . '</h2><p>' . esc_html( rpsite_t( 'f2b' ) ) . '</p></article>';
		echo '<article class="card" style="margin-top:18px"><h2>' . esc_html( rpsite_t( 'f5t' ) ) . '</h2><p>' . esc_html( rpsite_t( 'f5b' ) ) . '</p></article>';
		echo '<article class="card" style="margin-top:18px"><h2>' . esc_html( rpsite_t( 'f6t' ) ) . '</h2><p>' . esc_html( rpsite_t( 'f6b' ) ) . '</p></article>';
		break;

	case 'social':
		echo '<div class="grid-2">';
		foreach ( rpsite_platforms() as $platform ) {
			echo '<article class="card"><h2>' . esc_html( $platform['name'] ) . '</h2><p class="muted">' . esc_html( $platform['copy'] ) . '</p></article>';
		}
		echo '</div>';
		break;

	case 'download':
		echo '<ol class="card"><li>' . esc_html( rpsite_t( 'how1b' ) ) . '</li><li>' . esc_html( rpsite_t( 'how2b' ) ) . '</li><li>' . esc_html( rpsite_t( 'how3b' ) ) . '</li></ol>';
		echo '<p style="margin-top:24px"><a class="btn btn-gradient" href="' . esc_url( rpsite_plugin_zip_url() ) . '">' . esc_html( rpsite_t( 'cta_download' ) ) . '</a></p>';
		break;

	case 'guide':
		echo '<div class="grid-3">';
		foreach ( array( '1', '2', '3' ) as $n ) {
			echo '<article class="card"><h2>' . esc_html( $n . '. ' . rpsite_t( 'how' . $n . 't' ) ) . '</h2><p class="muted">' . esc_html( rpsite_t( 'how' . $n . 'b' ) ) . '</p></article>';
		}
		echo '</div>';
		break;

	case 'faq':
		echo '<div class="faq">';
		$faqs = $en
			? array(
				'What is RankPublish?' => 'A WPDevLtd WordPress plugin for SEO, AI metadata, editorial calendar, and social sharing. It runs on your site without a cloud account today.',
				'How does it relate to SchedulePress or ThinkRank?' => 'RankPublish embeds those GPL modules. Settings already stored as wpsp_* / thinkrank_* keep working. The RankPublish name and logo are original; we do not claim original authorship of the embedded module code.',
				'Should I keep the old plugins active?' => 'No. Keep standalone SchedulePress and ThinkRank deactivated so the embedded modules can load.',
				'When is Connect & billing ready?' => 'Target price is $9.99/month or $99/year with a 7-day trial. Connect & Activate ships with RankPublish.com. Until then, download and run the plugin locally.',
				'Can I move the domain later?' => 'Yes. After account launch you unbind a seat and attach another domain.',
			)
			: array(
				'ما هو RankPublish؟' => 'إضافة ووردبريس من WPDevLtd للسيو والذكاء الاصطناعي والتقويم والمشاركة الاجتماعية. تعمل على موقعك دون حساب سحابي اليوم.',
				'ما علاقتها بـ SchedulePress أو ThinkRank؟' => 'RankPublish يضم تلك الوحدات المرخّصة GPL. الإعدادات المخزّنة كمفاتيح wpsp_* وthinkrank_* تبقى صالحة. الاسم والشعار أصليان؛ لا ندّعي تأليف كود الوحدات المضمّنة.',
				'هل أبقي الإضافات القديمة مفعّلة؟' => 'لا. أبقِ SchedulePress وThinkRank المنفصلتين معطّلتين حتى تُحمَّل الوحدات المضمّنة.',
				'متى Connect والفوترة؟' => 'السعر المستهدف 9.99$ شهرياً أو 99$ سنوياً مع تجربة 7 أيام. Connect يأتي مع RankPublish.com. حتى ذلك الحين نزّل الإضافة وشغّلها محلياً.',
				'هل أنقل الدومين لاحقاً؟' => 'نعم. بعد إطلاق الحساب تفك الربط وتربط نطاقاً آخر على نفس المقعد.',
			);
		foreach ( $faqs as $q => $a ) {
			echo '<details><summary>' . esc_html( $q ) . '</summary><p>' . esc_html( $a ) . '</p></details>';
		}
		echo '</div>';
		break;

	case 'about':
		echo '<p class="lead">' . esc_html( $en ? 'RankPublish is built by WPDevLtd for WordPress publishers who want SEO and scheduling in one admin menu. The public mark and site chrome are original. Embedded feature modules stay GPL with attribution.' : 'RankPublish من WPDevLtd لمحرري ووردبريس الذين يريدون السيو والجدولة في قائمة واحدة. العلامة والواجهة أصلية. وحدات الميزات المضمّنة تبقى GPL مع النسبة.' ) . '</p>';
		echo '<div class="use-grid" style="margin-top:28px">';
		foreach ( array( '1', '2', '3' ) as $n ) {
			echo '<article class="use-card"><div class="avatar">' . esc_html( $n ) . '</div><h3>' . esc_html( rpsite_t( 'who' . $n . 't' ) ) . '</h3><p class="muted">' . esc_html( rpsite_t( 'who' . $n . 'b' ) ) . '</p></article>';
		}
		echo '</div>';
		break;

	case 'changelog':
		echo '<article class="card"><h2>0.8.0</h2><p class="muted">' . esc_html( $en ? 'Merged SEO + calendar plugin, data-compat Status screen, experimental staging.' : 'دمج السيو والتقويم، شاشة توافق البيانات، نطاق تجريبي.' ) . '</p></article>';
		echo '<article class="card" style="margin-top:18px"><h2>1.0.0 site</h2><p class="muted">' . esc_html( $en ? 'Marketing site plugin: homepage, pricing, download, legal.' : 'إضافة الموقع التسويقي: الرئيسية، التسعير، التنزيل، القانوني.' ) . '</p></article>';
		break;

	case 'contact':
		echo '<article class="card"><p>' . esc_html( $en ? 'This hostname is experimental until RankPublish.com launches. Use WordPress admin on this site for now.' : 'هذا النطاق تجريبي حتى إطلاق RankPublish.com. استخدم لوحة ووردبريس على هذا الموقع حالياً.' ) . '</p></article>';
		break;

	case 'privacy':
		echo '<article class="card"><p>' . esc_html( rpsite_t( 'privacy_body' ) ) . '</p></article>';
		break;

	case 'terms':
		echo '<article class="card"><p>' . esc_html( rpsite_t( 'terms_body' ) ) . '</p></article>';
		break;

	default:
		while ( have_posts() ) {
			the_post();
			echo '<article class="card">';
			the_content();
			echo '</article>';
		}
}
?>
</article>
<?php
require RPSITE_PATH . 'templates/footer.php';
