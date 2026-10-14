import { DESK_EDGES, CONNECT_MODES, evaluateConnect } from "../core/connect.js";
import { number } from "./art.js";
import { deskText, deskSvg, edgePath, edgeLabels, deskNodes, deskButton, deskRadio } from "./network-art.js";
export function connectArt(s){
 const current=s.current||evaluateConnect(s.selected),path=current.routes[s.route]||[];
 let body=deskText(73,77,"CONNECTION DESK / 04",'class="svg-note"');
 for(const id of CONNECT_MODES[s.mode]){
  const edge=DESK_EDGES.find(e=>e.id===id),built=s.selected.includes(id),[x,y]=edgeLabels[id];
  body+='<g id="build-edge-'+id+'" class="desk-edge-button" role="button" tabindex="0" data-action="connect-edge" data-edge="'+id+'" aria-label="'+(built?"移除":"連接")+' '+id+'，長度 '+edge.length+'" aria-pressed="'+built+'">'+
   '<path d="'+edgePath(id)+'" class="desk-hit"/><path d="'+edgePath(id)+'" class="desk-edge '+(built?'built ':'')+(built&&s.current&&path.includes(id)?'route ':'')+(s.marked===id?'marked':'')+'"/>'+
   deskText(x,y,id+" · "+edge.length,'text-anchor="middle" class="desk-edge-label"')+'</g>';
 }
 body+=deskNodes()+deskText(480,455,s.current?"橙色：目前路線　綠色：標記的共享段":"點選虛線接線；再點一次可移除",'text-anchor="middle"');
 return deskSvg(body,"相同資源位置的接線桌。可點選通道，右側有相同的按鈕；所有長度是指定教學單位。");
}
export function connectControls(s){
 return '<fieldset><legend>1. 用哪種方式連接？</legend>'+
  deskRadio("connect-mode","independent","每處各從起點連接",s.mode==="independent")+
  deskRadio("connect-mode","shared","允許從已連接處分支",s.mode==="shared")+
  '</fieldset><fieldset><legend>2. 親手接上通道</legend><div class="desk-edge-options">'+
  CONNECT_MODES[s.mode].map(id=>deskButton("connect-edge",(s.selected.includes(id)?"✓ ":"")+id,false,'id="connect-edge-'+id+'" data-edge="'+id+'" aria-pressed="'+s.selected.includes(id)+'"')).join("")+
  '</div></fieldset>'+deskButton("connect-test","沿網路走一次",false,'id="connect-test"')+
  (s.current?'<p class="desk-feedback" role="status">'+(s.current.connected?'已連上兩處資源 · 總長 '+s.current.total:'還有資源未連上，請繼續接線。')+'</p>':"")+
  '<p class="microcopy">先完成獨立支路的比較，再試共享。資源位置與候選長度不變；連上不代表所有路程都變短。</p>'+
  (s.current?.connected?'<fieldset><legend>3. 查看旅程，留下比較</legend>'+
    deskRadio("connect-route","SB","S → B：從起點到資源",s.route==="SB")+
    deskRadio("connect-route","SC","S → C：另一條供給路",s.route==="SC")+
    deskRadio("connect-route","BC","B → C：資源之間",s.route==="BC")+
    '<p class="desk-feedback">這條路 '+number(s.current.distances[s.route])+' 單位，經過 '+s.current.routes[s.route].join("、")+'。'+(s.seen.includes(s.route)?'✓ 已記下':'尚未記下')+'</p>'+
    '<div class="action-stack">'+deskButton("connect-inspect","記下這條路徑",false,'id="connect-inspect"')+'</div></fieldset>'+
    (s.mode==="shared"?'<fieldset><legend>4. 哪一段被兩條供給路共享？</legend><p class="microcopy">比較 S → B 和 S → C 經過的通道，再標一段。</p>'+
      s.selected.map(id=>deskRadio("connect-mark",id,id,s.marked===id)).join("")+'</fieldset>':""):"");
}
export function connectMetrics(s){
 if(!s.current)return '<div class="untested-note">接線後按「沿網路走一次」。缺少通道就會顯示不可達，不會把斷開的短網路算成成功。</div>';
 const r=s.current;
 const note=!r.connected?"還有資源未連上，繼續接線再測。":s.marked&&!r.shared.includes(s.marked)?"這一段沒有同時出現在兩條供給路上。可以換一段再看。":
  s.marked?"已找到共享段 "+s.marked+"。再看看兩種旅程的長度。":"資源已連通。切換旅程，觀察高亮路徑。";
 return '<div class="metric-row"><div><small>已建通道總長</small><strong>'+r.total+'</strong></div><div><small>S → B</small><strong>'+number(r.distances.SB)+'</strong></div><div><small>B → C</small><strong>'+number(r.distances.BC)+'</strong></div></div>'+
  '<p class="result-note">'+note+'</p><p class="microcopy">已記下：'+(s.seen.join("、")||"尚無")+'。長度為教學單位，圖面不按比例。</p>'+
  (s.runs.independent&&s.mode==="shared"&&r.connected?'<div class="comparison"><h3>共享之後，什麼變了？</h3><table><caption>同一組資源，實際已建通道的比較</caption><thead><tr><th>組織方式</th><th>總長</th><th>S → B</th><th>B → C</th></tr></thead><tbody>'+
    [["獨立支路",s.runs.independent],["本次共享",r]].map(([label,item])=>'<tr><th>'+label+'</th><td>'+item.total+'</td><td>'+number(item.distances.SB)+'</td><td>'+number(item.distances.BC)+'</td></tr>').join("")+
    '</tbody></table><p>總長變少不保證每段旅程都縮短；請以這次的數字判斷，不預設哪種組織一定更好。</p></div>':"");
}
