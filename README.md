# Sanding Monitoring Web App

A React TypeScript application for monitoring and analyzing sanding pass history, integrated with the Viam platform.

## Features

- Sanding pass history visualization with expandable detail rows
- Video and image capture viewing per step
- Robot config download and comparison between passes
- Diagnosis tracking (symptoms/causes) for failed passes
- Daily aggregation with execution time metrics
- Log download per step for debugging

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

3. Start the viam proxy:
   ```bash
   viam module local-app-testing --app-url http://localhost:3000 --machine-id <machine-id>
   ```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Project Structure

- `src/Root.tsx` - Sets up routing and Viam client context
- `src/App.tsx` - Fetches sanding pass data
- `src/AppInterface.tsx` - Legacy UI component (being refactored)
- `src/NewAppInterface.tsx` - Refactored UI component (uses modular components)
- `src/components/` - Reusable UI components
- `src/lib/` - Utilities, types, and contexts
- `src/index.tsx` - Application entry point
- `index.html` - HTML template
- `vite.config.ts` - Vite configuration

## Dependencies

- React 18.2.0
- React DOM 18.2.0
- React Router DOM 7.10.1
- @viamrobotics/sdk 0.57.0
- js-cookie 3.0.5
- Vite 4.4.0
- TypeScript 5.0.0
- @vitejs/plugin-react 4.0.0
- Type definitions for React, React DOM, React Router DOM, and js-cookie

# History CLI

`sanding-history` is a standalone command-line tool for inspecting sanding-run
history for a single machine, without opening the web app. It reads the same run
data the web UI shows and reuses the web app's data-fetching and formatting code,
so its output matches the history table and the run-detail view.

It has two commands:

- `log` — lists past runs as scannable plain text, newest first.
- `detail <run-id>` — prints everything known about one run as a JSON block.

## Building & installing

The tool is bundled separately from the web app into a single Node script, then
exposed as a `sanding-history` command:

```bash
make sanding-history   # or: npm run build:sanding-history
npm link               # puts `sanding-history` on your PATH (one time)
```

The build produces `dist-sanding-history/sanding-history.mjs`. After linking,
just run `sanding-history <command>` from anywhere. Node 22+ is required. If you
manage Node with nodenv/rbenv-style shims, run `nodenv rehash` once after
`npm link` so the command resolves. (`npm unlink -g sanding-monitoring-web-app`
removes the command.)

If you'd rather not install it globally, `npm run sanding-history -- <command>`
runs the built script in place.

## Authenticating

The CLI talks to Viam cloud with an API key and targets one machine. Provide
the following as flags or environment variables (flags take precedence):

| Flag            | Environment variable | Meaning                                   |
| --------------- | -------------------- | ----------------------------------------- |
| `--host`        | `VIAM_HOST`          | Machine host, `name.LOCATION.viam.cloud`  |
| `--api-key-id`  | `VIAM_API_KEY_ID`    | Viam API key id                           |
| `--api-key`     | `VIAM_API_KEY`       | Viam API key secret                       |
| `--robot-id`    | `VIAM_ROBOT_ID`      | Machine id to query                       |
| `--org-id`      | `VIAM_ORG_ID`        | Organization id (defaults to the first org the key can see) |

The location is parsed from `--host`: it is the segment immediately before
`viam.cloud` (so `name.LOCATION.viam.cloud` → `LOCATION`). The host must be the
full `name.LOCATION.viam.cloud` form.

```bash
export VIAM_HOST=my-machine-main.abcd1234.viam.cloud
export VIAM_API_KEY_ID=...
export VIAM_API_KEY=...
export VIAM_ROBOT_ID=...
```

## `log`

Lists runs newest first, grouped by day. Each day starts with a summary line
(total runs, total elapsed time, time spent executing vs. other steps, the
execution percentage, and a tally of failure symptoms and causes for that day).
Under it, each run shows its full run id (use this with `detail`), status, start
and end times, total and executing durations, the piece it ran on, the sanding
mode, step count, selected zones, selected rounds, and any error message.

Options:

- `--since <window>` — only runs newer than this. Accepts a duration (`7d`,
  `24h`, `30m`) or a date. Defaults to `7d`.
- `--all` — ignore `--since` and list all history.
- `--limit <n>` — show at most `n` runs.
- `--no-pager` — print plain instead of paging. On a terminal the output is
  otherwise paged through `$PAGER` (default `less`).

```bash
sanding-history log --since 3d --limit 50
```

Example output:

```
────────────────────────────────────────────────────────────────────────
 May 28, 2026
   Total Passes: 3   Total Time: 1h 12m   Executing Time: 48m   Other Steps Time: 9m   Execution %: 84.2%
   Symptoms: P-Stop: 1
   Causes: Part Issue: 1
────────────────────────────────────────────────────────────────────────

 8f3c1a9b-2d4e-4f6a-9c1b-7e0a2d5f8b31
   Status: Success   Start: 2:32:01 PM   End: 2:40:12 PM   Total: 8m 11s   Executing: 6m 2s
   Piece: piece-00421   Mode: auto   Steps: 4   Zones: 1, 2, 3   Rounds: 2

 1b9d77e0-6a52-4c0d-8f33-12ab9c4e5d77
   Status: Failed   Start: 1:10:00 PM   End: 1:14:30 PM   Total: 4m 30s   Executing: 1m 5s
   Piece: piece-00420   Mode: auto   Steps: 3   Zones: 4   Rounds: 1
   Error: joint 3 exceeded velocity limit during executing step
```

## `detail`

Prints the complete record for one run as pretty-printed JSON — every field the
web detail view draws from, including the run's timing, status, build info, the
list of steps, the sanding parameters, plus any saved diagnosis and notes. The
run id may be given in any position relative to the flags.

```bash
sanding-history detail 8f3c1a9b-2d4e-4f6a-9c1b-7e0a2d5f8b31
```

# Making Changes

When making a change to this repo, please run `npx @changesets/cli` to properly update the package.json using semantic versioning.

run `npm run start` to run the production build of the app locally and also ensure you start a module proxy `viam module local-app-testing --app-url http://localhost:3000 --machine-id <MACHINE_ID>`

IMPORTANT: until there is proper CI for beta env deployment, please deploy the module to a beta env for prod like testing, to achieve this, simply change the `module_id` field in the `meta-beta.json` file to point to module that you own and then run `make module-beta`
