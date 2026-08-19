<?php
declare(strict_types=1);

/**
 * Inner marketing pages.
 *
 * @package PublisherWP
 */

get_header();
$slug  = get_post_field( 'post_name', get_queried_object_id() );
$en    = 'en' === nashir_locale();
$cloud = nashir_cloud_url();
$start = $cloud ? $cloud . '/register' : nashir_plugin_zip_url();
?>
<div class="page-hero">
	<div class="wrap">
		<?php
		switch ( $slug ) {
			case 'pricing':
				echo '<p class="kicker">' . esc_html( nashir_t( 'price_k' ) ) . '</p><h1>' . esc_html( nashir_t( 'price_h' ) ) . '</h1><p class="muted">' . esc_html( nashir_t( 'trial' ) ) . '</p>';
				break;
			case 'features':
				echo '<p class="kicker">' . esc_html( nashir_t( 'features_k' ) ) . '</p><h1>' . esc_html( nashir_t( 'nav_features' ) ) . '</h1><p class="lead">' . esc_html( nashir_t( 'features_h' ) ) . '</p>';
				break;
			case 'social':
				echo '<p class="kicker">' . esc_html( nashir_t( 'social_k' ) ) . '</p><h1>' . esc_html( nashir_t( 'nav_social' ) ) . '</h1><p class="lead">' . esc_html( nashir_t( 'social_b' ) ) . '</p>';
				break;
			case 'download':
				echo '<h1>' . esc_html( nashir_t( 'nav_plugin' ) ) . '</h1><p class="lead">' . esc_html( nashir_t( 'how1b' ) ) . '</p>';
				break;
			case 'guide':
				echo '<p class="kicker">RankPublish</p><h1>' . esc_html( $en ? 'User guide' : 'دليل الاستخدام' ) . '</h1><p class="lead">' . esc_html( $en ? 'Install the plugin, pair your site, then use every publishing and SEO tool from WordPress and your RankPublish account.' : 'ثبّت الإضافة، اربط موقعك، ثم استخدم كل أدوات النشر وتحسين البحث من ووردبريس ومن حساب RankPublish.' ) . '</p>';
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
		echo '<article class="price-card"><h3>' . esc_html( nashir_t( 'monthly' ) ) . '</h3><div class="price">' . esc_html( nashir_t( 'mprice' ) ) . '</div><p class="muted">' . esc_html( nashir_t( 'per_site' ) ) . '</p><a class="btn btn-brand" href="' . esc_url( $start ) . '">' . esc_html( nashir_t( 'choose_plan' ) ) . '</a></article>';
		echo '<article class="price-card featured"><span class="badge">' . esc_html( nashir_t( 'popular' ) ) . '</span><h3>' . esc_html( nashir_t( 'yearly' ) ) . '</h3><div class="price">' . esc_html( nashir_t( 'yprice' ) ) . '</div><p class="muted">' . esc_html( nashir_t( 'per_site' ) ) . '</p><a class="btn btn-white" href="' . esc_url( $start ) . '">' . esc_html( nashir_t( 'choose_plan' ) ) . '</a></article>';
		echo '</div><ul class="checks">';
		foreach ( array( 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8' ) as $item ) {
			echo '<li>' . esc_html( nashir_t( $item ) ) . '</li>';
		}
		echo '</ul>';
		break;

	case 'features':
		echo '<div class="grid-2">';
		foreach ( array( 'f1', 'f2', 'f3', 'f4', 'f5', 'f6' ) as $k ) {
			echo '<article class="card"><p class="kicker">' . esc_html( nashir_t( $k . 'k' ) ) . '</p><h2>' . esc_html( nashir_t( $k . 't' ) ) . '</h2><p class="muted">' . esc_html( nashir_t( $k . 'b' ) ) . '</p></article>';
		}
		echo '</div>';
		break;

	case 'calendar':
		echo '<p class="lead">' . esc_html( nashir_t( 'f1b' ) ) . '</p>';
		echo '<p>' . esc_html( $en ? 'Editors see the month, drag a story to a new morning, and create a draft without leaving the calendar. The same board appears in the PublisherWP account after sync.' : 'يرى المحرر الشهر، ويسحب المقال إلى صباح آخر، وينشئ مسودة من التقويم. اللوحة نفسها تظهر في حساب PublisherWP بعد المزامنة.' ) . '</p>';
		nashir_mock_calendar();
		break;

	case 'scheduling':
		echo '<article class="card"><h2>' . esc_html( nashir_t( 'f2t' ) ) . '</h2><p>' . esc_html( nashir_t( 'f2b' ) ) . '</p></article>';
		echo '<article class="card" style="margin-top:18px"><h2>' . esc_html( nashir_t( 'f4t' ) ) . '</h2><p>' . esc_html( nashir_t( 'f4b' ) ) . '</p></article>';
		echo '<article class="card" style="margin-top:18px"><h2>' . esc_html( nashir_t( 'f6t' ) ) . '</h2><p>' . esc_html( nashir_t( 'f6b' ) ) . '</p></article>';
		break;

	case 'social':
		echo '<div class="grid-2">';
		foreach ( nashir_platforms() as $platform ) {
			echo '<article class="card"><h2>' . esc_html( $platform['name'] ) . '</h2><p class="muted">' . esc_html( $platform['copy'] ) . '</p></article>';
		}
		echo '</div>';
		break;

	case 'download':
		echo '<ol class="card"><li>' . esc_html( nashir_t( 'how1b' ) ) . '</li><li>' . esc_html( nashir_t( 'how2b' ) ) . '</li><li>' . esc_html( nashir_t( 'how3b' ) ) . '</li></ol>';
		echo '<p style="margin-top:24px"><a class="btn btn-gradient" href="' . esc_url( nashir_plugin_zip_url() ) . '">' . esc_html( nashir_t( 'cta_download' ) ) . '</a></p>';
		break;

	case 'guide':
		nashir_render_user_guide();
		break;

	case 'faq':
		echo '<div class="faq">';
		$faqs = $en
			? array(
				'Is PublisherWP a renamed commercial plugin?' => 'No. The product is original. Feature coverage is the goal; the code, name, and license are PublisherWP’s.',
				'How does licensing work?' => 'Install the plugin and sign in with your PublisherWP email and password. A seat must exist for that site.',
				'Can I move the domain?' => 'Yes. Unbind the seat and connect another domain while the subscription is active.',
				'What about missed schedules?' => 'The cloud runs due jobs first. WordPress repairs leftover future posts if the site was asleep.',
				'When is card billing ready?' => 'Plans are shown now. Stripe/PayPal come after the core. Trial and manual seats work today.',
			)
			: array(
				'هل PublisherWP نسخة من إضافة تجارية؟' => 'لا. المنتج أصلي. التكافؤ الوظيفي هو الهدف، والكود والاسم والترخيص لـ PublisherWP.',
				'كيف يعمل الترخيص؟' => 'ثبّت الإضافة وسجّل الدخول ببريد PublisherWP. يلزم مقعد اشتراك لهذا الموقع.',
				'هل أنقل الدومين؟' => 'نعم. فك الربط واربط موقعاً آخر أثناء سريان الاشتراك.',
				'ماذا عن المواعيد الفائتة؟' => 'السحابة تنفّذ أولاً، وووردبريس يصلح المقالات المستقبلية إن نام الموقع.',
				'متى التحصيل بالبطاقة؟' => 'الأسعار ظاهرة الآن. Stripe/PayPal لاحقاً. التجريبي واليدوي يعملان اليوم.',
			);
		foreach ( $faqs as $q => $a ) {
			echo '<details><summary>' . esc_html( $q ) . '</summary><p>' . esc_html( $a ) . '</p></details>';
		}
		echo '</div>';
		break;

	case 'about':
		echo '<p class="lead">' . esc_html( $en ? 'PublisherWP is a publishing platform for WordPress publishers who want the calendar in the site and the license in their own account. We do not wrap another vendor’s plugin.' : 'PublisherWP منصة نشر لمحرري ووردبريس: التقويم في الموقع، والترخيص في حسابك. لا نغلّف إضافة بائع آخر.' ) . '</p>';
		echo '<div class="use-grid" style="margin-top:28px">';
		foreach ( array( '1', '2', '3' ) as $n ) {
			echo '<article class="use-card"><div class="avatar"></div><h3>' . esc_html( nashir_t( 'who' . $n . 't' ) ) . '</h3><p class="muted">' . esc_html( nashir_t( 'who' . $n . 'b' ) ) . '</p></article>';
		}
		echo '</div>';
		break;

	case 'changelog':
		echo '<article class="card"><h2>1.1.0</h2><p class="muted">' . esc_html( $en ? 'Account login license, calendar, missed schedule, unpublish/republish, advanced editors, social templates.' : 'ترخيص بتسجيل الدخول، تقويم، مواعيد فائتة، إلغاء/إعادة نشر، محررات متقدمة، قوالب اجتماعية.' ) . '</p></article>';
		echo '<article class="card" style="margin-top:18px"><h2>1.0.0</h2><p class="muted">' . esc_html( $en ? 'Connector: signed REST, sync, cloud publish, heartbeat.' : 'الموصل: REST موقّع، مزامنة، نشر سحابي، نبضة.' ) . '</p></article>';
		break;

	case 'contact':
		echo '<article class="card"><p>' . esc_html( $en ? 'For the live trial domain, use the WordPress admin of this site or the PublisherWP account once the cloud app URL is set.' : 'للنطاق التجريبي استخدم لوحة هذا الموقع أو حساب PublisherWP بعد ضبط رابط التطبيق السحابي.' ) . '</p></article>';
		break;

	case 'privacy':
		echo '<article class="card"><p>' . esc_html( nashir_t( 'privacy_body' ) ) . '</p></article>';
		break;

	case 'terms':
		echo '<article class="card"><p>' . esc_html( nashir_t( 'terms_body' ) ) . '</p></article>';
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
get_footer();
