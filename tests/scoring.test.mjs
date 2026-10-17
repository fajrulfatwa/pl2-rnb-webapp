import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// Isolated tests without requiring a bundler to support JSON imports.
const root=new URL('../',import.meta.url);
const rubric=JSON.parse(readFileSync(new URL('src/data/rubric.json',root),'utf8'));
const raw=readFileSync(new URL('src/lib/scoring.js',root),'utf8');
const source=raw.replace("import rubric from '../data/rubric.json';",`const rubric=${JSON.stringify(rubric)};`);
const scoring=await import(`data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`);
const {DOC,PRES,weighted,scoreRecord,outcome,rankByGroup,rankPreliminary}=scoring;
const makeScore=(id,num)=>({evaluator_id:id,status:'submitted',document_scores:Object.fromEntries(DOC.map(d=>[d.code,num])),presentation_scores:Object.fromEntries(PRES.MANAGER.map(d=>[d.code,num]))});
const participant={position:'MANAGER',exception_status:'normal',submission_status:'on_time',presentation_status:'present'};
const settings={scoring_mode:'dual',calibration_threshold:10};
test('rubric based on workbook preserves guidebook allocations',()=>{assert.equal(DOC.length,11);assert.equal(DOC.reduce((s,x)=>s+x.weight,0),100);for(const r of Object.values(PRES)){assert.equal(r.length,5);assert.equal(r.reduce((s,x)=>s+x.weight,0),100);}});
test('0–4 anchors calculate weighted scores 0, 75, 100',()=>{assert.equal(weighted(Object.fromEntries(DOC.map(x=>[x.code,0])),DOC),0);assert.equal(weighted(Object.fromEntries(DOC.map(x=>[x.code,3])),DOC),75);assert.equal(scoreRecord(makeScore('a',4),'MANAGER').total,100)});
test('draft, partial score and invalid score cannot submit results',()=>{assert.equal(scoreRecord({...makeScore('a',4),status:'draft'},'MANAGER'),null);assert.equal(weighted({D01:4},DOC),null);assert.equal(weighted(Object.fromEntries(DOC.map(d=>[d.code,7])),DOC),null)});
test('two independent scorers with gap beyond 10 require panel',()=>{const result=outcome(participant,[makeScore('a',4),makeScore('b',3)],undefined,settings);assert.equal(result.status,'calibration');assert.equal(result.value,null);assert.equal(result.gap,25)});
test('panel can approve average after discrepancy',()=>{const result=outcome(participant,[makeScore('a',4),makeScore('b',3)],{decision:'approve_average'},settings);assert.equal(result.status,'complete');assert.equal(result.value,87.5);assert.equal(result.category,'A')});
test('panel can manually set consensus score',()=>{const result=outcome(participant,[makeScore('a',4),makeScore('b',3)],{decision:'override',override_score:70},settings);assert.equal(result.value,70);assert.equal(result.category,'C')});
test('single examiner plus moderator requires approval',()=>{const m={...settings,scoring_mode:'single_moderator'};assert.equal(outcome(participant,[makeScore('a',3)],undefined,m).status,'moderation');assert.equal(outcome(participant,[makeScore('a',3)],{decision:'approve_single'},m).value,75)});
test('late / missing submission without approved excuse goes to panel',()=>{assert.equal(outcome({...participant,submission_status:'late'},[makeScore('a',4),makeScore('b',4)],null,settings).status,'exception');assert.equal(outcome({...participant,submission_status:'late',exception_status:'excused'},[makeScore('a',4),makeScore('b',4)],null,settings).status,'complete')});
test('approved administrative D is marked D without invented numeric result',()=>{const out=outcome({...participant,exception_status:'confirmed_d'},[],null,settings);assert.equal(out.category,'D');assert.equal(out.value,null);assert.equal(out.status,'administrative')});
test('ranking leaves ties and excludes pending decisions',()=>{const ranked=rankByGroup([{name:'B',out:{status:'complete',value:86}},{name:'A',out:{status:'complete',value:86}},{name:'C',out:{status:'complete',value:70}},{name:'D',out:{status:'missing'}}]);assert.deepEqual(ranked.map(x=>x.rank),[1,1,3]);});

test('dual mode immediately previews one submitted reviewer without finalising',()=>{
 const out=outcome(participant,[makeScore('a',3)],null,settings);
 assert.equal(out.status,'missing');assert.equal(out.value,null);
 assert.deepEqual([out.preliminary.doc,out.preliminary.pres,out.preliminary.value,out.preliminary.category,out.preliminary.count],[75,75,75,'C',1]);
});
test('dual discrepancy shows preview 87.5 and still needs calibration',()=>{
 const out=outcome(participant,[makeScore('a',3),makeScore('b',4)],null,settings);
 assert.equal(out.status,'calibration');assert.equal(out.value,null);
 assert.equal(out.gap,25);assert.equal(out.preliminary.value,87.5);
});
test('one reviewer has live preview, then admin approval makes it final',()=>{
 const mode={...settings,scoring_mode:'single_moderator'};
 const before=outcome(participant,[makeScore('a',3)],null,mode);
 assert.equal(before.status,'moderation');assert.equal(before.preliminary.value,75);assert.equal(before.value,null);
 const after=outcome(participant,[makeScore('a',3)],{decision:'approve_single'},mode);
 assert.equal(after.status,'complete');assert.equal(after.preliminary.value,75);assert.equal(after.value,75);
});
test('override score differs from raw reviewer preview, and category matches final',()=>{
 const result=outcome(participant,[makeScore('a',3),makeScore('b',4)],{decision:'override',override_score:82},settings);
 assert.equal(result.preliminary.value,87.5);assert.equal(result.value,82);assert.equal(result.category,'B');
});
test('rank preliminary includes pending verification, ignores draft and exception',()=>{
 const mode={...settings,scoring_mode:'single_moderator'};
 const first=outcome(participant,[makeScore('a',3)],null,mode);
 const second=outcome(participant,[makeScore('b',4)],null,mode);
 const missing=outcome(participant,[{...makeScore('c',4),status:'draft'}],null,mode);
 const exc=outcome({...participant,exception_status:'review'},[makeScore('d',4)],null,mode);
 const records=[{name:'A',out:first},{name:'B',out:second},{name:'C',out:missing},{name:'D',out:exc}];
 assert.deepEqual(rankPreliminary(records).map(r=>[r.name,r.rank]),[['B',1],['A',2]]);
 assert.deepEqual(rankByGroup(records),[]);
});

test('single-examiner mode refuses to finalise two historical examiners',()=>{
 const mode={...settings,scoring_mode:'single_moderator'};
 const out=outcome(participant,[makeScore('a',3),makeScore('b',4)],{decision:'approve_single'},mode);
 assert.equal(out.status,'duplicate');assert.equal(out.value,null);assert.equal(out.preliminary.value,87.5);
 assert.deepEqual(rankPreliminary([{name:'Simulasi',out}]),[]);
});
test('prior dual approval does not silently validate single-reviewer mode',()=>{
 const mode={...settings,scoring_mode:'single_moderator'};
 const out=outcome(participant,[makeScore('a',3)],{decision:'approve_average'},mode);
 assert.equal(out.status,'moderation');assert.equal(out.value,null);assert.equal(out.preliminary.value,75);
});
