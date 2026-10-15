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
read 'reflectModel?OpenAI API model [gpt-6-astra]: '
export OPENAI_MODEL="${reflectModel:-gpt-6-astra}"
read -s 'OPENAI_API_KEY?OpenAI API key (hidden): '
print ''
if [[ -z "${OPENAI_API_KEY//[[:space:]]/}" ]]; then
  print 'No API key was entered. Run this launcher again, paste your OpenAI API key at the hidden prompt, then press Return. Input stays invisible.'
  exit 1
fi
export OPENAI_API_KEY
exec node server/ai-server.mjs
