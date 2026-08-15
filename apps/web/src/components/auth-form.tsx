"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = {
  mode: "login" | "register";
};

export function AuthForm({ mode }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const isRegister = mode === "register";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    };

    const response = await fetch(isRegister ? "/api/auth/register" : "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as { error?: string };
    setPending(false);

    if (!response.ok) {
      setError(data.error ?? "تعذر إتمام العملية.");
      return;
    }

    router.push("/app");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-6 py-16">
      <Link href="/" className="mb-10 text-lg font-bold">
        ناشر
      </Link>
      <h1 className="text-2xl font-bold">{isRegister ? "إنشاء حساب" : "دخول"}</h1>
      <p className="mt-2 text-sm text-ink-soft">
        {isRegister ? "مساحة عمل واحدة لكل مواقعك." : "عد إلى تقويمك ومواقعك المرتبطة."}
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        {isRegister ? (
          <label className="block text-sm">
            الاسم
            <input
              name="name"
              required
              className="mt-1 w-full rounded-xl border border-ink/10 bg-white px-3 py-2"
            />
          </label>
        ) : null}
        <label className="block text-sm">
          البريد
          <input
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded-xl border border-ink/10 bg-white px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          كلمة المرور
          <input
            name="password"
            type="password"
            required
            minLength={isRegister ? 8 : 1}
            className="mt-1 w-full rounded-xl border border-ink/10 bg-white px-3 py-2"
          />
        </label>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-ink py-3 text-sm font-semibold text-paper disabled:opacity-60"
        >
          {pending ? "جارٍ..." : isRegister ? "إنشاء الحساب" : "دخول"}
        </button>
      </form>
      <p className="mt-6 text-sm text-ink-soft">
        {isRegister ? (
          <>
            لديك حساب؟ <Link href="/login">دخول</Link>
          </>
        ) : (
          <>
            جديد على ناشر؟ <Link href="/register">إنشاء حساب</Link>
          </>
        )}
      </p>
    </div>
  );
}
