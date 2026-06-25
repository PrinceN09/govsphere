# ADR-004 — Use Next.js 15 for the Web Application

**Status:** Accepted **Date:** 2026-06 **Deciders:** GovSphere Engineering Team

---

## Context

GovSphere requires a web application that:

- Supports five languages (fr, en, ln, sw, lua) with server-side i18n
- Can render dashboard pages server-side for performance on slower connections
- Shares TypeScript types and utility libraries with the API via the monorepo
- Can be deployed as a static export or a Node.js server
- Supports progressive enhancement (works on older government machines)

## Decision

We will use **Next.js 15** with the App Router.

The web app lives at `apps/web/` in the monorepo. It consumes the NestJS API at `API_URL` and uses
`next-intl` for internationalization.

## Alternatives Considered

**Vite + React SPA:**

- Rejected. SPAs have poor initial load performance on slow connections. No native SSR or i18n
  routing. SEO is not required here, but SSR improves perceived performance for dashboard pages that
  are data-heavy.

**Remix:**

- Considered. Good data loading model, but smaller ecosystem and less Next.js interoperability with
  our monorepo tooling (Turborepo has first-class Next.js support).

**Angular:**

- Rejected. Not aligned with our TypeScript/React monorepo. Heavier framework with a longer learning
  curve for new contributors.

**Nuxt.js (Vue):**

- Rejected. Team competency is in React. Mixing Vue and React across packages would fragment the
  component library.

## Consequences

**Positive:**

- App Router enables React Server Components — data fetched on the server, reducing client bundle
  size
- `next-intl` provides server-side i18n for all 5 languages with type-safe translation keys
- Turborepo has a first-class `next` pipeline task — incremental builds work out of the box
- File-based routing mirrors the government portal's navigation structure
- `@govsphere/ui` shared component library is consumed directly from the monorepo

**Negative:**

- App Router has a steeper learning curve than the old Pages Router
- React Server Components require careful separation of server and client code
- Hot module replacement is slower in large App Router apps compared to Vite

## i18n Strategy

- Default language: French (`fr`) — all official government communications
- Locale prefix in URL: `/fr/dashboard`, `/en/dashboard`, `/ln/dashboard`
- Locale detection: browser `Accept-Language` header, falling back to `fr`
- Server-side translations with `next-intl` — no client-side loading waterfall
- All 5 locales must be translated before any new string is merged
