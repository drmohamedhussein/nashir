export const SOCIAL_PLATFORMS = [
  "facebook",
  "x",
  "linkedin",
  "pinterest",
  "instagram",
  "medium",
  "threads",
  "google_business",
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const DEFAULT_TEMPLATES: Record<SocialPlatform, string> = {
  facebook: "{title}\n{url}\n{excerpt}",
  x: "{title} {url}",
  linkedin: "{title}\n{excerpt}\n{url}",
  pinterest: "{title}\n{url}",
  instagram: "{title}\n{excerpt}",
  medium: "{title}\n\n{excerpt}\n\n{url}",
  threads: "{title}\n{url}",
  google_business: "{title}\n{url}",
};

export function renderTemplate(
  template: string,
  data: { title: string; url: string; excerpt?: string },
): string {
  return template
    .replaceAll("{title}", data.title)
    .replaceAll("{url}", data.url)
    .replaceAll("{excerpt}", data.excerpt ?? "");
}
