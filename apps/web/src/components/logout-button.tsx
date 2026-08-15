"use client";

import { useRouter } from "next/navigation";

export function LogoutButton({ name }: { name: string }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <button className="text-sm text-ink-soft" type="button" onClick={logout}>
      {name} · خروج
    </button>
  );
}
