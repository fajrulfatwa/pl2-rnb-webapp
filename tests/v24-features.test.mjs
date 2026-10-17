import test from 'node:test';import assert from 'node:assert/strict';
import {feedbackFromScore,individualFeedback,compileGroupComments} from '../src/lib/feedback.js';
const submitted={participant_id:'p1',status:'submitted',feedback_strengths:'Teliti',feedback_improvements:'Komunikasi',feedback_actions:'Latihan presentasi'};
test('V2.4 feedback individual muncul dari skor submitted',()=>assert.deepEqual(feedbackFromScore(submitted),{strengths:'Teliti',improvements:'Komunikasi',next_steps:'Latihan presentasi'}));
test('V2.4 skor draft tidak memunculkan feedback bersama',()=>assert.deepEqual(feedbackFromScore({...submitted,status:'draft'}),{strengths:'',improvements:'',next_steps:''}));
test('V2.4 kurasi admin opsional menimpa satu aspek saja',()=>assert.deepEqual(individualFeedback({strengths:'Sudah dikurasi'},submitted),{strengths:'Sudah dikurasi',improvements:'Komunikasi',next_steps:'Latihan presentasi'}));
test('V2.4 rekap kelompok hanya dari submitted pada grup yang sama',()=>{
 const ps=[{id:'p1',full_name:'A',group_id:'G1'},{id:'p2',full_name:'B',group_id:'G1'},{id:'p3',full_name:'C',group_id:'G2'}];
 const ss=[submitted,{...submitted,participant_id:'p2',status:'draft'}, {...submitted,participant_id:'p3'}];
 assert.deepEqual(compileGroupComments(ps,ss,'G1'),[{name:'A',strength:'Teliti',improve:'Komunikasi',action:'Latihan presentasi'}]);
});
