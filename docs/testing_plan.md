# Test Plan: Golf Field App

No test framework exists yet. All tests must be written from scratch. `vitest` is the recommended choice (same Vite ecosystem, supports React Testing Library well).

---

## Phase 1: Pure Unit Tests (fast, no DOM)

### `src/utils/geo.ts` — `calculateDistance`

| Test | Input | Expect |
|------|-------|--------|
| Same point | identical coordinates | 0 yd |
| Known distance | two Buenos Aires course points | ~40–500 yd range |
| Identity symmetry | swap A and B | same result |
| Edge: zero coords | (0,0) → (0,0) | 0 |

### `src/utils/score.ts` — `calculateRelativeScore`

| Test | Input | Expect |
|------|-------|--------|
| Par round (all pars) | all scores = hole par | 0 |
| One over par | scores sum = par + 1 | 1 |
| Under par (birdie) | scores sum = par - 1 | -1 |
| Empty scores `{}` | no holes played | 0 |
| Partial round | 9 holes with scores | correct relative |
| Mixed par-3/4/5 course | full 18 | correct diff |

### `src/utils/score.ts` — `calculateScoreDistribution`

| Test | Input | Expect |
|------|-------|--------|
| All pars | all = hole par | pars = 18, rest = 0 |
| Eagle | diff = -2 | eaglesOrBetter = 1 |
| Birdie | diff = -1 | birdies = 1 |
| Bogey, double, triple | diffs 1, 2, 3 | each = 1 |
| Triple+ | diff 4+ | otherBogeys |
| Partial round | 9 holes only | only 9 counted |
| Empty input | `{}` | all zeros |

### `src/data/course.ts` — COURSE_DATA integrity

| Test | Expect |
|------|--------|
| Exactly 18 holes | length === 18 |
| Total par = 72 | `sum(h.par)` === 72 |
| All par values valid | `h.par` in `[3, 4, 5]` |
| All holes numbered 1–18 | contiguous |
| Handicaps unique 1–18 | `new Set(h.handicap).size === 18` |
| Coordinates exist | every hole has `teeLocation` and `greenCenter` |

---

## Phase 2: Component Tests (React Testing Library + jsdom)

### `ThemeToggle`
- Click toggles theme context (assert `toggleTheme` called)
- Renders contrast/sun icon matching current theme

### `ConfirmModal`
- Renders nothing when `isOpen = false`
- Renders title, message, confirm/cancel buttons when open
- `onConfirm` fires on confirm click
- `onCancel` fires on cancel click and backdrop click
- `showCancel = false` hides cancel button
- Custom button text rendered correctly

### `InfoModal`
- Renders nothing when closed
- Renders title, message, OK button when open
- Shows success/error icon based on type prop
- Backdrop click calls `onClose`

### `StartingHoleModal`
- Renders 18-hole grid
- Click selects a hole (visual highlight)
- Confirm passes selected hole to `onConfirm`
- Cancel calls `onCancel`

### `AppMenu`
- Renders nothing when `isOpen = false`
- Renders drawer and nav actions when open
- Click "Golf Rounds" calls `onNavigateToRounds`
- Click "Driving Range" calls `onNavigateToDriving`
- Backdrop click calls `onClose`
- Contains `ThemeToggle`

### `RoundsManager`
- Renders "No rounds yet" when list empty
- Renders list with dates, scores, badges when rounds exist
- "Start New Round" calls `onCreateRound`
- Click View/Continue calls `onSelectRound(id)`
- Delete opens confirmation, then calls `onDeleteRound`
- Sync button shows spinner and calls `onSyncRound(id)`
- Loading state shows spinner
- Multi-round suffix `#N` displayed on same-day rounds

### `HoleView`
- Renders hole number, par, distance
- Approach/putt increment/decrement call `onUpdateScore` with correct args
- Star toggle flips `isRepresentative` flag
- "+" approach button disabled without club selection
- `LostBall` club skips geolocation for approach
- GPS error fallback passes `undefined` location
- Prev/Next nav calls callbacks
- `isReadOnly` disables all interactive elements
- Finish button on last hole opens confirmation
- Circular nav: `isFirst` / `isLast` correct relative to start
- Distance to green shown when GPS available
- Hole image modal toggles

### `Scorecard`
- Renders total score and relative score header
- Score distribution bar and counts rendered
- All 18 holes listed
- Click hole expands shot detail table
- Color coding correct (red = under, blue = E, etc.)
- Back and menu buttons fire callbacks
- Version indicator displayed

### `DrivingRange`
- Shows club selection grid when no active session
- Shows shot-input grid and live stats during active session
- Color-coded target buttons (red/yellow/green) fire correct direction
- Click count badges increment on each button
- Undo pops last shot
- Finish & Save marks finished, saves
- Discard removes session
- Past sessions grouped by day, paginated
- Delete saved session asks confirmation

---

## Phase 3: Integration Tests

### `App.tsx` — State and Navigation
- View transitions: `rounds → play → scorecard → rounds`
- View transitions: `rounds → driving`
- `generateRoundId` produces `dd-mm-yyyy` format
- Multiple rounds same day produce `dd-mm-yyyy-2`, `-3`, etc.
- `handleNext` / `handlePrev` wrap around hole 1/18
- Round finish marks `isFinished`, saves to localStorage
- Round resume loads existing scores
- `ensureTeeLocation` sets tee on round create, nav, and resume

### `App.tsx` — Sync and Persistence
- Rounds persist to localStorage on state change
- Rounds load from localStorage on mount
- Online fetch detects remote rounds, merges
- Sync conflict modal shows when local-only rounds exist
- "Keep Local" merges remote into localStorage
- "Discard" keeps remote only
- Network failure during sync does not lose local data

### `ThemeContext`
- Default theme is `'modern'` (light)
- Toggle switches `data-theme` on `<html>`
- Theme persists in localStorage
- `<html>` attribute restored on mount from localStorage
- `useTheme` throws outside provider

### `googleSheetsService` — Network
- POST with `Content-Type: text/plain;charset=utf-8` (no preflight)
- GET with `?t=` cache buster
- Error response (`result.error: '...'`) throws
- Network failure throws (test with mock/fetch rejection)
- `fetchRoundsFromGoogleSheets` parses array and object responses
- Round IDs with leading apostrophe stripped
- Driving session shots as JSON string parsed correctly

---

## Phase 4: E2E / User Flow Tests (optional — Playwright or Cypress)

1. **Full Round Play** — Start round on hole 1 → play 18 holes (approach + putt each) → finish → verify scorecard
2. **Resume Round** — Play 3 holes → leave → return → verify scores intact
3. **Driving Session** — Start session → take 10 shots → finish → verify in history
4. **Theme Toggle** — Toggle to high-contrast → verify CSS variables → refresh → verify persisted
5. **Sync Conflict** — Play round offline → go online → verify conflict modal appears
6. **Delete Round** — Delete from list → verify gone from UI and localStorage

---

## Suggested Tools and Setup

| Tool | Purpose |
|------|---------|
| `vitest` | Test runner (same Vite ecosystem) |
| `@testing-library/react` | Component rendering and queries |
| `@testing-library/jest-dom` | Custom DOM matchers (`toBeInTheDocument`, etc.) |
| `@testing-library/user-event` | Realistic user interactions |
| `jsdom` | DOM environment for components |
| `msw` (optional) | Mock Google Sheets API at network level |
| `playwright` or `cypress` | E2E tests (lower priority) |

### Config additions

- `vitest.config.ts` — test runner config, likely extends `vite.config.ts`
- `src/test/setup.ts` — RTL cleanup + jest-dom imports
- `src/__tests__/` or co-located `*.test.ts(x)` files

---

## Priority Order

| Priority | Area | Rationale |
|----------|------|-----------|
| **P0** | `utils/geo.ts`, `utils/score.ts` | Pure logic, no setup, highest ROI |
| **P0** | `COURSE_DATA` integrity | Data correctness affects all downstream |
| **P0** | `ThemeContext` | Wraps entire app, breaks everything if wrong |
| **P1** | `ConfirmModal`, `InfoModal`, `StartingHoleModal` | Simple, reusable, high coverage with few tests |
| **P1** | `HoleView`, `Scorecard` | Core business logic, many edge cases |
| **P1** | `googleSheetsService` | All data sync goes through this |
| **P2** | `RoundsManager`, `DrivingRange` | Complex state, but mostly presentational |
| **P2** | `App.tsx` integration | High-value but requires mocking many dependencies |
| **P3** | E2E flows | Manual QA sufficient for now |
