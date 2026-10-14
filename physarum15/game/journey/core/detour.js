import { shortestPaths } from "./graph.js";
export const DETOUR_LANES=Object.freeze([
 {id:"middle",name:"中路",y:255,parts:[100,200,100]},
 {id:"north",name:"北路",y:125,parts:[200,220,200]},
 {id:"south",name:"南路",y:385,parts:[260,240,260]},
]);
export const DETOUR_NODES=Object.freeze([
 {id:"S",x:130,y:255},{id:"T",x:830,y:255},
 ...DETOUR_LANES.flatMap(lane=>[{id:lane.id+"1",x:350,y:lane.y},{id:lane.id+"2",x:610,y:lane.y}]),
]);
export const DETOUR_EDGES=Object.freeze(DETOUR_LANES.flatMap(lane=>{
 const points=["S",lane.id+"1",lane.id+"2","T"];
 return lane.parts.map((length,i)=>({id:lane.id+i,a:points[i],b:points[i+1],length,lane:lane.id,patch:i===1}));
}));
const validLane=id=>DETOUR_LANES.some(lane=>lane.id===id);
export const detourKey=s=>[s.soft||"-",s.wall||"-",s.factor].join(":");
export function newDetour(){
 return {soft:null,wall:null,factor:2,tool:"resistance",route:"middle",current:null,trials:[],
  baseline:null,comparison:null,blocked:null,escape:null,hardMeaning:"",softMeaning:""};
}
function invalidate(s){s.current=null;}
export function placeDetour(s,lane){
 if(!validLane(lane)||!["resistance","wall"].includes(s.tool))return false;
 s[s.tool==="wall"?"wall":"soft"]=lane;invalidate(s);return true;
}
export function clearDetour(s,kind){
 if(!["soft","wall","all"].includes(kind))return false;
 if(kind!=="wall")s.soft=null;if(kind!=="soft")s.wall=null;
 invalidate(s);return true;
}
export function setDetourFactor(s,value){
 if(![1,2,4].includes(value))return false;
 s.factor=value;invalidate(s);return true;
}
export function selectDetourRoute(s,route){
 if(!validLane(route))return false;
 s.route=route;invalidate(s);return true;
}
export function evaluateDetour(settings,route){
 if(!validLane(route)||![1,2,4].includes(settings.factor)||
  ![settings.soft,settings.wall].every(id=>id===null||validLane(id)))throw Error("Invalid detour condition");
 const removed=settings.wall?[settings.wall+"1"]:[];
 const weighted=DETOUR_EDGES.map(edge=>({...edge,length:edge.length*(edge.patch&&edge.lane===settings.soft?settings.factor:1)}));
 const paths=shortestPaths(DETOUR_NODES,weighted,"S",removed);
 const rows=DETOUR_LANES.map(lane=>{
  const edges=DETOUR_EDGES.filter(edge=>edge.lane===lane.id),reachable=lane.id!==settings.wall;
  const length=edges.reduce((sum,edge)=>sum+edge.length,0);
  const cost=reachable?weighted.filter(edge=>edge.lane===lane.id).reduce((sum,edge)=>sum+edge.length,0):Infinity;
  return {id:lane.id,length,cost,reachable,edges:edges.map(edge=>edge.id),
   walked:reachable?edges.map(edge=>edge.id):[edges[0].id],walkedLength:reachable?length:edges[0].length};
 });
 const selected=rows.find(row=>row.id===route);
 return {key:detourKey(settings),settings:{soft:settings.soft,wall:settings.wall,factor:settings.factor},
  route,...selected,rows,bestCost:paths.distance.T,bestEdges:paths.routeTo("T"),bestRoutes:rows.filter(row=>row.cost===paths.distance.T).map(row=>row.id)};
}
export function testDetour(s){
 const result=evaluateDetour(s,s.route);
 s.current=result;s.trials.push(structuredClone(result));if(s.trials.length>24)s.trials.shift();
 if(!s.soft&&!s.wall&&s.route==="middle")s.baseline=structuredClone(result);
 if(s.soft&&!s.wall){
  const candidates=s.trials.filter(row=>row.key===result.key&&row.reachable);
  for(const shorter of candidates)for(const longer of candidates){
   if(shorter.length<longer.length&&shorter.cost>longer.cost)
    s.comparison={shorter:structuredClone(shorter),longer:structuredClone(longer)};
  }
 }
 if(!result.reachable){s.blocked=structuredClone(result);s.escape=null;}
 else if(s.blocked?.key===result.key)s.escape=structuredClone(result);
 return result;
}
export function detourEvidence(s){
 const pair=s.comparison,escape=s.escape;
 if(!s.baseline||!pair||!s.current?.reachable||!escape||escape.key!==s.current.key||
  escape.route!==s.current.route||s.current.key!==detourKey(s)||
  s.hardMeaning!=="blocked"||s.softMeaning!=="costly")return null;
 const index=id=>DETOUR_LANES.findIndex(lane=>lane.id===id);
 return {model:1,baselineLength:s.baseline.length,
  factor:pair.shorter.settings.factor,softLane:index(pair.shorter.settings.soft),
  shortRoute:index(pair.shorter.route),longRoute:index(pair.longer.route),
  shortLength:pair.shorter.length,longLength:pair.longer.length,shortCost:pair.shorter.cost,longCost:pair.longer.cost,
  wallLane:index(escape.settings.wall),escapeRoute:index(escape.route),escapeLength:escape.length,escapeCost:escape.cost,
  stoppedLength:s.blocked.walkedLength};
}
export function detourTask(s){
 if(!s.baseline)return "先不放紙片，走一次中路，留下一張沒有阻力的底稿。";
 if(!s.comparison)return "放下阻力紙片，調整倍率；在相同條件下試走兩條路，找出較長卻代價較低的一次。可先從中路 ×4 和北路比較。";
 if(!s.blocked)return "換用封閉紙片，試走被它擋住的那條路，看看在哪裡停下來。";
 if(!s.current?.reachable||!s.escape||s.escape.key!==detourKey(s))return "保留相同紙片位置，改走另一條仍可通行的路，抵達目標。";
 return "把兩種紙片的意思分開記下來：哪個不能穿過，哪個只是代價較高？";
}
