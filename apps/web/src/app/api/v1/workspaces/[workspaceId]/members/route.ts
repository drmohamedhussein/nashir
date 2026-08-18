import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { listMembers, inviteMember, removeMember } from "@/lib/workspace";
import { z } from "zod";

export async function GET(_req: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const session = await requireSession();
    const { workspaceId } = await params;
    const members = await listMembers(session.id, workspaceId);
    return NextResponse.json({ ok: true, data: members });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Access denied";
    return NextResponse.json({ ok: false, error: message }, { status: 403 });
  }
}

const inviteSchema = z.object({
  email: z.string().email().max(320),
  role: z.enum(["admin", "member", "viewer"]).default("member"),
});

export async function POST(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const session = await requireSession();
    const { workspaceId } = await params;
    const body = await request.json();
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Valid email is required" }, { status: 400 });
    }
    const invite = await inviteMember(session.id, workspaceId, parsed.data.email, parsed.data.role);
    return NextResponse.json({ ok: true, data: invite }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to invite";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

const removeSchema = z.object({ userId: z.string().min(1) });

export async function DELETE(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const session = await requireSession();
    const { workspaceId } = await params;
    const body = await request.json();
    const parsed = removeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "userId is required" }, { status: 400 });
    }
    await removeMember(session.id, workspaceId, parsed.data.userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to remove member";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
