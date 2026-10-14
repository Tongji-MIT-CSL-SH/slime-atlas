import { BACKUP } from "../content/scenes.js";
import { RECOVERY_EDGES, activeRecovery, recoveryFrame } from "../core/recovery.js";
import { deskSvg, deskText as text } from "./network-art.js";
export function recoveryArt(s){
 const run=activeRecovery(s),f=recoveryFrame(run),nodes=Object.fromEntries(BACKUP.nodes.map(n=>[n.id,n]));
 const line=(e,cls,fraction=1)=>{
  const a=nodes[e.a],b=nodes[e.b];
  return '<line x1="'+a.x+'" y1="'+a.y+'" x2="'+(a.x+(b.x-a.x)*fraction)+'" y2="'+(a.y+(b.y-a.y)*fraction)+'" class="'+cls+'"/>';
 };
 let body=RECOVERY_EDGES.map(e=>line(e,"recover-candidate")).join("");
 body+=BACKUP.edges.map(e=>line(e,e.id==="BC"&&f.cut?"recover-cut":"recover-base")).join("");
 body+=RECOVERY_EDGES.map(e=>{
  const amount=f.built[e.id];
  if(!amount)return "";
  const ratio=amount/e.length,a=nodes[e.a],b=nodes[e.b];
  return line(e,ratio===1?"recover-complete":"recover-growing",ratio)+(ratio<1?'<circle cx="'+(a.x+(b.x-a.x)*ratio)+'" cy="'+(a.y+(b.y-a.y)*ratio)+'" r="7" class="recover-front"/>':"");
 }).join("");
 const routes=new Set(Object.values(f.routes).flat());
 body+=BACKUP.edges.filter(e=>routes.has(e.id)).map(e=>line(e,"recover-connected")).join("");
 body+=BACKUP.nodes.map(n=>{
  const lost=f.missing.includes(n.id);
  return '<circle cx="'+n.x+'" cy="'+n.y+'" r="19" class="recover-node'+(lost?' lost':'')+'"/>'+
   text(n.x,n.y+5,n.id,'text-anchor="middle"')+text(n.x,n.id==="E"?74:302,n.name,'text-anchor="middle" class="recover-node-label"')+
   (BACKUP.targets.includes(n.id)?text(n.x,328,lost?"失聯":"可連通",'text-anchor="middle" class="'+(lost?'recover-lost-text':'recover-ok-text')+'"'):"");
 }).join("");
 body+=(f.cut?'<path d="M457 242 L483 268 M483 242 L457 268" class="recover-break"/>':
  '<g role="button" tabindex="0" id="recovery-cut-graphic" data-action="recovery-cut" aria-label="剪斷主通道 B 到 C"><circle cx="470" cy="255" r="26" class="recover-cut-handle"/>'+text(470,261,"剪",'text-anchor="middle"')+'</g>');
 body+=text(65,386,!run.started?"故障前 · 兩個目標都可連通":"故障後第 "+f.round+" 輪 · "+f.reached.length+" / 2 個目標連通",'class="recover-stage"');
 body+=text(65,418,run.prepared?"備路 EC 已提前投入 350 單位":"本次新增長度 "+f.builtLength+" · 未接完的線，還不能通行");
 body+=text(65,450,"灰虛線：候選方向　赭黃：尚在延伸　綠線：已完成或可通行",'class="recover-legend"');
 return deskSvg(body,"重連試驗；"+(!run.started?"故障前":"故障後第 "+f.round+" 輪")+"，"+f.reached.length+" 個目標可連通");
}
