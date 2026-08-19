<?php
declare(strict_types=1);

/**
 * RankPublish public user guide (marketing site).
 *
 * @package PublisherWP
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Render the public RankPublish user guide.
 */
function nashir_render_user_guide(): void {
	$en    = 'en' === nashir_locale();
	$cloud = nashir_cloud_url();
	$zip   = nashir_plugin_zip_url();
	$app   = $cloud ? untrailingslashit( $cloud ) : 'https://nashir.satest.top';

	$h = static function ( string $ar, string $en_text ) use ( $en ): string {
		return $en ? $en_text : $ar;
	};

	echo '<p class="lead">' . esc_html(
		$h(
			'RankPublish حساب سحابي وإضافة ووردبريس واحدة. المحركات الأربعة (النشر والتقويم وتحسين البحث وPro) تعمل على موقعك. الحساب يدير الاشتراك والمواقع والتقويم المُزامَن.',
			'RankPublish is a cloud account plus one WordPress plugin. The four engines (publishing, calendar, SEO, and Pro) run on your site. The account holds billing, extra domains, and the synced calendar.'
		)
	) . '</p>';

	echo '<article class="card"><h2>' . esc_html( $h( '1. ثبّت الإضافة على موقعك', '1. Install the plugin on your WordPress' ) ) . '</h2>';
	echo '<ol>';
	echo '<li>' . esc_html( $h( 'حمّل ملف RankPublish من صفحة التنزيل.', 'Download the RankPublish zip from the download page.' ) ) . ' <a href="' . esc_url( $zip ) . '">' . esc_html( $h( 'تنزيل الإضافة', 'Download plugin' ) ) . '</a></li>';
	echo '<li>' . esc_html( $h( 'في ووردبريس: إضافات ← أضف جديداً ← رفع إضافة ← فعّل RankPublish.', 'In WordPress: Plugins → Add New → Upload Plugin → activate RankPublish.' ) ) . '</li>';
	echo '<li>' . esc_html( $h( 'لا تثبّت SchedulePress أو ThinkRank منفصلين. هما داخل RankPublish.', 'Do not install SchedulePress or ThinkRank separately. They are already inside RankPublish.' ) ) . '</li>';
	echo '</ol></article>';

	echo '<article class="card" style="margin-top:18px"><h2>' . esc_html( $h( '2. أنشئ حساب RankPublish', '2. Create a RankPublish account' ) ) . '</h2>';
	echo '<ol>';
	echo '<li>' . esc_html( $h( 'سجّل من', 'Register at' ) ) . ' <a href="' . esc_url( $app . '/register' ) . '">' . esc_html( $app . '/register' ) . '</a></li>';
	echo '<li>' . esc_html( $h( 'كل موقع جديد يبدأ بتجربة 7 أيام، ثم 9.99 دولاراً شهرياً أو 99 دولاراً سنوياً لكل موقع.', 'Each new site starts a 7-day trial, then $9.99/month or $99/year per site.' ) ) . '</li>';
	echo '<li>' . esc_html( $h( 'من الحساب افتح Getting started لإنشاء رمز ربط من 6 أحرف.', 'From the account open Getting started and create a 6-character pairing code.' ) ) . '</li>';
	echo '</ol></article>';

	echo '<article class="card" style="margin-top:18px"><h2>' . esc_html( $h( '3. اربط الموقع', '3. Pair the site' ) ) . '</h2>';
	echo '<ol>';
	echo '<li>' . esc_html( $h( 'في ووردبريس افتح RankPublish ← Cloud Connect.', 'In WordPress open RankPublish → Cloud Connect.' ) ) . '</li>';
	echo '<li>' . esc_html( $h( 'الصق رابط الحساب (مثل https://nashir.satest.top) ورمز الربط.', 'Paste the cloud URL (for example https://nashir.satest.top) and the pairing code.' ) ) . '</li>';
	echo '<li>' . esc_html( $h( 'بعد الربط تُدفع المقالات إلى السحابة عند حفظها أو عند فتح لوحة ووردبريس.', 'After pairing, posts push to the cloud when you save them or when you open wp-admin.' ) ) . '</li>';
	echo '</ol>';
	echo '<p class="muted">' . esc_html(
		$h(
			'إن كان موقعك محلياً (.local) فالسحابة لا تسحب منه. الإضافة هي التي تدفع البيانات. افتح لوحة ووردبريس مرة بعد الربط.',
			'If the site is local (.local), the cloud cannot pull from it. The plugin pushes data. Open wp-admin once after pairing.'
		)
	) . '</p></article>';

	echo '<article class="card" style="margin-top:18px"><h2>' . esc_html( $h( '4. أدوات النشر على ووردبريس (Publish)', '4. Publishing tools on WordPress (Publish)' ) ) . '</h2>';
	echo '<p>' . esc_html( $h( 'كلها تحت قائمة RankPublish على موقعك:', 'All of these live under the RankPublish menu on your site:' ) ) . '</p>';
	echo '<ul class="checks">';
	echo '<li><strong>Scheduler</strong> — ' . esc_html( $h( 'الجدولة التلقائية، الطابور، الملفات الاجتماعية، الإشعارات، وأتمتة Pro (إلغاء نشر / إعادة نشر / محتوى متقدم).', 'Auto-schedule, queue, social profiles, notifications, and Pro automation (unpublish / republish / advanced content).' ) ) . '</li>';
	echo '<li><strong>Calendar</strong> — ' . esc_html( $h( 'تقويم سحب وإفلات للمقالات المجدولة.', 'Drag-and-drop calendar for scheduled posts.' ) ) . '</li>';
	echo '<li><strong>Publish workspace</strong> — ' . esc_html( $h( 'صفحة جامعة لكل روابط النشر مع رابط الحساب السحابي.', 'A hub of every publishing link plus the cloud account.' ) ) . '</li>';
	echo '</ul>';
	echo '<p class="muted">' . esc_html( $h( 'الشبكات: فيسبوك، X، لينكدإن، بنترست، إنستغرام، ثريدز، ميديوم، ماستودون، بلوسكاي، Google Business. تربط الحسابات من Scheduler على ووردبريس.', 'Networks: Facebook, X, LinkedIn, Pinterest, Instagram, Threads, Medium, Mastodon, Bluesky, Google Business. Connect them from Scheduler on WordPress.' ) ) . '</p></article>';

	echo '<article class="card" style="margin-top:18px"><h2>' . esc_html( $h( '5. أدوات SEO على ووردبريس (Rank)', '5. SEO tools on WordPress (Rank)' ) ) . '</h2>';
	echo '<ul class="checks">';
	echo '<li><strong>SEO Dashboard</strong> — ' . esc_html( $h( 'نظرة عامة وصحة الموقع.', 'Overview and site health.' ) ) . '</li>';
	echo '<li><strong>Essential SEO</strong> — ' . esc_html( $h( 'هوية الموقع، التحليلات، الأداء، التحسين الجماعي، صور SEO، Schema، وسوم التواصل، الزحف وsitemap وllms.txt، الفهرسة الفورية، أرشيف المؤلفين، والروابط الداخلية (Pro)، وتكامل Google.', 'Site identity, analytics, performance, bulk SEO, image SEO, schema, social meta, crawling/sitemap/llms.txt, instant indexing, author archives, internal links (Pro), and Google integrations.' ) ) . '</li>';
	echo '<li><strong>AI Tools</strong> — ' . esc_html( $h( 'عناوين، وصف، ملخصات محتوى، وتحليل.', 'Titles, descriptions, content briefs, and analysis.' ) ) . '</li>';
	echo '<li><strong>Usages</strong> — ' . esc_html( $h( 'استهلاك أدوات الذكاء.', 'AI usage analytics.' ) ) . '</li>';
	echo '<li><strong>SEO Settings</strong> — ' . esc_html( $h( 'مفاتيح API والأدوار والإعدادات العامة.', 'API keys, roles, and global options.' ) ) . '</li>';
	echo '<li><strong>Account / License</strong> — ' . esc_html( $h( 'اشتراك RankPublish يغطي محركات Pro. لا حاجة لترخيص بائع منفصل.', 'The RankPublish subscription covers the Pro engines. No separate vendor license is required.' ) ) . '</li>';
	echo '</ul>';
	echo '<p>' . esc_html( $h( 'في محرر المقال يظهر صندوق SEO لكل مقال (عنوان، وصف، كلمة التركيز، Schema).', 'The post editor includes the SEO box for each article (title, description, focus keyword, schema).' ) ) . '</p></article>';

	echo '<article class="card" style="margin-top:18px"><h2>' . esc_html( $h( '6. ماذا يفعل حساب RankPublish السحابي', '6. What the RankPublish cloud account does' ) ) . '</h2>';
	echo '<p>' . esc_html( $h( 'بعد تسجيل الدخول إلى', 'After signing in at' ) ) . ' <a href="' . esc_url( $app . '/app' ) . '">' . esc_html( $app . '/app' ) . '</a>:</p>';
	echo '<ul class="checks">';
	echo '<li><strong>Sites</strong> — ' . esc_html( $h( 'عرض المواقع، إضافة نطاق، فك الربط أثناء سريان الاشتراك.', 'List sites, add a domain, unbind while the subscription is live.' ) ) . '</li>';
	echo '<li><strong>Scheduler</strong> (' . esc_html( $app . '/app/calendar' ) . ') — ' . esc_html( $h( 'التقويم المُزامَن وروابط فتح Scheduler/Calendar على ووردبريس.', 'Synced calendar plus links that open Scheduler/Calendar on WordPress.' ) ) . '</li>';
	echo '<li><strong>SEO</strong> (' . esc_html( $app . '/app/seo' ) . ') — ' . esc_html( $h( 'نتائج المقالات المُزامَنة وروابط لوحة SEO على ووردبريس.', 'Synced post scores plus links to the WordPress SEO screens.' ) ) . '</li>';
	echo '<li><strong>Social</strong> — ' . esc_html( $h( 'قوالب المشاركة وحسابات السحابة. الربط الكامل للشبكات يتم في Scheduler على الموقع.', 'Share templates and cloud accounts. Full network OAuth stays in Scheduler on the site.' ) ) . '</li>';
	echo '<li><strong>Team / Billing / Settings / Activity</strong> — ' . esc_html( $h( 'الفريق، الفاتورة، الإعدادات، وسجل النشاط.', 'Team, billing, settings, and activity.' ) ) . '</li>';
	echo '</ul></article>';

	echo '<article class="card" style="margin-top:18px"><h2>' . esc_html( $h( '7. بيئات العمل', '7. Environments' ) ) . '</h2>';
	echo '<ul>';
	echo '<li><code>https://nashir.satest.top</code> — ' . esc_html( $h( 'الحساب التجريبي الحي وإضافة المقر (Site Core).', 'Live trial account and HQ Site Core.' ) ) . '</li>';
	echo '<li><code>https://rankpublish-test.local</code> — ' . esc_html( $h( 'موقع المستخدم التجريبي المحلي (إضافة RankPublish الكاملة).', 'Local customer test site (full RankPublish plugin).' ) ) . '</li>';
	echo '<li><code>https://rankpublish.local</code> — ' . esc_html( $h( 'بيئة تطوير المقر المحلية.', 'Local HQ development stack.' ) ) . '</li>';
	echo '</ul></article>';

	echo '<article class="card" style="margin-top:18px"><h2>' . esc_html( $h( '8. إن لم يظهر التقويم في الحساب', '8. If the cloud calendar is empty' ) ) . '</h2>';
	echo '<ol>';
	echo '<li>' . esc_html( $h( 'تأكد أن الموقع Connected في /app.', 'Confirm the site is Connected in /app.' ) ) . '</li>';
	echo '<li>' . esc_html( $h( 'افتح wp-admin على الموقع المرتبط مرة واحدة.', 'Open wp-admin on the connected site once.' ) ) . '</li>';
	echo '<li>' . esc_html( $h( 'احفظ مقالاً أو اجدول مقالاً من Calendar في ووردبريس.', 'Save a post or schedule one from Calendar in WordPress.' ) ) . '</li>';
	echo '<li>' . esc_html( $h( 'حدّث /app/calendar. المقالات تظهر بعد المزامنة.', 'Refresh /app/calendar. Posts appear after sync.' ) ) . '</li>';
	echo '</ol></article>';

	echo '<div class="faq" style="margin-top:28px">';
	$faqs = $en
		? array(
			'Where do the four plugin UIs live?' => 'On your WordPress, under RankPublish. Cloud pages link to those screens; they do not replace them.',
			'Can I use SEO and scheduling without pairing?' => 'Yes on the site itself. Pairing is required for the cloud calendar, extra domains, and billing seat.',
			'Why does HQ WordPress look different?' => 'nashir.satest.top WordPress is the operator Site Core. Customer engines belong on the customer plugin, not as a paired HQ seat.',
			'How do I add another domain?' => 'Keep the subscription live, generate a new pairing code, install RankPublish on the new site, and connect it.',
		)
		: array(
			'أين واجهات البلاجنز الأربعة؟' => 'على ووردبريس تحت قائمة RankPublish. صفحات الحساب تفتح تلك الشاشات ولا تستبدلها.',
			'هل أستخدم SEO والجدولة بدون ربط؟' => 'نعم على الموقع نفسه. الربط لازم لتقويم السحابة والنطاقات الإضافية ومقعد الفاتورة.',
			'لماذا ووردبريس المقر مختلف؟' => 'ووردبريس nashir.satest.top هو سطح المقر (Site Core). محركات الزبون على إضافة RankPublish في موقعه، وليس كمقعد مربوط للمقر.',
			'كيف أضيف نطاقاً آخر؟' => 'أبقِ الاشتراك سارياً، أنشئ رمز ربط جديد، ثبّت RankPublish على الموقع الجديد، ثم اربطه.',
		);
	foreach ( $faqs as $q => $a ) {
		echo '<details><summary>' . esc_html( $q ) . '</summary><p>' . esc_html( $a ) . '</p></details>';
	}
	echo '</div>';
}
