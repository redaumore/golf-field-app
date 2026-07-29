# Project Testing Capabilities & Context

## Project Identification
- **Name**: golf-field-app
- **Version**: 1.10.0
- **Stack**: React 19, TypeScript 5.9, Vite 7, Tailwind CSS v4, Capacitor 7
- **Target Platform**: SPA / Web & Mobile (Capacitor)
- **Deployment**: Vercel

## Quality Assurance & Verification Setup
- **Linter**: ESLint 9 (`npm run lint` -> `eslint .`)
- **Type Checker**: TypeScript Compiler (`npm run build` -> `tsc -b && vite build`)
- **Test Runner**: Vitest 4 (`npm run test` -> `vitest run`)
- **Strict TDD Status**: Enabled (`strict_tdd: true`)

## Test Layers & Coverage
- **Unit Tests**: 3 files (`src/utils/__tests__/geo.test.ts`, `src/utils/__tests__/score.test.ts`, `src/data/__tests__/course.test.ts` - 17 passing tests)
- **Component Tests**: Planned (React Testing Library + jsdom configured in `vitest.config.ts`)
- **Integration Tests**: Planned (`App.tsx` state, localStorage persistence, Google Sheets sync)
- **E2E Tests**: Optional future addition (Playwright/Cypress)
- **Coverage Tool**: Vitest built-in v8 coverage available
