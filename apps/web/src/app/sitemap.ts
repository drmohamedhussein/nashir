import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = appUrl();
  return ["", "/download", "/pricing", "/privacy", "/terms", "/login", "/register"].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
  }));
}
