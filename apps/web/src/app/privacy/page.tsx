import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export default function PrivacyPage() {
  return (
    <div className="min-h-full">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-16 leading-8">
        <h1 className="text-3xl font-bold">سياسة الخصوصية</h1>
        <p className="mt-6 text-ink-soft">آخر تحديث: 15 أغسطس 2026</p>
        <p className="mt-6">
          ناشر يجمع البريد والاسم لإنشاء الحساب، وبيانات المواقع المرتبطة (الرابط، إصدار ووردبريس،
          عناوين المقالات وحالتها ومواعيد النشر) لتشغيل التقويم ومحرك النشر.
        </p>
        <p className="mt-4">
          أسرار التوقيع تُحفظ لربط الموقع بالتطبيق. لا نبيع بياناتك. يمكنك فصل الموقع أو حذف الحساب
          بطلب إلى مشغّل الخدمة.
        </p>
        <p className="mt-4">
          الاتصال بين السحابة وووردبريس يتم عبر طلبات REST موقّعة. لا نخزّن محتوى المقال الكامل في
          هذا الإصدار، بل البيانات اللازمة للجدولة.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
