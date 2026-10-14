import { newSearch, exploreSearch, recordSearchDecision, SEARCH_BUDGET } from "./search.js";
import { BACKUP, evaluateBackup } from "../content/scenes.js";
export function cleanSearchDraft(raw){
 if(!raw||![0,1,2,3].includes(raw.sheet)||!Array.isArray(raw.moves)||raw.moves.length>SEARCH_BUDGET)return null;
 const s=newSearch(raw.sheet);
 for(const m of raw.moves){
  if(!m||!["wide","follow"].includes(m.intent))return null;
  s.intent=m.intent;if(!exploreSearch(s,m.branch))return null;
 }
 if(Number.isInteger(raw.decisionIndex))recordSearchDecision(s,raw.decisionIndex);
 s.intent=raw.intent==="follow"?"follow":"wide";
 s.hint=raw.hint===true?1:[1,2].includes(raw.hint)?raw.hint:false;
 return s;
}
const option=id=>BACKUP.options.some(o=>o.id===id);
const cut=id=>["BC","CD"].includes(id);
const prediction=p=>["0","1","2","unsure"].includes(p)?p:"";
export function cleanBackupDraft(raw){
 if(!raw||!option(raw.choice)||!cut(raw.cutEdge))return null;
 const records=Array.isArray(raw.records)?raw.records.slice(-12).filter(r=>r&&option(r.option)&&cut(r.cutEdge)).map(r=>({option:r.option,cutEdge:r.cutEdge,prediction:prediction(r.prediction)})):[];
 return {choice:raw.choice,cutEdge:raw.cutEdge,prediction:prediction(raw.prediction),records};
}
export function cleanFieldwork(raw){return {search:cleanSearchDraft(raw?.search),backup:cleanBackupDraft(raw?.backup)};}
export function resumeFieldwork(session,raw){
 const data=cleanFieldwork(raw);
 if(session.id==="003"&&data.search)session.search=data.search;
 if(session.id==="008"&&data.backup){
  const d=data.backup;session.choice=d.choice;session.backup={cutEdge:d.cutEdge,prediction:d.prediction,records:d.records};
  for(const r of d.records)if(r.cutEdge==="BC")session.tested[r.option]=evaluateBackup(r.option,true,r.cutEdge);
  const last=d.records.at(-1);
  if(last&&last.option===d.choice&&last.cutEdge===d.cutEdge&&last.prediction===d.prediction)session.current=evaluateBackup(last.option,true,last.cutEdge);
 }
 return session;
}
