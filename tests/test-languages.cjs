const assert=require('node:assert/strict');const {review,languageFamily}=require('../extension/analysis/review.js');
const s=(id,lang,code,title=id)=>({id,title,lang,code,timestamp:'2026-10-16T00:00:00Z'});
for(const [name,family] of [['MySQL','sql'],['MS SQL Server','sql'],['PostgreSQL','sql'],['C++17','cpp'],['cpp','cpp'],['C#','csharp'],['golang','go'],['Pandas','python'],['Python3','python'],['Swift','swift']])assert.equal(languageFamily(name),family);
const names=['c','cpp','csharp','java','javascript','typescript','python3','golang','rust','ruby','swift','kotlin','scala','dart','php','r','racket','erlang','elixir','bash','mysql','mssql','postgresql','unfamiliar-language'];
for(const lang of names){const r=review([s(lang,lang,'x'.repeat(110))]);assert.equal(r.coverage.reviewedSolutions,1,lang);assert.ok(r.findings.some(f=>f.key==='long'),lang);assert.equal(r.coverage.unsupportedLanguages.length,0)}
let r=review([s('sql','mysql','SELECT *\nFROM users\nWHERE email = NULL;'),s('py','python3','count = 1')]);assert.equal(r.findings.find(f=>f.key==='sql-null').examples[0].line,3);assert.equal(r.findings.find(f=>f.key==='sql-projection').denom,1);
for(const lang of ['mysql','mssql','postgresql']){r=review([s('sql',lang,"-- SELECT * WHERE x = NULL\nSELECT 'x = NULL', 'SELECT *', 1 /* SELECT * */;")]);assert.equal(r.findings.length,0);}
for(const code of ['SELECT COUNT(*) FROM users;','SELECT id FROM users WHERE value <=> NULL;','SELECT id FROM users WHERE value IS NULL;'])assert.equal(review([s('sql','mysql',code)]).findings.length,0);
assert.ok(review([s('sql','mysql','SELECT id FROM a WHERE id NOT IN (SELECT other_id FROM b);')]).findings.some(f=>f.key==='sql-not-in'));
assert.ok(review([s('sql','mysql','SELECT salary AS tmp FROM users;')]).findings.some(f=>f.key==='sql-alias'));
for(const [lang,code] of [['rust','let mut tmp: i32 = 0;'],['golang','tmp := 0'],['kotlin','val tmp = 0'],['swift','let tmp: Int = 0'],['ruby','tmp = 0'],['php','$tmp = 0;']])assert.ok(review([s('n',lang,code)]).findings.some(f=>f.key==='naming'),lang);
assert.equal(review([s('1','cpp','int x = 0;','P'),s('2','C++','int count = 0;','P')]).coverage.reviewedSolutions,1);
console.log('Passed: popular language aliases, fallback coverage, SQL evidence and denominators, SQL comment/string exclusions, NULL-safe operators, COUNT(*), SQL suggestions, multi-language naming, alias deduplication.');
