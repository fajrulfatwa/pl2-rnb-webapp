import rubric from '../data/rubric.json';
export const DOC=rubric.doc;
export const PRES=rubric.presentation;
export const GROUPS=rubric.groups;
export const round2=n=>Math.round((n+Number.EPSILON)*100)/100;
export function validRating(v){return Number.isInteger(v)&&v>=0&&v<=4;}
export function weighted(scores,criteria){
 if(!criteria?.length||!criteria.every(x=>validRating(scores?.[x.code])))return null;
 return round2(criteria.reduce((a,x)=>a+(scores[x.code]/4)*x.weight,0));
}
export function scoreRecord(score,position){
 if(!score||score.status!=='submitted')return null;
 const doc=weighted(score.document_scores,DOC),pres=weighted(score.presentation_scores,PRES[position]);
 if(doc===null||pres===null)return null;
 return {doc,pres,total:round2(doc*.6+pres*.4)};
}
const categoryFor=v=>v>=86?'A':v>=76?'B':v>=61?'C':'D';
function averageDetails(list){
 if(!list.length)return null;
 const doc=round2(list.reduce((a,v)=>a+v.details.doc,0)/list.length);
 const pres=round2(list.reduce((a,v)=>a+v.details.pres,0)/list.length);
 const value=round2(doc*.6+pres*.4);
 return {doc,pres,value,category:categoryFor(value),count:list.length};
}
export function outcome(participant,allScores,moderation,settings){
 const valid=allScores.map(s=>({evaluator:s.evaluator_id,submittedAt:s.submitted_at||'',details:scoreRecord(s,participant.position)})).filter(x=>x.details);
 // A consistent choice matters if extra historical test scores exist in single-reviewer mode.
 valid.sort((a,b)=>a.submittedAt.localeCompare(b.submittedAt)||String(a.evaluator).localeCompare(String(b.evaluator)));
 const mode=settings?.scoring_mode||'dual',threshold=Number(settings?.calibration_threshold??10);
 const selected=mode==='dual'?valid.slice(0,2):valid.slice(0,Math.min(valid.length,2));
 const preliminary=averageDetails(selected); // Available immediately after a complete score is submitted.
 const gap=valid.length>=2?round2(Math.abs(valid[0].details.total-valid[1].details.total)):null;
 if(participant.exception_status==='confirmed_d')return {status:'administrative',label:'D administratif (disahkan)',value:null,doc:null,pres:null,category:'D',exception:true,preliminary:null};
 if(participant.exception_status==='review'||(participant.exception_status==='normal'&&(['late','missing'].includes(participant.submission_status)||participant.presentation_status==='absent')))return {status:'exception',label:'Menunggu keputusan rapat',value:null,doc:null,pres:null,preliminary,gap};
 if(mode==='dual'&&valid.length<2)return {status:'missing',label:`Menunggu ${2-valid.length} penguji`,value:null,preliminary,gap};
 if(mode==='single_moderator'&&valid.length<1)return {status:'missing',label:'Menunggu penguji',value:null,preliminary:null,gap:null};
 if(mode==='single_moderator'&&valid.length>1)return {status:'duplicate',label:'Lebih dari 1 penguji · periksa penugasan',value:null,preliminary,gap};
 if(mode==='single_moderator'&&!['approve_single','override'].includes(moderation?.decision))return {status:'moderation',label:'Skor sementara · menunggu verifikasi admin',value:null,preliminary,gap};
 if(mode==='dual'&&valid.length>=2&&gap>threshold&&!moderation)return {status:'calibration',label:`Perlu kalibrasi · Δ${gap}`,gap,value:null,preliminary};
 if(!preliminary)return {status:'missing',label:'Menunggu nilai',value:null,preliminary:null,gap};
 const doc=preliminary.doc,pres=preliminary.pres;
 let total=preliminary.value;
 if(moderation?.decision==='override')total=Number(moderation.override_score);
 const band=categoryFor(total);
 return {status:'complete',label:'Terverifikasi',value:total,doc,pres,category:band,band,gap,exception:false,preliminary};
}
function makeRanks(records,getValue){
 const sorted=records.map(r=>({...r,_rankValue:getValue(r)})).filter(r=>Number.isFinite(r._rankValue))
   .sort((a,b)=>b._rankValue-a._rankValue||a.name.localeCompare(b.name));
 let rank=0,previous=null;
 return sorted.map((r,i)=>{if(r._rankValue!==previous){rank=i+1;previous=r._rankValue;}
   const {_rankValue,...record}=r;return {...record,rank};});
}
export function rankByGroup(records){
 return makeRanks(records,r=>r.out?.status==='complete'&&!r.out.exception?r.out.value:null);
}
export function rankPreliminary(records){
 return makeRanks(records,r=>!['administrative','exception','duplicate'].includes(r.out?.status)&&r.out?.preliminary?r.out.preliminary.value:null);
}
export function aggregateForGroup(groupId,participants,allScores,moderations,settings){
 const group=GROUPS.find(g=>g.id===groupId);if(!group)return [];
 return participants.filter(p=>p.group_id===groupId).map(p=>({...p,position:group.position,out:outcome({...p,position:group.position},allScores.filter(s=>s.participant_id===p.id),moderations.find(m=>m.participant_id===p.id),settings)}));
}
export function gradeLabel(g){return ({A:'Sangat Baik',B:'Baik',C:'Cukup',D:'Kurang'})[g]||'—';}
