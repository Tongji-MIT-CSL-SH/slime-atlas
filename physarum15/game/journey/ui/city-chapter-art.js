import { CITY, evaluateCity } from "../content/scenes.js";
import { reachSnapshot, REACH_NODE_NAMES } from "../core/reach.js";
import { cityArt, esc } from "./art.js";
const nodes=Object.fromEntries(CITY.nodes.map(n=>[n.id,n]));
function directLine(blocked=false){
 const a=nodes.H,b=nodes.S;
 return '<path d="M'+a.x+' '+a.y+'L'+b.x+' '+b.y+'" class="city-reference"/>'+
  '<text x="555" y="348" class="city-reference-note">直線參考 ≠ 通道</text>'+
  (blocked?'<path d="M422 350l24 24m0-24-24 24" class="city-no-passage"/>':"");
}
function overlay(art,body,label){
 return art.replace('role="img"','role="group"').replace(/aria-label="[^"]*"/,'aria-label="'+esc(label)+'"').replace("</svg>",body+"</svg>");
}
export function translateArt(s){
 const result=evaluateCity(s.option==="copy"?"none":s.option);
 const draft=s.option==="copy";
 const plain={...result,routes:{}};
 return '<div class="transfer-intro"><span>培養皿觀察<small>探索・回饋・適應</small></span><b aria-hidden="true">→</b><span>重新定義問題<small>需求・候選・規則</small></span><b aria-hidden="true">→</b><span>河灣鎮<small>需要再檢驗的方案</small></span></div>'+
  overlay(cityArt(plain,"bend"),draft?directLine(Boolean(s.current)):"","轉譯桌上的河灣鎮；"+(draft?"跨河虛線是未獲准草圖":"只展示本關合法候選，尚不代表服務已達標"));
}
export function reachArt(s){
 const r=reachSnapshot(s),at=nodes[r.at];
 let body=directLine(s.directTried);
 body+=r.choices.map(c=>{
  const n=nodes[c.node];
  return '<g id="reach-node-'+c.node+'" role="button" tabindex="0" data-action="reach-step" data-node="'+c.node+'" aria-label="走到'+REACH_NODE_NAMES[c.node]+'，這段 '+c.length+'"><circle cx="'+n.x+'" cy="'+n.y+'" r="24" class="reach-next"/><text x="'+n.x+'" y="'+(n.y+6)+'" text-anchor="middle" class="reach-node-code">'+c.node+'</text></g>';
 }).join("");
 body+='<g transform="translate('+at.x+' '+at.y+')" aria-label="小禾目前在'+REACH_NODE_NAMES[r.at]+'"><circle r="13" class="reach-person"/><path d="M-4-7v14m8-14v14" class="reach-footprints"/></g>';
 body+='<text x="75" y="82" class="reach-stage">已走 '+r.distance+' 教學距離 · '+(r.arrived?'已到站':'目前在'+REACH_NODE_NAMES[r.at])+'</text>';
 return overlay(cityArt({...r.network,routes:{bend:r.edges}},"bend"),body,"小禾的實際行走路線；已走 "+r.distance+"，目前在"+REACH_NODE_NAMES[r.at]);
}
