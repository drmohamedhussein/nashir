<?php
/**
 * Marketing website content — editable from RankPublish Core admin.
 *
 * @package RankPublishSite
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Stores bilingual marketing overrides and structured site sections.
 */
final class RankPublish_Site_Marketing {

	public const OPTION = 'rankpublish_site_marketing';

	/**
	 * i18n keys editable from Website admin (grouped).
	 *
	 * @return array<string, string[]>
	 */
	public static function editable_groups(): array {
		return array(
			'hero'     => array( 'os_pill', 'hero', 'hero_accent', 'hero_body', 'cta_workspace', 'cta_how', 'cta_started', 'cta_download', 'bottom_h', 'bottom_b' ),
			'products' => array(
				'products_k',
				'products_h',
				'products_b',
				'prod_cal_k',
				'prod_cal_t',
				'prod_cal_b',
				'prod_cal_1',
				'prod_cal_2',
				'prod_cal_3',
				'prod_seo_k',
				'prod_seo_t',
				'prod_seo_b',
				'prod_seo_1',
				'prod_seo_2',
				'prod_seo_3',
				'prod_cloud_k',
				'prod_cloud_t',
				'prod_cloud_b',
				'prod_cloud_1',
				'prod_cloud_2',
				'prod_cloud_3',
			),
			'workflow' => array( 'how_os_k', 'how_os_h', 'how1t', 'how1b', 'how2t', 'how2b', 'how3t', 'how3b' ),
			'pricing'  => array( 'price_k', 'price_h', 'trial', 'monthly', 'yearly', 'mprice', 'yprice', 'per_site', 'save_badge', 'popular', 'choose_plan', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8' ),
			'features' => array( 'features_k', 'features_h', 'f1k', 'f1t', 'f1b', 'f2k', 'f2t', 'f2b', 'f3k', 'f3t', 'f3b', 'f4k', 'f4t', 'f4b', 'f5k', 'f5t', 'f5b', 'f6k', 'f6t', 'f6b', 'f7k', 'f7t', 'f7b', 'f8k', 'f8t', 'f8b' ),
			'tools'    => array( 'tools_k', 'tools_h', 'g1t', 'g1b', 'g2t', 'g2b', 'g3t', 'g3b', 'g4t', 'g4b', 'g5t', 'g5b', 'g6t', 'g6b', 'g7t', 'g7b', 'g8t', 'g8b', 'g9t', 'g9b', 'g10t', 'g10b' ),
			'audience' => array( 'who_k', 'who_h', 'who1t', 'who1b', 'who2t', 'who2b', 'who3t', 'who3b' ),
			'about'    => array( 'about_lead' ),
			'legal'    => array( 'privacy_body', 'terms_body' ),
			'social'   => array( 'social_k', 'social_b', 'pfb', 'px', 'pli', 'ppi', 'pig', 'pmd', 'pth', 'pgb' ),
			'nav'      => array( 'nav_features', 'nav_social', 'nav_plugin', 'promo' ),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function defaults(): array {
		return array(
			'contact_email'   => get_option( 'admin_email', '' ),
			'promo_enabled'   => true,
			'show_tools'      => true,
			'show_audience'   => true,
			'show_cloud_card' => true,
			'overrides'       => array(
				'en' => array(),
				'ar' => array(),
			),
			'faq'             => self::default_faq(),
			'changelog'       => self::default_changelog(),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function get(): array {
		$stored = get_option( self::OPTION, array() );
		if ( ! is_array( $stored ) ) {
			$stored = array();
		}
		return self::merge_recursive( self::defaults(), $stored );
	}

	/**
	 * @param array<string, mixed> $data Incoming.
	 */
	public static function save( array $data ): void {
		$current = self::get();
		$next    = self::merge_recursive( $current, $data );

		$next['contact_email']   = sanitize_email( (string) ( $next['contact_email'] ?? '' ) );
		$next['promo_enabled']   = ! empty( $next['promo_enabled'] );
		$next['show_tools']      = ! empty( $next['show_tools'] );
		$next['show_audience']   = ! empty( $next['show_audience'] );
		$next['show_cloud_card'] = ! empty( $next['show_cloud_card'] );

		foreach ( array( 'en', 'ar' ) as $locale ) {
			$bag = is_array( $next['overrides'][ $locale ] ?? null ) ? $next['overrides'][ $locale ] : array();
			$clean = array();
			foreach ( $bag as $key => $value ) {
				$key = sanitize_key( (string) $key );
				if ( '' === $key ) {
					continue;
				}
				$value = is_string( $value ) ? trim( wp_kses_post( $value ) ) : '';
				if ( '' !== $value ) {
					$clean[ $key ] = $value;
				}
			}
			$next['overrides'][ $locale ] = $clean;
		}

		$faq = array();
		if ( is_array( $next['faq'] ?? null ) ) {
			foreach ( $next['faq'] as $row ) {
				if ( ! is_array( $row ) ) {
					continue;
				}
				$q_en = sanitize_text_field( (string) ( $row['q_en'] ?? '' ) );
				$a_en = sanitize_textarea_field( (string) ( $row['a_en'] ?? '' ) );
				if ( '' === $q_en && '' === $a_en ) {
					continue;
				}
				$faq[] = array(
					'q_en' => $q_en,
					'a_en' => $a_en,
					'q_ar' => sanitize_text_field( (string) ( $row['q_ar'] ?? '' ) ),
					'a_ar' => sanitize_textarea_field( (string) ( $row['a_ar'] ?? '' ) ),
				);
			}
		}
		$next['faq'] = $faq;

		$changelog = array();
		if ( is_array( $next['changelog'] ?? null ) ) {
			foreach ( $next['changelog'] as $row ) {
				if ( ! is_array( $row ) ) {
					continue;
				}
				$version = sanitize_text_field( (string) ( $row['version'] ?? '' ) );
				if ( '' === $version ) {
					continue;
				}
				$changelog[] = array(
					'version' => $version,
					'body_en' => sanitize_textarea_field( (string) ( $row['body_en'] ?? '' ) ),
					'body_ar' => sanitize_textarea_field( (string) ( $row['body_ar'] ?? '' ) ),
				);
			}
		}
		$next['changelog'] = $changelog;

		update_option( self::OPTION, $next, false );
	}

	/**
	 * Resolved marketing string (override → i18n defaults).
	 */
	public static function text( string $key, ?string $locale = null ): string {
		$locale = $locale ?: rpsite_locale();
		$data   = self::get();
		$over   = $data['overrides'][ $locale ][ $key ] ?? '';
		if ( is_string( $over ) && '' !== $over ) {
			return $over;
		}
		return self::bundle_text( $key, $locale );
	}

	/**
	 * @return array<int, array<string, string>>
	 */
	public static function faq( ?string $locale = null ): array {
		$locale = $locale ?: rpsite_locale();
		$rows   = self::get()['faq'];
		$out    = array();
		foreach ( $rows as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}
			$q = 'ar' === $locale ? (string) ( $row['q_ar'] ?: $row['q_en'] ) : (string) $row['q_en'];
			$a = 'ar' === $locale ? (string) ( $row['a_ar'] ?: $row['a_en'] ) : (string) $row['a_en'];
			if ( '' === $q ) {
				continue;
			}
			$out[] = array( 'q' => $q, 'a' => $a );
		}
		return $out;
	}

	/**
	 * @return array<int, array<string, string>>
	 */
	public static function changelog( ?string $locale = null ): array {
		$locale = $locale ?: rpsite_locale();
		$rows   = self::get()['changelog'];
		$out    = array();
		foreach ( $rows as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}
			$body = 'ar' === $locale ? (string) ( $row['body_ar'] ?: $row['body_en'] ) : (string) $row['body_en'];
			$out[] = array(
				'version' => (string) $row['version'],
				'body'    => $body,
			);
		}
		return $out;
	}

	/**
	 * Extra i18n defaults not yet in older bundles.
	 *
	 * @return array<string, string>
	 */
	public static function extra_en(): array {
		return array(
			'prod_cloud_k' => 'Cloud account',
			'prod_cloud_t' => 'Connect, seats, and sync',
			'prod_cloud_b' => 'Pair each WordPress site with a RankPublish account for workspace views, billing seats, and secure sync.',
			'prod_cloud_1' => '6-character pairing code',
			'prod_cloud_2' => 'Calendar and SEO sync views',
			'prod_cloud_3' => 'Per-site seats and trial',
			'f7k'          => 'Cloud',
			'f7t'          => 'Connect & Activate from WordPress',
			'f7b'          => 'Pair the plugin to your RankPublish account, keep engines on your site, and open calendar or SEO workspaces in the cloud.',
			'f8k'          => 'AI & Pro SEO',
			'f8t'          => 'Titles, schema, ranks, redirects',
			'f8b'          => 'AI metadata drafts, Essential SEO, schema and sitemaps, rank tracking, broken links, and redirects in one RankPublish menu.',
			'about_lead'   => 'RankPublish is a WordPress publishing system from WPDevLtd: editorial calendar, scheduling, social sharing, and SEO — plus a cloud account for pairing, seats, and synced workspaces. Engines run on your site; your WordPress remains the source of truth.',
			'sec_k'        => 'Trust',
			'sec_h'        => 'Built for site owners who keep control',
			'sec_b'        => 'The plugin runs on your WordPress. Cloud pairing uses signed requests. You choose when to connect a seat.',
			'int_k'        => 'Works with your stack',
			'int_h'        => 'Editors and builders you already use',
			'contact_h'    => 'Talk to us',
			'contact_b'    => 'Questions about RankPublish, pairing, or billing? Send a message — we reply from the address configured in RankPublish Core → Website.',
			'contact_sent' => 'Thanks — your message was sent.',
			'contact_fail' => 'Could not send. Check the contact email in RankPublish Core → Website.',
			'name'         => 'Name',
			'email'        => 'Email',
			'message'      => 'Message',
			'send'         => 'Send message',
			'dl_steps_h'   => 'Install in three steps',
			'nav_security' => 'Security',
			'nav_integrations' => 'Integrations',
		);
	}

	/**
	 * @return array<string, string>
	 */
	public static function extra_ar(): array {
		return array(
			'prod_cloud_k' => 'الحساب السحابي',
			'prod_cloud_t' => 'الربط والمقاعد والمزامنة',
			'prod_cloud_b' => 'اربط كل موقع ووردبريس بحساب RankPublish لمساحات العمل والفوترة والمزامنة الآمنة.',
			'prod_cloud_1' => 'رمز ربط من 6 أحرف',
			'prod_cloud_2' => 'عرض التقويم والسيو في السحابة',
			'prod_cloud_3' => 'مقعد لكل موقع وتجربة',
			'f7k'          => 'السحابة',
			'f7t'          => 'Connect وActivate من ووردبريس',
			'f7b'          => 'اربط الإضافة بحسابك، أبقِ المحركات على موقعك، وافتح مساحات التقويم والسيو في السحابة.',
			'f8k'          => 'الذكاء والسيو الكامل',
			'f8t'          => 'عناوين، Schema، ترتيب، إعادة توجيه',
			'f8b'          => 'مسودات ذكاء اصطناعي، Essential SEO، مخطط وخرائط، تتبع ترتيب، روابط مكسورة، وإعادة توجيه في قائمة RankPublish.',
			'about_lead'   => 'RankPublish نظام نشر لووردبريس من WPDevLtd: تقويم تحريري، جدولة، مشاركة اجتماعية، وسيو — مع حساب سحابي للربط والمقاعد ومساحات العمل. المحركات على موقعك؛ ووردبريس يبقى مصدر الحقيقة.',
			'sec_k'        => 'الثقة',
			'sec_h'        => 'مصمم لمن يريد الإبقاء على السيطرة',
			'sec_b'        => 'الإضافة تعمل على ووردبريس لديك. الربط السحابي بطلبات موقعة. أنت تختار متى تربط مقعداً.',
			'int_k'        => 'يتوافق مع أدواتك',
			'int_h'        => 'المحررات والبناة التي تستخدمها',
			'contact_h'    => 'تواصل معنا',
			'contact_b'    => 'أسئلة عن RankPublish أو الربط أو الفوترة؟ أرسل رسالة — نرد من البريد المضبوط في RankPublish Core ← Website.',
			'contact_sent' => 'شكراً — تم إرسال رسالتك.',
			'contact_fail' => 'تعذر الإرسال. تحقق من بريد التواصل في RankPublish Core ← Website.',
			'name'         => 'الاسم',
			'email'        => 'البريد',
			'message'      => 'الرسالة',
			'send'         => 'إرسال',
			'dl_steps_h'   => 'التثبيت في ثلاث خطوات',
			'nav_security' => 'الأمان',
			'nav_integrations' => 'التكاملات',
		);
	}

	/**
	 * @return array<int, array<string, string>>
	 */
	private static function default_faq(): array {
		return array(
			array(
				'q_en' => 'What is RankPublish?',
				'a_en' => 'A WordPress plugin for editorial calendar, scheduling, social sharing, and SEO — plus a RankPublish cloud account for pairing, seats, and synced calendar/SEO workspaces. Engines run on your site.',
				'q_ar' => 'ما هو RankPublish؟',
				'a_ar' => 'إضافة ووردبريس للتقويم التحريري والجدولة والمشاركة الاجتماعية والسيو — مع حساب RankPublish سحابي للربط والمقاعد ومساحات التقويم/السيو. المحركات تعمل على موقعك.',
			),
			array(
				'q_en' => 'How does it relate to SchedulePress or ThinkRank?',
				'a_en' => 'RankPublish embeds those GPL modules. Existing wpsp_* / thinkrank_* settings keep working. The RankPublish name and chrome are original; we do not claim authorship of the embedded module code.',
				'q_ar' => 'ما علاقتها بـ SchedulePress أو ThinkRank؟',
				'a_ar' => 'RankPublish يضم تلك الوحدات المرخّصة GPL. إعدادات wpsp_* وthinkrank_* تبقى صالحة. الاسم والواجهة أصلية؛ لا ندّعي تأليف كود الوحدات المضمّنة.',
			),
			array(
				'q_en' => 'Should I keep the old plugins active?',
				'a_en' => 'No. Deactivate standalone SchedulePress and ThinkRank so the embedded modules inside RankPublish can load cleanly.',
				'q_ar' => 'هل أبقي الإضافات القديمة مفعّلة؟',
				'a_ar' => 'لا. عطّل SchedulePress وThinkRank المنفصلتين حتى تُحمَّل الوحدات داخل RankPublish بشكل نظيف.',
			),
			array(
				'q_en' => 'How do Connect and billing work?',
				'a_en' => 'Install RankPublish, open Cloud Connect, enter the pairing code from your RankPublish account. Pricing is $9.99/month or $99/year per site with a 7-day trial.',
				'q_ar' => 'كيف يعمل Connect والفوترة؟',
				'a_ar' => 'ثبّت RankPublish، افتح Cloud Connect، أدخل رمز الربط من حسابك. السعر 9.99$ شهرياً أو 99$ سنوياً لكل موقع مع تجربة 7 أيام.',
			),
			array(
				'q_en' => 'Can I move the domain later?',
				'a_en' => 'Yes. Unbind a seat in your RankPublish account and attach another WordPress site.',
				'q_ar' => 'هل أنقل الدومين لاحقاً؟',
				'a_ar' => 'نعم. افك ربط المقعد في حساب RankPublish واربط موقعاً آخر.',
			),
			array(
				'q_en' => 'Where does content live — cloud or WordPress?',
				'a_en' => 'Posts, schedules, and SEO data stay on your WordPress. The cloud account handles tenancy, billing, and synced views — it does not replace your site database.',
				'q_ar' => 'أين يعيش المحتوى — السحابة أم ووردبريس؟',
				'a_ar' => 'المقالات والمواعيد وبيانات السيو على ووردبريس. الحساب السحابي للمقاعد والفوترة والعروض المتزامنة — ولا يستبدل قاعدة موقعك.',
			),
		);
	}

	/**
	 * @return array<int, array<string, string>>
	 */
	private static function default_changelog(): array {
		return array(
			array(
				'version' => '1.9.0 site',
				'body_en' => 'Website CMS in RankPublish Core, expanded product pages (cloud connect, security, integrations), OS-consistent marketing layout, updated FAQ.',
				'body_ar' => 'إدارة محتوى الموقع من RankPublish Core، صفحات منتج موسّعة (الربط السحابي، الأمان، التكاملات)، تخطيط تسويقي متسق، وتحديث الأسئلة الشائعة.',
			),
			array(
				'version' => '1.8.6 site',
				'body_en' => 'Site Core polish, multi-site deploy verification, Publishing OS homepage.',
				'body_ar' => 'تحسينات Site Core، تحقق النشر متعدد المواقع، الرئيسية بنمط Publishing OS.',
			),
			array(
				'version' => '0.8.0 product',
				'body_en' => 'Merged SEO + calendar plugin with Cloud Connect connector.',
				'body_ar' => 'إضافة منتج مدمجة (سيو + تقويم) مع موصل Cloud Connect.',
			),
		);
	}

	private static function bundle_text( string $key, string $locale ): string {
		$extra = 'ar' === $locale ? self::extra_ar() : self::extra_en();
		if ( isset( $extra[ $key ] ) ) {
			return $extra[ $key ];
		}
		if ( 'ar' === $locale ) {
			$ar = rpsite_ar();
			if ( isset( $ar[ $key ] ) ) {
				return $ar[ $key ];
			}
		}
		$en = rpsite_en();
		if ( isset( $en[ $key ] ) ) {
			return $en[ $key ];
		}
		$extra_en = self::extra_en();
		return $extra_en[ $key ] ?? $key;
	}

	/**
	 * @param array<string, mixed> $base Base.
	 * @param array<string, mixed> $over Overlay.
	 * @return array<string, mixed>
	 */
	private static function merge_recursive( array $base, array $over ): array {
		foreach ( $over as $key => $value ) {
			if ( is_array( $value ) && isset( $base[ $key ] ) && is_array( $base[ $key ] ) && self::is_assoc( $value ) ) {
				$base[ $key ] = self::merge_recursive( $base[ $key ], $value );
			} else {
				$base[ $key ] = $value;
			}
		}
		return $base;
	}

	/**
	 * @param array<mixed> $arr Array.
	 */
	private static function is_assoc( array $arr ): bool {
		if ( array() === $arr ) {
			return false;
		}
		return array_keys( $arr ) !== range( 0, count( $arr ) - 1 );
	}
}
