import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, getSession } from "@/lib/auth";
import { assertMember } from "@/lib/workspace";

const schema = z.object({
  workspaceId: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: { code: "UNAUTHENTICATED", message: "Login required." } }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: { code: "INVALID_REQUEST", message: "Invalid workspace." } }, { status: 400 });
  }

  await assertMember(session.id, parsed.data.workspaceId);

  await createSession({
    id: session.id,
    name: session.name,
    email: session.email,
    workspaceId: parsed.data.workspaceId,
  });

  return NextResponse.json({ ok: true, data: { workspaceId: parsed.data.workspaceId } });
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: { code: "UNAUTHENTICATED", message: "Login required." } }, { status: 401 });
  }

  const { listWorkspaces } = await import("@/lib/workspace");
  const workspaces = await listWorkspaces(session.id);

  return NextResponse.json({
    ok: true,
    data: {
      activeWorkspaceId: session.workspaceId,
      workspaces,
    },
  });
}
