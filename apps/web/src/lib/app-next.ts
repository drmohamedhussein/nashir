/**
 * Allow only in-app relative paths, including query strings such as
 * /app/getting-started?siteUrl=https://customer.example
 */
export function safeAppNextPath(raw: string | null | undefined, fallback = "/app"): string {
  if (!raw) {
    return fallback;
  }
  try {
    const url = new URL(raw, "https://rankpublish.invalid");
    if (url.origin !== "https://rankpublish.invalid") {
      return fallback;
    }
    if (url.pathname.startsWith("//") || !url.pathname.startsWith("/app")) {
      return fallback;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
