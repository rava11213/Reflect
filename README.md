# Connect Reflect to LeetCode in Chrome

1. Open chrome://extensions in Chrome.
2. Turn on Developer mode.
3. Click Load unpacked and select this reflect-chrome folder (not its ZIP).
4. Refresh your signed-in https://leetcode.com/progress/ tab once.
5. Click the Reflect extension icon to open the bundled dashboard.
6. Click Sync LeetCode. Keep your LeetCode tab open until it finishes.

The extension reads a trailing year using your existing LeetCode sign-in. No passwords or cookies are extracted. Submission history and code are stored in Chrome extension local storage on this computer, not sent to a server. Clear data removes the saved history. Only leetcode.com is requested as a host permission. There are no third-party libraries, network fonts, analytics, or remote scripts.

This is a separate, bundled copy of Reflect and works without localhost or web hosting. Sync status and partial-export errors appear above the report. If a tab closes mid-sync, refresh LeetCode and retry Sync LeetCode. A new sync replaces saved history after it completes or returns partial results. The source fetches each submission with a short delay and may take several minutes. LeetCode uses undocumented endpoints that can change; authenticated sync has not yet been tested. A completed history fetch does not guarantee every source-detail request succeeded. Check the error count.

Source: manifest.json declares permissions; sync.js reads LeetCode in the existing tab; background.js saves results; connection.js loads them into the dashboard. The original JSON import still works. Analysis is rule-based, with Python-specific source signals and verdict/topic statistics for other languages.

## Update 0.1.1

Reload Reflect using the circular arrow in chrome://extensions, then close the old dashboard and open Reflect again. Sync now attaches its script on demand using Chrome scripting permission, limited to leetcode.com. Failed connections display their underlying errors. This fixes the missing-receiver recovery path; authenticated endpoint compatibility still requires a live sync.

## Code quality review — 0.2.0

The Coding habits section now reviews source quality instead of using verdict counts as habits. It shows category, confidence, source line, an example snippet, a suggested improvement, and recurrence across distinct problems. Click an evidence button to inspect the submitted code. Only the latest source per problem/language is counted.

Python checks cover mixed indentation, missing spacing in simple assignments, generic local names, mixed local naming styles, long functions, broad exceptions, and list-front removal. Python/JavaScript/TypeScript/Java/C++/C# receive basic local-name and line-length checks. Trailing whitespace is also checked. Comments and string literals are masked before most checks. These are conservative text heuristics and can still misread unusual syntax. A single-letter name may be appropriate; naming findings require judgment.

The Two Sum pattern check only suggests comparing Python nested-loop implementations with a complement hash map, including time/space tradeoffs. It does not prove complexity, correctness, or optimality. General DP/sliding-window/greedy selection and full semantic reviews are not implemented. Problem constraints are not fetched. Verdict statistics remain available in the report as verdictFindings; they no longer appear as code-quality habits.

Reload the extension in chrome://extensions and reopen Reflect to apply this update. Saved synced history is reanalyzed automatically; source code must be present. Tests: node test-review.cjs and node test-connection.cjs.

Version 0.2.1 recognizes LeetCode’s cpp language identifier. C++ checks include simple initializer spacing, generic local names, long lines, range-loop copy suggestions, and endl flush suggestions. MySQL source review remains unsupported.
