#!/bin/zsh
set -eu
cd -- "$(dirname -- "$0")"
if ! command -v node >/dev/null 2>&1; then
  print 'Node.js 20 or later is required. Install it, then run this launcher again.'
  read 'reflectExit?Press Return to close. '
  exit 1
fi
read 'REFLECT_EXTENSION_ID?Reflect extension ID from chrome://extensions: '
export REFLECT_EXTENSION_ID
read 'reflectModel?OpenAI API model [gpt-6-astra]: '
export OPENAI_MODEL="${reflectModel:-gpt-6-astra}"
read -s 'OPENAI_API_KEY?OpenAI API key (hidden): '
print ''
export OPENAI_API_KEY
exec node server/ai-server.mjs
