chrome.action.onClicked.addListener(()=>chrome.tabs.create({url:chrome.runtime.getURL('extension/dashboard/index.html')}));
const trusted=sender=>sender.tab?.url?.startsWith('https://leetcode.com/');
chrome.runtime.onMessage.addListener((m,sender,reply)=>{
 if(!trusted(sender))return;
 if(m.kind==='reflect-result')chrome.storage.local.set({history:m.payload,syncState:{status:'finished',count:m.payload.submissions.length,at:Date.now()}}).then(()=>reply({ok:true})).catch(e=>reply({error:e.message}));
 else if(m.kind==='reflect-progress')chrome.storage.local.set({syncState:{status:'running',count:m.count,at:Date.now()}}).then(()=>reply({ok:true}));
 else if(m.kind==='reflect-error')chrome.storage.local.set({syncState:{status:'error',error:m.error,at:Date.now()}}).then(()=>reply({ok:true}));
 else return;
 return true;
});
