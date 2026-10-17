// Derive feedback from submitted evaluator comments. Never include drafts.
export function feedbackFromScore(score){
 if(!score||score.status!=='submitted')return {strengths:'',improvements:'',next_steps:''};
 return {strengths:score.feedback_strengths||'',improvements:score.feedback_improvements||'',next_steps:score.feedback_actions||''};
}
export function individualFeedback(approved,score){
 const auto=feedbackFromScore(score);
 return {strengths:approved?.strengths||auto.strengths,improvements:approved?.improvements||auto.improvements,next_steps:approved?.next_steps||auto.next_steps};
}
export function compileGroupComments(participants,scores,groupId){
 return participants.filter(p=>p.group_id===groupId).flatMap(p=>scores.filter(s=>s.participant_id===p.id&&s.status==='submitted').map(s=>({name:p.full_name,strength:s.feedback_strengths||'',improve:s.feedback_improvements||'',action:s.feedback_actions||''})));
}
