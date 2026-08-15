"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SiteCard({
  id,
  name,
  url,
  status,
  wpVersion,
  lastSeen,
}: {
  id: string;
  name: string;
  url: string;
  status: string;
  wpVersion: string | null;
  lastSeen: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function disconnect() {
    if (!confirm("فصل هذا الموقع من ناشر؟")) {
      return;
    }
    setPending(true);
    const response = await fetch(`/api/v1/sites/${id}`, { method: "DELETE" });
    setPending(false);
    if (response.ok) {
      router.refresh();
    }
  }

  return (
    <article className="rounded-2xl bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold">{name}</h2>
          <a className="text-sm text-leaf" href={url} target="_blank" rel="noreferrer">
            {url}
          </a>
        </div>
        <span className="rounded-full bg-leaf/10 px-3 py-1 text-xs text-leaf">
          {status === "connected" ? "مرتبط" : status}
        </span>
      </div>
      <p className="mt-3 text-xs text-ink-soft">
        ووردبريس {wpVersion ?? "غير معروف"}
        {lastSeen ? ` · آخر تواصل ${lastSeen}` : " · لم يُرصد تواصل بعد"}
      </p>
      <button
        type="button"
        onClick={disconnect}
        disabled={pending}
        className="mt-4 text-sm text-danger disabled:opacity-60"
      >
        {pending ? "جارٍ الفصل..." : "فصل الموقع"}
      </button>
    </article>
  );
}
