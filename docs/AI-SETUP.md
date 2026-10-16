# Gemini AI reviews — Reflect 0.10.0

## Switch from OpenAI

1. Stop the old AI server with **Ctrl+C** in its Terminal window.
2. Reload Reflect in `chrome://extensions`, close the old dashboard, and reopen it.
3. Create your own [Gemini API key in Google AI Studio](https://aistudio.google.com/apikey). Do not paste it into chat or the extension.
4. Run `zsh start-ai.command` from this project folder, or double-click the launcher. Node.js 20+ is required.
5. Enter Reflect’s extension ID from `chrome://extensions`. Accept the default model, `gemini-3.8-flash`, or enter a supported Gemini text model. Enter your Gemini key at the hidden prompt.
6. Leave Terminal running. In **AI review**, click **Check connection**. This verifies the key and model metadata without sending code. A review checks generation quota and structured-output support.
7. Select 1–5 solutions, prepare them, inspect the code and problem context, check consent, and click **Run AI review**.

Restart the launcher whenever you change the key, model, or extension ID. Keys stay in the server process environment and are not saved in project files or browser storage. Existing saved OpenAI reports remain readable and labeled; the updated dashboard blocks sending code to an older server.

## Manual start (macOS zsh)

```zsh
read "REFLECT_EXTENSION_ID?Reflect extension ID: "
export REFLECT_EXTENSION_ID
read "GEMINI_MODEL?Gemini model (e.g. gemini-3.8-flash): "
export GEMINI_MODEL
read -s "GEMINI_API_KEY?Gemini API key (hidden): "
export GEMINI_API_KEY
node server/ai-server.mjs
```

The server binds to `127.0.0.1:4318` and accepts only the configured extension origin and local Host header. It never returns the key to the extension. No automatic retry sends additional requests.

## Cost and data

Gemini offers a free tier for eligible models/projects, with rate and quota limits. Billing-enabled projects may incur charges. Check [current Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing) and your AI Studio project limits. Free-tier content may be used to improve Google products; review Google’s terms before sending code.

Only your explicitly selected source, titles, languages, and visible problem statements/constraints are sent to Google’s Generate Content API. The key is supplied in the `x-goog-api-key` header, never the URL or model input. LeetCode cookies and account credentials are not sent. Ordinary sync and local analysis do not call Gemini.

The latest report and its source/context sample are stored locally, replacing the previous AI report. Export before replacing it if needed. Clearing the local report does not delete provider records. Citation IDs, line ranges, and quotations are checked against source; these checks do not establish correctness or optimality. Reports cover the selected sample, not the entire year.

## Troubleshooting

- **Older OpenAI server:** stop it, then restart the updated launcher.
- **Rejected key:** create/check your Gemini key in AI Studio and restart.
- **Access denied:** check key restrictions, project permissions, API availability and region.
- **Quota reached:** check AI Studio limits; wait for reset or reduce the selection.
- **Model unavailable:** select a supported Gemini text model in AI Studio.

Run `npm test` for automated checks. Tests mock Gemini and make no live provider requests. A live connection requires your own configured key.

[Structured output documentation](https://ai.google.dev/gemini-api/docs/generate-content/structured-output)
