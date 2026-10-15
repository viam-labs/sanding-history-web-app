---
'sanding-monitoring-web-app': patch
---

Match generated step videos by step start time so repeated steps in a pass (e.g. two Executing steps around a pause/resume) no longer share a video. Videos generated before this change no longer appear on their step; regenerate them.
