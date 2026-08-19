import { API_ERRORS } from "./api-errors";

/** RankPublish HQ / marketing hosts — never a customer Site origin. */
export const HQ_HOSTS = new Set([
  "nashir.satest.top",
  "www.nashir.satest.top",
  "rankpublish.com",
  "www.rankpublish.com",
]);

export function originHost(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url.hostname.toLowerCase();
  } catch {
    return null;
  }
}

function canonicalHost(host: string): string {
  return host.replace(/^www\./, "");
}

export function isHqOrigin(value: string): boolean {
  const host = originHost(value);
  if (!host) {
    return false;
  }
  return HQ_HOSTS.has(host) || HQ_HOSTS.has(canonicalHost(host));
}

export function normalizeSiteUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

export type CustomerUrlResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export function customerSiteUrlOrError(value: string): CustomerUrlResult {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, error: API_ERRORS.INVALID_WP_URL };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: API_ERRORS.INVALID_WP_URL };
  }
  if (isHqOrigin(value)) {
    return { ok: false, error: API_ERRORS.HQ_SITE_BLOCKED };
  }
  parsed.hash = "";
  parsed.search = "";
  return { ok: true, url: normalizeSiteUrl(parsed.toString()) };
}

export function rejectHqOrigin(value: string): string | null {
  if (isHqOrigin(value)) {
    return API_ERRORS.HQ_SITE_BLOCKED;
  }
  return null;
}

export type IntendedSite = {
  url: string | null;
  name: string;
  blocked: boolean;
};

export function readIntendedSite(siteUrl: string, siteName = ""): IntendedSite {
  const name = siteName.trim();
  const raw = siteUrl.trim();
  if (!raw) {
    return { url: null, name, blocked: false };
  }
  const parsed = customerSiteUrlOrError(raw);
  if (!parsed.ok) {
    return { url: null, name, blocked: parsed.error === API_ERRORS.HQ_SITE_BLOCKED };
  }
  return { url: parsed.url, name, blocked: false };
}
