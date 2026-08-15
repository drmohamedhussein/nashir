"use client";

import { useState } from "react";

export function PairingPanel() {
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function createCode() {
    setPending(true);
    setError("");
    const response = await fetch("/api/v1/pairing", { method: "POST" });
    const data = (await response.json()) as { code?: string; error?: string };
    setPending(false);
    if (!response.ok || !data.code) {
      setError(data.error ?? "تعذر إنشاء الرمز.");
      return;
    }
    setCode(data.code);
  }

  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-6">
      <h2 className="text-lg font-semibold">ربط موقع ووردبريس</h2>
      <p className="mt-2 text-sm leading-7 text-ink-soft">
        أنشئ رمزاً صالحاً لربع ساعة، ثم الصقه في إضافة ناشر داخل لوحة ووردبريس.
      </p>
      <button
        type="button"
        onClick={createCode}
        disabled={pending}
        className="mt-4 rounded-full bg-ink px-4 py-2 text-sm text-paper disabled:opacity-60"
      >
        {pending ? "جارٍ..." : "إنشاء رمز ربط"}
      </button>
      {code ? (
        <p className="mt-4 font-mono text-3xl tracking-[0.4em] text-leaf">{code}</p>
      ) : null}
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
    </div>
  );
}
