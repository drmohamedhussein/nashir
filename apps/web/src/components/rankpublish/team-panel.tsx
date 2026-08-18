"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { t, type Locale } from "@/lib/i18n";

type Member = { id: string; userId: string; name: string; email: string; role: string };
type Invite = { id: string; email: string; role: string; expiresAt: string };

const ROLE_STYLES: Record<string, string> = {
  owner: "bg-amber-50 text-amber-700 border-amber-200",
  admin: "bg-violet-50 text-violet-700 border-violet-200",
  member: "bg-sky-50 text-sky-700 border-sky-200",
  viewer: "bg-slate-50 text-slate-600 border-slate-200",
};

export function TeamPanel({
  members,
  invites,
  currentUserId,
  workspaceId,
  locale,
}: {
  members: Member[];
  invites: Invite[];
  currentUserId: string;
  workspaceId: string;
  locale: Locale;
}) {
  const copy = t(locale);
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [loading, setLoading] = useState(false);

  const roleLabels: Record<string, string> = {
    owner: copy.roleOwner,
    admin: copy.roleAdmin,
    member: copy.roleMember,
    viewer: copy.roleViewer,
  };

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(`/api/v1/workspaces/${workspaceId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(userId: string) {
    if (!confirm(copy.inviteRemoveConfirm)) return;
    await fetch(`/api/v1/workspaces/${workspaceId}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    window.location.reload();
  }

  const memberLabel =
    members.length === 1 ? `1 ${copy.membersCount}` : `${members.length} ${copy.membersCountPlural}`;

  return (
    <div className="mt-6 space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">{memberLabel}</p>
        <button
          onClick={() => setShowInvite(!showInvite)}
          className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-sky-700"
        >
          {copy.inviteMember}
        </button>
      </div>

      {showInvite && (
        <form onSubmit={handleInvite} className="flex gap-3 rounded-2xl border border-sky-200 bg-sky-50/30 p-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={copy.inviteEmailPlaceholder}
            required
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="member">{copy.roleMember}</option>
            <option value="admin">{copy.roleAdmin}</option>
            <option value="viewer">{copy.roleViewer}</option>
          </select>
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-sky-600 px-5 py-2 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-50"
          >
            {loading ? "..." : copy.inviteSend}
          </button>
        </form>
      )}

      <div className="space-y-2">
        {members.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_12px_rgba(11,22,56,0.04)]"
          >
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                {m.name.charAt(0).toUpperCase()}
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">{m.name}</p>
                <p className="text-xs text-slate-500">{m.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase", ROLE_STYLES[m.role] ?? ROLE_STYLES.member)}>
                {roleLabels[m.role] ?? m.role}
              </span>
              {m.role !== "owner" && m.userId !== currentUserId && (
                <button
                  onClick={() => handleRemove(m.userId)}
                  className="text-xs text-slate-400 transition-colors hover:text-rose-600"
                >
                  {copy.inviteRemove}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {invites.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">{copy.pendingInvitations}</p>
          <div className="space-y-2">
            {invites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-3">
                <div>
                  <p className="text-sm text-slate-700">{inv.email}</p>
                  <p className="text-[10px] text-slate-400">
                    {copy.inviteExpires} {new Date(inv.expiresAt).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US")}
                  </p>
                </div>
                <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase", ROLE_STYLES[inv.role])}>
                  {roleLabels[inv.role] ?? inv.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
