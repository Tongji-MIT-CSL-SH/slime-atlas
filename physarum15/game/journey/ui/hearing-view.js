import { HEARING_STEPS, cleanHearing, hearingChecklist } from "../core/hearing.js";
import { FIELD_TOOLS, residentReply } from "../core/workshop.js";
import { balanceReady, evaluateCouncil, proposalReady, councilTask } from "../core/council.js";
import { CITY } from "../content/scenes.js";
import { LESSONS } from "../content/catalog.js";
import { councilControls, proposalPaper } from "./council-view.js";
import { councilConversation, proposalExport } from "./workshop-view.js";
import { esc, cityArt } from "./art.js";

const questions=[["bridge","北橋不能走時"],["daily","平日能照顧誰"],["budget","這筆帳怎麼算"]];
function stepButton(step,label,id,kind="secondary") {
  return '<button type="button" class="'+kind+'" data-action="hearing-step" data-step="'+step+'" id="'+id+'">'+label+'</button>';
}
function questionsView(s) {
  return '<div class="conversation-tabs">'+questions.map(([id,label])=>'<button type="button" id="town-question-'+id+'" data-action="town-question" data-question="'+id+'" aria-pressed="'+(s.conversation===id)+'">'+label+'</button>').join("")+'</div>'+
    (s.conversation==="budget"?"":'<div class="resident-buttons">'+CITY.groups.map(g=>'<button type="button" id="town-resident-'+g.id+'" data-resident="'+g.id+'" aria-pressed="'+(s.resident===g.id)+'">'+g.name+'</button>').join("")+'</div>');
}
function cards(s) {
  const labels={"008":"查斷橋","012":"看居民","013":"算代價"};
  return '<section class="hearing-tools" aria-label="使用已收集的發現卡">'+FIELD_TOOLS.map(t=>{
    const owned=s.toolCards?.includes(t.id);
    return '<article class="hearing-tool '+(s.tool===t.id?"used":"")+'"><small>NO. '+t.id+'</small><h3>'+t.name+'</h3>'+
      (owned?'<button type="button" id="use-card-'+t.id+'" data-action="field-tool" data-tool="'+t.id+'">'+labels[t.id]+' ↗</button>':'<a href="#level/'+t.id+'">去收集</a>')+'</article>';
  }).join("")+'</section>';
}
function listen(s) {
  const reply=residentReply(s.council,s.conversation,s.resident);
  return '<div class="hearing-listen"><section class="hearing-question"><p class="eyebrow">A VOICE FROM RIVERBEND</p>'+questionsView(s)+
    '<div class="hearing-voice"><span class="mentor-avatar" aria-hidden="true">'+(s.conversation==="budget"?"帳":"問")+'</span><div><p>'+esc(reply.speaker)+'</p><h3 id="town-reply">'+esc(reply.question)+'</h3></div></div>'+
    '<p>先不用回答。帶著這個問題，看看你的兩張圖紙。</p><div class="controls hearing-choice">'+councilControls(s,"choice")+'</div></section>'+
    '<figure class="scene hearing-town">'+cityArt(evaluateCouncil(s.council.plans[s.council.chosen].mask),s.resident)+
    '<figcaption>方案 '+s.council.chosen+' 的平日圖紙示意；不是這次提問的測試答案。距離是教學設定。</figcaption></figure></div>';
}
function check(s) {
  const ready=balanceReady(s.council);
  return '<div class="hearing-check"><div class="hearing-toolbox"><p class="eyebrow">YOUR FIELD CARDS / 帶來的發現</p>'+cards(s)+
    '<p class="microcopy">卡牌替你安排操作，不替方案加分。</p>'+
    '<details id="hearing-plan"><summary>正在看方案 '+s.council.chosen+' · 換一張圖紙</summary><div class="controls hearing-choice">'+councilControls(s,"choice")+'</div></details></div>'+
    '<div class="hearing-findings">'+councilConversation(s)+
    (s.conversation==="budget"?'<p class="microcopy">這是建設與一期維護的條件帳；不是故障測試，不能作為一張路程紙條。</p>':
      '<button type="button" id="hearing-test" class="secondary" data-action="hearing-test" '+(ready?'':'disabled')+'>重新測試這個問題 · A / B 同場</button><p class="microcopy">沒有相應卡牌，也能直接測試。'+(ready?'': '<a href="#level/013">先去準備兩個可比較方案 →</a>')+'</p>')+'</div></div>';
}
function reply(s) {
  const b=s.council,r=residentReply(b,s.conversation,s.resident);
  const section=(id,title,summary,part,open)=>'<details class="hearing-answer" name="hearing-response" id="hearing-'+id+'"'+(open?' open':'')+'><summary><span>'+title+'</span><small>'+summary+'</small></summary>'+councilControls(s,part)+'</details>';
  return '<div class="hearing-reply"><aside class="hearing-prompt"><p class="eyebrow">YOUR REPLY / 你的回應</p><h3>'+esc(r.question)+'</h3><p>你暫定推薦方案 '+b.chosen+'。挑出依據，也說明你沒有解決的事。</p>'+
    stepButton("check","再查一次","hearing-recheck")+stepButton("listen","換推薦方案","hearing-rechoose")+
    '<p class="microcopy">不同方案都能成立；這裡不替居民表態贊成，也不把選項當成理解程度評分。</p></aside>'+
    '<div class="controls hearing-responses">'+
    section("evidence","留下兩張依據",b.evidenceKeys.length+" / 2 張","evidence",b.evidenceKeys.length!==2)+
    section("tradeoff","承認選擇的代價",b.tradeoff?"已留下":"待回應","tradeoff",b.evidenceKeys.length===2&&!b.tradeoff)+
    section("question","留一個未解問題",b.question?"已留下":"待回應","question",Boolean(b.tradeoff)&&!b.question)+
    councilControls(s,"extra")+'</div></div>';
}
function letter(s) {
  const ready=proposalReady(s.council),checks=hearingChecklist(s.council);
  return '<div class="hearing-letter"><div class="hearing-paper"><span class="hearing-stamp">'+(ready?'依據已齊 · 可以交出':'尚未完成 · 草稿')+'</span>'+
    proposalPaper(s.council)+'</div><aside class="hearing-delivery"><h3>交出去之前</h3><ul class="hearing-checklist">'+checks.map(c=>'<li class="'+(c.ok?'ready':'pending')+'"><span aria-hidden="true">'+(c.ok?'✓':'○')+'</span>'+esc(c.text)+
      (c.ok?'':c.href?'<a href="'+c.href+'">補上 →</a>':stepButton(c.step,"補上 →","hearing-fix-"+c.id,"text-button"))+'</li>').join("")+'</ul>'+
    proposalExport(s)+'<p class="microcopy">可返回修改；修改圖紙後需重測。已收藏的歷史卡片仍保留。</p></aside></div>';
}
export function hearingView(s) {
  const step=cleanHearing({step:s.hearingStep}).step,index=HEARING_STEPS.findIndex(x=>x.id===step),meta=HEARING_STEPS[index];
  const ready=proposalReady(s.council),atEnd=step==="letter";
  return '<div class="hearing-shell"><div class="breadcrumb"><a href="#map">← 探索地圖</a><span>FIELD NOTE 015 · 共議</span><button type="button" class="text-button" data-action="restart">重聽委託（保留方案）</button></div>'+
    '<header class="level-heading"><div><p class="eyebrow">THE TOWN MEETING / 河灣鎮的小桌會議</p><h1>'+esc(LESSONS["015"].title)+'</h1></div><span class="model-label">虛構小鎮 · 以證據回應</span></header>'+
    '<nav class="hearing-steps" aria-label="共議步驟">'+HEARING_STEPS.map((item,i)=>'<button type="button" id="hearing-step-'+item.id+'" data-action="hearing-step" data-step="'+item.id+'"'+(step===item.id?' aria-current="step"':'')+'><span>'+(i+1)+'</span>'+item.title+'</button>').join("")+'</nav>'+
    '<section class="hearing-stage" aria-labelledby="hearing-heading"><header class="hearing-stage-heading"><p class="eyebrow">桌面 '+(index+1)+' / 4 · 隨時可以返回</p><h2 id="hearing-heading" tabindex="-1">'+meta.prompt+'</h2></header>'+
    (step==="listen"?listen(s):step==="check"?check(s):step==="reply"?reply(s):letter(s))+'</section>'+
    '<div class="hearing-turns">'+(index>0?stepButton(HEARING_STEPS[index-1].id,"← 上一步","hearing-prev"):'<span class="microcopy">先選一個問題，再帶卡片去查證。</span>')+
    (index<3?stepButton(HEARING_STEPS[index+1].id,["帶著問題去查證 →","整理我的回應 →",ready?"看看我的提案 →":"看看還缺什麼 →"][index],"hearing-next","primary"):'')+'</div>'+
    '<section class="next-step hearing-outcome" aria-label="提案狀態"><p id="next-task" role="status">'+(ready&&!atEnd?'內容已齊。到「交出提案」回看並收下共議卡。':councilTask("015",s.council))+'</p>'+
    '<button type="button" class="primary" id="collect" data-action="collect" '+(ready&&atEnd?'':'disabled')+'>交給小鎮，收下「共議」卡 ↗</button></section>'+
    '<details class="knowledge"><summary>詞語解讀與模型邊界</summary><p>'+LESSONS["015"].explanation+'</p><p>四個步驟只是整理順序，不是四項學習成績。所有方案與紙條仍使用原有路網計算及版本校驗。</p></details></div>';
}
