import { CITY, CITY_OPTIONS } from "../content/scenes.js";
import { shortestPaths, serviceSummary } from "./graph.js";
export const COUNCIL_BUDGET=7;
export const PLAN_IDS=["A","B"];
export const MEASURES=[
 {id:"centre",bit:1,name:"中心捷徑",build:2,maintenance:1,edges:CITY_OPTIONS[1].edges,note:"中心街區至服務站：260 → 100"},
 {id:"river",bit:2,name:"南側通道",build:3,maintenance:1,edges:CITY_OPTIONS[2].edges,note:"新增南橋與接續道路，河灣至服務站：520"},
 {id:"west",bit:4,name:"西岸連路",build:2,maintenance:1,edges:[{id:"westUpgrade",a:"H",b:"W",length:120}],note:"新增同岸連路：120；原有繞行道路 500 仍保留"}
];
export const SCENARIOS=[
 {id:"normal",name:"平日",removed:[],note:"所有已選道路正常開放"},
 {id:"bridge",name:"北橋封閉",removed:["bridge"],note:"只封閉北橋 WN—EN"},
 {id:"road",name:"南路阻斷",removed:["southRoad"],note:"只封閉南側道路 BR—R；其他路段不變"}
];
export const QUESTIONS=[
 {id:"flood",text:"洪水同時影響多條路時，這個選擇還成立嗎？"},
 {id:"capacity",text:"服務站容量、行動需求與開放時間會改變結果嗎？"},
 {id:"permission",text:"真實工程的許可、造價與後續維護由誰確認？"}
];
export const RESPONSES=[
 {id:"inspect",text:"先核查受影響路段與居民需求，再討論改善。"},
 {id:"temporary",text:"討論臨時服務或接駁；尚未模擬，不能算成已解決。"},
 {id:"revise",text:"回取捨桌調整措施，再把三種情景重測。"}
];
const validMask=m=>Number.isInteger(m)&&m>=0&&m<=7;
const version=v=>Number.isSafeInteger(v)&&v>0&&v<1000000;
export function newCouncil(){
 return {model:1,plans:{A:{mask:0,revision:1,runs:{}},B:{mask:0,revision:1,runs:{}}},
 active:"A",scenario:"normal",chosen:"A",evidenceKeys:[],weakness:"",response:"",tradeoff:"",question:"",note:"",refs:[]};
}
export function evaluateCouncil(mask,scenario="normal"){
 if(!validMask(mask))throw Error("Unknown measure set");
 const condition=SCENARIOS.find(x=>x.id===scenario);
 if(!condition)throw Error("Unknown council scenario");
 const measures=MEASURES.filter(m=>mask&m.bit);
 const build=measures.reduce((a,m)=>a+m.build,0),maintenance=measures.reduce((a,m)=>a+m.maintenance,0);
 const edges=[...CITY.edges,...measures.flatMap(m=>m.edges)].filter(e=>!condition.removed.includes(e.id));
 const paths=shortestPaths(CITY.nodes,edges,"S");
 return {mask,scenario,build,maintenance,cost:build+maintenance,affordable:build+maintenance<=COUNCIL_BUDGET,edges,
 ...serviceSummary(CITY.groups,paths.distance,CITY.threshold),
 routes:Object.fromEntries(CITY.groups.map(g=>[g.id,paths.routeTo(g.node)]))};
}
function compact(r){return {distances:r.rows.map(g=>Number.isFinite(g.distance)?g.distance:null),cost:r.cost,served:r.servedPopulation};}
function record(plan,scenario){return {mask:plan.mask,revision:plan.revision,...compact(evaluateCouncil(plan.mask,scenario))};}
export function currentRun(board,id,scenario){
 const p=board.plans[id],r=p?.runs[scenario];
 return r&&r.mask===p.mask&&r.revision===p.revision?r:null;
}
export function toggleMeasure(board,id,bit){
 const p=board.plans[id];
 if(!p||!MEASURES.some(m=>m.bit===bit)||p.revision>=999999)return false;
 p.mask^=bit;p.revision++;
 board.evidenceKeys=[];board.weakness="";board.response="";board.tradeoff="";
 return true;
}
export function testCouncil(board,scenario){
 if(!SCENARIOS.some(s=>s.id===scenario))return false;
 board.scenario=scenario;
 // Both plans experience exactly the same scenario and budget accounting.
 for(const id of PLAN_IDS){
  const p=board.plans[id];
  if(evaluateCouncil(p.mask).affordable)p.runs[scenario]=record(p,scenario);
 }
 return true;
}
export function balanceReady(b){
 return b.plans.A.mask!==b.plans.B.mask &&
  PLAN_IDS.every(id=>currentRun(b,id,"normal")&&evaluateCouncil(b.plans[id].mask).affordable)&&
  PLAN_IDS.some(id=>evaluateCouncil(b.plans[id].mask).allServed);
}
export function cell(board,key){
 const [id,scenario,...extra]=String(key).split(".");
 if(extra.length||!PLAN_IDS.includes(id)||!SCENARIOS.some(s=>s.id===scenario)||!currentRun(board,id,scenario))return null;
 return {id,scenario,result:evaluateCouncil(board.plans[id].mask,scenario)};
}
export function currentCells(b){
 return PLAN_IDS.flatMap(id=>SCENARIOS.map(s=>id+"."+s.id)).filter(key=>cell(b,key));
}
export function trialsReady(b){
 return balanceReady(b)&&currentCells(b).length===6;
}
export function trialEvidenceReady(b){
 const weak=cell(b,b.weakness);
 return trialsReady(b)&&weak&&weak.result.servedPopulation<weak.result.population&&RESPONSES.some(r=>r.id===b.response);
}
export function tradeoffs(b){
 const id=b.chosen,other=id==="A"?"B":"A",r=evaluateCouncil(b.plans[id].mask),q=evaluateCouncil(b.plans[other].mask);
 const out=[{id:"budget",text:"方案 "+id+" 使用 "+r.build+" 枚建設＋"+r.maintenance+" 枚一期維護，共 "+r.cost+" / 7；留下 "+(7-r.cost)+" 枚未分配。後續各期維護未計入。"}];
 if(r.mean>q.mean)out.push({id:"daily",text:"平日平均比方案 "+other+" 多 "+Math.round(r.mean-q.mean)+" 教學距離；我仍選擇它，但承認這段額外路程。"});
 const failures=SCENARIOS.filter(s=>!evaluateCouncil(b.plans[id].mask,s.id).allServed);
 if(failures.length)out.push({id:"service",text:failures.map(s=>s.name).join("、")+"時，方案 "+id+" 仍有人超過 650，並非所有情景都達標。"});
 return out;
}
export function proposalReady(b){
 return Boolean(trialEvidenceReady(b)&&evaluateCouncil(b.plans[b.chosen].mask).allServed&&
 b.evidenceKeys.length===2&&new Set(b.evidenceKeys).size===2&&b.evidenceKeys.every(k=>cell(b,k))&&
 b.evidenceKeys.some(k=>k.startsWith(b.chosen+"."))&&
 tradeoffs(b).some(t=>t.id===b.tradeoff)&&QUESTIONS.some(q=>q.id===b.question));
}
export function selectCouncil(board,field,value,checked=true){
 if(field==="active"&&PLAN_IDS.includes(value))board.active=value;
 else if(field==="chosen"&&PLAN_IDS.includes(value)){board.chosen=value;board.evidenceKeys=[];board.tradeoff="";}
 else if(field==="weakness"&&cell(board,value)?.result.servedPopulation<140)board.weakness=value;
 else if(field==="response"&&RESPONSES.some(r=>r.id===value))board.response=value;
 else if(field==="tradeoff"&&tradeoffs(board).some(t=>t.id===value))board.tradeoff=value;
 else if(field==="question"&&QUESTIONS.some(q=>q.id===value))board.question=value;
 else if(field==="note")board.note=String(value).slice(0,300);
 else if(field==="evidence"&&cell(board,value)){
  board.evidenceKeys=board.evidenceKeys.filter(k=>k!==value);
  if(checked&&board.evidenceKeys.length<2)board.evidenceKeys.push(value);
 }else return false;
 return true;
}
export function cleanCouncil(raw){
 const b=newCouncil();
 if(!raw||raw.model!==1)return b;
 for(const id of PLAN_IDS){
  const p=raw.plans?.[id];if(!p||!validMask(p.mask)||!version(p.revision))continue;
  const dest=b.plans[id]={mask:p.mask,revision:p.revision,runs:{}};
  for(const scenario of SCENARIOS){
   const r=p.runs?.[scenario.id];
   if(!r||!validMask(r.mask)||!version(r.revision)||r.revision>p.revision)continue;
   if(r.revision===p.revision&&r.mask!==p.mask)continue;
   const result=evaluateCouncil(r.mask,scenario.id),expected=compact(result);
   if(result.affordable&&r.cost===expected.cost&&r.served===expected.served&&
    Array.isArray(r.distances)&&r.distances.length===3&&r.distances.every((v,i)=>v===expected.distances[i]))
    dest.runs[scenario.id]={mask:r.mask,revision:r.revision,...expected};
  }
 }
 for(const field of ["active","chosen","weakness","response","tradeoff","question","note"])
  if(typeof raw[field]==="string")selectCouncil(b,field,raw[field]);
 if(Array.isArray(raw.evidenceKeys))for(const key of raw.evidenceKeys)selectCouncil(b,"evidence",key);
 b.scenario=SCENARIOS.some(s=>s.id===raw.scenario)?raw.scenario:"normal";
 b.refs=Array.isArray(raw.refs)?[...new Set(raw.refs.filter(x=>typeof x==="string"&&/^00[1-9]$|^01[0-2]$/.test(x)))]:[];
 return b;
}
export function councilEvidence(id,b){
 const clean=cleanCouncil(b);
 const ready=id==="013"?balanceReady(clean):id==="014"?trialEvidenceReady(clean):id==="015"?proposalReady(clean):false;
 return ready?{model:1,lesson:id,board:clean}:null;
}
export function cleanCouncilEvidence(id,e){
 if(e?.model!==1||e.lesson!==id)return null;
 return councilEvidence(id,e.board);
}
export function councilTask(id,b){
 if(!balanceReady(b))return "在取捨桌留下兩份不同且可負擔的方案，測試平日；至少一份須讓每組居民在 650 內到站。";
 if(id==="013")return "比較已留下。收下取捨卡，再把同一組方案送進情景試驗。";
 if(!trialsReady(b))return "兩份方案都要留下平日、北橋封閉、南路阻斷的當前版本結果；舊版不計入。";
 if(!trialEvidenceReady(b))return "從測試表挑一個未達標的情景，留下受影響居民與下一步應對。";
 if(id==="014")return "測試與弱點已留下；不必讓每種故障都毫無損失。";
 if(!evaluateCouncil(b.plans[b.chosen].mask).allServed)return "這份提案尚未達到平日公共底線，請換方案或回取捨桌調整。";
 if(b.evidenceKeys.length!==2||!b.evidenceKeys.some(k=>k.startsWith(b.chosen+".")))return "貼上兩張不同的實測紙條，其中至少一張要來自你推薦的方案。";
 if(!b.tradeoff||!b.question)return "留下這份選擇的投入或代價，再留一個仍需研究的問題。";
 return "把這份有依據、也承認限制的選擇交給小鎮。";
}
