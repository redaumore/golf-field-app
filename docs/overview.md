# Golf App - System Documentation & Overview

This document provides a comprehensive overview of the golf score tracking and practice application. The app is designed as a Vite-powered React Single Page Application (SPA), deployable on Vercel, and wrappable as a mobile app using Capacitor.

---

## 1. Technical Stack

*   **Frontend Library:** React 19 (using hooks and context API)
*   **Language:** TypeScript (strict typechecking via `tsconfig.app.json` and `tsconfig.node.json`)
*   **Build Tool:** Vite 7 (optimized dev server and ESbuild-based bundling)
*   **Styling:** Tailwind CSS v4 via PostCSS (uses modern CSS-based theme variables rather than legacy JS configuration)
*   **Icons:** Lucide React
*   **Mobile Container:** Capacitor v7 (configured for iOS and Android platforms)
*   **Hosting:** Vercel (configured with custom route rewrites for SPA fallback)

---

## 2. Architecture & Directory Structure

The project has a clear division of components, contexts, data, services, and utility files:

```
src/
├── main.tsx             # App entry point, mounts ThemeProvider & App component
├── App.tsx              # Root component, manages global views and rounds state
├── App.css              # Unused boilerplate styles (marked for deletion)
├── index.css            # Global CSS, `@import "tailwindcss"`, CSS theme variables
├── types.ts             # TypeScript interface and type declarations
├── components/          # React Presentation & Container Components
│   ├── AppMenu.tsx            # Navigation slide-out drawer
│   ├── ThemeToggle.tsx        # Toggle button between Modern and High-Contrast themes
│   ├── HoleView.tsx           # Active round view (counter, club selector, GPS calculation)
│   ├── Scorecard.tsx          # Summary of round scores and shot distribution stats
│   ├── RoundsManager.tsx      # Landing page list of rounds, start round button, sync triggers
│   ├── ConfirmModal.tsx       # Reusable confirmation modal
│   ├── InfoModal.tsx          # Reusable success/error/info alerts replacement
│   └── StartingHoleModal.tsx  # Initial hole selector for shotgun or back-9 starts
├── constants/           # Global configurations
│   ├── api.ts                 # Google Apps Script Web App URL
│   └── version.ts             # Single source of truth for app version
├── contexts/            # React Contexts
│   └── ThemeContext.tsx       # Handles data-theme switching
├── data/                # Static assets & structures
│   └── course.ts              # Hardcoded 18-hole golf course (Lomas Athletic Club area coordinates)
├── services/            # API integration layer
│   └── googleSheetsService.ts # GET and POST sync client for Google Apps Script Web App
└── utils/               # Math & coordinates helper functions
    ├── geo.ts                 # Haversine distance calculator between GPS coordinates
    └── score.ts               # Round relative score and bogey/birdie distribution math
```

---

## 3. Core App Views

The application transitions dynamically between four views governed by the `View` type in `src/types.ts`:

### A. Rounds Manager (`'rounds'`)
The main landing page listing all played rounds.
*   **Rounds List:** Shows dates, total strokes, and completion status ("In Progress" vs. "Complete"). Ordered chronologically (newest first).
*   **Action Triggers:** Start a new round, resume an unfinished round, delete a round, or manually sync a round to the cloud.
*   **Local-Cloud Merge:** On startup, if a network connection exists, it fetches remote rounds and cross-checks them against localStorage. If unsaved local rounds are found, it triggers a **Sync Conflict Modal** asking the user whether to merge or discard local edits.

### B. Play / Hole View (`'play'`)
The core tracking screen used on the course.
*   **Strokes Counter:** Seperated into *Approach Shots* and *Putts*.
*   **Interactive Club Selection Grid:** Allows the user to select which club was hit (e.g., Driver `1w`, Woods `3w`, Irons `4i`–`9i`, Wedges `Pw` / `Sd` / `60`, or `LostBall`).
*   **GPS Distance Estimation:**
    1. When starting a hole or moving to the next, the tee location is auto-configured from static course data or current GPS coordinates.
    2. Adding an approach shot records the player's current coordinate and calculates the distance from the last shot location (or the tee) using the Haversine formula.
    3. Displays the current real-time distance from the player to the center of the green (`To Green`).
*   **Stats Flag (`isRepresentative`):** Allows tagging specific shots as "representative" for performance logging, or excluding recovery shots and bad hits from statistical averages.
*   **Visual Hole Map:** Displays a map image overlay of the hole (`/fields/CdeC/hoyo-[number].jpg`).

### C. Scorecard (`'scorecard'`)
A comprehensive summary of the current or reviewed round.
*   **Total Summary:** Displays total strokes, relative score to par (e.g., `+3`, `E`, `-1`), and expected par count.
*   **Score Distribution:** A segmented horizontal bar graph detailing the percentage of eagles or better, birdies, pars, bogeys, double bogeys, and triple bogeys.
*   **Interactive List:** A detailed list of all 18 holes. Tapping a hole expands it to reveal a table of individual shots, clubs used, calculated distances, and timestamps, as well as the initial tee GPS coordinates.

### D. Driving Range (`'driving'`)
A practice mode designed for range sessions.
*   **Session Start:** Allows selecting the active practice club (Driver, Wood, Long Iron, Short Iron).
*   **Target Log Grid:** Features a grid of 5 colored buttons (Red for *Far Left / Far Right*, Yellow for *Left / Right*, Green for *Center*) corresponding to target alignment.
*   **Live Aggregated Stats:** Real-time calculation of *Success %*, *Acceptable %*, and *Missed %*, accompanied by left vs. right deviation ratios.
*   **Practice History:** Grouped by calendar day, showing previous sessions, stroke distribution bars, and paging navigation (allowing offsets to fetch older entries from Google Sheets).

---

## 4. Google Sheets Synchronization & Cloud API

To prevent complex database hosting and backend code, the app synchronizes all data directly with a Google Spreadsheet via a Google Apps Script Web App.

*   **API Endpoint:** Defined in `src/constants/api.ts`.
*   **CORS Preflight Bypass:** Google Apps Script Web Apps do not natively handle HTTP `OPTIONS` requests (preflight) smoothly. To bypass this, all POST requests send payloads with a `Content-Type` of `text/plain;charset=utf-8`.
*   **Cache-Busting:** GET requests include a timestamp parameter (`?t=${Date.now()}`) to prevent the browser or service worker from serving stale cached round data.
*   **Data Translation:**
    *   **Rounds Payload:** Contains the round metadata, total score, and a nested key-value record of hole scores.
    *   **Driving Sessions Payload:** Practice sessions are logged with session ID, club, date, and a serialized string of shot directions.

---

## 5. Mobile Wrapper (Capacitor)

The codebase is prepared for compilation into mobile packages (`appId: com.golfapp.scorecard`).
*   **Platform Builds:** Mobile directories (`ios/` and `android/`) are excluded from source control and generated locally.
*   **Web Target:** Outputs to the `dist` folder.
*   **Mobile Permissions:** The app uses `navigator.geolocation` for course GPS mapping. For native Capacitor builds to work, permission declarations are required:
    *   **iOS:** `NSLocationWhenInUseUsageDescription` in `Info.plist`.
    *   **Android:** `ACCESS_FINE_LOCATION` and `ACCESS_COARSE_LOCATION` in `AndroidManifest.xml`.

---

## 6. Theme & Styling System

The styling is built using Tailwind CSS v4, styled around the CSS Custom Properties theme architecture.

*   **Theme Configurations:** Scoped to the `html[data-theme]` attribute:
    *   `[data-theme="modern"]`: Light mode. Uses subtle blues and greens.
    *   `[data-theme="high-contrast"]`: Dark mode. Uses premium slate colors, dark blue approach cards, and dark green putting cards.
*   **Utility Mapping:** Component classes are written using generic class identifiers mapping to theme custom variables (e.g. `theme-bg-primary`, `theme-text-secondary`, `theme-card-approach`) which change dynamically when the theme is toggled.
