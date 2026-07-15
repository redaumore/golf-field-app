# Migration Plan: DB, Testing & Guest Player

## Phase 0 — Foundation & Tooling

- [ ] Choose database backend (recommended: Supabase — hosted Postgres + REST API)
- [ ] Install test dependencies: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`
- [ ] Install DB client: `@supabase/supabase-js` (or `express` + `pg` if custom backend)
- [ ] Create `vitest.config.ts` extending `vite.config.ts` with `jsdom` environment
- [ ] Create `src/test/setup.ts` — import jest-dom matchers, add cleanup
- [ ] Decide test file convention: co-located `*.test.ts(x)` vs `src/__tests__/`
- [ ] Add test script to `package.json`: `"test": "vitest"`, `"test:run": "vitest run"`

---

## Phase 1 — Database Migration (Google Sheets → PostgreSQL/Supabase)

### Schema Design

- [ ] Create `supabase/migrations/001_initial_schema.sql` with tables:
  - [ ] `rounds` — id, date, starting_hole, current_hole_index, is_finished
  - [ ] `hole_scores` — id, round_id FK, hole_number, approach_shots, putts, tee_lat, tee_lng
  - [ ] `shot_details` — id, hole_score_id FK, club, lat, lng, distance, is_representative, timestamp
  - [ ] `driving_sessions` — id, club, date, is_finished
  - [ ] `driving_shots` — id, session_id FK, direction, timestamp
- [ ] Add indexes on foreign keys (`round_id`, `hole_score_id`, `session_id`)

### Service Layer

- [ ] Create `src/services/supabase.ts` — Supabase client singleton
- [ ] Create `src/services/db.ts` with namespaced CRUD:
  - [ ] `db.rounds.getAll()`, `db.rounds.getById(id)`, `db.rounds.upsert(round)`, `db.rounds.delete(id)`
  - [ ] `db.holeScores.*` — CRUD for hole scores
  - [ ] `db.shotDetails.*` — CRUD for shot details
  - [ ] `db.drivingSessions.*` — CRUD for driving sessions
  - [ ] `db.drivingShots.*` — CRUD for driving shots
- [ ] Add error handling consistent with existing `console.error` + `throw` pattern

### Refactor App.tsx

- [ ] Replace `fetchRoundsFromGoogleSheets()` → `db.rounds.getAll()`
- [ ] Replace `saveRoundToGoogleSheets()` → `db.rounds.upsert()` + nested hole_scores + shot_details
- [ ] Replace `deleteRoundFromGoogleSheets()` → `db.rounds.delete()`
- [ ] Replace driving session calls with `db.drivingSessions.*` and `db.drivingShots.*`
- [ ] Keep localStorage as read-through cache for offline resilience

### Cleanup

- [ ] Delete `src/services/googleSheetsService.ts`
- [ ] Delete `src/constants/api.ts` (or archive)
- [ ] Remove sync conflict modal and related state (pendingRemoteRounds, unsavedLocalRoundsCount, etc.)
- [ ] Remove sync conflict handler functions (`handleKeepLocalRounds`, `handleDiscardLocalRounds`)
- [ ] Update `DrivingRange.tsx` — replace all googleSheetsService imports with `db.*`
- [ ] Update `src/constants/version.ts` if needed

---

## Phase 2 — Test Suite

### Unit Tests (no mocking, pure logic)

- [ ] `src/utils/geo.test.ts`:
  - [ ] Same point → 0 yd
  - [ ] Known Buenos Aires points → correct yardage
  - [ ] Symmetry: swap A/B → same result
  - [ ] Zero coordinates → 0
- [ ] `src/utils/score.test.ts`:
  - [ ] `calculateRelativeScore` — par round, +1, -1, empty scores, partial 9 holes
  - [ ] `calculateScoreDistribution` — all pars, eagle, birdie, bogey, double, triple, triple+, partial, empty
- [ ] `src/data/course.test.ts`:
  - [ ] Exactly 18 holes
  - [ ] Total par = 72
  - [ ] All par values in [3,4,5]
  - [ ] Handicaps 1-18 unique
  - [ ] All holes have teeLocation and greenCenter

### Service Layer Tests (mocked Supabase)

- [ ] `src/services/db.test.ts`:
  - [ ] `rounds.getAll` calls correct Supabase method
  - [ ] `rounds.upsert` sends correct payload
  - [ ] `rounds.delete` sends correct filter
  - [ ] Error responses propagate correctly

### Component Tests (React Testing Library + jsdom)

- [ ] `ThemeToggle` — click toggles context, correct icon per theme
- [ ] `ConfirmModal` — open/closed states, confirm/cancel buttons, custom text, showCancel=false
- [ ] `InfoModal` — open/closed, success/error/info icons, backdrop close
- [ ] `StartingHoleModal` — 18-hole grid, selection highlight, confirm/cancel callbacks
- [ ] `AppMenu` — open/closed, nav callbacks, backdrop close, contains ThemeToggle
- [ ] `RoundsManager`:
  - [ ] Empty state vs list rendering
  - [ ] Start New Round calls onCreateRound
  - [ ] View/Continue calls onSelectRound
  - [ ] Delete flow (modal → confirm → onDeleteRound)
  - [ ] Sync button spinner and callback
  - [ ] Multi-round suffix `#N`
  - [ ] Loading state
- [ ] `HoleView`:
  - [ ] Header renders hole number, par, distance
  - [ ] Approach +/- calls onUpdateScore
  - [ ] Putt +/- calls onUpdateScore
  - [ ] Star toggle flips isRepresentative
  - [ ] + button disabled without club selection
  - [ ] LostBall skips geolocation
  - [ ] GPS error → undefined location fallback
  - [ ] Navigation buttons call callbacks
  - [ ] isReadOnly disables all controls
  - [ ] Finish on last hole opens confirmation
  - [ ] Circular nav (isFirst/isLast relative to start)
  - [ ] Distance to green display
  - [ ] Hole image modal toggle
- [ ] `Scorecard`:
  - [ ] Total score and relative score header
  - [ ] Score distribution bar and stats grid
  - [ ] All 18 holes listed
  - [ ] Expand/collapse shot details
  - [ ] Color coding (yellow/red/blue/gray)
  - [ ] Back and menu button callbacks
  - [ ] Version indicator
- [ ] `DrivingRange`:
  - [ ] Club selection grid (no active session)
  - [ ] Shot input grid (active session)
  - [ ] Color-coded target buttons
  - [ ] Count badges
  - [ ] Undo pops last shot
  - [ ] Finish & Save flow
  - [ ] Discard removes session
  - [ ] Past sessions grouped by day
  - [ ] Pagination nav
  - [ ] Delete saved session

### Integration Tests

- [ ] `App.tsx` — view transitions (`rounds → play → scorecard → rounds`, `rounds → driving`)
- [ ] `App.tsx` — round lifecycle: create → play → finish → scorecard → back to list
- [ ] `App.tsx` — `generateRoundId` produces `dd-mm-yyyy`, multiple rounds get `-N`
- [ ] `App.tsx` — `handleNext`/`handlePrev` wrap around hole 1/18
- [ ] `App.tsx` — resume round loads scores, resets currentHoleIndex
- [ ] `App.tsx` — `ensureTeeLocation` on create, nav, resume
- [ ] `ThemeContext` — default 'modern', toggle changes `data-theme`, persists to localStorage, restores on mount, throws outside provider
- [ ] DB service — actual Supabase queries (test DB or local emulator)

---

## Phase 3 — Guest Player Feature

### Types

- [ ] Add `GuestHoleScore` interface: `{ holeNumber, approachShots, putts }`
- [ ] Add fields to `Round`: `guestScores?: Record<number, GuestHoleScore>`, `hasGuest?: boolean`

### Database

- [ ] Create migration: `ALTER TABLE rounds ADD COLUMN has_guest BOOLEAN DEFAULT FALSE`
- [ ] Create `guest_hole_scores` table: id, round_id FK, hole_number, approach_shots, putts, UNIQUE(round_id, hole_number)
- [ ] Add `db.guestScores.upsert()`, `db.guestScores.getForRound()` to service layer

### UI: Round Creation

- [ ] Add "Add Guest Player" toggle to `StartingHoleModal` (or round creation flow)
- [ ] When toggled, `round.hasGuest = true` and `round.guestScores = {}`

### UI: HoleView

- [ ] Add `guestScore?: GuestHoleScore` and `onUpdateGuestScore?: (delta: number, type: 'approach' | 'putt') => void` to `HoleViewProps`
- [ ] Render guest section below putting when `onUpdateGuestScore` is provided:
  - [ ] Two rows: `[-] N [+] approach` and `[-] N [+] putts`
  - [ ] No club selector, no GPS, no isRepresentative flag
- [ ] Respect `isReadOnly` for guest controls
- [ ] Ensure guest section does not display for non-guest rounds

### UI: Scorecard

- [ ] When `round.hasGuest`, show guest scores per hole
- [ ] Add tab/toggle between "Main" and "Guest" view, or show both
- [ ] Show guest total score and relative-to-par summary

### UI: RoundsManager

- [ ] Show "Guest" badge on rounds with `hasGuest: true`

### App.tsx

- [ ] Add `handleUpdateGuestScore(delta, type)` — updates `round.guestScores[holeNumber]`
- [ ] Pass `guestScore` and `onUpdateGuestScore` to `HoleView` when `currentRound.hasGuest`
- [ ] Persist `guestScores` and `hasGuest` to DB on save

### Tests: Guest Player

- [ ] Unit: new `calculateGuestStats` utility (if extracted)
- [ ] Component: `HoleView` renders guest section when `onUpdateGuestScore` provided
- [ ] Component: `HoleView` guest +/- buttons call callback with correct args
- [ ] Component: `Scorecard` shows guest data when present
- [ ] Component: `RoundsManager` shows guest badge
- [ ] Integration: create round with guest → play → verify guest scores persist to DB
- [ ] DB: guest_hole_scores CRUD operations

---

## Priority Order

| Priority | Area | Rationale |
|----------|------|-----------|
| **P0** | DB migration | Everything else depends on stable persistence |
| **P0** | Unit tests (utils, course data) | Pure logic, no mocking, highest ROI |
| **P0** | ThemeContext tests | Wraps entire app |
| **P1** | Reusable modal tests (Confirm, Info, StartingHole) | Simple, high coverage per test |
| **P1** | HoleView tests | Core gameplay, many edge cases |
| **P1** | Scorecard tests | Complex rendering logic |
| **P1** | DB service tests | All data flows through this |
| **P2** | RoundsManager tests | Complex state but mostly presentational |
| **P2** | DrivingRange tests | Second feature area |
| **P2** | App.tsx integration tests | High value but requires heavy mocking |
| **P2** | Guest player feature | Builds on tested foundations |
| **P3** | E2E flows | Manual QA sufficient initially |

---

## Key Decisions Needed

- [ ] **DB choice**: Supabase (recommended) vs custom backend vs in-browser SQLite
- [ ] **localStorage strategy**: Keep as offline cache or remove entirely
- [ ] **Guest UI on Scorecard**: Tab toggle vs column vs separate view
- [ ] **Guest per round or per session**: Only at creation time, or toggleable mid-round
