import { CITY, CITY_OPTIONS } from "../content/scenes.js";
import { reachSnapshot, REACH_NODE_NAMES, replayReachEvidence } from "../core/reach.js";
import { deskButton as button, deskRadio as radio } from "./network-art.js";
export { reachArt } from "./city-chapter-art.js";
export function reachControls(s){
 const r=reachSnapshot(s);
 return '<fieldset><legend>1. 對岸看得見，能直接走嗎？</legend>'+
  button("reach-direct","試試直接走向對岸",s.nodes.length!==1,'id="reach-direct"')+
  '<p class="microcopy">虛線是方向參考，不是已存在的橋。示意圖不按比例，不從像素量出直線距離。</p></fieldset>'+
  '<fieldset><legend>2. 陪小禾走到下一個路口</legend><p class="reach-feedback" role="status">'+s.note+'</p>'+
  '<div class="reach-steps">'+r.choices.map(c=>button("reach-step",REACH_NODE_NAMES[c.node]+' <small>＋'+c.length+'</small>',false,'id="reach-step-'+c.node+'" data-node="'+c.node+'"')).join("")+'</div>'+
  (r.arrived?'<p class="gentle-hint">'+(r.served?'已在 650 以內。還要檢查這次的預算和原路比較。':'雖然走到了，但還超過 650。換一張方案，再從家出發。')+'</p>':"")+
  '<div class="desk-edge-options">'+button("reach-undo","退回一個路口",!s.edges.length,'id="reach-undo"')+
  button("reach-restart","本方案重新走",!s.edges.length,'id="reach-restart"')+'</div></fieldset>'+
  '<fieldset><legend>3. 換一張方案，從家重走</legend>'+CITY_OPTIONS.map(o=>radio("reach-option",o.id,o.name+' · '+o.cost+' 枚',s.option===o.id)).join("")+
  '<p class="microcopy">選擇即開始另一輪路線試驗，不是在散步途中瞬間建橋。所有候選均為本關假設已獲准的通道；預算 4 枚。</p></fieldset>'+
  (s.baseline&&r.arrived?'<fieldset><legend>4. 我用哪一把尺判斷？</legend>'+
   radio("reach-meaning","line","看上去近，畫一個直線圈就足夠",s.interpretation==="line")+
   radio("reach-meaning","network","沿可走道路累加，並檢查服務門檻",s.interpretation==="network")+
   (s.interpretation==="line"?'<p class="gentle-hint">回想剛才繞到北橋的每一段。直線沒有替小禾找到跨河通道，可以修改解釋。</p>':"")+'</fieldset>':"");
}
export function reachMetrics(s){
 const r=reachSnapshot(s);
 return '<div class="metric-row"><div><small>'+ (r.arrived?'這次到站路程':'目前已走，尚非全程')+'</small><strong>'+r.distance+'</strong></div><div><small>服務門檻</small><strong>'+CITY.threshold+'</strong></div><div><small>投入 / 預算</small><strong class="'+(r.affordable?'':'danger')+'">'+r.cost+' / 4</strong></div></div>'+
  '<p class="result-note">'+(!r.arrived?"腳印只畫出已走過的段落，還沒走的路不算已到達。":!r.affordable?"雖然到站，這組措施仍超出預算。":r.served?"這次沿合法通道到站，路程也在本關門檻內。":"路網可連通，但這次路程超過門檻；可到達與在規定距離內到達要分開看。")+'</p>'+
  '<ol class="reach-route" aria-label="本次實際路線">'+r.nodes.map((id,i)=>'<li>'+REACH_NODE_NAMES[id]+(i?' <small>＋'+r.network.edges.find(e=>e.id===r.edges[i-1]).length+'</small>':' · 出發')+'</li>').join("")+'</ol>'+
  (s.baseline?'<div class="comparison"><h3>把原路留下來比較</h3><table><caption>同一個家、同一個服務站；只改候選措施</caption><thead><tr><th>項目</th><th>原有道路</th><th>本次</th></tr></thead><tbody><tr><th>走完的路程</th><td>'+s.baseline.distance+'</td><td>'+(r.arrived?r.distance:'尚未走完')+'</td></tr><tr><th>措施投入</th><td>0</td><td>'+r.cost+'</td></tr></tbody></table></div>':"")+
  '<p class="microcopy">單位是教學距離，不是實測公尺或步行分鐘。這關只檢查小禾所在的河灣住戶；下一關再看其他居民組，不能據此說全鎮都改善。</p>';
}
export function reachCardRecord(e){
 const s=replayReachEvidence(e),r=s?reachSnapshot(s):null;
 return '我試過直接跨河，但圖上的虛線不是通道。原有道路經北橋到服務站，要走 '+e.baselineDistance+' 教學距離。換成「'+CITY_OPTIONS[e.option].name+'」後，我親自走過'+(r?r.nodes.map(n=>REACH_NODE_NAMES[n]).join(' → '):'合法路線')+'，全程 '+e.distance+'，投入 '+e.cost+' / 4 枚，達到 '+e.threshold+' 以內。這只驗證了河灣住戶，其他居民還要另外查看。';
}
