import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { listWorkspaces, createWorkspaceForUser } from "@/lib/workspace";
import { z } from "zod";

export async function GET() {
  try {
    const session = await requireSession();
    const workspaces = await listWorkspaces(session.id);
    return NextResponse.json({ ok: true, data: workspaces });
  } catch {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
}

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
});

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Name is required (2-120 chars)" }, { status: 400 });
    }
    const workspace = await createWorkspaceForUser(session.id, parsed.data.name);
    return NextResponse.json({ ok: true, data: workspace }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create workspace";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
