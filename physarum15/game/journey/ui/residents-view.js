import { CITY, CITY_OPTIONS } from "../content/scenes.js";
import { residentFrame, residentComparison, residentTrail } from "../core/residents.js";
import { cityArt, esc, number } from "./art.js";
const name=id=>CITY_OPTIONS.find(o=>o.id===id)?.name||"";
const initials={centre:"中",west:"西",bend:"灣"};
const questions={
  centre:"我們這裡人多。路變短了，其他街區也有被照顧到嗎？",
  west:"我住在河的另一邊。請沿著真正能走的橋，看看我的路。",
  bend:"平均距離變短了，我這段繞路也會跟著變短嗎？",
};
const distance=v=>Number.isFinite(v)?number(v):"不可達";
function changeText(before,after){
  if(!Number.isFinite(before)&&!Number.isFinite(after))return "仍不可達";
  if(!Number.isFinite(before))return "從不可達到有路可走";
  if(!Number.isFinite(after))return "原本可達，現在失聯";
  return before===after?"路程不變":(after<before?"少走 ":"多走 ")+number(Math.abs(after-before));
}
export function residentHeader(s){
  const f=residentFrame(s);
  return '<div class="resident-header"><p class="eyebrow">THREE LETTERS / 換一位居民，看看同一張圖紙</p><div class="resident-postcards" role="group" aria-label="選一封居民來信">'+
    CITY.groups.map(g=>'<button type="button" id="resident-'+g.id+'" data-resident="'+g.id+'" class="resident-postcard" aria-pressed="'+(s.resident===g.id)+'"><span class="resident-initial" aria-hidden="true">'+initials[g.id]+'</span><span><strong>'+g.name+'</strong><small>'+g.population+' 位居民</small></span></button>').join("")+
    '</div><p id="resident-frame-label" class="resident-frame-label">'+(f.historical?"回看實測":f.measured?"本次實測":"條件預覽 · 尚未測試")+' · '+name(f.result.option)+'</p></div>';
}
export function residentArt(s){return cityArt(residentFrame(s).result,s.resident,{interactive:true});}
export function residentDock(s){
  const f=residentFrame(s),g=CITY.groups.find(g=>g.id===s.resident),row=f.result.rows.find(r=>r.id===g.id);
  const comparison=residentComparison(s),pair=comparison?.rows.find(r=>r.id===g.id);
  let message=questions[g.id];
  if(f.measured)message=!row.reachable?"這張圖紙裡，我沒有可通行的路到服務站。":
    '這張圖紙裡，我要走 '+distance(row.distance)+' 教學距離單位，'+(row.served?'在約定的 650 以內。':'還超過約定的 650。');
  const route=residentTrail(f.result,g.id);
  return '<div class="resident-dock"><article id="resident-letter" tabindex="-1" class="resident-letter resident-story" role="status"><div class="letter-heading"><span class="resident-initial" aria-hidden="true">'+initials[g.id]+'</span><strong>來自'+g.name+'的一封信</strong><span class="resident-letter-stamp">'+(f.measured?(row.served?"✓ 達到底線":"尚未達標"):"等你測試")+'</span></div><p class="resident-quote">'+message+'</p>'+
    (!f.measured?'<p>先按「測試這個方案」，再把路程帶回來。</p>':'')+
    (pair&&!f.historical?'<p class="resident-difference">和「'+name(comparison.before.option)+'」相比：'+changeText(pair.before.distance,pair.after.distance)+'。</p>':'')+
    (f.measured&&!f.result.affordable?'<p class="danger">這份方案用了 '+f.result.cost+' 枚，超過 4 枚預算；能到達不等於可採用。</p>':'')+
    (f.measured&&f.result.option==="centre"&&g.id==="bend"&&!s.inspectedBend?'<button type="button" id="resident-note" class="secondary" data-action="resident-note">記下河灣住戶的這段路</button>':'')+
    '<button type="button" id="resident-edit" class="text-button" data-action="resident-edit">'+(f.measured?'換一個措施，再看看 →':'去選措施、測試 →')+'</button></article><div class="resident-view-switch" role="group" aria-label="切換兩份圖紙">'+
    '<button type="button" id="resident-view-current" class="secondary" data-action="resident-view" data-view="current" aria-pressed="'+!f.historical+'">看本次'+(f.current?'實測':'預覽')+'</button>'+
    '<button type="button" id="resident-view-reference" class="secondary" data-action="resident-view" data-view="reference" aria-pressed="'+f.historical+'"'+(!f.reference?' disabled':'')+'>回看比較起點</button></div>'+
    (f.reference?'<label class="resident-reference-label" for="resident-reference">比較起點（只列已測方案）</label><select id="resident-reference">'+CITY_OPTIONS.filter(o=>s.tested[o.id]).map(o=>'<option value="'+o.id+'"'+(f.reference.option===o.id?' selected':'')+'>'+o.name+'</option>').join("")+'</select>':'')+
    (f.measured?'<details id="resident-route-details"><summary>沿合法道路走一遍 · '+distance(row.distance)+'</summary>'+(route.length?'<ol class="resident-route-list">'+route.map(e=>'<li>'+esc(e.from)+' → '+esc(e.to)+' <strong>'+e.length+'</strong></li>').join("")+'</ol>':'<p>沒有可通行路線。</p>')+'</details>':'')+
    '<p class="microcopy">來信依教學模型結果編寫，不是真實訪談。切換圖紙不新增試驗，收卡仍依本次已測方案判定。</p></div>';
}
export function residentControls(s){
  return '<h3>把改善放在哪裡？</h3><p class="microcopy">同一組居民、同一個 650 服務底線。選好措施後，測一次再換人看。</p><fieldset><legend>本輪預算 4 枚</legend>'+
    CITY_OPTIONS.map(o=>'<label class="choice '+(s.choice===o.id?'chosen':'')+'"><input id="option-'+o.id+'" type="radio" name="option" value="'+o.id+'"'+(s.choice===o.id?' checked':'')+'><span><strong>'+o.name+'</strong><small>'+o.cost+' 枚 · '+o.note+(o.cost>CITY.budget?'（超支）':'')+'</small></span></label>').join("")+
    '</fieldset><button type="button" class="primary" id="test" data-action="test">測試這個方案</button><p class="microcopy">所有候選通道均假定已獲准；籌碼不是實際工程報價。改措施後，原結果不能代表新方案。</p><p class="resident-nudge">想一想：平均變近了，三封來信會說同一件事嗎？</p>';
}
export function residentMetrics(s){
  const f=residentFrame(s),r=f.result,c=residentComparison(s);
  let html=f.measured?'<p class="resident-metric-label">'+(f.historical?'回看':'本次')+'實測 · '+name(r.option)+'</p><div class="metric-row"><div><small>人口加權平均距離</small><strong>'+distance(r.mean)+'</strong></div><div><small>最不利組距離</small><strong>'+distance(r.worst)+'</strong></div><div><small>投入 / 預算</small><strong class="'+(r.affordable?'':'danger')+'">'+r.cost+' / 4</strong></div></div><div class="group-results">'+r.rows.map(row=>'<span>'+row.name+'：'+distance(row.distance)+(row.served?' ✓':' ×')+'</span>').join("")+'</div>':
    '<p class="untested-note">目前是條件預覽。先測試，才會有居民路程與方案比較。</p>';
  if(c){
    const ceiling=Math.max(CITY.threshold,...c.rows.flatMap(p=>[p.before.distance,p.after.distance]).filter(Number.isFinite));
    const width=v=>Number.isFinite(v)?v/ceiling*100:0;
    html+='<section class="comparison resident-impact"><h3>改一張圖紙，誰的路變了？</h3><p>'+name(c.before.option)+' → '+name(c.after.option)+' · 點一組居民看路線</p><div class="resident-impact-list">'+c.rows.map(p=>
      '<button type="button" class="resident-impact-row" id="resident-impact-'+p.id+'" data-resident="'+p.id+'" data-action="resident-impact" aria-pressed="'+(s.resident===p.id&&!f.historical)+'"><span><strong>'+p.name+'</strong><small>'+p.population+' 位 · '+changeText(p.before.distance,p.after.distance)+'</small></span><span class="resident-bars" aria-hidden="true"><i class="resident-bar-before" style="width:'+width(p.before.distance)+'%"></i><i class="resident-bar-after" style="width:'+width(p.after.distance)+'%"></i><b style="left:'+(CITY.threshold/ceiling*100)+'%"></b></span><span class="resident-pair">'+distance(p.before.distance)+' → '+distance(p.after.distance)+'</span></button>').join("")+'</div><p>灰線：比較起點；綠線：本次；金線：650 底線。三組共用同一比例。</p><p class="resident-tradeoff">平均距離 '+distance(c.before.mean)+' → '+distance(c.after.mean)+'；投入 '+c.before.cost+' → '+c.after.cost+' 枚。誰受益、誰多走，以及是否超支，要分開看。</p></section>';
  }
  if(f.measured)html+='<details id="resident-math"><summary>平均數怎麼算？為什麼還要逐組看？</summary><p>人口加權平均是把每位居民各計一次，不是把三組的距離直接平均。</p><p>'+r.rows.map(row=>row.population+' × '+distance(row.distance)).join(' + ')+'，再除以 '+r.population+'，得到 '+distance(r.mean)+'。</p><p>本次達到底線的居民為 '+r.servedPopulation+' / '+r.population+' 位。本關約定每一組都在 650 以內；這是教學採用的公平標準，不代表公平只有一種定義。</p></details>';
  return html;
}
