import { reviewInstructions } from './review-prompt.mjs';
const API = 'https://generativelanguage.googleapis.com/v1beta/models/';
export function modelName(model) {
 const name=String(model||'').replace(/^models\//,'');
 if(!/^gemini-[a-zA-Z0-9._-]+$/.test(name))throw Error('Use a Gemini model ID from Google AI Studio, such as gemini-3.8-flash.');
 return name;
}
export function apiFailure(status,payload={}) {
 const details=payload?.error?.details||[];
 if(status===401||details.some(d=>d.reason==='API_KEY_INVALID')||/api key not valid|invalid api key/i.test(payload?.error?.message||''))return 'Gemini rejected the API key. Create a key in Google AI Studio and restart the launcher with it.';
 if(status===403)return 'Gemini denied access. Check your Google API key restrictions, project permissions, API availability and region.';
 if(status===404)return 'The Gemini model was not found or is unavailable to this project. Restart with a model listed in Google AI Studio.';
 if(status===429)return 'Gemini rate limit or free-tier quota reached. Wait for your quota to reset or try a smaller selection. Check limits in Google AI Studio.';
 if(status===400)return 'Gemini rejected the request. Check that the model supports structured JSON and that the input fits its limits.';
 if(status===503)return 'Gemini is temporarily unavailable. Try again later.';
 return `Gemini request failed (HTTP ${status}). Check Google AI Studio and your server configuration.`;
}
async function callGemini(path,{apiKey,body,fetchImpl=fetch,timeout=180000}) {
 if(!apiKey?.trim())throw Error('Configure GEMINI_API_KEY, then restart the local server.');
 let response;
 try{response=await fetchImpl(API+path,{method:body?'POST':'GET',headers:{'x-goog-api-key':apiKey,...(body?{'Content-Type':'application/json'}:{})},signal:AbortSignal.timeout(timeout),...(body?{body:JSON.stringify(body)}:{})})}
 catch(e){throw Error(e.name==='TimeoutError'?'Gemini request timed out. Try a smaller selection.':'The local server cannot reach Google Gemini. Check your network or proxy.');}
 let payload;try{payload=await response.json()}catch{throw Error('Gemini returned an unreadable response.');}
 if(!response.ok)throw Error(apiFailure(response.status,payload));return payload;
}
export async function checkApiConnection({apiKey,model,fetchImpl=fetch}) {
 if(!apiKey||!model)throw Error('Configure GEMINI_API_KEY and GEMINI_MODEL, then restart the local server.');
 const name=modelName(model),payload=await callGemini(encodeURIComponent(name),{apiKey,fetchImpl,timeout:20000});
 if(typeof payload.name!=='string')throw Error('Gemini did not return model metadata.');
 if(!payload.supportedGenerationMethods?.includes('generateContent'))throw Error('This Gemini model does not support text generation. Choose a text model in Google AI Studio.');
 return {ready:true,provider:'gemini',model:name,verified:'authentication-and-model-metadata',note:'Gemini authentication and model metadata verified. Generation quota and structured-output support are checked when a review runs.'};
}
export async function requestGeminiReview(submissions,schema,{apiKey,model,fetchImpl=fetch}) {
 const name=modelName(model);
 const numbered=submissions.map(s=>({...s,code:s.code.split('\n').map((line,i)=>`${i+1}: ${line}`).join('\n')}));
 const payload=await callGemini(encodeURIComponent(name)+':generateContent',{apiKey,fetchImpl,body:{systemInstruction:{parts:[{text:reviewInstructions}]},contents:[{role:'user',parts:[{text:JSON.stringify({submissions:numbered})}]}],generationConfig:{maxOutputTokens:16000,responseFormat:{text:{mimeType:'application/json',schema}}}}});
 if(payload.promptFeedback?.blockReason)throw Error('Gemini declined the supplied content. No review was returned.');
 const candidate=payload.candidates?.[0];
 if(candidate?.finishReason==='MAX_TOKENS')throw Error('AI response was incomplete; review fewer submissions.');
 if(candidate?.finishReason!=='STOP')throw Error('Gemini did not complete the review. Try a smaller selection; content may have been blocked.');
 const text=(candidate.content?.parts||[]).filter(p=>!p.thought&&typeof p.text==='string').map(p=>p.text).join('');
 let review;try{review=JSON.parse(text)}catch{throw Error('Gemini did not return a valid structured report. Try fewer submissions.');}
 const usage=payload.usageMetadata?{input_tokens:payload.usageMetadata.promptTokenCount??null,output_tokens:payload.usageMetadata.candidatesTokenCount??null,total_tokens:payload.usageMetadata.totalTokenCount??null}:null;
 return {review,provider:'gemini',model:name,usage};
}
