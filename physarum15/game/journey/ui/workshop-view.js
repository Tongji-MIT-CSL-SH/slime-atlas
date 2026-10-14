import { FIELD_TOOLS, residentReply } from "../core/workshop.js";
import { CITY, evaluateBackup } from "../content/scenes.js";
import { evaluateCouncil, currentRun, proposalReady } from "../core/council.js";
import { searchSnapshot } from "../core/search.js";
import { searchArt } from "./beginnings.js";
import { esc, cityArt, backupArt } from "./art.js";
export function toolTray(s){
 return '<details id="field-tools" class="field-tools" open><summary>把發現卡放上桌</summary><div class="tool-cards">'+FIELD_TOOLS.map(t=>{
  const owned=(s.toolCards||[]).includes(t.id);
  return `<article class="tool-card ${s.tool===t.id?'used':''}"><small>NO. ${t.id}</small><h3>${t.name}</h3><p>${t.note}</p>${owned?`<button type="button" id="use-card-${t.id}" data-action="field-tool" data-tool="${t.id}">${t.action}</button>`:`<a href="#level/${t.id}">尚未收集 · 去取得</a>`}</article>`;
 }).join('')+'</div><p class="microcopy">卡牌是操作捷徑，不會加分或改寫結果。沒收集也能用原有試煉與取捨操作；不會卡住主線。</p></details>';
}
export function councilConversation(s){
 const b=s.council,reply=residentReply(b,s.conversation,s.resident);
 const choices=[['bridge','北橋不能走時'],['daily','平日也看每一組人'],['budget','這筆帳怎麼算']];
 let view='<section class="town-conversation" aria-label="小鎮居民提問"><p class="eyebrow">A QUESTION FROM THE TOWN / 讓提案接受提問</p><div class="conversation-tabs">'+choices.map(([id,t])=>`<button type="button" id="town-question-${id}" data-action="town-question" data-question="${id}" aria-pressed="${s.conversation===id}">${t}</button>`).join('')+'</div>';
 if(s.conversation!=='budget')view+='<div class="resident-buttons">'+CITY.groups.map(g=>`<button type="button" id="town-resident-${g.id}" data-resident="${g.id}" aria-pressed="${s.resident===g.id}">${g.name}</button>`).join('')+'</div>';
 view+='<h3>'+esc(reply.speaker)+'：「'+esc(reply.question)+'」</h3><p id="town-reply" role="status">'+esc(reply.text)+'</p>';
 if(reply.tested)view+=`<button type="button" id="town-attach" data-action="town-attach" data-key="${reply.key}" ${b.evidenceKeys.includes(reply.key)||b.evidenceKeys.length>=2?'disabled':''}>${b.evidenceKeys.includes(reply.key)?'✓ 這張紙條已留下':'把這次測試留作回答'}</button><p class="microcopy">已留 ${b.evidenceKeys.length} / 2 張。紙條保留三組居民的結果；可到「作出回應」換一張。</p>`;
 if(s.conversation==='budget')view+='<div class="ledger-pair">'+['A','B'].map(id=>{const r=evaluateCouncil(b.plans[id].mask);return `<p><strong>方案 ${id}</strong><br>建設 ${r.build}＋維護 ${r.maintenance}<br>合計 ${r.cost} / 7${r.affordable?'':' · 超支'}</p>`;}).join('')+'</div>';
 else {
  const scenario=s.conversation==='daily'?'normal':'bridge';
  if(currentRun(b,b.chosen,scenario)){
   const route=cityArt(evaluateCouncil(b.plans[b.chosen].mask,scenario),s.resident);
   const closure=scenario==="bridge"?'<g class="council-closed"><path d="M416 131l28 28m0-28-28 28"/><text x="430" y="120" text-anchor="middle">北橋封閉</text></g>':"";
   view+='<details id="town-route" open><summary>這組居民實際走哪裡？</summary>'+route.replace("</svg>",closure+"</svg>")+'</details>';
  }
 }
 return view+'</section>';
}
export function proposalExport(s){return '<button type="button" id="export-proposal" class="secondary" data-action="export-proposal" '+(proposalReady(s.council)?'':'disabled')+'>下載我的提案文字</button><p class="microcopy">只下載目前有效的提案到本機；不含姓名、不上傳，也不是學習證書。</p>';}
export function fieldbookView(progress){
 const data=progress.snapshot(),s=data.fieldwork?.search,b=data.fieldwork?.backup,c=data.council;
 const search=s?searchSnapshot(s):null,last=b?.records.at(-1);
 const proposal=proposalReady(c),hasCouncil=['A','B'].some(id=>c.plans[id].mask||Object.keys(c.plans[id].runs).length);
 const card=(id,title,body,art)=>`<article class="fieldbook-note"><p class="eyebrow">FIELD TRACE / ${id}</p><h3>${title}</h3><p>${body}</p>${art?'<details><summary>展開這次的底圖</summary>'+art+'</details>':''}<a href="#level/${id}">回到這張桌子 →</a></article>`;
 return '<section class="fieldbook" aria-labelledby="fieldbook-title"><div class="section-heading"><div><p class="eyebrow">YOUR WORK IN PROGRESS</p><h2 id="fieldbook-title">地圖記得你試過什麼。</h2></div></div><p>這裡是最新草稿，不會改寫已收藏卡片的歷史。003、008與終章會在此瀏覽器續接。</p><div class="fieldbook-grid">'+
 card('003','尋路的鉛筆痕',search?`底紙 ${s.sheet+1} · 已投入 ${search.spent} / 6 次 · ${search.found?'找到食物':search.exhausted?'暫未找到，可撤回再分配':'探索仍在進行'}。`:'尚無探索草稿；舊卡的歷史仍在圖鑑。',s?searchArt(s):'')+
 card('008','剪斷以後的記號',last?`留下 ${b.records.length} 次近期試驗。最近剪斷 ${last.cutEdge}，保住 ${evaluateBackup(last.option,true,last.cutEdge).reached.length} / 2 個目標。`:'還沒有故障試驗記錄。',last?backupArt(evaluateBackup(last.option,true,last.cutEdge)):'')+
 card('015','留給小鎮的圖紙',hasCouncil?`推薦草稿 ${c.chosen} · ${proposal?'當前證據已齊，可提交':'尚待完善；舊版測試不算新證據'}。`:'兩張圖紙還是空白。',hasCouncil?cityArt(evaluateCouncil(c.plans[c.chosen].mask),'bend'):'')+
 '</div><p class="microcopy">小鎮縮圖是所選方案的平日條件示意，不代表工程已建成。沒有雲端同步。</p></section>';
}
