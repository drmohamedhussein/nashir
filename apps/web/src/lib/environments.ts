/**
 * Canonical RankPublish environment URLs.
 * Staging SaaS → production target RankPublish.com later.
 */
export const ENV_URLS = {
  /** Live trial SaaS (Contabo) — accounts, billing, pairing */
  stagingSaas: "https://nashir.satest.top",
  /** Local official / dev WordPress (upstream stack) */
  localWpDev: "https://rankpublish.local",
  /** Simulated customer WordPress (product-only plugin) */
  customerWpTest: "https://rankpublish-test.local",
  /** Future production SaaS */
  productionSaas: "https://rankpublish.com",
} as const;

/** App URL shown in pairing UI and sent to WordPress. */
export function publicAppUrl(): string {
  const fromEnv = process.env.APP_URL?.replace(/\/+$/, "");
  if (fromEnv) {
    return fromEnv;
  }
  if (process.env.NODE_ENV === "production") {
    return ENV_URLS.stagingSaas;
  }
  return ENV_URLS.stagingSaas;
}
