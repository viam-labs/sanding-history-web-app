# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a React TypeScript web application for monitoring sanding pass history, deployed as a Viam module. The app displays historical sanding passes with video/image captures, robot config downloads, diagnosis tracking, and daily aggregation metrics. It runs as a single-machine web app in the Viam platform, served via the module proxy.

## Key Commands

### Development
```bash
npm install                    # Install dependencies
npm run dev                    # Start development server (runs on port 3000)
npm run build                  # Build for production
npm run preview                # Preview production build
```

### Development with Viam Proxy
The app requires a Viam proxy to run properly:
```bash
viam module local-app-testing --app-url http://localhost:3000 --machine-id <machine-id>
```

### Production Testing
```bash
npm run start                  # Build and serve production build locally
```

### Testing & Quality
```bash
npm run test                   # Run tests with Vitest
npm run test:ui                # Run tests with Vitest UI
npm run sanity                 # Run typecheck + lint
npm run typecheck              # TypeScript type checking (no emit)
npm run lint                   # Lint TypeScript/React files
npm run lint:fix               # Fix linting issues
npm run prettier               # Format code
```

### Build Analysis
```bash
npm run view-bundle            # Analyze bundle size (sets ANALYZE_DEBUG=true)
```

### Version Management
When making changes to the repo, use changesets for semantic versioning:
```bash
npx @changesets/cli            # Create a changeset for your changes
```

### Module Deployment

**Production deployment:**
```bash
make module                    # Build and package module (creates module.tar.gz)
```

**Beta deployment:**
Before deploying to beta, update `module_id` in `meta-beta.json` to point to your personal module, then:
```bash
make module-beta               # Deploy to beta environment
```

This is critical for prod-like testing until proper CI is established for beta environments.

## Architecture

### URL and Authentication Flow

The app expects to be served at URLs like:
```
/machine/[machine-name]-main.[location-id].viam.cloud
```

Authentication and machine info are provided via cookies set by the Viam module proxy. The cookie key is the machine info string from the URL (e.g., `machine-name-main.location-id.viam.cloud`), and contains JSON with:
- `apiKey.id` and `apiKey.key` - Viam API credentials
- `hostname` - Robot hostname
- `machineId` - Robot ID

The `ViamClientContext` (src/lib/contexts/ViamClientContext.tsx) parses this and initializes two clients:
- `viamClient` - For app API calls (data queries, metadata)
- `robotClient` - For direct robot connections (optional)

### Data Architecture

**Pass Summaries (MQL Queries):**
The app queries sanding pass summaries from the `sanding-summary` sensor component using MQL (MongoDB Query Language) via `tabularDataByMQL()`. Data is fetched in batches of 1000 records, initially loading the last 7 days, then fetching all historical data. This is handled in `PassContext` (src/lib/contexts/PassContext.tsx).

**Binary Data (Files, Videos, Images):**
Binary data (videos, images, logs, configs) is queried using the Data API via `binaryDataByFilter()`. The `FileQueryManager` (src/lib/FileQueryManager.ts) manages pagination and caching:
- Videos are fetched once per machine and cached globally
- Images are fetched per-pass with time-based filtering
- Files are fetched per-pass with broader time buffers

**Metadata (Notes and Diagnoses):**
Pass notes and diagnoses are stored in robot metadata as flat key-value pairs:
- Notes: `note-{passId}` → JSON-stringified `PassNote`
- Diagnoses: `diagnosis-{passId}` → JSON-stringified `PassDiagnosis`

The `PassMetadataManager` (src/lib/passMetadataManager.ts) uses a singleton pattern to manage this data with caching and incremental updates.

### Context Hierarchy

The app uses a deep context provider tree (Root.tsx):

```
ToastProvider                    # Toast notifications
└─ ViamClientProvider            # Viam SDK clients (viamClient, robotClient)
   └─ PassProvider               # Pass summaries, notes, diagnoses
      └─ FilesProvider           # Binary file query manager
         └─ PaginationProvider   # Pagination state
            └─ ModalProvider     # Modal state
               └─ HashRouter     # React Router
```

Additional contexts used within the main app:
- `CameraProvider` - Selected camera state (App.tsx)
- `VideoStoreProvider` - Video store selection (App.tsx)
- `SinglePassProvider` - Individual pass data per row (HistoryTable/index.tsx)

### Component Architecture

**Main Pages:**
- `Root.tsx` - Sets up routing and context providers
- `App.tsx` - Main list view with `ResourceSelection` and `HistoryTable`
- `VideoDetailPage.tsx` - Video detail view (`/videos/:videoId`)

**HistoryTable Components (src/components/HistoryTable/):**
The history table is modular with these key components:
- `index.tsx` - Main table orchestrator with day grouping and aggregation
- `Row.tsx` - Expandable row for each pass
- `CollapsedRow.tsx` - Compact row view
- `DaySummaryHeader.tsx` - Daily aggregation header (execution %, time, blue points, diagnoses)
- `StepsGrid.tsx` - Grid of steps within a pass
- `StepVideosGrid.tsx` - Video grid for a step
- `StepImagesGrid.tsx` - Image grid for a step
- `PassInfo.tsx` - Pass metadata display
- `Diagnosis.tsx` - Diagnosis selection UI (symptom/cause)
- `PassFiles.tsx` - File downloads (logs, configs)
- `Pagination.tsx` - Pagination controls

**Reusable Components (src/components/):**
- `Spinner.tsx`, `LoadingIndicator.tsx` - Loading states
- `StatusBadge.tsx` - Pass status display
- `Button.tsx` - Reusable button component
- `VideoModal.tsx`, `SnapshotModal.tsx`, `BeforeAfterModal.tsx` - Media modals
- `ImageDisplay.tsx` - Image display with loading states
- `RenderIf.tsx` - Conditional rendering helper

### Utilities (src/lib/)

**Core Managers:**
- `FileQueryManager.ts` - Binary data query manager with pagination and caching
- `passMetadataManager.ts` - Metadata CRUD operations (notes, diagnoses)
- `videoPollingManager.ts` - Video upload polling with exponential backoff

**Utilities:**
- `configUtils.ts` - Robot config comparison and formatting
- `passUtils.ts` - Pass-related utilities
- `videoUtils.ts` - Video file utilities
- `snapshotUtils.ts` - Snapshot utilities
- `uiUtils.tsx` - UI helper functions
- `BinaryDataFile.ts` - Binary data file wrapper class
- `types.ts` - TypeScript type definitions

### Styling

The app uses Tailwind CSS 4.x with the `@tailwindcss/vite` plugin. Configuration is in `tailwind.config.ts`. Some legacy CSS exists in `src/AppInterface.css` (being phased out).

**Styling Guidelines (from PR template):**
- Use Tailwind utility classes
- Split code into components where possible
- Use contexts instead of prop drilling
- Deploy changes to personal module for testing (unless very small)

## Technology Stack

- **Framework:** React 18.2 with TypeScript 5.0
- **Routing:** React Router DOM 7.10.1 (HashRouter for module compatibility)
- **Build Tool:** Vite 7.3.0 with plugins for React, Svelte, Tailwind
- **Styling:** Tailwind CSS 4.1.13
- **Viam SDK:** @viamrobotics/sdk 0.57.0
- **Testing:** Vitest
- **Linting:** ESLint 9.x with TypeScript and React plugins
- **Svelte Integration:** Uses Svelte 5.46 and @viamrobotics/svelte-sdk for some components

Note: The app uses both React and Svelte. Svelte components can be embedded in React via `useSvelte` hook (src/lib/hooks/useSvelte.tsx).

## Important Patterns

### Query Patterns

**Batch Fetching:** Pass summaries are fetched in batches of 1000 using MQL with time-based pagination. The initial query loads the last 7 days quickly, then continues fetching all historical data in the background.

**Time Buffers:** Binary data queries use time buffers to account for upload delays:
- Images: +1 hour buffer
- All files: +3 hour buffer

**Abort Signals:** Image and file queries support abort signals for cleanup when components unmount or passes change.

### Caching Strategy

**FileQueryManager:**
- Videos: Global cache per machine (never refetched unless `forceRefresh=true`)
- Images: Per-pass cache (refetched if not loaded)
- Files: Per-pass cache (refetched if not loaded)

**PassMetadataManager:**
- Singleton per machine ID
- In-memory cache for notes and diagnoses
- Incremental updates to avoid overwriting other apps' metadata

### Performance Optimizations

- Lazy loading: `HistoryTable` and `Row` components are lazy-loaded
- Suspense boundaries: Used for graceful loading states
- Memoization: Heavy computations (day aggregates, grouped passes) are memoized
- Pagination: Passes are paginated client-side (handled by `PaginationContext`)

## Testing Guidelines

- Use Vitest for unit/integration tests
- Deploy to personal module for integration testing before merging
- Run `npm run sanity` before committing

## Known Issues & TODOs

- Legacy `AppInterface.css` should be migrated to Tailwind
- `@typescript-eslint/no-explicit-any` is disabled (should be re-enabled eventually)
- No proper CI for beta environment deployment yet
- PassContext could be decomposed into separate contexts for notes/diagnoses and pass summaries
