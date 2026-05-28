---
"sanding-monitoring-web-app": minor
---

Add a standalone `sanding-history` command-line tool for inspecting sanding-run history: `log` lists past runs as paged plain text (matching the history table), and `detail <run-id>` prints a run's full metadata as JSON. The history list's query, day-aggregation, and field formatting are extracted into shared modules so the CLI and the web app render from the same logic.
