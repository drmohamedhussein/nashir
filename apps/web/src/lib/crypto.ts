import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { hash, compare } from "bcryptjs";

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return compare(password, passwordHash);
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

export function pairingCode(): string {
  return randomBytes(3).toString("hex").toUpperCase().slice(0, 6);
}

export function signPayload(secret: string, timestamp: string, body: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

export function verifyPayload(
  secret: string,
  timestamp: string,
  body: string,
  signature: string,
): boolean {
  if (!secret || !timestamp || !signature) {
    return false;
  }

  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) {
    return false;
  }

  const expected = signPayload(secret, timestamp, body);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

export function readSignedHeaders(request: Request): { timestamp: string; signature: string } {
  return {
    timestamp:
      request.headers.get("x-rankpublish-timestamp") ??
      request.headers.get("x-nashir-timestamp") ??
      "",
    signature:
      request.headers.get("x-rankpublish-signature") ??
      request.headers.get("x-nashir-signature") ??
      "",
  };
}

export function hashSecret(value: string): string {
  return createHmac("sha256", "nashir-api-key").update(value).digest("hex");
}

export function digestToken(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function sameDigest(expected: string, raw: string): boolean {
  const actual = digestToken(raw);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(actual, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function normalizeOrigin(value: string): string {
  const url = new URL(value);
  return url.origin.toLowerCase();
}
