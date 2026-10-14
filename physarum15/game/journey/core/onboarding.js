import { OBSERVATION_POINTS } from "./meet.js";
import { replaySearchEvidence } from "./search.js";

// Presentation only. Looking at a frame never runs, records or awards a trial.
export function meetStage(s) {
  return !s.food ? 0 : s.observed.length < 2 ? 1 : !s.traced ? 2 : 3;
}
export function sensingFrame(s,runtime={}) {
  const current=runtime.snapshot?.placement===s.choice?runtime.snapshot:null;
  const recorded=s.trials[s.choice]||null;
  const start=!runtime.running&&s.sensingView==="start";
  const snapshot=start?{placement:s.choice}:!runtime.running&&s.sensingView==="event"&&recorded?recorded:current||recorded||{placement:s.choice};
  return {snapshot,recorded,start,
    kind:start||!snapshot.tips?"start":snapshot.firstSense?"event":snapshot.done?"unfound":"live"};
}
export function setSensingView(s,runtime,view) {
  if(s.id!=="002"||runtime.running||!["start","event"].includes(view))return false;
  if(view==="event"&&!s.trials[s.choice]?.firstSense)return false;
  s.sensingView=view;return true;
}
export function chapterOneReview(progress) {
  const ids=["001","002","003"];
  if(!ids.every(id=>progress.has(id)))return null;
  const saved=progress.snapshot().completed;
  const meet=saved["001"].evidence,sense=saved["002"].evidence,search=saved["003"].evidence;
  const replay=replaySearchEvidence(search);
  if(!replay)return null;
  return {
    observations:OBSERVATION_POINTS.filter((_,i)=>meet.observedMask&(1<<i)).map(p=>p.name),
    nearTime:sense.nearTime,farTime:sense.farTime,spent:search.spent,budget:search.budget,
    decisionStep:search.decisionStep,decisionResult:replay.rows[search.decisionStep-1]?.result||"",
  };
}
