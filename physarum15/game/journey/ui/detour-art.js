import { DETOUR_LANES, DETOUR_NODES, DETOUR_EDGES } from "../core/detour.js";
import { deskText as text, deskSvg } from "./network-art.js";
const node=id=>DETOUR_NODES.find(n=>n.id===id);
export function detourArt(s){
 const placed=s.tool==="wall"?s.wall:s.soft;
 const edges=DETOUR_EDGES.map(edge=>{
  const a=node(edge.a),b=node(edge.b),closed=edge.patch&&edge.lane===s.wall;
  const walked=s.current?.walked.includes(edge.id),chosen=!s.current&&edge.lane===s.route;
  return '<path d="M'+a.x+' '+a.y+' L'+b.x+' '+b.y+'" class="detour-path '+(closed?'closed ':walked?'walked ':chosen?'planned ':'')+'"/>';
 }).join("");
 const patches=DETOUR_LANES.map(lane=>{
  const soft=s.soft===lane.id,wall=s.wall===lane.id;
  const label=wall?'封閉 · 不可通行':soft?'阻力 ×'+s.factor:lane.name+' · 放下紙片';
  return '<g id="detour-zone-'+lane.id+'" tabindex="0" role="button" data-action="detour-place" data-lane="'+lane.id+'" aria-label="在'+lane.name+'放置'+(s.tool==="wall"?'封閉紙片':'阻力紙片')+'" aria-pressed="'+(placed===lane.id)+'">'+
   '<rect x="382" y="'+(lane.y-25)+'" width="196" height="50" rx="5" class="detour-patch '+(wall?'wall':soft?'resistance':'empty')+'"/>'+
   (wall?'<path d="M397 '+(lane.y-10)+' l20 20 m0 -20 l-20 20" class="detour-cross"/>':"")+
   text(wall?492:480,lane.y+6,label,'text-anchor="middle" class="detour-patch-label"')+'</g>'+
   text(220,{north:155,middle:227,south:365}[lane.id],lane.name+' · 總長 '+lane.parts.reduce((a,b)=>a+b,0),'text-anchor="middle" class="desk-edge-label"')+
   (soft&&wall?text(480,lane.y+45,'此處也有阻力；封閉時先判不可通行','text-anchor="middle" class="detour-small"'):"");
 }).join("");
 const marker=s.current?node(s.current.reachable?"T":s.route+"1"):null;
 return deskSvg('<defs><pattern id="detour-hatch" width="9" height="9" patternUnits="userSpaceOnUse"><rect width="9" height="9" fill="#efe2b9"/><path d="M-2 2 L2 -2 M0 9 L9 0 M7 11 L11 7" stroke="#cbb879" stroke-width="1"/></pattern></defs>'+
  text(65,70,'DETOUR DESK / 07','class="desk-heading"')+
  text(895,70,s.current?(s.current.reachable?'抵達目標':'在封閉紙片前停下'):'放紙片，再選路','text-anchor="end" class="desk-caption"')+edges+patches+
  ['S','T'].map(id=>{const n=node(id);return '<circle cx="'+n.x+'" cy="'+n.y+'" r="22" class="oat"/>'+text(n.x,n.y+6,id,'text-anchor="middle"')+text(n.x,n.y+49,id==="S"?'起點':'目標','text-anchor="middle"');}).join("")+
  (marker?'<circle class="detour-stop '+(s.current.reachable?'arrived':'blocked')+'" cx="'+marker.x+'" cy="'+marker.y+'" r="32"/>':"")+
  text(480,458,s.current?'綠線：本次實際走過　灰虛線：封閉路段':'選一種紙片，點通道中段放置；不用拖曳','text-anchor="middle" class="desk-caption"'),
  "三條通道的障礙與阻力試驗台。圖面不按比例，與右側按鈕操作相同。");
}
