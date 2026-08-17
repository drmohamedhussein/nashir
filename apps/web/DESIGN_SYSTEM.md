# RankPublish design system

SaaS UI follows the design foundation from [drmohamedhussein/rankpublish](https://github.com/drmohamedhussein/rankpublish).

## What is integrated

| Layer | Location |
|-------|----------|
| Design tokens (oklch) | `src/app/globals.css` |
| Typography | Manrope (Latin), IBM Plex Sans Arabic (RTL) |
| Brand mark | `src/components/rankpublish/brand-mark.tsx` |
| App shell (dark sidebar `#11172a`) | `src/components/rankpublish/app-dashboard-shell.tsx` |
| shadcn-style primitives | `src/components/ui/*` |
| `cn()` utility | `src/lib/utils.ts` |

## Sync upstream

```bash
node deploy/local/sync-design-system.cjs
```

This clones/updates the GitHub repo and copies `client/src/index.css` to `design/rankpublish/index.css` for diffing.

## Conventions

- Use `Button`, `Card`, `Input` from `@/components/ui/*` for new UI.
- Marketing pages: `SiteHeader` / `SiteFooter` in `site-chrome.tsx`.
- Authenticated app: `AppDashboardShell` via `app/app/layout.tsx`.
