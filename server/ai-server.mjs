import http from 'node:http';
import {pathToFileURL} from 'node:url';
import { requestGeminiReview, checkApiConnection } from './gemini.mjs';
const string={type:'string'};
const object=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const array=items=>({type:'array',items});
const confidence={type:'string',enum:['high','medium','low']};
const evidence=object({submission_id:string,line_start:{type:'integer'},line_end:{type:'integer'},quote:string});
export const reviewSchema=object({summary:string,coding_habits:array(object({title:string,explanation:string,suggestion:string,confidence,evidence:array(evidence)})),algorithms:array(object({submission_id:string,approach:string,time_complexity:string,space_complexity:string,assessment:string,alternative:string,alternative_time:string,alternative_space:string,tradeoff:string,confidence,evidence:array(evidence)})),limitations:array(string)});
export function validateInput(body){
 if(!body||!Array.isArray(body.submissions)||body.submissions.length<1||body.submissions.length>5)throw Error('Select 1–5 submissions per review.');
 const seen=new Set();return body.submissions.map(s=>{
  if(!s||typeof s.id!=='string'||!s.id||seen.has(s.id)||typeof s.code!=='string'||!s.code.trim()||s.code.length>30000||typeof s.problem!=='string'||!s.problem.trim()||s.problem.length>40000||typeof s.title!=='string'||s.title.length>300||typeof s.lang!=='string'||s.lang.length>100)throw Error('Each unique submission needs code (up to 30,000 characters), language, title, and problem statement including constraints (up to 40,000 characters).');
  seen.add(s.id);return {id:s.id,title:s.title,lang:s.lang,code:s.code,problem:s.problem};
 });
}
export function validateReview(r,submissions){
 function shape(value,schema){if(schema.type==='object'){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==schema.required.length)throw Error('Unexpected AI report shape.');for(const k of schema.required)shape(value[k],schema.properties[k]);}else if(schema.type==='array'){if(!Array.isArray(value))throw Error('Unexpected AI report array.');value.forEach(v=>shape(v,schema.items));}else if(schema.type==='integer'){if(!Number.isInteger(value))throw Error('Invalid evidence line.');}else if(typeof value!=='string'||(schema.enum&&!schema.enum.includes(value)))throw Error('Unexpected AI report value.');}
 shape(r,reviewSchema);const ids=new Map(submissions.map(s=>[s.id,s]));
 const check=e=>{const s=ids.get(e.submission_id);if(!s)throw Error('AI report references an unknown submission.');const lines=s.code.split('\n');if(e.line_start<1||e.line_end<e.line_start||e.line_end>lines.length||!e.quote.trim()||!lines.slice(e.line_start-1,e.line_end).join('\n').includes(e.quote))throw Error('AI evidence did not match the submitted source. Try reviewing fewer submissions.');};
 for(const f of r.coding_habits){if(!f.evidence.length)throw Error('AI habit is missing source evidence.');f.evidence.forEach(check)}
 for(const a of r.algorithms){if(!ids.has(a.submission_id)||!a.evidence.length)throw Error('AI algorithm assessment is missing valid source evidence.');a.evidence.forEach(e=>{if(e.submission_id!==a.submission_id)throw Error('Algorithm evidence references a different submission.');check(e)})}
 if(new Set(r.algorithms.map(a=>a.submission_id)).size!==submissions.length||r.algorithms.length!==submissions.length)throw Error('AI report did not assess every selected submission.');
 return r;
}
export { apiFailure, checkApiConnection } from './gemini.mjs';
export async function generateReview(submissions, options) {
 const result = await requestGeminiReview(submissions, reviewSchema, options);
 return { ...result, review: validateReview(result.review, submissions), createdAt: new Date().toISOString(), submissionIds: submissions.map(s=>s.id) };
}
export function createReviewServer({apiKey,model,extensionId,fetchImpl=fetch}){
 const origin=`chrome-extension://${extensionId}`;let busy=false;
 return http.createServer(async(req,res)=>{
  const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data))};
  // Chrome extension GET requests can omit Origin. A custom header identifies
  // those requests; web pages must preflight and still pass the origin check.
  const allowedOrigin=req.headers.origin===origin||(!req.headers.origin&&req.headers['x-reflect-extension']===extensionId);
  if(!allowedOrigin||req.headers.host!==`127.0.0.1:${req.socket.localPort}`)return send(403,{error:'Only the configured Reflect extension may use this local server.'});
  res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type, X-Reflect-Extension');res.setHeader('Access-Control-Allow-Private-Network','true');
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return}
  if(req.method==='GET'&&req.url==='/health')return send(200,{ready:!!apiKey&&!!model,model:model||null,provider:'gemini'});
  if(req.method==='GET'&&req.url==='/check-api'){try{return send(200,await checkApiConnection({apiKey,model,fetchImpl}))}catch(e){return send(502,{error:e.message})}}
  if(req.method!=='POST'||req.url!=='/review')return send(404,{error:'Not found.'});
  if(!apiKey||!model)return send(503,{error:'Configure GEMINI_API_KEY and GEMINI_MODEL on the local server.'});
  if(busy)return send(409,{error:'A review is already running. Wait for it to finish.'});
  if(!req.headers['content-type']?.startsWith('application/json'))return send(415,{error:'JSON required.'});
  busy=true;let size=0,chunks=[];
  try{for await(const chunk of req){size+=chunk.length;if(size>400000){send(413,{error:'Review payload too large.'});req.resume();return}chunks.push(chunk)}
   let submissions;try{submissions=validateInput(JSON.parse(Buffer.concat(chunks).toString()))}catch(e){return send(400,{error:e.message})}
   send(200,await generateReview(submissions,{apiKey,model,fetchImpl}));
  }catch(e){send(502,{error:e.name==='TimeoutError'?'AI review timed out. Try a smaller selection.':e.message})}finally{busy=false}
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const {GEMINI_API_KEY:apiKey,GEMINI_MODEL:model,REFLECT_EXTENSION_ID:extensionId}=process.env;
 if(!/^[a-p]{32}$/.test(extensionId||'')){console.error('Set REFLECT_EXTENSION_ID to the ID shown for Reflect in chrome://extensions.');process.exit(1)}
 const selectedModel=model||'gemini-3.8-flash';
 const server=createReviewServer({apiKey,model:selectedModel,extensionId});server.requestTimeout=200000;server.listen(4318,'127.0.0.1',()=>console.log(`Reflect AI server: http://127.0.0.1:4318 — ${apiKey&&selectedModel?'Gemini configured':'set GEMINI_API_KEY and GEMINI_MODEL, then restart'}`));
}
