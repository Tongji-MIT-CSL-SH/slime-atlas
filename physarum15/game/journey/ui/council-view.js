import { CITY } from "../content/scenes.js";
import { MEASURES, SCENARIOS, PLAN_IDS, QUESTIONS, RESPONSES, evaluateCouncil, currentRun, currentCells, cell, balanceReady, trialsReady, tradeoffs } from "../core/council.js";
import { deskButton as button, deskRadio as radio } from "./network-art.js";
import { cityArt, esc, number } from "./art.js";
import { getCard } from "../content/catalog.js";
import { toolTray, councilConversation, proposalExport } from "./workshop-view.js";
const scenarioName=id=>SCENARIOS.find(s=>s.id===id)?.name||id;
const distance=n=>Number.isFinite(n)?number(n):"不連通";
const planName=p=>MEASURES.filter(m=>p.mask&m.bit).map(m=>m.name).join("＋")||"維持現狀";
function choice(field,value,text,selected){return radio("council-"+field,value,text,selected);}
function evidenceText(b,key){
 const c=cell(b,key);if(!c)return "尚未測試";
 return "方案 "+c.id+"・"+scenarioName(c.scenario)+"：平均 "+distance(c.result.mean)+"；最不利組 "+distance(c.result.worst)+"；"+c.result.servedPopulation+" / 140 人在 650 內。";
}
export function proposalPaper(b){
 const p=b.plans[b.chosen],r=evaluateCouncil(p.mask);
 return '<article class="council-letter"><p class="eyebrow">TO RIVERBEND / 給河灣鎮</p><h2>我想推薦方案 '+b.chosen+'</h2><p class="council-hand">'+planName(p)+'</p><p>建設 '+r.build+' ＋一期維護 '+r.maintenance+' ＝ '+r.cost+' / 7 枚</p>'+
 '<div class="evidence-slips">'+(b.evidenceKeys.length?b.evidenceKeys.map(k=>'<p>'+evidenceText(b,k)+'</p>').join(""):'<p class="empty-slip">把兩張測試紙條貼在這裡。</p>')+'</div>'+
 '<h3>我承認的代價</h3><p>'+esc(tradeoffs(b).find(t=>t.id===b.tradeoff)?.text||"還沒留下這份選擇的代價。")+'</p>'+
 '<h3>我還想知道</h3><p>'+esc(QUESTIONS.find(q=>q.id===b.question)?.text||"留一個尚未回答的問題。")+'</p>'+
 (b.note?'<p class="council-personal">'+esc(b.note)+'</p>':"")+
 (b.refs.length?'<p class="microcopy">我帶回的發現：'+b.refs.map(id=>esc(id+" "+getCard(id)?.name)).join("、")+'</p>':"")+
 '<p class="microcopy">這是虛構小鎮的教學提案，不是已獲驗證的城市工程建議。</p></article>';
}
export function councilArt(s){
 const b=s.council;
 if(s.id==="015")return councilConversation(s)+proposalPaper(b);
 const r=evaluateCouncil(b.plans[b.active].mask,s.id==="013"?"normal":b.scenario);
 const closed=s.id==="014"?SCENARIOS.find(x=>x.id===b.scenario).removed:[];
 const marks=closed.map(id=>id==="bridge"?{x:430,y:145}:{x:645,y:430}).map(p=>
  '<g class="council-closed"><path d="M'+(p.x-14)+' '+(p.y-14)+'l28 28m0-28-28 28"/><text x="'+p.x+'" y="'+(p.y-25)+'" text-anchor="middle">封閉</text></g>').join("");
 return '<div class="council-map-label">方案 '+b.active+'・第 '+b.plans[b.active].revision+' 版・'+scenarioName(r.scenario)+
  (currentRun(b,b.active,r.scenario)?' · 已測試':' · 條件預覽，尚未記錄')+'</div>'+
 cityArt(r,s.resident).replace("</svg>",marks+"</svg>");
}
function planTabs(b){
 return '<div class="council-tabs">'+PLAN_IDS.map(id=>button("council-view","查看方案 "+id,false,'id="council-view-'+id+'" data-plan="'+id+'" aria-pressed="'+(b.active===id)+'"')).join("")+'</div>';
}
function matrix(b){
 return '<div class="council-table-scroll" tabindex="0" role="region" aria-label="兩份方案的測試表；小螢幕可左右捲動"><table class="council-matrix"><caption>同一組居民、650 門檻、7 枚預算；改版後必須重測。小螢幕可左右滑動。</caption><thead><tr><th>情景</th>'+PLAN_IDS.map(id=>'<th>方案 '+id+' · 第 '+b.plans[id].revision+' 版</th>').join("")+'</tr></thead><tbody>'+
 SCENARIOS.map(s=>'<tr><th>'+s.name+'</th>'+PLAN_IDS.map(id=>{
  const run=currentRun(b,id,s.id),old=b.plans[id].runs[s.id];
  return '<td data-cell="'+id+'.'+s.id+'" class="'+(run?"tested":old?"stale":"pending")+'">'+
  (run?'<strong>'+run.served+' / 140 人達標</strong><small>'+CITY.groups.map((g,i)=>g.name+' '+distance(run.distances[i]??Infinity)).join(' · ')+'</small>':
   old?'舊版記錄<br><small>第 '+old.revision+' 版；不計入本次提案</small>':'尚未測試')+'</td>';
 }).join("")+'</tr>').join("")+'</tbody></table></div>';
}
export function councilControls(s,part="all"){
 const b=s.council;
 if(s.id==="013"){
  const p=b.plans[b.active],r=evaluateCouncil(p.mask);
  return '<div class="council-brief"><strong>新的小鎮委託</strong><p>本章預算改為 7 枚，新增已假定獲准的西岸連路。前一章的 4 枚限制不變。平日每組仍須在 650 內到站。</p></div>'+
   '<fieldset><legend>1. 在兩張圖紙上組合措施</legend>'+planTabs(b)+
   '<div class="council-measures">'+MEASURES.map(m=>button("council-toggle",'<strong>'+m.name+'</strong><small>建設 '+m.build+' ＋一期維護 '+m.maintenance+'</small><small>'+m.note+'</small>',false,
    'id="council-measure-'+m.id+'" data-bit="'+m.bit+'" aria-pressed="'+Boolean(p.mask&m.bit)+'"')).join("")+'</div>'+
   '<p class="council-wallet '+(r.affordable?'':'danger')+'">已用 '+r.cost+' / 7 枚 · '+(r.affordable?'餘下 '+(7-r.cost)+' 枚':'超出 '+(r.cost-7)+' 枚')+'</p>'+
   '<p class="microcopy">再次點措施可拿掉。籌碼不是貨幣報價；每個方案均計建設＋一期維護，既有道路成本不重算。</p></fieldset>'+
   '<fieldset><legend>2. 把平日結果並排留下</legend>'+button("council-test","測試兩份平日方案",false,'id="council-test-normal" data-scenario="normal"')+
   '<p class="microcopy">至少留下兩份不同且可負擔的候選，其中一份達到公共底線。超支的方案不會記錄成有效測試。</p></fieldset>';
 }
 if(s.id==="014")return '<p class="council-brief">兩張方案接受同一種故障。先看誰仍然到得了，再說哪個選擇適合什麼條件。</p>'+
  (!balanceReady(b)?'<p class="gentle-hint">先回 <a href="#level/013">取捨桌</a> 留下兩個可比較方案。</p>':'')+
  '<fieldset><legend>1. 為兩份方案安排同場試驗</legend>'+
  SCENARIOS.map(c=>button("council-test",c.name+'<small>'+c.note+'</small>',!balanceReady(b)&&c.id!=="normal",'id="council-test-'+c.id+'" data-scenario="'+c.id+'"')).join("")+
  '</fieldset><fieldset><legend>2. 在圖上查看受影響的人</legend>'+planTabs(b)+
  SCENARIOS.map(c=>button("council-scenario","回看："+c.name,false,'id="council-scenario-'+c.id+'" data-scenario="'+c.id+'" aria-pressed="'+(b.scenario===c.id)+'"')).join("")+
  CITY.groups.map(g=>'<button type="button" data-resident="'+g.id+'" id="council-resident-'+g.id+'" aria-pressed="'+(s.resident===g.id)+'">'+g.name+'</button>').join("")+'</fieldset>'+
  '<fieldset><legend>3. 把弱點留下，不必假裝沒有損失</legend>'+
  (currentCells(b).filter(k=>cell(b,k).result.servedPopulation<140).map(k=>choice("weakness",k,evidenceText(b,k),b.weakness===k)).join("")||'<p class="microcopy">測試後，這裡會出現未達標的實際記錄。</p>')+
  RESPONSES.map(r=>choice("response",r.id,r.text,b.response===r.id)).join("")+
  '<a href="#level/013">回取捨桌修改 →</a><p class="microcopy">修改會讓相應方案的舊結果失效。應對想法本身不會改變計算，也不算已解決問題。</p></fieldset>';
 const available=s.ownedCards||[];
 const sections={
  choice:'<fieldset><legend>拿哪張圖紙來討論？</legend>'+PLAN_IDS.map(id=>choice("chosen",id,"方案 "+id+"："+planName(b.plans[id]),b.chosen===id)).join("")+
   '<p class="microcopy">這是暫定推薦，可以改。換方案會移除已貼紙條和代價，測試本身仍保留。</p></fieldset>',
  evidence:'<fieldset><legend>哪兩次測試支持你的回答？</legend><p class="microcopy">至少一張來自推薦方案；先取消一張，才能換第三張。</p>'+
   (currentCells(b).map(k=>'<label class="council-check"><input id="council-evidence-'+k.replace(".","-")+'" type="checkbox" data-council="evidence" value="'+k+'"'+(b.evidenceKeys.includes(k)?' checked':b.evidenceKeys.length===2?' disabled':'')+'><span>'+evidenceText(b,k)+'</span></label>').join("")||'<p>還沒有可用紙條。<a href="#level/014">先去測試 →</a></p>')+'</fieldset>',
  tradeoff:'<fieldset><legend>這個選擇也要付出什麼？</legend>'+tradeoffs(b).map(t=>choice("tradeoff",t.id,t.text,b.tradeoff===t.id)).join("")+'</fieldset>',
  question:'<fieldset><legend>如果真的要建，還要問什麼？</legend>'+QUESTIONS.map(q=>choice("question",q.id,q.text,b.question===q.id)).join("")+'</fieldset>',
  extra:'<details id="council-extra" class="council-extra"><summary>帶上我的發現卡，或補一句話（選填）</summary>'+
 (available.length?available.map(id=>'<label class="council-check"><input id="council-ref-'+id+'" type="checkbox" data-council="ref" value="'+id+'"'+(b.refs.includes(id)?' checked':'')+'><span>'+id+' '+getCard(id).name+'</span></label>').join(""):'<p>尚未收集前四章卡片；沒有自動補發。</p>')+
 '<label for="council-note">想對小禾說的話 · 最多 300 字，不評分</label><textarea id="council-note" maxlength="300" data-council="note">'+esc(b.note)+'</textarea></details>'
 };
 return part==="all"?toolTray(s)+Object.values(sections).join(""):(sections[part]||"");
}
export function councilMetrics(s){
 const b=s.council,r=evaluateCouncil(b.plans[b.active].mask,s.id==="013"?"normal":b.scenario),p=b.plans[b.active];
 if(s.id==="015")return '<p class="result-note">推薦不是宣告唯一最優。提案引用當前版本的測試紙條，沒有被測到的條件仍是問題。</p>'+
 (b.weakness?'<p>留下的弱點：'+evidenceText(b,b.weakness)+'</p><p>'+esc(RESPONSES.find(x=>x.id===b.response)?.text||"")+'</p>':"")+
 '<a href="#level/014">再看完整測試表 →</a>'+proposalExport(s);
 const previous=p.runs.normal,delta=s.id==="013"&&previous&&!currentRun(b,b.active,"normal")?
  '<div class="council-delta"><h3>改動後，誰的路程變了？</h3><p>與本方案上次平日測試相比（現在只是預覽）：</p>'+
  r.rows.map((g,i)=>'<p>'+g.name+'：'+distance(previous.distances[i]??Infinity)+' → '+distance(g.distance)+'</p>').join("")+'</div>':"";
 return '<div class="metric-row"><div><small>方案 '+b.active+' · '+(currentRun(b,b.active,r.scenario)?'已測試':'預覽')+'平均</small><strong>'+distance(r.mean)+'</strong></div><div><small>650 內的居民</small><strong>'+r.servedPopulation+' / 140</strong></div><div><small>投入</small><strong>'+r.cost+' / 7</strong></div></div>'+
  '<div class="group-results">'+r.rows.map(g=>'<span>'+g.name+'：'+distance(g.distance)+(g.served?' ✓':' ×')+'</span>').join("")+'</div>'+
  delta+matrix(b)+'<p class="microcopy">距離為教學設定，平均按 100／20／20 位居民加權。不連通不當成 0；超過 650 也不等於不連通。情景不帶發生機率，不把三欄任意平均成總分。</p>';
}
export function councilCardRecord(id,e){
 const b=e.board;
 if(id==="013")return "我用相同的 7 枚預算比較方案 A（"+planName(b.plans.A)+"，"+evaluateCouncil(b.plans.A.mask).cost+" 枚）與 B（"+planName(b.plans.B)+"，"+evaluateCouncil(b.plans.B.mask).cost+" 枚）。"+evidenceText(b,"A.normal")+evidenceText(b,"B.normal");
 if(id==="014")return "兩份方案都經過平日、北橋封閉、南路阻斷。留下的弱點："+evidenceText(b,b.weakness)+" "+RESPONSES.find(r=>r.id===b.response).text+" 這些是三種指定條件，不是所有未來。";
 return "我推薦方案 "+b.chosen+"。"+b.evidenceKeys.map(k=>evidenceText(b,k)).join(" ")+
  " 我承認："+esc(tradeoffs(b).find(t=>t.id===b.tradeoff).text)+" 還想知道："+esc(QUESTIONS.find(q=>q.id===b.question).text)+
  (b.note?" 我對小禾說："+esc(b.note):"")+(b.refs.length?" 我引用已收集的卡："+b.refs.join("、")+"。":"");
}
export function councilCardDetails(id,e){
 if(id==="014")return matrix(e.board);
 if(id==="015")return '<div class="council-ending"><p>小禾收下了你的提案。小鎮還有未解的問題，但你的選擇已能被看懂、被比較，也能重新討論。</p><a href="#level/013">再試另一組選擇 →</a> · <a href="#album">帶著問題翻閱發現卡 ↗</a></div>';
 return "";
}
