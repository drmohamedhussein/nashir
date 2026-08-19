<?php
declare(strict_types=1);

/**
 * RankPublish public user guide (marketing site).
 *
 * @package RankPublishSite
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Render the public RankPublish user guide.
 */
function rpsite_render_user_guide(): void {
	$en    = 'en' === rpsite_locale();
	$cloud = rpsite_cloud_url();
	$zip   = rpsite_plugin_zip_url();
	$app   = $cloud ? untrailingslashit( $cloud ) : 'https://nashir.satest.top';

	$h = static function ( string $ar, string $en_text ) use ( $en ): string {
		return $en ? $en_text : $ar;
	};

	echo '<!-- rp-guide-v3 -->';
	echo '<p class="lead">' . esc_html(
		$h(
			'RankPublish حساب سحابي وإضافة ووردبريس واحدة. المحركات الأربعة (النشر والتقويم وتحسين البحث وPro) تعمل على موقعك. الحساب يدير الاشتراك والمواقع والتقويم المُزامَن.',
			'RankPublish is a cloud account plus one WordPress plugin. The four engines (publishing, calendar, SEO, and Pro) run on your site. The account holds billing, extra domains, and the synced calendar.'
		)
	) . '</p>';

	echo '<article class="card"><h2>' . esc_html( $h( 'كيف يعمل المنتج', 'How the product works' ) ) . '</h2>';
	echo '<ul class="checks">';
	echo '<li>' . esc_html( $h( 'على ووردبريس: Scheduler و Calendar و SEO Dashboard و Essential SEO و AI Tools وكل أدوات Pro.', 'On WordPress: Scheduler, Calendar, SEO Dashboard, Essential SEO, AI Tools, and every Pro tool.' ) ) . '</li>';
	echo '<li>' . esc_html( $h( 'في الحساب: المواقع، الرموز، التقويم المُزامَن، نتائج SEO المُزامَنة، الفريق، والفاتورة.', 'In the account: sites, pairing codes, synced calendar, synced SEO scores, team, and billing.' ) ) . '</li>';
	echo '<li>' . esc_html( $h( 'صفحات الحساب تفتح شاشات ووردبريس؛ لا تستبدلها.', 'Account pages open the WordPress screens; they do not replace them.' ) ) . '</li>';
	echo '</ul></article>';

	echo '<article class="card" style="margin-top:18px"><h2>' . esc_html( $h( '1. ثبّت الإضافة على موقعك', '1. Install the plugin on your WordPress' ) ) . '</h2>';
	echo '<ol>';
	echo '<li>' . esc_html( $h( 'حمّل ملف RankPublish من صفحة التنزيل.', 'Download the RankPublish zip from the download page.' ) ) . ' <a href="' . esc_url( $zip ) . '">' . esc_html( $h( 'تنزيل الإضافة', 'Download plugin' ) ) . '</a></li>';
	echo '<li>' . esc_html( $h( 'في ووردبريس: إضافات ← أضف جديداً ← رفع إضافة ← اختر الملف ← ثبّت الآن ← فعّل RankPublish.', 'In WordPress: Plugins → Add New → Upload Plugin → choose the zip → Install Now → Activate RankPublish.' ) ) . '</li>';
	echo '<li>' . esc_html( $h( 'لا تثبّت SchedulePress أو ThinkRank منفصلين. هما داخل RankPublish.', 'Do not install SchedulePress or ThinkRank separately. They are already inside RankPublish.' ) ) . '</li>';
	echo '<li>' . esc_html( $h( 'ستظهر قائمة RankPublish في الشريط الجانبي فوراً.', 'The RankPublish menu appears in the admin sidebar immediately.' ) ) . '</li>';
	echo '</ol></article>';

	echo '<article class="card" style="margin-top:18px"><h2>' . esc_html( $h( '2. أنشئ حساب RankPublish', '2. Create a RankPublish account' ) ) . '</h2>';
	echo '<ol>';
	echo '<li>' . esc_html( $h( 'سجّل من', 'Register at' ) ) . ' <a href="' . esc_url( $app . '/register' ) . '">' . esc_html( $app . '/register' ) . '</a></li>';
	echo '<li>' . esc_html( $h( 'كل موقع جديد يبدأ بتجربة 7 أيام، ثم 9.99 دولاراً شهرياً أو 99 دولاراً سنوياً لكل موقع.', 'Each new site starts a 7-day trial, then $9.99/month or $99/year per site.' ) ) . '</li>';
	echo '<li>' . esc_html( $h( 'بعد الدخول افتح Getting started.', 'After sign-in open Getting started.' ) ) . ' <a href="' . esc_url( $app . '/app/getting-started' ) . '">' . esc_html( $app . '/app/getting-started' ) . '</a></li>';
	echo '<li>' . esc_html( $h( 'أنشئ رمز ربط من 6 أحرف وانسخه.', 'Create a 6-character pairing code and copy it.' ) ) . '</li>';
	echo '</ol></article>';

	echo '<article class="card" style="margin-top:18px"><h2>' . esc_html( $h( '3. اربط الموقع', '3. Pair the site' ) ) . '</h2>';
	echo '<ol>';
	echo '<li>' . esc_html( $h( 'في ووردبريس افتح RankPublish ← Cloud Connect.', 'In WordPress open RankPublish → Cloud Connect.' ) ) . '</li>';
	echo '<li>' . esc_html( $h( 'الصق رابط الحساب (مثل', 'Paste the cloud URL (for example' ) ) . ' <code>' . esc_html( $app ) . '</code> ' . esc_html( $h( ') ورمز الربط ثم احفظ.', ') and the pairing code, then save.' ) ) . '</li>';
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
	echo '<li><strong>Scheduler</strong> — ' . esc_html( $h( 'الجدولة التلقائية، الطابور، الملفات الاجتماعية، الإشعارات، وربط الشبكات، وأتمتة Pro (إلغاء نشر / إعادة نشر / محتوى متقدم).', 'Auto-schedule, queue, social profiles, notifications, network OAuth, and Pro automation (unpublish / republish / advanced content).' ) ) . '</li>';
	echo '<li><strong>Calendar</strong> — ' . esc_html( $h( 'تقويم سحب وإفلات للمقالات المجدولة. أنشئ مقالاً من يوم في التقويم أو انقل الموعد.', 'Drag-and-drop calendar for scheduled posts. Create a post from a day or move its date.' ) ) . '</li>';
	echo '<li><strong>Publish workspace</strong> — ' . esc_html( $h( 'صفحة جامعة لكل روابط النشر مع رابط الحساب السحابي.', 'A hub of every publishing link plus the cloud account.' ) ) . '</li>';
	echo '</ul>';
	echo '<p>' . esc_html( $h( 'خطوات سريعة:', 'Quick steps:' ) ) . '</p>';
	echo '<ol>';
	echo '<li>' . esc_html( $h( 'افتح Scheduler واربط حسابات الشبكات من تبويب الملفات الاجتماعية.', 'Open Scheduler and connect network accounts from the social profiles tab.' ) ) . '</li>';
	echo '<li>' . esc_html( $h( 'اضبط الفاصل الزمني أو ساعات النشر في الإعدادات.', 'Set the interval or publishing hours in settings.' ) ) . '</li>';
	echo '<li>' . esc_html( $h( 'افتح Calendar لجدولة المقالات بالسحب والإفلات.', 'Open Calendar to schedule posts by drag and drop.' ) ) . '</li>';
	echo '</ol>';
	echo '<p class="muted">' . esc_html( $h( 'الشبكات: فيسبوك، X، لينكدإن، بنترست، إنستغرام، ثريدز، ميديوم، ماستودون، بلوسكاي، Google Business. تربط الحسابات من Scheduler على ووردبريس.', 'Networks: Facebook, X, LinkedIn, Pinterest, Instagram, Threads, Medium, Mastodon, Bluesky, Google Business. Connect them from Scheduler on WordPress.' ) ) . '</p></article>';

	echo '<article class="card" style="margin-top:18px"><h2>' . esc_html( $h( '5. أدوات SEO على ووردبريس (Rank)', '5. SEO tools on WordPress (Rank)' ) ) . '</h2>';
	echo '<ul class="checks">';
	echo '<li><strong>SEO Dashboard</strong> — ' . esc_html( $h( 'نظرة عامة وصحة الموقع والدرجات.', 'Overview, site health, and scores.' ) ) . '</li>';
	echo '<li><strong>Essential SEO</strong> — ' . esc_html( $h( 'هوية الموقع، التحليلات، الأداء، التحسين الجماعي، صور SEO، Schema، وسوم التواصل، الزحف وsitemap وllms.txt، الفهرسة الفورية، أرشيف المؤلفين، والروابط الداخلية (Pro)، وتكامل Google. أدوات Pro الإضافية (تتبع الرتب، إعادة التوجيه، الروابط المعطوبة، SEO المحلي، WooCommerce) داخل هذه الشاشة.', 'Site identity, analytics, performance, bulk SEO, image SEO, schema, social meta, crawling/sitemap/llms.txt, instant indexing, author archives, internal links (Pro), and Google integrations. Extra Pro tools (rank tracking, redirects, broken links, local SEO, WooCommerce) live inside this screen.' ) ) . '</li>';
	echo '<li><strong>AI Tools</strong> — ' . esc_html( $h( 'عناوين، وصف، ملخصات محتوى، وتحليل.', 'Titles, descriptions, content briefs, and analysis.' ) ) . '</li>';
	echo '<li><strong>Usages</strong> — ' . esc_html( $h( 'استهلاك أدوات الذكاء.', 'AI usage analytics.' ) ) . '</li>';
	echo '<li><strong>SEO Settings</strong> — ' . esc_html( $h( 'مفاتيح API والأدوار والإعدادات العامة.', 'API keys, roles, and global options.' ) ) . '</li>';
	echo '<li><strong>Account / License</strong> — ' . esc_html( $h( 'اشتراك RankPublish يغطي محركات Pro. لا حاجة لترخيص بائع منفصل.', 'The RankPublish subscription covers the Pro engines. No separate vendor license is required.' ) ) . '</li>';
	echo '<li><strong>Rank workspace</strong> — ' . esc_html( $h( 'صفحة جامعة لكل روابط SEO مع الحساب السحابي.', 'A hub of every SEO link plus the cloud account.' ) ) . '</li>';
	echo '</ul>';
	echo '<p>' . esc_html( $h( 'في محرر المقال يظهر صندوق SEO لكل مقال (عنوان، وصف، كلمة التركيز، Schema).', 'The post editor includes the SEO box for each article (title, description, focus keyword, schema).' ) ) . '</p></article>';

	echo '<article class="card" style="margin-top:18px"><h2>' . esc_html( $h( '6. ماذا يفعل حساب RankPublish السحابي', '6. What the RankPublish cloud account does' ) ) . '</h2>';
	echo '<p>' . esc_html( $h( 'بعد تسجيل الدخول إلى', 'After signing in at' ) ) . ' <a href="' . esc_url( $app . '/app' ) . '">' . esc_html( $app . '/app' ) . '</a>:</p>';
	echo '<ul class="checks">';
	echo '<li><strong>Sites</strong> (' . esc_html( $app . '/app' ) . ') — ' . esc_html( $h( 'عرض المواقع، حالة الربط، إضافة نطاق، فك الربط أثناء سريان الاشتراك.', 'List sites, connection status, add a domain, unbind while the subscription is live.' ) ) . '</li>';
	echo '<li><strong>Getting started</strong> — ' . esc_html( $h( 'إنشاء رمز الربط واتباع خطوات التفعيل.', 'Create the pairing code and follow activation steps.' ) ) . '</li>';
	echo '<li><strong>Scheduler</strong> (' . esc_html( $app . '/app/calendar' ) . ') — ' . esc_html( $h( 'التقويم المُزامَن وأزرار فتح Scheduler و Calendar على ووردبريس.', 'Synced calendar plus buttons that open Scheduler and Calendar on WordPress.' ) ) . '</li>';
	echo '<li><strong>SEO</strong> (' . esc_html( $app . '/app/seo' ) . ') — ' . esc_html( $h( 'نتائج المقالات المُزامَنة وأزرار فتح لوحة SEO على ووردبريس.', 'Synced post scores plus buttons that open the WordPress SEO screens.' ) ) . '</li>';
	echo '<li><strong>Social</strong> (' . esc_html( $app . '/app/social' ) . ') — ' . esc_html( $h( 'قوالب المشاركة وحسابات السحابة. الربط الكامل للشبكات يتم في Scheduler على الموقع.', 'Share templates and cloud accounts. Full network OAuth stays in Scheduler on the site.' ) ) . '</li>';
	echo '<li><strong>Team</strong> — ' . esc_html( $h( 'دعوة أعضاء الفريق وصلاحيات المساحة.', 'Invite teammates and workspace roles.' ) ) . '</li>';
	echo '<li><strong>Billing</strong> — ' . esc_html( $h( 'التجربة، الترقية، وإدارة الاشتراك.', 'Trial, upgrade, and subscription.' ) ) . '</li>';
	echo '<li><strong>Settings / Activity</strong> — ' . esc_html( $h( 'إعدادات الحساب وسجل النشاط.', 'Account settings and activity log.' ) ) . '</li>';
	echo '</ul></article>';

	echo '<article class="card" style="margin-top:18px"><h2>' . esc_html( $h( '7. إضافة نطاق آخر', '7. Add another domain' ) ) . '</h2>';
	echo '<ol>';
	echo '<li>' . esc_html( $h( 'أبقِ الاشتراك سارياً على الحساب.', 'Keep the subscription live on the account.' ) ) . '</li>';
	echo '<li>' . esc_html( $h( 'من Getting started أنشئ رمز ربط جديداً.', 'From Getting started create a new pairing code.' ) ) . '</li>';
	echo '<li>' . esc_html( $h( 'ثبّت RankPublish على الموقع الجديد واربطه من Cloud Connect.', 'Install RankPublish on the new site and pair it from Cloud Connect.' ) ) . '</li>';
	echo '</ol></article>';

	echo '<article class="card" style="margin-top:18px"><h2>' . esc_html( $h( '8. إن لم يظهر التقويم في الحساب', '8. If the cloud calendar is empty' ) ) . '</h2>';
	echo '<ol>';
	echo '<li>' . esc_html( $h( 'تأكد أن الموقع Connected في /app.', 'Confirm the site is Connected in /app.' ) ) . '</li>';
	echo '<li>' . esc_html( $h( 'افتح wp-admin على الموقع المرتبط مرة واحدة.', 'Open wp-admin on the connected site once.' ) ) . '</li>';
	echo '<li>' . esc_html( $h( 'احفظ مقالاً أو اجدول مقالاً من Calendar في ووردبريس.', 'Save a post or schedule one from Calendar in WordPress.' ) ) . '</li>';
	echo '<li>' . esc_html( $h( 'حدّث صفحة Scheduler في الحساب. المقالات تظهر بعد المزامنة.', 'Refresh the account Scheduler page. Posts appear after sync.' ) ) . '</li>';
	echo '</ol></article>';

	echo '<div class="faq" style="margin-top:28px">';
	$faqs = $en
		? array(
			'Where do the four plugin UIs live?' => 'On your WordPress, under RankPublish. Cloud pages link to those screens; they do not replace them.',
			'Can I use SEO and scheduling without pairing?' => 'Yes on the site itself. Pairing is required for the cloud calendar, extra domains, and billing seat.',
			'Why does HQ WordPress look different?' => 'The WordPress on this marketing hostname is the operator Site Core. Customer engines belong on the customer plugin, not as a paired HQ seat.',
			'How do I add another domain?' => 'Keep the subscription live, generate a new pairing code, install RankPublish on the new site, and connect it.',
			'Do I need a SchedulePress or ThinkRank license?' => 'No. The RankPublish subscription covers the embedded Pro engines.',
		)
		: array(
			'أين واجهات البلاجنز الأربعة؟' => 'على ووردبريس تحت قائمة RankPublish. صفحات الحساب تفتح تلك الشاشات ولا تستبدلها.',
			'هل أستخدم SEO والجدولة بدون ربط؟' => 'نعم على الموقع نفسه. الربط لازم لتقويم السحابة والنطاقات الإضافية ومقعد الفاتورة.',
			'لماذا ووردبريس المقر مختلف؟' => 'ووردبريس هذا النطاق هو سطح المقر (Site Core). محركات الزبون على إضافة RankPublish في موقعه، وليس كمقعد مربوط للمقر.',
			'كيف أضيف نطاقاً آخر؟' => 'أبقِ الاشتراك سارياً، أنشئ رمز ربط جديد، ثبّت RankPublish على الموقع الجديد، ثم اربطه.',
			'هل أحتاج ترخيص SchedulePress أو ThinkRank؟' => 'لا. اشتراك RankPublish يغطي محركات Pro المضمّنة.',
		);
	foreach ( $faqs as $q => $a ) {
		echo '<details><summary>' . esc_html( $q ) . '</summary><p>' . esc_html( $a ) . '</p></details>';
	}
	echo '</div>';
}
