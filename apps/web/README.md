# @prinodia/web

Next.js 15 web application — the primary interface for Prinodia Workspace.

## Stack

- Next.js 15 (App Router, Server Components)
- TypeScript
- Tailwind CSS
- next-intl (i18n — FR, EN, Lingala, Swahili, Tshiluba)
- NextAuth.js (session management)
- TanStack Query (server state)
- Zustand (client state)
- Socket.IO client (real-time)

## Dev

```bash
cd apps/web
npm run dev    # http://localhost:3000
```

## Structure (to be built)

```
src/
├── app/              Next.js App Router pages
│   ├── [locale]/     Locale-scoped routes
│   ├── (auth)/       Login, MFA, forgot-password
│   └── (dashboard)/  Main workspace layout
├── components/       App-specific components
├── hooks/            Custom React hooks
├── lib/              Client utilities
├── store/            Zustand stores
└── middleware.ts     i18n routing middleware
```
