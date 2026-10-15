(()=>{if(globalThis.reflectSyncInstalled)return;globalThis.reflectSyncInstalled=true;
let reflectRunning=false;
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 if(message.kind!=='reflect-sync')return;
 if(reflectRunning){reply({error:'A sync is already running in this tab.'});return;}
 reflectRunning=true;reply({started:true});
 (async()=>{try{
 const end=new Date(),start=new Date(end);start.setFullYear(start.getFullYear()-1);
 const submissions=[],errors=[],seen=new Set();let offset=0,complete=false,lastkey='';
 const pause=()=>new Promise(r=>setTimeout(r,500));
 const gql=async(query,variables)=>{await pause();let res=await fetch('/graphql/',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({query,variables})});if(!res.ok)throw Error('GraphQL HTTP '+res.status);let j=await res.json();if(j.errors)throw Error(j.errors.map(e=>e.message).join('; '));return j.data};
 try{while(true){await pause();let res=await fetch('/api/submissions/?offset='+offset+'&limit=20&lastkey='+encodeURIComponent(lastkey),{credentials:'same-origin'});if(!res.ok)throw Error('History HTTP '+res.status);let j=await res.json();if(!Array.isArray(j.submissions_dump))throw Error('History format changed or login required.');if(!j.submissions_dump.length){complete=true;break}let older=false,newCount=0;for(let s of j.submissions_dump){let date=new Date(Number(s.timestamp)*1000);if(date<start){older=true;continue}if(date>end||seen.has(String(s.id)))continue;seen.add(String(s.id));newCount++;let row={...s,status:s.status_display??s.status,titleSlug:s.title_slug,topics:[],code:''};try{let d=await gql('query submissionDetails($submissionId: Int!) { submissionDetails(submissionId: $submissionId) { code lang { name } question { titleSlug topicTags { name } } } }',{submissionId:Number(s.id)});if(!d?.submissionDetails)throw Error('Submission details unavailable');row.code=d.submissionDetails.code||'';row.lang=d.submissionDetails.lang?.name||s.lang;row.topics=d.submissionDetails.question?.topicTags?.map(t=>t.name)||[];}catch(e){errors.push({id:s.id,message:e.message})}submissions.push(row)}await chrome.runtime.sendMessage({kind:'reflect-progress',count:submissions.length});offset+=j.submissions_dump.length;lastkey=j.last_key||'';if(older||j.has_next===false){complete=true;break}if(!newCount)throw Error('Pagination made no progress; export stopped.')}}catch(e){errors.push({message:e.message})}

 await chrome.runtime.sendMessage({kind:'reflect-result',payload:{exportedAt:end.toISOString(),start:start.toISOString(),complete,errors,submissions}});
 }catch(e){await chrome.runtime.sendMessage({kind:'reflect-error',error:e.message});}finally{reflectRunning=false;}})();
});

})();
