"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BrandMark } from "@/components/rankpublish/brand-mark";
import { t, type Locale } from "@/lib/i18n";
import { localizeApiError } from "@/lib/localize-api-error";

type Props = {
  mode: "login" | "register";
  locale: Locale;
};

export function AuthForm({ mode, locale }: Props) {
  const router = useRouter();
  const copy = t(locale);
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
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    setPending(false);

    if (!response.ok) {
      const fallback =
        response.status === 503 ? copy.errorDatabase : copy.errorGeneric;
      setError(localizeApiError(data.error ?? fallback, locale));
      return;
    }

    window.location.assign(isRegister ? "/app/getting-started" : "/app");
  }

  return (
    <div className="hero-gradient flex min-h-[70vh] items-center justify-center px-6 py-16">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <BrandMark className="mb-2 [&_span:last-child_span:last-child]:text-muted-foreground" />
          <CardTitle>{isRegister ? copy.registerTitle : copy.loginTitle}</CardTitle>
          <CardDescription>{isRegister ? copy.registerHint : copy.loginHint}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {isRegister ? (
              <label className="block text-sm font-medium">
                {copy.name}
                <Input name="name" required className="mt-1.5" />
              </label>
            ) : null}
            <label className="block text-sm font-medium">
              {copy.email}
              <Input name="email" type="email" required className="mt-1.5" />
            </label>
            <label className="block text-sm font-medium">
              {copy.password}
              <Input name="password" type="password" required minLength={isRegister ? 8 : 1} className="mt-1.5" />
            </label>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? copy.pending : isRegister ? copy.registerTitle : copy.loginTitle}
            </Button>
          </form>
          <p className="mt-6 text-sm text-muted-foreground">
            {isRegister ? (
              <>
                {copy.haveAccount}{" "}
                <Link href="/login" className="font-bold text-primary">
                  {copy.login}
                </Link>
              </>
            ) : (
              <>
                {copy.newHere}{" "}
                <Link href="/register" className="font-bold text-primary">
                  {copy.start}
                </Link>
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
