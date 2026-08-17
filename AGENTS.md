# golf-field-app

React 19 + TypeScript + Vite SPA for golf score tracking. Tailwind CSS v4 via PostCSS. No test framework. Deployed on Vercel.

## Commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | `tsc -b && vite build` — **typecheck first** |
| `npm run lint` | `eslint .` |
| `npm run preview` | Preview production build locally |

There is no typecheck-only script. No tests exist. Always run `npm run build` to verify before committing (type errors are caught only at build time).

## TypeScript quirks

- `verbatimModuleSyntax: true` — use `import type` for type-only imports
- `erasableSyntaxOnly: true` — no `enum`, no `namespace`, no parameter properties
- `noUnusedLocals` and `noUnusedParameters` are strict
- Two-project references: `tsconfig.app.json` (src/) and `tsconfig.node.json` (vite.config.ts)

## Architecture

Single-page app with 4 views: `'rounds'` | `'play'` | `'scorecard'` | `'driving'` (see `src/types.ts:56`).

Key structure:
- `src/data/course.ts` — hardcoded single 18-hole course with geo coordinates (Buenos Aires area)
- `src/services/googleSheetsService.ts` — sync via Google Apps Script Web App
- `src/contexts/ThemeContext.tsx` — dark/high-contrast theme via CSS custom properties + `data-theme` attribute
- Round IDs are date-based: `dd-mm-yyyy` (or `dd-mm-yyyy-N` for multiple rounds the same day)

## Google Sheets sync

API URL is in `src/constants/api.ts`. Override per environment by setting `VITE_GOOGLE_SHEETS_API_URL` in `.env` (see `.env.example`). Falls back to the hardcoded production URL. All POST requests use `Content-Type: text/plain;charset=utf-8` to avoid CORS preflight (Google Apps Script quirk). Fetch uses `GET` with cache-busting `?t=${Date.now()}`.

## Capacitor

Capacitor config at root (`capacitor.config.ts`), appId `com.golfapp.scorecard`. No `android/` or `ios/` platforms are checked in — run `npx cap add android` / `npx cap add ios` locally to generate them.

## Vercel

All routes rewrite to `/index.html` (SPA fallback). Assets in `/assets/` have immutable caching (1 year). Build command is `npm run build`, output is `dist/`.

## Styling

Tailwind v4 (`@import "tailwindcss"`). Theme system uses CSS custom properties scoped to `[data-theme="modern"]` / `[data-theme="high-contrast"]` — **not** the Tailwind `dark:` variant. Component template classes use `theme-*` utility classes defined in `src/index.css`.

## Versioning

The version lives in **two places, kept in sync**: `package.json` (`version`) and `src/constants/version.ts` (`APP_VERSION`, shown in the UI headers).

- A `commit-msg` hook (`.githooks/commit-msg`) bumps the version based on the conventional-commit type: `feat:` → **minor**, `fix:` → **patch**, anything else (`docs`, `chore`, `refactor`, `test`, etc.) → no bump. A `post-commit` hook (`.githooks/post-commit`) then commits that bump as a paired `chore: bump version to X.Y.Z` commit — git hooks can't include the bump in the *same* commit because the message isn't available to the hook that can modify the tree.
- Manual bump: `npm run version:bump` (patch) or `npm run version:bump:minor` (minor).
- The hooks need `core.hooksPath` set once per clone: `git config core.hooksPath .githooks`. Skip a bump with `git commit --no-verify`.
