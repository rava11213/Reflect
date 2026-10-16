# Reflect — LeetCode coding review

Chrome extension with signed-in LeetCode history sync, local code-quality checks, and optional Gemini API reviews.

## Install and sync

1. In Chrome, open `chrome://extensions`, enable Developer mode, and choose **Load unpacked**. Select this folder, not its ZIP.
2. Keep your signed-in https://leetcode.com/progress/ tab open. Click the Reflect extension icon to open the dashboard, then **Sync LeetCode**.
3. Sync reads a trailing year of submission metadata and source. It can take several minutes. Incomplete history and source-fetch errors are displayed. The extension can attach its script to an already-open LeetCode tab.

Sync uses undocumented LeetCode endpoints, which may change or restrict access. No passwords or cookies are extracted. Source is not executed. Synced history is saved in Chrome extension local storage on this computer. **Clear data** removes history and saved AI reports. A partial history cannot establish your complete solved/unsolved status.

To update: reload Reflect in `chrome://extensions`, approve new permissions if requested, close the old dashboard, and reopen through the extension icon. Existing saved submissions are reanalyzed. Current version: **0.10.1**.

## Optional AI review

See [AI-SETUP.md](docs/AI-SETUP.md). Start `start-ai.command` on macOS (Node.js 20+), configure your own Gemini API key at the hidden Terminal prompt, then use the dashboard's **AI review** section.

Select 1–5 latest solutions per request. Prepare and inspect their source and problem statements/constraints, then explicitly run a review. The local server sends that selection to Google Gemini's Generate Content API. The model returns coding habits, algorithm/complexity analysis, alternatives with tradeoffs, and improvement suggestions. Free-tier limits or API charges apply. Nothing is sent to an AI provider during ordinary sync or local analysis. The key stays on the local server, outside browser storage and the repository.

Reports are labeled with model, time, and selected submissions. They are not whole-year conclusions. Citation quotes and line ranges are checked against source; correctness, complexity, and optimality conclusions still require verification. The latest AI report and its source/context sample are stored locally and can be exported or cleared. Google’s data policies apply; free-tier content may be used to improve products.

## Dashboard

- Year activity, acceptance statistics, and supplied topic-tag breakdown.
- **Attempted but not solved:** problems attempted in the selected year with no accepted attempt in imported history through the review end date; searchable, with counts, latest verdicts, dates, and links.
- **Coding habits (local checks):** naming, formatting, readability, and structure, with evidence lines and suggestions. Latest source per problem/language avoids counting retries as separate habits.
- **Algorithms & improvement (local checks):** a limited set of pattern suggestions, separately labeled outcome/practice signals, without generated schedules. Local checks do not perform semantic algorithm review.
- **AI review:** separate model-generated source/context review, available after setup.

Python local checks include mixed indentation, simple assignment spacing, naming consistency, long functions, broad exceptions, list-front removal, and Two Sum nested-loop suggestions. Basic naming and line-length checks support Python, JavaScript, TypeScript, Java, C++ (`cpp` included), and C#. C++ adds simple initializer spacing, range-loop copy, and output-flush suggestions. Comments/strings are masked for most checks. These text heuristics can misread unusual syntax; style signals are not proof of bad code. SQL (including MySQL, PostgreSQL, and MS SQL Server) has local projection, NULL-comparison, nullable NOT IN, and result-alias checks. All imported source languages receive basic readability checks; recognized declarations receive naming checks. The expandable Check coverage panel reports the depth for each language.

## JSON import

Import a JSON array or `{ "submissions": [...] }`. Required: `id`, `timestamp` (ISO or Unix seconds/milliseconds), `title`, `status`. Optional: `titleSlug`, `lang`, `code`, `topics` (array). Numeric verdict codes are supported. Duplicate IDs are ignored; malformed rows are counted and skipped. Import limit: 50 MB. Manual imports stay in page memory. Demo data is explicitly labeled and cannot be submitted for AI review.

## Source and tests

- `manifest.json`: Chrome permissions (LeetCode and the local review server).
- `extension/content/sync.js`, `extension/background.js`, `extension/dashboard/connection.js`: history sync and local storage.
- `extension/analysis/analyzer.js`, `extension/analysis/review.js`: statistics, unsolved grouping, local source heuristics.
- `extension/content/ai-context.js`: read problem statements from the signed-in LeetCode tab.
- `extension/dashboard/ai-ui.js`: payload preparation, explicit sending, and AI report display.
- `server/ai-server.mjs`: loopback-only API server, structured response validation, and source evidence checks.
- `extension/dashboard/index.html`, `extension/dashboard/style.css`, `extension/dashboard/app.js`: dashboard.

No npm dependencies. Run `node tests/test-ai.mjs`, `node tests/test-review.cjs`, `node tests/test-unsolved.cjs`, and `node tests/test-connection.cjs`. AI tests mock Gemini; a live paid review is not part of the automated tests.

## Project layout

```text
manifest.json            # Chrome loads this root folder
extension/
  background.js
  content/               # LeetCode history and problem statements
  dashboard/             # UI, sync controls, and AI review controls
  analysis/              # Local code review and statistics
server/                  # Gemini API server
tests/                   # Automated checks
docs/                    # AI setup guide
start-ai.command         # macOS launcher
```

Run `npm test` from the root to run all checks. No package installation is required. Reload the extension and reopen its dashboard after updating; keep loading this root folder, not the extension subfolder.

## Compact dashboard — 0.6.0

The overview uses a plain heading and shorter controls. Coding-habit, algorithm, and AI cards show a short recommendation, with explanations and code evidence in expandable details. Privacy and methodology details expand on demand; the AI sending consent and charge notice remain visible.

## Language coverage — 0.7.0

Recognizes LeetCode aliases for Python/Pandas, C/C++, C#, Java, JavaScript, TypeScript, Go, Rust, Ruby, Swift, Kotlin, Scala, Dart, PHP, R, Racket, Erlang, Elixir, Shell and SQL dialects. Unknown language labels receive basic checks instead of being discarded. Python/C++/SQL have additional local rules; other languages have basic naming/readability checks, not full semantic analysis. SQL checks do not infer indexes or query-plan performance. NULL-safe operators are excluded from the ordinary NULL-comparison check. Comment/string masking is heuristic and may miss unusual language syntax.

## Progress tracking — 0.8.0

Overview is the default view, with current habits and unsolved problems. Progress is a separate tab. Weekly plans are removed. Year totals and review methodology are expandable; activity, topics, AI review, and algorithm feedback remain available. Habit cards prioritize the top three recurring findings.

The first successful sync (or an existing saved history on upgrade) establishes a baseline. Later changed imports save new metric snapshots automatically. Identical datasets are deduplicated; the first baseline and latest 59 snapshots are kept. Use Compare with to select a saved review. Snapshots store IDs, rule counts, language families, source fingerprints, and problem status, not full code. Clear data also clears snapshot history. Demo data is never saved. An explicitly incomplete sync is not added to review history.

Habit trends compare baseline source against new latest solutions submitted after that baseline, separately within each language family. Both samples need at least five solutions, the same local rule version, and complete imported source without fetch errors. Lower rates are labeled less frequent; zero occurrences are labeled not observed. Samples can differ in topic/difficulty, and these are heuristic signals, not proof of a fixed habit. AI reviews are sample-specific and are not automatically compared or run.

Previously unsolved problems count as solved only when an accepted submission dated after the baseline is present. Aging out of the year or backfilling an older accepted attempt does not count as progress. Imports with no shared submission IDs are not compared. Incomplete imports, missing source, and changed rule sets are shown explicitly. Historical progress before the first saved baseline is not reconstructed.

## Overview and 50-submission comparison — 0.9.0

The extension starts on Overview, with year totals, current habit findings, and unsolved problems. Progress opens as a separate view, not another section of the same scrolling page.

Progress defaults to **50 submissions ago · reconstructed** when at least 51 attempts are available within the selected imported year. It removes exactly the latest 50 attempts (all verdicts) and reruns the same local checks on the earlier prefix. This uses actual imported code; it does not invent or claim a saved review existed then. Each side reviews the latest available source per problem/language family. The 50 attempts may represent fewer than 50 distinct solutions. Tied timestamps use numeric submission-ID ordering when possible.

Code then & now shows the boundary submission from before those 50 attempts and a recent submission. It prefers the same problem/language when available; selectors let you inspect either cohort. Different problems are reference examples, not proof of improvement. Missing source is explicitly shown. With fewer than 51 attempts the UI explains the required history. Real saved reviews remain selectable. Demo datasets support the reconstructed view but are never persisted as review history.

## Connection diagnostics — 0.10.1

Configured means credentials are present, not validated. Check connection now asks Gemini for the configured model’s metadata using the key held by the server. It sends no submitted code. This verifies authentication and model-metadata access; Generation permissions and quota are verified only by an actual review request. Restart the local server after this update. Errors distinguish rejected keys, denied permissions, missing models, quota, and rate limits.
