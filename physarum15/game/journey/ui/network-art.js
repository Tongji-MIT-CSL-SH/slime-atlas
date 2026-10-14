import { DESK_NODES } from "../core/connect.js";
import { esc } from "./art.js";
export const deskText=(x,y,label,attrs="")=>'<text x="'+x+'" y="'+y+'" '+attrs+'>'+esc(label)+'</text>';
export const deskSvg=(body,label)=>'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 510" role="group" aria-label="'+label+'"><rect x="35" y="35" width="890" height="440" rx="45" class="dish"/>'+body+'</svg>';
export const edgePath=(id)=>({
 SB:"M150 255 Q310 35 740 120",SC:"M150 255 Q310 475 740 390",
 SJ:"M150 255 L420 255",JB:"M420 255 Q575 175 740 120",
 JC:"M420 255 Q575 340 740 390",BC:"M740 120 L740 390",
})[id];
export const edgeLabels={SB:[355,105],SC:[355,434],SJ:[275,234],JB:[554,163],JC:[554,371],BC:[805,255]};
export function deskNodes(demands){
 return DESK_NODES.map(node=>'<g><circle cx="'+node.x+'" cy="'+node.y+'" r="'+(node.id==="J"?14:23)+'" class="'+(node.id==="J"?"network-node":"oat")+'"/>'+
  deskText(node.x,node.y+6,node.id,'text-anchor="middle"')+
  deskText(node.id==="S"?node.x-35:node.id==="J"?node.x:node.x+86,node.y+(node.id==="J"?38:node.id==="S"?52:5),
   demands&&["B","C"].includes(node.id)?"需求 "+demands[node.id]:node.name,'text-anchor="middle"')+'</g>').join("");
}
export const deskButton=(action,label,disabled=false,attrs="")=>'<button type="button" class="secondary" data-action="'+action+'" '+attrs+(disabled?' disabled':'')+'>'+label+'</button>';
export const deskRadio=(name,value,title,selected,disabled=false)=>'<label class="choice '+(selected?'chosen':'')+'"><input type="radio" name="'+name+'" id="'+name+'-'+value+'" value="'+value+'"'+(selected?' checked':'')+(disabled?' disabled':'')+'><span><strong>'+title+'</strong></span></label>';
