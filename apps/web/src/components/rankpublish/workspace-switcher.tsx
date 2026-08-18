"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type WorkspaceOption = {
  workspace: { id: string; name: string; slug: string };
  role: string;
};

export function WorkspaceSwitcher({ activeWorkspaceId }: { activeWorkspaceId: string }) {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    fetch("/api/v1/workspaces/switch")
      .then((r) => r.json())
      .then((data: { data?: { workspaces?: WorkspaceOption[] } }) => {
        setWorkspaces(data.data?.workspaces ?? []);
      })
      .catch(() => setWorkspaces([]));
  }, []);

  if (workspaces.length <= 1) {
    return null;
  }

  async function onChange(workspaceId: string) {
    if (workspaceId === activeWorkspaceId) {
      return;
    }
    setPending(true);
    const response = await fetch("/api/v1/workspaces/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId }),
    });
    setPending(false);
    if (response.ok) {
      router.refresh();
    }
  }

  return (
    <label className="flex items-center gap-2 text-xs text-slate-400">
      <span className="hidden sm:inline">Workspace</span>
      <select
        disabled={pending}
        value={activeWorkspaceId}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white outline-none",
          pending && "opacity-60",
        )}
      >
        {workspaces.map((row) => (
          <option key={row.workspace.id} value={row.workspace.id} className="text-slate-900">
            {row.workspace.name}
          </option>
        ))}
      </select>
    </label>
  );
}
