#!/bin/zsh
set -eu
cd -- "$(dirname -- "$0")"
if ! command -v node >/dev/null 2>&1; then
  print 'Node.js 20 or later is required. Install it, then run this launcher again.'
  read 'reflectExit?Press Return to close. '
  exit 1
fi
read 'REFLECT_EXTENSION_ID?Reflect extension ID from chrome://extensions: '
if [[ ! "$REFLECT_EXTENSION_ID" =~ '^[a-p]{32}$' ]]; then
  print 'Invalid extension ID. Copy the 32-letter ID for Reflect from chrome://extensions.'
  exit 1
fi
export REFLECT_EXTENSION_ID
read 'reflectModel?Gemini API model [gemini-3.8-flash]: '
export GEMINI_MODEL="${reflectModel:-gemini-3.8-flash}"
read -s 'GEMINI_API_KEY?Gemini API key (hidden): '
print ''
if [[ -z "${GEMINI_API_KEY//[[:space:]]/}" ]]; then
  print 'No API key was entered. Run this launcher again, paste your Gemini API key at the hidden prompt, then press Return. Input stays invisible.'
  exit 1
fi
export GEMINI_API_KEY
exec node server/ai-server.mjs
