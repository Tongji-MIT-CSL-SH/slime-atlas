import { DETOUR_LANES } from "../core/detour.js";
import { deskButton as button, deskRadio as radio } from "./network-art.js";
import { number } from "./art.js";
export { detourArt } from "./detour-art.js";
const name=id=>DETOUR_LANES.find(l=>l.id===id)?.name||"—";
export function detourControls(s){
 const ready=s.baseline&&s.comparison&&s.escape;
 return '<div class="detour-stamps" aria-label="本關觀察進度"><span>'+ (s.baseline?'✓':'○')+' 底稿</span><span>'+(s.comparison?'✓':'○')+' 長短比較</span><span>'+(s.escape?'✓':'○')+' 受阻再繞行</span></div>'+
  '<fieldset><legend>1. 放哪一種紙片？</legend>'+
  radio("detour-tool","resistance","斜線紙片：通行代價改變",s.tool==="resistance")+
  radio("detour-tool","wall","封閉紙片：禁止通過",s.tool==="wall")+
  '<div class="desk-edge-options">'+DETOUR_LANES.map(l=>button("detour-place",l.name,false,'id="detour-place-'+l.id+'" data-lane="'+l.id+'"')).join("")+'</div>'+
  '<p class="microcopy">每種紙片各一張，放到別處就是移動。只影響通道中段，不是整條路。</p>'+
  '<p class="detour-placement" role="status">阻力：'+(s.soft?name(s.soft)+' ×'+s.factor:'未放置')+'<br>封閉：'+(s.wall?name(s.wall):'未放置')+'</p>'+
  '<div class="desk-edge-options">'+button("detour-clear","收起阻力",!s.soft,'id="detour-clear-soft" data-kind="soft"')+button("detour-clear","收起封閉",!s.wall,'id="detour-clear-wall" data-kind="wall"')+'</div></fieldset>'+
  '<fieldset><legend>2. 阻力有多大？</legend><div class="desk-edge-options">'+[1,2,4].map(f=>radio("detour-factor",String(f),'×'+f,s.factor===f)).join("")+'</div>'+
  '<p class="microcopy">×1 是原本代價。只改倍率，距離不會跟著改；這不是生物實測參數。</p></fieldset>'+
  '<fieldset><legend>3. 我選這條路，試走看看</legend>'+DETOUR_LANES.map(l=>radio("detour-route",l.id,l.name+' · 長度 '+l.parts.reduce((a,b)=>a+b,0),s.route===l.id)).join("")+
  button("detour-test","沿這條路走一次",false,'id="detour-test"')+
  '<p class="desk-feedback" role="status">'+(s.current?(s.current.reachable?'已到達 · 路程 '+s.current.length+' · 代價 '+s.current.cost:'走了 '+s.current.walkedLength+' 就被擋住，沒有抵達目標。'):'目前只是預覽，請試走。第一次可先不放紙片，走中路。')+'</p></fieldset>'+
  (ready?'<fieldset><legend>4. 把兩種條件分開記</legend><p>封閉紙片表示：</p>'+radio("detour-hard","costly","可以穿過，只是很費力",s.hardMeaning==="costly")+radio("detour-hard","blocked","不能穿過，要另找通道",s.hardMeaning==="blocked")+
   '<p>阻力紙片表示：</p>'+radio("detour-soft","costly","仍可通行，代價按倍率計算",s.softMeaning==="costly")+radio("detour-soft","blocked","倍率變高就一律禁止通過",s.softMeaning==="blocked")+
   ((s.hardMeaning==="costly"||s.softMeaning==="blocked")?'<p class="gentle-hint">回看停下的位置與之前的中路：封閉是禁行，阻力只改本關的通行代價。可以修改，不扣卡。</p>':"")+'</fieldset>':"");
}
export function detourMetrics(s){
 const r=s.current,pair=s.comparison;
 return (!r?'<div class="untested-note">先選路試走。紙片移動或倍率改變後，舊結果不會當成本次結果。</div>':
  '<div class="metric-row"><div><small>本次路線</small><strong>'+name(r.route)+'</strong></div><div><small>'+(r.reachable?'走過的長度':'受阻前走過')+'</small><strong>'+r.walkedLength+'</strong></div><div><small>到達目標的代價</small><strong>'+number(r.cost)+'</strong></div></div>'+
  '<p class="result-note">'+(r.reachable?'這條路可以走到目標。長度與加權代價是兩把不同的尺。':'在 '+name(r.route)+' 中段前停下：規劃長度是 '+r.length+'，但這次沒有走完。')+'</p>'+
  '<details class="flow-rule"><summary>查看目前三條路的計算參考</summary><div class="comparison"><table><caption>只計算允許的通道；參考不等於你已親自試走</caption><thead><tr><th>路線</th><th>規劃長度</th><th>通行代價</th></tr></thead><tbody>'+r.rows.map(row=>'<tr><th>'+name(row.id)+'</th><td>'+row.length+'</td><td>'+number(row.cost)+'</td></tr>').join("")+'</tbody></table></div><p>目前模型最低代價：'+r.bestCost+'（'+r.bestRoutes.map(name).join('、')+'）。這是固定圖上的算法參考，不是黏菌一定會選它。</p></details>')+
  (pair?'<div class="comparison"><h3>長一點，卻比較省力</h3><table><caption>同一紙片位置、同一倍率 ×'+pair.shorter.settings.factor+'；你實際試走的兩次</caption><thead><tr><th>選擇</th><th>長度</th><th>代價</th></tr></thead><tbody>'+[pair.shorter,pair.longer].map(row=>'<tr><th>'+name(row.route)+'</th><td>'+row.length+'</td><td>'+row.cost+'</td></tr>').join("")+'</tbody></table><p>這張比較已記下。後續移動紙片，不會改寫當時的條件與數字。</p></div>':"")+
  (s.blocked?'<p class="result-note">受阻記錄：'+name(s.blocked.route)+' 走了 '+s.blocked.walkedLength+' 後停下。'+(s.escape?'相同條件改走'+name(s.escape.route)+'，才抵達目標。':'保留紙片，再試另一條路。')+'</p>':"")+
  '<p class="microcopy">加權代價 = 各段長度 × 各段倍率，再相加。封閉段直接移出可通行網路，不是給它一個很大的有限代價。示意圖不按比例；代價是教學分數，不是秒、金錢或細胞能量。</p>';
}
export function detourCardRecord(e){
 const lane=i=>DETOUR_LANES[i]?.name||"未識別";
 return '我先留下中路長度 '+e.baselineLength+' 的底稿。在'+lane(e.softLane)+'中段放阻力 ×'+e.factor+' 後，'+lane(e.shortRoute)+'長度 '+e.shortLength+'、代價 '+e.shortCost+'；'+lane(e.longRoute)+'長度 '+e.longLength+'、代價 '+e.longCost+'。較長不一定更費力。另一次，我在'+lane(e.wallLane)+'封閉處前停下，改走'+lane(e.escapeRoute)+'才到達目標，路程 '+e.escapeLength+'、代價 '+e.escapeCost+'。這是預設教學網路的比較。';
}
