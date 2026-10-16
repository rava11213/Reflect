# Reflect — LeetCode Coding Habits Analyzer

A Chrome extension that turns your LeetCode submission history into feedback on how you code, where you get stuck, and how your habits change with practice.

## Why Reflect exists

Solving a problem is only part of preparing for a technical interview. Candidates also need to explain their reasoning, choose suitable algorithms, discuss tradeoffs, and write code that another person can follow. An accepted submission alone does not tell you how well you are developing those skills.

Reflect helps you revisit your own work. It brings recurring naming, formatting, and readability issues together with unfinished problems and algorithm feedback, so you can make your next practice session more deliberate. The goal is to build clearer thinking and better coding habits through reflection, then return later to see what has changed.

## The user journey

1. **Connect your practice history.** Install Reflect and sync the past year of submissions from your signed-in LeetCode account.
2. **See what needs attention now.** Start with an overview of activity, recurring coding habits, and attempted problems that remain unsolved in your imported history.
3. **Reflect on specific solutions.** Follow findings back to source lines. Optionally request an AI review of selected solutions to explore algorithms, complexity, alternatives, and tradeoffs.
4. **Practice with a purpose.** Apply clearer names, more readable structure, or a better-suited approach in your next solutions. Revisit problems you previously could not solve.
5. **Come back and compare.** Open Progress to see which findings occur less often and which previously unsolved problems now have accepted submissions. Inspect earlier and recent code side by side.

Reflect supports self-review and interview preparation. It does not score interview readiness or measure how well you explain your reasoning aloud.

## What you can review

| View | What it shows |
| --- | --- |
| **Overview** | Submission totals, solved problems, acceptance rate, active days, activity, and current findings. |
| **Coding habits** | Local checks for naming, spacing, readability, and structure, with source evidence and suggestions. |
| **Unsolved problems** | Attempted problems without an accepted submission in imported history through the review date, with search and LeetCode links. |
| **Algorithms & improvement** | Limited local pattern suggestions and optional AI analysis of selected solutions. |
| **Progress** | Changes in recurring findings, newly solved problems, and code comparisons. |
| **Topics** | A breakdown using the topic tags supplied with your submissions. |

### Coding habits and algorithm feedback

Local checks run without an AI API. Every imported source language receives basic readability checks; recognized declarations receive naming checks. Python, C++, and SQL have additional rules. Supported language labels include common LeetCode languages and SQL dialects such as MySQL. The dashboard’s expandable coverage panel shows the depth of analysis for each language.

These checks are text heuristics, not a compiler or semantic proof. A short variable name may be appropriate; a detected pattern may be intentional. Findings include evidence so you can judge them in context. Local checks cannot establish that an algorithm is optimal.

Optional **Gemini AI review** uses selected source and problem statements to discuss coding habits, time and space complexity, alternatives, and tradeoffs. Reports cover the selected sample rather than your entire year. Source quotations and line references are validated, but the model’s reasoning can still be wrong. The integration requires your own key and a reachable provider; quota, availability, and generation limits can prevent reviews.

### Seeing progress

Progress defaults to **50 submissions ago · reconstructed** when at least 51 attempts are available. Reflect removes the latest 50 attempts and reruns the local checks on the earlier history. This uses your imported code, rather than inventing a historical review. The two code viewers prefer the same problem and language when available; different problems are reference examples, not direct proof of improvement.

Saved review baselines are also available after sync. Habit trends compare language-specific samples with at least five solutions on each side, compatible rules, and complete source. A lower finding frequency is a signal to investigate, not proof that a habit has disappeared. Previously unsolved problems count as progress when a later accepted submission is present; problems aging out of the review window do not count as newly solved.

## Install and sync

1. Download or clone this repository.
2. Open `chrome://extensions`, enable **Developer mode**, and select **Load unpacked**. Choose the repository root containing `manifest.json`.
3. Open [LeetCode Progress](https://leetcode.com/progress/) and sign in.
4. Click the Reflect extension icon, then **Sync LeetCode**. Importing a year of source can take several minutes.

To update the extension, reload it in `chrome://extensions`, close its old dashboard, and reopen it. Reloading is only needed after extension code changes.

Sync uses undocumented LeetCode endpoints, which may change or restrict access. Reflect displays incomplete imports and source-fetch failures. Unsolved status and progress depend on the history actually imported.

### Optional AI setup

Follow [the Gemini setup guide](docs/AI-SETUP.md). On macOS, run `zsh start-ai.command` with Node.js 20 or later, enter your extension ID, choose a supported Gemini model, and enter your key at the hidden prompt. Leave the server running and use **AI review → Check connection**.

Select 1–5 solutions, prepare and inspect their source and problem context, then give consent to run the review. The connection check verifies authentication and model metadata; a generation request is needed to check review quota and output support. Free-tier limits or API charges apply.

### Import a JSON file

Import an array or `{ "submissions": [...] }` with these fields:

- Required: `id`, `timestamp` (ISO or Unix seconds/milliseconds), `title`, and `status`.
- Optional: `titleSlug`, `lang`, `code`, and `topics` (array).

Numeric verdict codes are supported. Duplicate IDs are ignored, malformed rows are counted and skipped, and the file limit is 50 MB. Manual imports stay in page memory. Demo data is labeled and cannot be sent for AI review.

## Privacy and storage

LeetCode sync and local analysis do not call an AI provider. Reflect does not extract passwords or cookies, and it never executes submitted source code. Synced submissions and progress snapshots are stored in Chrome extension local storage on your computer.

AI review sends only the explicitly selected source, titles, languages, and visible problem context to Google through a server bound to `127.0.0.1:4318`. Your API key stays in the server process, outside browser storage and the repository. Google’s data policies apply; free-tier content may be used to improve products. See the setup guide for details.

The latest AI report and its source/context sample are saved locally and can be exported or cleared. **Clear data** removes synced history, saved progress, and AI reports. Clearing local data does not delete provider-side records.

## Development

The dashboard uses HTML, CSS, and JavaScript. Local analysis runs in the extension; a separate Node.js server handles Gemini requests and report validation. No npm dependencies are required.

```text
manifest.json            # Chrome extension configuration
extension/
  background.js          # Opens the dashboard
  content/               # LeetCode history and problem context
  dashboard/             # Overview, habits, progress, and AI controls
  analysis/              # Statistics, local checks, and progress comparisons
server/                  # Local Gemini transport and report validation
tests/                   # Automated checks
docs/                    # AI setup and troubleshooting
start-ai.command         # macOS AI server launcher
```

Run all checks from the repository root:

```sh
npm test
```

Tests cover local analysis, language coverage, unsolved grouping, progress comparisons, sync recovery, AI consent, request validation, and server access restrictions. Gemini tests use mocked responses; passing tests do not establish live provider availability.
