import { BACKUP } from "../content/scenes.js";
import { shortestPaths } from "./graph.js";
export const RECOVERY_HORIZON = 6;
export const RECOVERY_INCREMENT = 100;
export const RECOVERY_EDGES = BACKUP.options.flatMap(o=>o.edges).map(e=>Object.freeze({...e}));
export const RECOVERY_ACTIONS = ["wait","EB","EC","ED"];
const initialBuilt = prepared => ({EB:0,EC:prepared?350:0,ED:0});
const newRun = prepared => ({prepared,started:false,actions:[],frames:[],cursor:0});
export const newRecovery = () => ({mode:"repair",repair:newRun(false),prepared:newRun(true),markedRound:null,interpretation:""});
export const activeRecovery = s => s[s.mode];
function snapshot(built,round,cut,outage=0,action="start") {
  const completed=RECOVERY_EDGES.filter(e=>built[e.id]===e.length);
  const edges=[...BACKUP.edges,...completed];
  const paths=shortestPaths(BACKUP.nodes,edges,"A",cut?[BACKUP.cut]:[]);
  const reached=BACKUP.targets.filter(id=>Number.isFinite(paths.distance[id]));
  return {round,cut,action,built:{...built},builtLength:Object.values(built).reduce((a,b)=>a+b,0),
    completed:completed.map(e=>e.id),reached,missing:BACKUP.targets.filter(id=>!reached.includes(id)),outage,
    routes:Object.fromEntries(BACKUP.targets.map(id=>[id,paths.routeTo(id)]))};
}
export function recoveryFrame(run) {
  return run.started ? run.frames[run.cursor] : snapshot(initialBuilt(run.prepared),-1,false);
}
export function startRecovery(run) {
  if(run.started) return false;
  run.started=true;
  run.frames=[snapshot(initialBuilt(run.prepared),0,true)];
  run.cursor=0;
  return true;
}
export function advanceRecovery(run,action="wait") {
  if(!run.started||run.actions.length>=RECOVERY_HORIZON||!RECOVERY_ACTIONS.includes(action))return false;
  if(run.prepared&&action!=="wait")return false;
  const previous=run.frames.at(-1),built={...previous.built};
  if(action!=="wait"){
    const edge=RECOVERY_EDGES.find(e=>e.id===action);
    if(built[action]>=edge.length)return false;
    built[action]=Math.min(edge.length,built[action]+RECOVERY_INCREMENT);
  }
  // Service loss is integrated over [t,t+1); a finished edge opens at the end.
  const frame=snapshot(built,previous.round+1,true,previous.outage+previous.missing.length,action);
  run.actions.push(action);
  run.frames.push(frame);
  run.cursor=run.frames.length-1;
  return true;
}
export function finishRecovery(run) {
  if(!run.started)return false;
  let changed=false;
  while(advanceRecovery(run,"wait"))changed=true;
  return changed;
}
export function viewRecovery(run,round) {
  if(!Number.isInteger(round)||round<0||round>=run.frames.length)return false;
  run.cursor=round;
  return true;
}
export function switchRecovery(s,mode) {
  if(!["repair","prepared"].includes(mode))return false;
  s.mode=mode;
  return true;
}
export function resetRecovery(s) {
  s[s.mode]=newRun(s.mode==="prepared");
  s.interpretation="";
  if(s.mode==="repair")s.markedRound=null;
}
export function markRecovery(s) {
  const run=s.repair,frame=run.frames[run.cursor];
  if(s.mode!=="repair"||!frame?.missing.length)return false;
  s.markedRound=run.cursor;
  return true;
}
export function recoverySummary(run) {
  if(!run.started)return null;
  const final=run.frames.at(-1);
  const restored=run.frames.find(f=>f.reached.length===BACKUP.targets.length);
  return {round:final.round,restoredAt:restored?.round??null,outage:final.outage,
    finalReached:final.reached.length,builtLength:final.builtLength,
    initialLength:run.prepared?350:0,affected:BACKUP.targets.filter(id=>run.frames.some(f=>f.missing.includes(id))),
    uninterrupted:run.frames.every(f=>f.missing.length===0)};
}
function encode(values,base) {
  return values.reduce((sum,value,index)=>sum+value*base**index,0);
}
function framesCode(run) {
  return encode(run.frames.map(f=>(f.reached.includes("C")?1:0)+(f.reached.includes("D")?2:0)),4);
}
export function recoveryEvidence(s) {
  const a=recoverySummary(s.repair),b=recoverySummary(s.prepared);
  if(!a||!b||a.round!==RECOVERY_HORIZON||b.round!==RECOVERY_HORIZON
    ||s.repair.cursor!==RECOVERY_HORIZON||s.prepared.cursor!==RECOVERY_HORIZON
    ||a.restoredAt===null||a.restoredAt===0||a.finalReached!==2||!b.uninterrupted
    ||!Number.isInteger(s.markedRound)||!s.repair.frames[s.markedRound]?.missing.length
    ||s.interpretation!=="gap")return null;
  return {model:1,rounds:RECOVERY_HORIZON,actionCode:encode(s.repair.actions.map(a=>RECOVERY_ACTIONS.indexOf(a)),4),
    markedRound:s.markedRound,restoredAt:a.restoredAt,outage:a.outage,affectedMask:3,
    finalReached:a.finalReached,initialPreparedLength:b.initialLength,repairBuiltLength:a.builtLength,
    preparedOutage:b.outage,preparedFinalReached:b.finalReached,
    repairFramesCode:framesCode(s.repair),preparedFramesCode:framesCode(s.prepared)};
}
export function replayRecoveryEvidence(e) {
  if(!e||e.model!==1||e.rounds!==RECOVERY_HORIZON||!Number.isInteger(e.actionCode)||e.actionCode<0||e.actionCode>=4**RECOVERY_HORIZON)return null;
  const s=newRecovery();
  startRecovery(s.repair);startRecovery(s.prepared);
  for(let i=0;i<RECOVERY_HORIZON;i++){
    if(!advanceRecovery(s.repair,RECOVERY_ACTIONS[Math.floor(e.actionCode/4**i)%4]))return null;
    advanceRecovery(s.prepared,"wait");
  }
  s.markedRound=e.markedRound;s.interpretation="gap";
  const actual=recoveryEvidence(s);
  if(!actual||!Object.keys(actual).every(key=>actual[key]===e[key]))return null;
  return s;
}
export function recoveryTask(s) {
  const a=recoverySummary(s.repair),b=recoverySummary(s.prepared);
  if(!a)return "先在「故障後再連接」剪斷 B—C，看看誰失去了連接。";
  if(a.round<RECOVERY_HORIZON)return a.finalReached===2
    ? "已恢復連通。保持目前網路觀察到第 6 輪，留下相同長度的觀察窗。"
    : "選一條候選連接逐輪延伸。每輪最多延伸 100 單位，完成之前不能通行。";
  if(a.restoredAt===null)return "第 6 輪仍未恢復，這也是一次結果。重試「故障後再連接」，換一種投入方向。";
  if(!b||b.round<RECOVERY_HORIZON)return "換到「事先有備路」，剪斷同一段 B—C，也觀察到第 6 輪。";
  if(s.markedRound===null)return "回到「故障後再連接」，點一格失聯的舊記錄，把這段中斷留進卡背。";
  if(s.repair.cursor!==RECOVERY_HORIZON||s.prepared.cursor!==RECOVERY_HORIZON)return "已保留中斷記錄。把兩組都切回第 6 輪，再比較最後與中間發生的事。";
  return "兩組最後都連上了。中間經歷也相同嗎？把你的解釋記下來。";
}
