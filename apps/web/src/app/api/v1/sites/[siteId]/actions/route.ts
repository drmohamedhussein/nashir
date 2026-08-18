import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callWordPress } from "@/lib/wordpress";
import { assertActionEntitlement } from "@/lib/entitlements";
import { SubscriptionInactiveError } from "@/lib/subscription";
import {
  completeCommand,
  createCommand,
  findCommandByIdempotency,
  logActivity,
} from "@/lib/commands";

const schema = z.object({
  action: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).optional(),
  idempotency_key: z.string().uuid().optional(),
});

type Params = { params: Promise<{ siteId: string }> };

export async function POST(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: { code: "UNAUTHENTICATED", message: "Login required." } }, { status: 401 });
  }

  const { siteId } = await params;
  const site = await prisma.site.findFirst({
    where: { id: siteId, workspaceId: session.workspaceId },
  });
  if (!site) {
    return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: "Site not found." } }, { status: 404 });
  }

  if (!site.restUrl.includes("rankpublish/v1")) {
    return NextResponse.json(
      { ok: false, error: { code: "CONNECTOR_REQUIRED", message: "Site must use RankPublish Connector." } },
      { status: 422 },
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: { code: "INVALID_REQUEST", message: "Invalid request." } }, { status: 400 });
  }

  const idempotencyKey = parsed.data.idempotency_key ?? randomUUID();
  const existing = await findCommandByIdempotency(session.workspaceId, idempotencyKey);
  if (existing) {
    return NextResponse.json({
      ok: true,
      data: existing.result ? JSON.parse(existing.result) : null,
      meta: { commandId: existing.id, idempotent: true },
    });
  }

  try {
    await assertActionEntitlement(session.workspaceId, parsed.data.action);
  } catch (error) {
    if (error instanceof SubscriptionInactiveError) {
      return NextResponse.json(
        { ok: false, error: { code: error.code, message: "Subscription inactive or expired." } },
        { status: 402 },
      );
    }
    if (error instanceof Error && (error as Error & { code?: string }).code === "CAPABILITY_UNAVAILABLE") {
      return NextResponse.json(
        { ok: false, error: { code: "CAPABILITY_UNAVAILABLE", message: "Plan does not include this capability." } },
        { status: 403 },
      );
    }
    throw error;
  }

  const command = await createCommand({
    workspaceId: session.workspaceId,
    siteId: site.id,
    actorId: session.id,
    capabilityKey: parsed.data.action,
    idempotencyKey,
    payload: parsed.data.payload,
  });

  try {
    const result = await callWordPress<{ ok: boolean; result?: unknown }>({
      restUrl: site.restUrl,
      signingSecret: site.signingSecret,
      method: "POST",
      path: "actions",
      body: {
        action: parsed.data.action,
        payload: parsed.data.payload ?? {},
        idempotency_key: idempotencyKey,
      },
    });

    await completeCommand(command.id, "succeeded", result.result ?? null);
    await logActivity({
      workspaceId: session.workspaceId,
      siteId: site.id,
      commandId: command.id,
      type: "action.executed",
      title: parsed.data.action,
      detail: site.name,
      status: "succeeded",
    });

    return NextResponse.json({
      ok: true,
      data: result.result ?? null,
      meta: { commandId: command.id },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Action failed.";
    await completeCommand(command.id, "failed", null, message);
    await logActivity({
      workspaceId: session.workspaceId,
      siteId: site.id,
      commandId: command.id,
      type: "action.failed",
      title: parsed.data.action,
      detail: message,
      status: "failed",
    });
    return NextResponse.json({ ok: false, error: { code: "UPSTREAM_ERROR", message } }, { status: 502 });
  }
}
