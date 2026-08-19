import { NextResponse } from "next/server";
import { API_ERRORS } from "@/lib/api-errors";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callWordPress } from "@/lib/wordpress";

type Params = { params: Promise<{ siteId: string }> };

type CapabilityRow = { id: string; label: string; integration: string };

export async function GET(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: API_ERRORS.LOGIN_REQUIRED }, { status: 401 });
  }

  const { siteId } = await params;
  const site = await prisma.site.findFirst({
    where: { id: siteId, workspaceId: session.workspaceId },
  });
  if (!site) {
    return NextResponse.json({ error: API_ERRORS.SITE_NOT_FOUND }, { status: 404 });
  }

  let integrations: unknown[] = [];
  let capabilities: CapabilityRow[] = [];

  try {
    integrations = JSON.parse(site.integrationsJson || "[]") as unknown[];
    capabilities = JSON.parse(site.capabilitiesJson || "[]") as CapabilityRow[];
  } catch {
    integrations = [];
    capabilities = [];
  }

  if (capabilities.length === 0 && site.restUrl.includes("rankpublish/v1")) {
    try {
      const live = await callWordPress<{
        ok: boolean;
        integrations?: unknown[];
        capabilities?: CapabilityRow[];
      }>({
        restUrl: site.restUrl,
        signingSecret: site.signingSecret,
        method: "GET",
        path: "capabilities",
      });
      if (live.capabilities?.length) {
        capabilities = live.capabilities;
        integrations = live.integrations ?? integrations;
      }
    } catch {
      // Return cached empty state.
    }
  }

  return NextResponse.json({
    ok: true,
    integrations,
    capabilities,
  });
}
