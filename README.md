# Reflect — LeetCode coding review

Chrome extension with signed-in LeetCode history sync, local code-quality checks, and optional OpenAI API reviews.

## Install and sync

1. In Chrome, open `chrome://extensions`, enable Developer mode, and choose **Load unpacked**. Select this folder, not its ZIP.
2. Keep your signed-in https://leetcode.com/progress/ tab open. Click the Reflect extension icon to open the dashboard, then **Sync LeetCode**.
3. Sync reads a trailing year of submission metadata and source. It can take several minutes. Incomplete history and source-fetch errors are displayed. The extension can attach its script to an already-open LeetCode tab.

Sync uses undocumented LeetCode endpoints, which may change or restrict access. No passwords or cookies are extracted. Source is not executed. Synced history is saved in Chrome extension local storage on this computer. **Clear data** removes history and saved AI reports. A partial history cannot establish your complete solved/unsolved status.

To update: reload Reflect in `chrome://extensions`, approve new permissions if requested, close the old dashboard, and reopen through the extension icon. Existing saved submissions are reanalyzed. Current version: **0.5.1**.

## Optional AI review

See [AI-SETUP.md](docs/AI-SETUP.md). Start `start-ai.command` on macOS (Node.js 20+), configure your own OpenAI API key at the hidden Terminal prompt, then use the dashboard's **AI review** section.

Select 1–5 latest solutions per request. Prepare and inspect their source and problem statements/constraints, then explicitly run a review. The local server sends that selection to OpenAI's Responses API. The model returns coding habits, algorithm/complexity analysis, alternatives with tradeoffs, and practice exercises. API charges apply. Nothing is sent to an AI provider during ordinary sync or local analysis. The key stays on the local server, outside browser storage and the repository.

Reports are labeled with model, time, and selected submissions. They are not whole-year conclusions. Citation quotes and line ranges are checked against source; correctness, complexity, and optimality conclusions still require verification. The latest AI report and its source/context sample are stored locally and can be exported or cleared. API provider data policies apply independently; requests set `store: false`.

## Dashboard

- Year activity, acceptance statistics, and supplied topic-tag breakdown.
- **Attempted but not solved:** problems attempted in the selected year with no accepted attempt in imported history through the review end date; searchable, with counts, latest verdicts, dates, and links.
- **Coding habits (local checks):** naming, formatting, readability, and structure, with evidence lines and suggestions. Latest source per problem/language avoids counting retries as separate habits.
- **Algorithms & improvement (local checks):** a limited set of pattern suggestions, separately labeled outcome/practice signals, and a four-week plan. Local checks do not perform semantic algorithm review.
- **AI review:** separate model-generated source/context review, available after setup.

Python local checks include mixed indentation, simple assignment spacing, naming consistency, long functions, broad exceptions, list-front removal, and Two Sum nested-loop suggestions. Basic naming and line-length checks support Python, JavaScript, TypeScript, Java, C++ (`cpp` included), and C#. C++ adds simple initializer spacing, range-loop copy, and output-flush suggestions. Comments/strings are masked for most checks. These text heuristics can misread unusual syntax; style signals are not proof of bad code. MySQL has no local source checks but can be selected for AI review.

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

No npm dependencies. Run `node tests/test-ai.mjs`, `node tests/test-review.cjs`, `node tests/test-unsolved.cjs`, and `node tests/test-connection.cjs`. AI tests mock OpenAI; a live paid review is not part of the automated tests.

## Project layout

```text
manifest.json            # Chrome loads this root folder
extension/
  background.js
  content/               # LeetCode history and problem statements
  dashboard/             # UI, sync controls, and AI review controls
  analysis/              # Local code review and statistics
server/                  # OpenAI API server
tests/                   # Automated checks
docs/                    # AI setup guide
start-ai.command         # macOS launcher
```

Run `npm test` from the root to run all checks. No package installation is required. Reload the extension and reopen its dashboard after updating; keep loading this root folder, not the extension subfolder.
