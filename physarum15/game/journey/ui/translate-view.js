import { TRANSLATE_PAIRS, CITY_RULES } from "../core/translate.js";
import { CITY_OPTIONS } from "../content/scenes.js";
import { deskButton as button, deskRadio as radio } from "./network-art.js";
export { translateArt } from "./city-chapter-art.js";
export function translateControls(s){
 return '<fieldset><legend>1. 先試一張草圖</legend>'+radio("translate-option","copy","把連線直接畫到對岸",s.option==="copy")+
  CITY_OPTIONS.filter(o=>o.id!=="none").map(o=>radio("translate-option",o.id,o.name+' · '+o.cost+' 枚',s.option===o.id)).join("")+
  button("translate-test","檢查這張草圖",false,'id="translate-test"')+'</fieldset>'+
  '<fieldset><legend>2. 把觀察紙條帶進城市</legend>'+TRANSLATE_PAIRS.map(p=>'<label class="transfer-pair" for="translate-pair-'+p.id+'"><strong>'+p.source+'</strong><select id="translate-pair-'+p.id+'" data-pair="'+p.id+'"><option value="">選擇如何轉譯</option><option value="redefine"'+(s.pairs[p.id]==="redefine"?' selected':'')+'>'+p.good+'</option><option value="copy"'+(s.pairs[p.id]==="copy"?' selected':'')+'>'+p.bad+'</option></select></label>').join("")+
  '<p class="microcopy">這是重新定義，不是一一等同。沒有把生物圖案直接當成城市答案。</p></fieldset>'+
  '<fieldset><legend>3. 帶上城市的規則</legend>'+CITY_RULES.map(r=>'<label class="transfer-rule"><input type="checkbox" id="translate-rule-'+r.id+'" data-rule="'+r.id+'"'+(s.rules.includes(r.id)?' checked':'')+'><span><strong>'+r.label+'</strong><small>'+r.note+'</small></span></label>').join("")+
  '<p class="microcopy">勾選表示把規則納入問題，不是打開或關閉許可。取消勾選不會讓非法通道變合法。</p>'+
  button("translate-test","帶著規則再檢查",false,'id="translate-retest"')+'</fieldset>';
}
export function translateMetrics(s){
 const r=s.current;
 return '<p class="result-note">'+(!r?"目前是草圖預覽。先檢查一次，再把缺少的城市條件帶進來。":r.ready?"規則與候選已整理好，可以進入服務檢驗；不代表所有居民已達標。":"這張草圖還不能直接帶去使用。")+'</p>'+
  (r?.issues.length?'<ul class="transfer-issues">'+r.issues.map(issue=>'<li>'+issue+'</li>').join("")+'</ul>':"")+
  (r?.result?'<div class="metric-row"><div><small>措施投入 / 預算</small><strong>'+r.result.cost+' / 4</strong></div><div><small>服務要求</small><strong>650</strong></div><div><small>模型參考：河灣住戶</small><strong>'+r.result.rows.find(row=>row.id==="bend").distance+'</strong></div></div><p class="microcopy">距離由既有路網計算，只是後續要親自查驗的參考。規則定義完成，不等於規劃方案通過。</p>':"")+
  '<div class="transfer-note"><h3>帶走的是思路，不是答案</h3><p>我們可以借鑑探索、回饋與適應。誰需要服務、哪裡可通行、能投入多少，以及怎樣算照顧到居民，必須由城市問題另外說清楚。</p></div>';
}
export function translateCardRecord(e){
 const option=CITY_OPTIONS.find(o=>o.id===["copy","centre","river","both"][e.option]);
 return '我試過直穿河面的草圖，它被通行規則擋下。之後重新定義需求、候選通道與代價，加入許可、4 枚預算與 650 距離的逐組服務要求。我留下「'+option.name+'」作後續檢驗，投入 '+e.cost+' 枚；模型中的河灣住戶距離為 '+e.bendDistance+'。這是把問題定義清楚，不是宣告方案已照顧每個人。';
}
