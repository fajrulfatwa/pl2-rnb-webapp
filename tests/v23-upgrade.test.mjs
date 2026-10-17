import test from 'node:test';
import assert from 'node:assert/strict';
import {uniquePeopleCount,vicePresidentCode} from '../src/lib/identity.js';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const rubric=JSON.parse(readFileSync(new URL('src/data/rubric.json',root),'utf8'));
const raw=readFileSync(new URL('src/lib/scoring.js',root),'utf8');
const source=raw.replace("import rubric from '../data/rubric.json';",`const rubric=${JSON.stringify(rubric)};`);
const {GROUPS,DOC,PRES,scoreRecord,rankPreliminary}=await import(`data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`);

test('president and vice president remain the same unique person',()=>{
 const a={id:'A',code:'GDO-PRES-01'},b={id:'B',code:'GDO-VP-01',origin_participant_id:'A'};
 assert.equal(uniquePeopleCount([a,b]),1);
 assert.equal(vicePresidentCode(a.code),b.code);
 assert.equal(uniquePeopleCount([a,b,{id:'C'}]),2);
});
test('rubric positions include president and vice president separately',()=>{
 assert.ok(GROUPS.some(g=>g.id==='GDO-PRES'));
 assert.ok(GROUPS.some(g=>g.id==='GDO-VP'));
 assert.ok(PRES['PRESIDENT DIRECTOR']);
 assert.ok(PRES['VICE PRESIDENT DIRECTOR']);
});
test('one evaluator submitted all rubric criteria has immediate preliminary ranking',()=>{
 const doc=Object.fromEntries(DOC.map(c=>[c.code,3]));
 const pres=Object.fromEntries(PRES['VICE PRESIDENT DIRECTOR'].map(c=>[c.code,3]));
 const details=scoreRecord({status:'submitted',document_scores:doc,presentation_scores:pres},'VICE PRESIDENT DIRECTOR');
 assert.equal(details.total,75);
 const provisional=rankPreliminary([{id:'VP-A',name:'Kandidat A',out:{status:'moderation',preliminary:{value:75}}},{id:'VP-B',name:'Kandidat B',out:{status:'missing',preliminary:null}}]);
 assert.equal(provisional.length,1);
 assert.equal(provisional[0].rank,1);
});
