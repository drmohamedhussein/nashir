import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { listPendingInvites } from "@/lib/workspace";

export async function GET() {
  try {
    const session = await requireSession();
    const invites = await listPendingInvites(session.email);
    return NextResponse.json({
      ok: true,
      data: invites.map((inv) => ({
        id: inv.id,
        role: inv.role,
        expiresAt: inv.expiresAt.toISOString(),
        workspace: inv.workspace,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Access denied";
    return NextResponse.json({ ok: false, error: message }, { status: 403 });
  }
}
