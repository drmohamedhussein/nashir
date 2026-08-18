import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, requireSession } from "@/lib/auth";
import { acceptInvite } from "@/lib/workspace";

const schema = z.object({
  inviteId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "inviteId is required" }, { status: 400 });
    }

    const workspaceId = await acceptInvite(session.id, session.email, parsed.data.inviteId);
    await createSession({
      id: session.id,
      name: session.name,
      email: session.email,
      workspaceId,
    });

    return NextResponse.json({ ok: true, data: { workspaceId } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to accept invite";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
