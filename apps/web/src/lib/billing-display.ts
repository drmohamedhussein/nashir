export function publicListPriceCents(cents: number): number {
  return cents === 990 ? 999 : cents;
}

export function formatUsdFromCents(cents: number): string {
  const dollars = publicListPriceCents(cents) / 100;
  if (!Number.isFinite(dollars) || dollars < 0) {
    return "$0";
  }
  if (Math.abs(dollars - Math.round(dollars)) < 0.001) {
    return `$${Math.round(dollars)}`;
  }
  return `$${dollars.toFixed(2)}`;
}

export function siteDisplayUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }
  const compact = url.trim().replace(/\s+/g, "");
  if (!compact) {
    return null;
  }
  try {
    const parsed = new URL(compact.includes("://") ? compact : `https://${compact}`);
    const path = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/$/, "");
    return `${parsed.origin}${path}`;
  } catch {
    return compact;
  }
}
