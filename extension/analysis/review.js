/* Conservative source heuristics. Never executes submitted code. */
(function(root){
function mask(code,python){
 // Preserve offsets and newlines while hiding comments and string literals.
 return code.replace(python?/'''[\s\S]*?'''|"""[\s\S]*?"""|'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|#[^\n]*/g:/\/\*[\s\S]*?\*\/|\/\/[^\n]*|'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/g,s=>s.replace(/[^\n]/g,' '));
}
function languageFamily(language){
 const name=String(language).toLowerCase().replace(/[\s_.-]/g,'');
 if(/^(mysql|mssql|sql|sqlserver|tsql|postgres(?:ql)?|pgsql|oracle)/.test(name))return 'sql';
 if(/^(python|pandas)/.test(name))return 'python';
 if(/^(cpp|c\+\+)/.test(name))return 'cpp';
 if(/^(csharp|c#)/.test(name))return 'csharp';
 const aliases={js:'javascript',javascript:'javascript',ts:'typescript',typescript:'typescript',java:'java',c:'c',golang:'go',go:'go',rust:'rust',ruby:'ruby',swift:'swift',kotlin:'kotlin',scala:'scala',dart:'dart',php:'php',r:'r',racket:'racket',erlang:'erlang',elixir:'elixir',bash:'shell',shell:'shell'};
 return aliases[name]||'generic';
}
function maskSource(code,family){
 if(family==='sql')return code.replace(/\/\*[\s\S]*?\*\/|--[^\n]*|#[^\n]*|'(?:''|\\.|[^'\\])*'|"(?:""|[^"])*"|`(?:``|[^`])*`|\$(\w*)\$[\s\S]*?\$\1\$/g,s=>s.replace(/[^\n]/g,' '));
 if(['python','ruby','r','elixir','shell'].includes(family))return mask(code,true);
 if(family==='racket')return mask(code,false).replace(/;[^\n]*/g,s=>' '.repeat(s.length));
 if(family==='erlang')return mask(code,false).replace(/%[^\n]*/g,s=>' '.repeat(s.length));
 if(family==='php')return mask(code,false).replace(/#[^\n]*/g,s=>' '.repeat(s.length));
 return mask(code,false);
}
function review(submissions){
 const supported=submissions.filter(x=>typeof x.code==='string'&&x.code.trim());
 // One latest source per problem/language avoids counting identical retries as recurring habits.
 const latest=new Map();for(const s of supported){const k=(s.titleSlug||s.title)+'|'+languageFamily(s.lang);const old=latest.get(k);if(!old||s.timestamp>=old.timestamp)latest.set(k,s)}
 const samples=[...latest.values()],buckets=new Map();
 function add(s,key,title,category,confidence,description,action,line,snippet){let f=buckets.get(key);if(!f){f={key,title,category,confidence,description,action,examples:[],ids:new Set(),problems:new Set()};buckets.set(key,f)}f.ids.add(s.id);f.problems.add(s.titleSlug||s.title);if(f.examples.length<3)f.examples.push({id:s.id,title:s.title,line,snippet})}
 for(const s of samples){const family=languageFamily(s.lang),py=family==='python',cpp=family==='cpp',sql=family==='sql',clean=maskSource(s.code,family),lines=clean.split('\n'),raw=s.code.split('\n');const issue=(key,title,cat,conf,desc,action,index)=>add(s,key,title,cat,conf,desc,action,index+1,raw[index]?.trimEnd()||'');
  if(py){
   let tabs=lines.findIndex(l=>/^\t+\S/.test(l)),spaces=lines.some(l=>/^ +\S/.test(l));if(tabs>=0&&spaces)issue('indent','Use consistent indentation','Formatting','Observed','This Python source uses tabs on some indented lines and spaces on others. This is a consistency signal, not proof of an indentation error.','Use four spaces per indentation level; configure your formatter to replace indentation tabs.',tabs);
   let spacing=lines.findIndex(l=>/\b[A-Za-z_]\w*=(?!=)/.test(l)&&!/^\s*def\b/.test(l)&&!/[([]/.test(l));if(spacing>=0)issue('spacing','Give assignments breathing room','Formatting','Observed','An ordinary Python assignment has no space before its = operator. Keyword arguments and function defaults are excluded by this conservative check.','Prefer count = 0 over count=0. Use a Python formatter for consistent formatting.',spacing);
  }
  let trailing=raw.findIndex((l,i)=>/\S[ \t]+$/.test(l)&&lines[i].trim());if(trailing>=0)issue('trailing','Remove trailing whitespace','Formatting','Observed','A code line ends in unnecessary spaces or tabs.','Enable trim trailing whitespace in your editor.',trailing);
  let long=lines.findIndex(l=>l.trim()&&l.trimEnd().length>100);if(long>=0)issue('long','Break up long code lines','Readability','Style preference','A non-comment code line exceeds the review’s configurable-in-code 100-character threshold. Long lines can make expressions harder to scan.','Split the expression across lines or introduce a descriptive intermediate variable.',long);
  if(cpp){
   let spacing=lines.findIndex(l=>/\b(?:int|long|double|float|bool|auto)\s+\w+=(?!=)/.test(l));if(spacing>=0)issue('cpp-spacing','Space C++ initializers consistently','Formatting','Observed','A local scalar declaration has no space before its initializer = operator.','Prefer int count = 0; and apply your preferred clang-format style consistently.',spacing);
   let valueCopy=lines.findIndex(l=>/for\s*\(\s*(?:auto|(?:const\s+)?(?:std::)?(?:string|vector\s*<[^>]+>))\s+\w+\s*:/.test(l));if(valueCopy>=0)issue('cpp-range-copy','Review range-loop copies','Algorithm / data structure','Review suggestion','A range-based loop binds its element by value. Copies can be appropriate for small scalar values; strings, vectors, or larger objects may cost more.','If the element is a large object and mutation is unnecessary, compare const auto& with the current by-value binding. Check lifetime and aliasing requirements.',valueCopy);
   let flushing=lines.findIndex(l=>/\b(?:std::)?endl\b/.test(l)&&/<<|cout/.test(l));if(flushing>=0)issue('cpp-flush','Avoid unnecessary output flushing','Efficiency','Review suggestion','std::endl adds a newline and flushes the stream. Frequent flushing can make non-interactive output slower.','When flushing is not required, consider a newline character instead; preserve explicit flushes for interactive protocols.',flushing);
  }
  if(sql){
   const code=lines.join('\n');const locate=offset=>code.slice(0,offset).split('\n').length-1;
   const star=code.match(/\bSELECT\s+(?:DISTINCT\s+)?(?:[A-Za-z_]\w*\s*\.\s*)?\*/i);
   if(star)issue('sql-projection','Select explicit columns','Readability','Review suggestion','SELECT * includes every column. It may be intentional, but explicit output columns make the expected result clearer and can avoid unnecessary retrieval.','Select the columns required by the problem; keep * if all columns are required.',locate(star.index));
   const nullComparison=code.match(/(?<![<>=!])(?:!=|<>|=)(?!=)\s*NULL\b|\bNULL\s*(?:!=|<>|=(?!=))/i);
   if(nullComparison)issue('sql-null','Check NULL comparisons','Correctness','High confidence','Ordinary equality and inequality comparisons with NULL do not perform a nullness test in standard SQL and MySQL. NULL-safe operators and IS NULL are different.','Use IS NULL or IS NOT NULL when testing whether a value is null.',locate(nullComparison.index));
   const notIn=code.match(/\bNOT\s+IN\s*\(\s*SELECT\b/i);
   if(notIn)issue('sql-not-in','Check nullable anti-joins','Algorithm / SQL','Needs schema verification','NOT IN with a subquery can behave unexpectedly if the subquery returns NULL. This check does not know whether the selected column is nullable.','Confirm the subquery cannot return NULL; compare a correctly correlated NOT EXISTS when appropriate.',locate(notIn.index));
   const alias=code.match(/\bAS\s+(?:tmp\d*|temp\d*|foo|bar|obj\d*)\b/i);
   if(alias)issue('sql-alias','Use descriptive result aliases','Naming','Review suggestion','A result alias is a generic placeholder. Required output names must still match the problem.','Name the result by its role, unless the problem requires this exact column name.',locate(alias.index));
  }
  const decl=family==='php'?/\$([A-Za-z_]\w*)\s*=/:py||family==='ruby'||family==='r'?/^\s*([A-Za-z_]\w*)\s*(?:=(?!=)|<-)/:family==='go'?/\b([A-Za-z_]\w*)\s*:=/:/\b(?:let|const|var|val|int|long|double|float|String|boolean|bool|auto)\s+(?:mut\s+)?([A-Za-z_]\w*)(?:\s*:\s*[^=;]+)?\s*=/;
  let vague=sql?-1:lines.findIndex(l=>{let m=l.match(decl);return m&&/^(?:a|b|c|x|y|z|tmp\d*|temp\d*|foo|bar|obj\d*|data\d*)$/.test(m[1])});if(vague>=0)issue('naming','Name values by their role','Naming','Review suggestion','A local assignment uses a generic name such as x, tmp, or obj. Short names can be appropriate for coordinates or conventional algorithms; inspect the context. Loop indices and parameters are not flagged.','Where meaning is unclear, prefer descriptive names such as current_node, window_start, or remaining_count.',vague);
  if(py){let mixed=lines.findIndex(l=>{let m=l.match(decl);return m&&/^[a-z]+[A-Z]/.test(m[1])});if(mixed>=0&&lines.some(l=>{let m=l.match(decl);return m&&/^[a-z]+_[a-z]/.test(m[1])}))issue('naming-style','Keep local naming consistent','Naming','Observed','Python local assignments mix camelCase and snake_case. Required LeetCode method signatures are excluded.','Use snake_case for your own Python locals; preserve required platform interfaces.',mixed)}
  const fnStart=py?/^\s*(?:async\s+)?def\s+\w+/:/\bfunction\s+\w+|\b(?:public|private|protected)\s+.*\(/;let fn=lines.findIndex(l=>fnStart.test(l));if(fn>=0&&py){let indent=lines[fn].search(/\S/),end=fn+1;while(end<lines.length&&(!lines[end].trim()||lines[end].search(/\S/)>indent))end++;let count=lines.slice(fn+1,end).filter(l=>l.trim()).length;if(count>40)issue('function-size','Consider extracting a helper','Structure','Review suggestion',`A Python function contains ${count} nonblank code lines. Length alone does not establish poor design.`,'Look for a coherent operation to name and extract; keep the main algorithm easy to follow.',fn)}
  if(py){let front=lines.findIndex(l=>/\.pop\(\s*0\s*\)/.test(l));if(front>=0)issue('queue','Use a queue-friendly data structure','Algorithm / data structure','Review suggestion','Python list.pop(0) shifts the remaining elements in O(n) time per removal. Repeated queue removals can add quadratic work. The receiver’s type and algorithm still need review.','If this is a list used as a FIFO queue, use collections.deque with popleft(); deque end-removal is O(1).',front);
   let broad=lines.findIndex(l=>/\bexcept\s*(?:Exception\s*)?:/.test(l));if(broad>=0)issue('exceptions','Keep exception handling specific','Structure','Review suggestion','A broad exception handler can hide unrelated bugs. It may be intentional at an application boundary.','Catch the exceptions you expect and keep the protected block small.',broad);
   if(/^(two-sum|Two Sum)$/.test(s.titleSlug||s.title)){let outer=lines.findIndex(l=>/^\s*for\b/.test(l)),inner=outer<0?-1:lines.findIndex((l,i)=>i>outer&&/^\s*for\b/.test(l)&&l.search(/\S/)>lines[outer].search(/\S/));if(inner>=0)issue('two-sum','Compare pair scanning with a hash map','Algorithm / pattern','Needs problem verification','This Two Sum solution contains nested for loops. If both loops scan the input, pair scanning is O(n²); the check does not infer loop bounds or prove equivalence.','For the standard unsorted Two Sum problem, compare with a one-pass complement hash map: expected O(n) time and O(n) extra space. Confirm constraints and required output first.',inner)}
  }
 }
 const findings=[...buckets.values()].map(f=>{const {ids,problems,...rest}=f;return {...rest,count:ids.size,denom:samples.filter(s=>f.key.startsWith('sql-')?languageFamily(s.lang)==='sql':f.key.startsWith('cpp-')?languageFamily(s.lang)==='cpp':['indent','spacing','naming-style','function-size','queue','exceptions','two-sum'].includes(f.key)?languageFamily(s.lang)==='python':true).length,problemCount:problems.size,recurrence:problems.size>=3?'Recurring across problems':problems.size>=2?'Seen in multiple problems':'Single-problem observation'}});
 return {findings,coverage:{sourceSubmissions:submissions.filter(x=>x.code).length,supportedSubmissions:supported.length,reviewedSolutions:samples.length,unsupportedLanguages:[],basicOnlyLanguages:[...new Set(samples.filter(x=>!['python','cpp','sql'].includes(languageFamily(x.lang))).map(x=>x.lang))],languageCoverage:[...new Set(samples.map(x=>x.lang))].map(lang=>({language:lang,family:languageFamily(lang),level:['python','cpp','sql'].includes(languageFamily(lang))?'language-specific':'basic',checks:['line length','trailing whitespace',...(['python','cpp','sql'].includes(languageFamily(lang))?['language-specific suggestions']:['naming where recognized'])]})),method:'Latest source per problem and language; conservative text checks, not a semantic or optimality proof.'}};
}
root.ReflectReview={review,mask,languageFamily,maskSource};if(typeof module!=='undefined')module.exports=root.ReflectReview;
})(typeof window==='undefined'?globalThis:window);
