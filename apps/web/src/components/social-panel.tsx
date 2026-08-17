"use client";

import { useState } from "react";
import { SOCIAL_PLATFORMS } from "@/lib/social";

type SiteSocial = {
  id: string;
  name: string;
  accounts: Array<{ id: string; platform: string; label: string; connected: boolean }>;
  templates: Array<{ platform: string; body: string }>;
  jobs: Array<{ id: string; platform: string; status: string; message: string }>;
};

export function SocialPanel({ sites }: { sites: SiteSocial[] }) {
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");
  const [platform, setPlatform] = useState<(typeof SOCIAL_PLATFORMS)[number]>("facebook");
  const [label, setLabel] = useState("default");
  const [token, setToken] = useState("");
  const [template, setTemplate] = useState("{title}\n{url}");
  const [message, setMessage] = useState("");

  const site = sites.find((row) => row.id === siteId);

  async function post(body: Record<string, unknown>) {
    await fetch("/api/v1/social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    window.location.reload();
  }

  if (sites.length === 0) {
    return <p className="text-sm text-ink-soft">اربط موقعاً أولاً ثم أضف حسابات المنصات هنا.</p>;
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-soft">
        أسرار التطبيقات تُحفظ في حساب RankPublish. الصق رمز وصول المنصة الآن؛ تدفق OAuth الكامل يُستكمل عند ضبط مفاتيح
        Facebook وX وLinkedIn وPinterest وInstagram وMedium وThreads وGoogle Business.
      </p>
      <label className="block text-sm">
        الموقع
        <select className="mt-1 w-full rounded-xl border border-ink/10 bg-white px-3 py-2" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
          {sites.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <form
          className="rounded-2xl bg-white p-5 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            post({ intent: "connect", siteId, platform, label, accessToken: token });
          }}
        >
          <h2 className="font-semibold">ربط منصة</h2>
          <select className="w-full rounded-xl border border-ink/10 px-3 py-2" value={platform} onChange={(e) => setPlatform(e.target.value as typeof platform)}>
            {SOCIAL_PLATFORMS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <input className="w-full rounded-xl border border-ink/10 px-3 py-2" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="label" />
          <input className="w-full rounded-xl border border-ink/10 px-3 py-2" value={token} onChange={(e) => setToken(e.target.value)} placeholder="access token" />
          <button className="rounded-full bg-ink px-4 py-2 text-sm text-paper" type="submit">
            حفظ الحساب
          </button>
        </form>
        <form
          className="rounded-2xl bg-white p-5 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            post({ intent: "template", siteId, platform, body: template });
          }}
        >
          <h2 className="font-semibold">قالب</h2>
          <textarea className="w-full rounded-xl border border-ink/10 px-3 py-2" rows={5} value={template} onChange={(e) => setTemplate(e.target.value)} />
          <button className="rounded-full bg-leaf px-4 py-2 text-sm text-white" type="submit">
            حفظ القالب
          </button>
        </form>
      </div>
      <form
        className="rounded-2xl bg-white p-5 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          post({ intent: "share", siteId, platform, message });
        }}
      >
        <h2 className="font-semibold">مشاركة فورية / مجدولة في الطابور</h2>
        <textarea className="w-full rounded-xl border border-ink/10 px-3 py-2" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
        <button className="rounded-full border border-ink/15 px-4 py-2 text-sm" type="submit">
          أضف إلى الطابور
        </button>
      </form>
      {site ? (
        <div className="text-sm">
          <p className="font-medium">حسابات {site.name}</p>
          <ul className="mt-2 space-y-1 text-ink-soft">
            {site.accounts.map((account) => (
              <li key={account.id}>
                {account.platform} · {account.label} · {account.connected ? "متصل" : "بانتظار الرمز"}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
