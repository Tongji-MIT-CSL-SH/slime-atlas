import { shortestPaths } from "./graph.js";
export const DESK_NODES=Object.freeze([
 {id:"S",x:150,y:255,name:"資源起點"}, {id:"J",x:420,y:255,name:"匯合點"},
 {id:"B",x:740,y:120,name:"資源 B"}, {id:"C",x:740,y:390,name:"資源 C"},
]);
export const DESK_EDGES=Object.freeze([
 {id:"SB",a:"S",b:"B",length:550},{id:"SC",a:"S",b:"C",length:550},
 {id:"SJ",a:"S",b:"J",length:260},{id:"JB",a:"J",b:"B",length:300},
 {id:"JC",a:"J",b:"C",length:300},{id:"BC",a:"B",b:"C",length:220},
]);
export const CONNECT_MODES=Object.freeze({independent:["SB","SC"],shared:["SJ","JB","JC","BC"]});
export function newConnect(){return {mode:"independent",selected:[],runs:{},current:null,route:"SB",seen:[],marked:""};}
function invalidate(s){s.current=null;s.seen=[];s.marked="";}
export function setConnectMode(s,mode){
 if(!Object.hasOwn(CONNECT_MODES,mode))return false;
 s.mode=mode;s.selected=[];invalidate(s);return true;
}
export function toggleConnect(s,id){
 if(!CONNECT_MODES[s.mode].includes(id))return false;
 s.selected=s.selected.includes(id)?s.selected.filter(edge=>edge!==id):[...s.selected,id];
 invalidate(s);return true;
}
export function evaluateConnect(ids){
 if(new Set(ids).size!==ids.length || ids.some(id=>!DESK_EDGES.some(edge=>edge.id===id)))throw Error("Invalid desk edges");
 const edges=DESK_EDGES.filter(edge=>ids.includes(edge.id));
 const source=shortestPaths(DESK_NODES,edges,"S"),b=shortestPaths(DESK_NODES,edges,"B");
 const routes={SB:source.routeTo("B"),SC:source.routeTo("C"),BC:b.routeTo("C")};
 return {edges,total:edges.reduce((sum,e)=>sum+e.length,0),
  connected:Number.isFinite(source.distance.B)&&Number.isFinite(source.distance.C),
  distances:{SB:source.distance.B,SC:source.distance.C,BC:b.distance.C},routes,
  shared:routes.SB.filter(id=>routes.SC.includes(id))};
}
export function testConnect(s){
 s.current=evaluateConnect(s.selected);
 s.seen=[];s.marked="";
 if(s.current.connected)s.runs[s.mode]=structuredClone(s.current);
 return s.current;
}
export function inspectConnect(s,route){
 if(!["SB","SC","BC"].includes(route))return false;
 s.route=route;
 if(s.current?.connected&&!s.seen.includes(route))s.seen.push(route);
 return true;
}
export function markConnect(s,id){
 if(!s.current?.connected || !s.selected.includes(id))return false;
 s.marked=id;return true;
}
export function connectEvidence(s){
 if(s.mode!=="shared"||!s.runs.independent?.connected||!s.current?.connected ||
   !["SB","BC"].every(route=>s.seen.includes(route))||!s.current.shared.includes(s.marked))return null;
 return {mask:DESK_EDGES.reduce((mask,edge,i)=>mask|(s.selected.includes(edge.id)?1<<i:0),0),
  sharedEdge:DESK_EDGES.findIndex(edge=>edge.id===s.marked),
  beforeTotal:s.runs.independent.total,total:s.current.total,
  beforeSB:s.runs.independent.distances.SB,distanceSB:s.current.distances.SB,
  beforeBC:s.runs.independent.distances.BC,distanceBC:s.current.distances.BC};
}
