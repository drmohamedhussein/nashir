import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { createSiteInWorkspace } from "@/lib/workspace";
import { checkSiteLimit } from "@/lib/entitlements";

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  url: z.string().trim().url().max(500),
});

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: { message: "Name and valid URL are required" } }, { status: 400 });
    }

    const siteCheck = await checkSiteLimit(session.workspaceId);
    if (!siteCheck.allowed) {
      return NextResponse.json(
        { ok: false, error: { message: `Site limit reached (${siteCheck.current}/${siteCheck.limit}).` } },
        { status: 403 },
      );
    }

    const result = await createSiteInWorkspace(session.id, session.workspaceId, parsed.data);
    return NextResponse.json({
      ok: true,
      data: {
        siteId: result.site.id,
        token: result.token,
        expiresAt: result.expiresAt.toISOString(),
      },
    }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create site";
    return NextResponse.json({ ok: false, error: { message } }, { status: 400 });
  }
}
