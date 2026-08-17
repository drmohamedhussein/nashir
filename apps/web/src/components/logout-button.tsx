"use client";

import { useRouter } from "next/navigation";

export function LogoutButton({ name, label }: { name: string; label: string }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <button
      className="text-left text-sm text-slate-400 hover:text-sky-200"
      type="button"
      onClick={logout}
    >
      <span className="block truncate font-medium text-white">{name}</span>
      <span className="text-xs font-semibold text-sky-300">{label}</span>
    </button>
  );
}
