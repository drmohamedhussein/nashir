import { prisma } from "./db";

export async function findCommandByIdempotency(workspaceId: string, idempotencyKey: string) {
  return prisma.command.findUnique({
    where: { workspaceId_idempotencyKey: { workspaceId, idempotencyKey } },
  });
}

export async function createCommand(input: {
  workspaceId: string;
  siteId: string;
  actorId: string;
  capabilityKey: string;
  idempotencyKey: string;
  payload?: unknown;
}) {
  return prisma.command.create({
    data: {
      workspaceId: input.workspaceId,
      siteId: input.siteId,
      actorId: input.actorId,
      capabilityKey: input.capabilityKey,
      idempotencyKey: input.idempotencyKey,
      status: "running",
      input: input.payload ? JSON.stringify(input.payload) : null,
      startedAt: new Date(),
    },
  });
}

export async function completeCommand(
  commandId: string,
  status: "succeeded" | "failed",
  result?: unknown,
  errorMessage?: string,
) {
  return prisma.command.update({
    where: { id: commandId },
    data: {
      status,
      result: result !== undefined ? JSON.stringify(result) : null,
      errorMessage: errorMessage ?? null,
      completedAt: new Date(),
    },
  });
}

export async function logActivity(input: {
  workspaceId: string;
  siteId?: string;
  commandId?: string;
  type: string;
  title: string;
  detail?: string;
  status?: string;
}) {
  return prisma.activityEvent.create({
    data: {
      workspaceId: input.workspaceId,
      siteId: input.siteId,
      commandId: input.commandId,
      type: input.type,
      title: input.title,
      detail: input.detail,
      status: input.status ?? "succeeded",
    },
  });
}
