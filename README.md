# Ame's desk

A static study desk, based on the supplied `desk (14).html`. Serve this directory with `python3 -m http.server 8000`, then open port 8000. No build step.

- `index.html`: original bundled desk and music player.
- `ame.js`: companion reactions, daily/weekly journal, persistent dated observations, mock/note linking, moods, streak unlocks, focus idle checks, bedtime reminders and optional audio.
- `ame-insights.js`: bounded pattern and weekly statistics calculations.
- `ame-companion.css`: companion and journal presentation.

Run `node --test tests/*.test.cjs` and `node --check ame.js`.

Recaps run at wind-down or when rested is marked; Sunday also generates a weekly card. Open **Ame’s journal** below the desk to read saved cards. Up to 35 daily and weekly cards and 24 dated observations are stored locally (`ame-journal-v1`). Original desk data remains in `desk-needy-v1`. AI requests use the attachment's existing chat endpoint; offline failures retain a factual local recap. Notes and dated patterns are included in AI context. Missing activity is described as unlogged, not proof of skipped work.

Focus mode shrinks Ame and suppresses spontaneous speech except a check-in after 15 idle minutes, at most every 30 minutes. Direct chat remains available. Streaks unlock lines at 1 day, a sticker at 3, and an alternate GIF at 7; a lost streak gives a 20-minute sulking session. Low sleep takes precedence with a worried mood. Audio obeys the existing sound switch and requires a browser gesture; optional voice is browser speech, not a character recording.

## Asset sources

Existing GIFs are preserved from the attachment. Alternate Ame GIF discovered from [Tenor's Ame search](https://tenor.com/search/ame-chan-gifs): https://media.tenor.com/nWtsbiRnYJMAAAAM/ame-ame-chan.gif . Assets remain externally hosted and retain an image failure fallback.

[Ame sound search](https://www.myinstants.com/en/search/?name=ame%20chan) returned ambiguous/unrelated clips. No unverified voice recording is included. The soft chime is synthesized locally with Web Audio; speech uses the browser's installed voice.

Publish the static files at the site root. This task can push its assigned branch; merging into the Pages source branch requires a separate authorized publishing step.
