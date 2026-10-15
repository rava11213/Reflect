function showSync(state){if(!state)return;$('#connect').disabled=false;if(state.status==='running')$('#message').textContent=`Syncing your LeetCode history… ${state.count||0} submissions read. Keep the LeetCode tab open.`;if(state.status==='error')$('#message').textContent=state.error;}
function loadHistory(payload){try{const n=ReflectAnalysis.normalize(payload);items=n.items;isDemo=false;render();$('#message').textContent=`Connected import: ${items.length} submissions. ${payload.complete?'History pagination finished.':'Partial history — sync did not finish.'} ${payload.errors.length} fetch errors. ${payload.errors.slice(0,2).map(e=>e.message).join('; ')} Stored only in this extension on this computer.`}catch(e){$('#message').textContent=e.message}}
chrome.storage.local.get(['history','syncState']).then(s=>{if(s.history)loadHistory(s.history);showSync(s.syncState)});
chrome.storage.onChanged.addListener((changes,area)=>{if(area!=='local')return;if(changes.history?.newValue)loadHistory(changes.history.newValue);if(changes.syncState?.newValue)showSync(changes.syncState.newValue)});
$('#connect').onclick=async()=>{
 const button=$('#connect');button.disabled=true;$('#message').textContent='Connecting to your signed-in LeetCode tab…';
 try{
  const tabs=await chrome.tabs.query({url:'https://leetcode.com/*'});
  if(!tabs.length)throw Error('No accessible LeetCode tab. Open https://leetcode.com/progress/ and allow this extension access to leetcode.com in Chrome extension settings.');
  const tab=tabs.find(t=>t.active)||tabs.find(t=>t.url?.startsWith('https://leetcode.com/progress/'))||tabs[0];
  let response;
  try{response=await chrome.tabs.sendMessage(tab.id,{kind:'reflect-sync'})}
  catch(firstError){
   try{await chrome.scripting.executeScript({target:{tabId:tab.id},files:['extension/content/sync.js']});response=await chrome.tabs.sendMessage(tab.id,{kind:'reflect-sync'})}
   catch(error){throw Error('Could not attach to LeetCode: '+error.message+' Check that Reflect has site access to https://leetcode.com and reload the extension after updating.');}
  }
  if(response?.error)throw Error(response.error);
  if(!response?.started)throw Error('LeetCode did not acknowledge the sync request. Reload Reflect in chrome://extensions and reopen its dashboard.');
  showSync({status:'running',count:0});
 }catch(e){$('#message').textContent=e.message}
 finally{button.disabled=false}
};
const oldClear=$('#clear').onclick;$('#clear').onclick=async()=>{await chrome.storage.local.remove(['history','syncState','aiReport']);if(typeof clearAIView==='function')clearAIView();oldClear();$('#connect').disabled=false};
