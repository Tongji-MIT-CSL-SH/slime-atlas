// Authored exploration puzzle. Tokens and signals are teaching rules, not a biological energy model.
import { SEARCH_BOARDS, mazeSnapshot } from "./search-boards.js";
export const SEARCH_BUDGET=6;
export const SEARCH_BRANCHES=Object.freeze(["upper","lower"]);
export const SEARCH_NAMES=Object.freeze({upper:"上方區域",lower:"下方區域"});
export function newSearch(sheet=0) {
  return {sheet:[0,1,2,3].includes(sheet)?sheet:0,moves:[],intent:"wide",decisionIndex:null,hint:false};
}
function signalAt(sheet,branch,step) {
  const resourceBranch=sheet===1?"upper":"lower";
  if(branch!==resourceBranch)return step===4?"empty":"quiet";
  return ["quiet","faint","strong","food"][step] || "food";
}
export const SIGNAL_TEXT=Object.freeze({
  quiet:"尚無新線索",faint:"發現淡淡線索",strong:"線索變得明顯",food:"找到燕麥",empty:"這一側暫無資源",
});
export function searchSnapshot(state) {
  if(SEARCH_BOARDS[state.sheet])return mazeSnapshot(state,SEARCH_BUDGET,SIGNAL_TEXT);
  const counts={upper:0,lower:0};
  const rows=state.moves.map((move,index)=>{
    const step=++counts[move.branch];
    const signal=signalAt(state.sheet,move.branch,step);
    return {...move,index,step,signal,result:SIGNAL_TEXT[signal]};
  });
  const found=rows.some(row=>row.signal==="food");
  const remaining=SEARCH_BUDGET-rows.length;
  const frontiers=SEARCH_BRANCHES.filter(branch=>
    !found && remaining>0 && counts[branch]<4
  );
  return {rows,counts,found,remaining,spent:rows.length,frontiers,exhausted:!found && remaining===0};
}
export function exploreSearch(state,branch) {
  const before=searchSnapshot(state);
  if(!before.frontiers.includes(branch))return false;
  const previous=SEARCH_BOARDS[state.sheet]?before.rows.at(-1):before.rows.filter(row=>row.branch===branch).at(-1);
  state.moves.push({branch,intent:state.intent==="follow"?"follow":"wide",before:previous?.signal || "unknown"});
  state.decisionIndex=null;
  return true;
}
export function undoSearch(state) {
  if(!state.moves.length)return false;
  state.moves.pop();
  state.decisionIndex=null;
  return true;
}
export function recordSearchDecision(state,index) {
  const snapshot=searchSnapshot(state);
  if(!snapshot.found || !Number.isInteger(index) || index<0 || index>=snapshot.rows.length)return false;
  state.decisionIndex=index;
  return true;
}
export function searchEvidence(state) {
  const snapshot=searchSnapshot(state);
  if(!snapshot.found || snapshot.remaining<0 || !Number.isInteger(state.decisionIndex) || !snapshot.rows[state.decisionIndex])return null;
  return {spent:snapshot.spent,budget:SEARCH_BUDGET,decisionStep:state.decisionIndex+1,
    upper:snapshot.counts.upper,lower:snapshot.counts.lower,sheet:state.sheet,
    followed:state.moves[state.decisionIndex].intent==="follow"?1:0,
    pathCode:state.moves.reduce((code,move,i)=>code | (move.branch==="lower"?1<<i:0),0),
    intentCode:state.moves.reduce((code,move,i)=>code | (move.intent==="follow"?1<<i:0),0)};
}
export function replaySearchEvidence(evidence) {
  if(![0,1,2,3].includes(evidence?.sheet) || !Number.isInteger(evidence?.spent) || evidence.spent<1 || evidence.spent>SEARCH_BUDGET
    || !Number.isInteger(evidence.pathCode) || !Number.isInteger(evidence.intentCode)
    || evidence.pathCode<0 || evidence.intentCode<0
    || evidence.pathCode>=2**evidence.spent || evidence.intentCode>=2**evidence.spent)return null;
  const state=newSearch(evidence.sheet);
  for(let i=0;i<evidence.spent;i++){
    state.intent=evidence.intentCode & (1<<i) ? "follow" : "wide";
    if(!exploreSearch(state,evidence.pathCode & (1<<i) ? "lower" : "upper"))return null;
  }
  return searchSnapshot(state);
}
