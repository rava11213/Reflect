(()=>{
 if(globalThis.reflectAIContextInstalled)return;globalThis.reflectAIContextInstalled=true;
 chrome.runtime.onMessage.addListener((message,sender,reply)=>{
  if(message.kind!=='reflect-ai-context')return;
  if(!Array.isArray(message.slugs)||message.slugs.length>5||message.slugs.some(s=>!/^[-a-z0-9]+$/.test(s))){reply({error:'Invalid problem selection.'});return;}
  (async()=>{const problems={};for(const slug of new Set(message.slugs)){try{const r=await fetch('/graphql/',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:'query reflectQuestion($titleSlug: String!) { question(titleSlug: $titleSlug) { content } }',variables:{titleSlug:slug}})});if(!r.ok)throw Error('Problem fetch HTTP '+r.status);const j=await r.json();if(j.errors||!j.data?.question?.content)throw Error('Problem statement unavailable; paste it manually.');problems[slug]={html:j.data.question.content}}catch(e){problems[slug]={error:e.message}}}reply({problems})})().catch(e=>reply({error:e.message}));return true;
 });
})();
