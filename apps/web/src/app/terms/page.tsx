import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export default function TermsPage() {
  return (
    <div className="min-h-full">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-16 leading-8">
        <h1 className="text-3xl font-bold">شروط الاستخدام</h1>
        <p className="mt-6 text-ink-soft">آخر تحديث: 15 أغسطس 2026</p>
        <p className="mt-6">
          ناشر خدمة جدولة محتوى لمواقع ووردبريس. الإصدار الحالي تجريبي ومجاني، وقد يتغير التسعير
          لاحقاً مع إشعار المستخدمين.
        </p>
        <p className="mt-4">
          أنت مسؤول عن المحتوى الذي تنشره عبر مواقعك وعن صلاحية الوصول إلى ووردبريس. لا تستخدم الخدمة
          لإرسال محتوى غير قانوني أو انتهاك حقوق الغير.
        </p>
        <p className="mt-4">
          الخدمة تُقدَّم كما هي. قد تفشل مواعيد النشر إذا كان الموقع غير متاح أو إذا رُفض الطلب من
          ووردبريس. احتفظ بنسخ احتياطية لمواقعك.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
