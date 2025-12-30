# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
bun install           # Install dependencies (uses Bun runtime)
npm run dev           # Start dev server on port 3000
npm run build         # Build for production
npm start             # Run production build

# Code Quality
npm run check         # Full Biome check (lint + format + organize imports)
npm run lint          # Run linter only
npm run format        # Auto-format code

# Testing
npm run test          # Run Vitest tests
```

## Architecture

**Calorie Tracker** - Full-stack nutrition tracking app using TanStack Start with Nitro server runtime.

### Tech Stack
- **Frontend**: React 19 + TanStack Router (file-based routing)
- **Server**: TanStack Start with Nitro, React Server Functions via `createServerFn`
- **Database**: LibSQL/Turso (serverless SQLite)
- **Styling**: Tailwind CSS 4 + shadcn/ui components
- **Runtime**: Bun

### Key Patterns

**File-based Routing** (`src/routes/`):
- `__root.tsx` - Server-rendered HTML shell
- `_sidebar.tsx` - Layout wrapper with navigation sidebar
- `_sidebar/*.tsx` - Protected dashboard routes
- `auth/*.tsx` - Authentication pages
- `routeTree.gen.ts` - Auto-generated, do not edit

**Server Functions** - Use `createServerFn` from `@tanstack/react-start`:
```typescript
export const myServerFn = createServerFn({ method: "POST" })
  .inputValidator((data) => { /* validation */ })
  .handler(async ({ data }) => { /* server-side logic */ })
```

**Database** (`src/db/database.ts`):
- LibSQL client with auto-initialization
- Schema: `users` table with username/password authentication

**UI Components** (`src/components/ui/`):
- shadcn/ui with Radix primitives and CVA variants
- Use `cn()` from `src/lib/utils.ts` for class merging

### Path Aliases
- `@/*` resolves to `./src/*`

### Environment Variables
Required in `.env` (see `.env.example`):
- `DATABASE_URL` - Turso database URL
- `DATABASE_AUTH_TOKEN` - Turso auth token
- `BETTER_AUTH_SECRET` - Authentication secret
