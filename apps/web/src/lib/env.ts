import { publicAppUrl } from "./environments";

export function appUrl(): string {
  return publicAppUrl();
}

export function cronSecret(): string {
  return process.env.CRON_SECRET || "";
}

export function assertProductionSecrets(): void {
  if (process.env.NODE_ENV !== "production") {
    return;
  }
  const missing = ["AUTH_SECRET", "DATABASE_URL", "CRON_SECRET"].filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing production environment variables: ${missing.join(", ")}`);
  }
}
