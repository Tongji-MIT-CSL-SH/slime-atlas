import { FLOW_EDGES, dynamicsFrame } from "../core/flow.js";
import { number } from "./art.js";
import { deskSvg, deskText, deskNodes, edgePath, edgeLabels } from "./network-art.js";
export function flowArt(s){
 const now=dynamicsFrame(s);
 const edges=FLOW_EDGES.map(edge=>{
  const id=edge.id,q=now.flows[id],width=3+now.strengths[id]*8,[x,y]=edgeLabels[id];
  const angle={SJ:0,JB:-24,JC:24,BC:90}[id]+(q<0?180:0);
  const [ax,ay]={SJ:[330,255],JB:[577.5,181.25],JC:[577.5,333.75],BC:[740,255]}[id];
  const ghost=s.kind==="006"&&s.overlay?'<path class="flow-ghost" d="'+edgePath(id)+'" stroke-width="'+(3+s.before.strengths[id]*8)+'"/>':"";
  const prediction=s.prediction===id?'<path class="flow-prediction" d="'+edgePath(id)+'" stroke-width="'+(width+12)+'"/>':"";
  return '<g id="flow-map-'+id+'" role="button" tabindex="0" data-action="flow-inspect" data-edge="'+id+'" aria-label="查看 '+id+'，流量 '+number(Math.abs(q),2)+'，連接強度 '+number(now.strengths[id],2)+'" aria-pressed="'+(s.selected===id)+'">'+
   ghost+prediction+'<path class="desk-hit" d="'+edgePath(id)+'"/><path class="flow-tube '+(s.selected===id?'selected':'')+'" d="'+edgePath(id)+'" stroke-width="'+width+'"/>'+
   (Math.abs(q)>0.001?'<path class="flow-arrow" d="M-8,-6 L8,0 L-8,6 Z" transform="translate('+ax+' '+ay+') rotate('+angle+')"/>':"")+
   deskText(x,y,id+' · |Q| '+number(Math.abs(q),2),'class="flow-value" text-anchor="'+(id==="BC"?"start":"middle")+'"')+'</g>';
 }).join("");
 return deskSvg(deskText(65,78,s.history.length?'第 '+s.cursor+' 輪 · '+(s.cursor===0?'需求剛改變':'連接已調整'):'改變之前 · 先留下一個預測','text-anchor="start" class="desk-heading"')+
  edges+deskNodes(now.demands)+deskText(65,450,'箭頭：流向　數字：流量 |Q|　線寬：連接強度 D','text-anchor="start" class="desk-caption"'),"固定網路的流量與連接強度");
}
