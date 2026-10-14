import { meetStage, sensingFrame } from "../core/onboarding.js";
import { meetControls, meetMetrics } from "./beginnings.js";
import { esc, number } from "./art.js";
const button=(id,action,label,disabled=false,attrs="")=>'<button type="button" id="'+id+'" data-action="'+action+'" class="secondary"'+(disabled?' disabled':'')+' '+attrs+'>'+label+'</button>';
const stages=["放一粒燕麥","看看兩個部位","連回同一個身體"];
export function meetDock(s){
  const stage=meetStage(s);
  return '<div class="first-dock meet-dock"><ol class="first-steps" aria-label="初見的三步觀察">'+stages.map((name,i)=>'<li'+(stage===i?' aria-current="step"':'')+'><span aria-hidden="true">'+(stage>i?'✓':i+1)+'</span>'+name+'</li>').join('')+'</ol>'+
    '<div id="meet-live" tabindex="-1">'+meetMetrics(s)+'</div>'+meetControls(s)+
    (s.traced?button("meet-pack","first-pack","把這次發現收進圖鑑 →"):'')+'</div>';
}
export function firstNotes(id){
  return '<h3>'+(id==="001"?'林老師的觀察便條':'這次只改一件事')+'</h3><p class="first-question">'+
    (id==="001"?'這幾條分支，會連回同一個身體嗎？':'你看得到燕麥，模型也已經取得線索了嗎？')+'</p>'+
    '<details class="first-help"><summary>需要一點提示？</summary><p>'+
    (id==="001"?'放好燕麥後，點兩個不同的觀察圈，也可以使用圖下按鈕。再退回全景，沿細線看它們如何相連。':'先留下猜測，再各試近處與遠處。可以暫停或跳到首次感知；快轉仍逐步計算，不會直接填答案。')+'</p></details>'+
    '<details class="first-help"><summary>這張圖能說明什麼？</summary><p>'+
    (id==="001"?'這是一張生物結構示意。放下燕麥是觀察的開場，不會在本關引發真實生長。下一關才使用簡化生長模型。':'兩次使用相同種子、起點、步長與感知設定，只改燕麥位置。時間單位是模型秒，不是真實黏菌的反應時間。')+'</p></details>';
}
export function sensingLive(s,runtime){
  const f=sensingFrame(s,runtime),snap=f.snapshot,p=s.choice==="near"?"A · 近處":"B · 遠處";
  const title=f.kind==="start"?(f.recorded?"回看起始條件":"起始條件 · 尚未運行"):f.kind==="event"?"已記錄 · 首次取得線索":f.kind==="unfound"?"觀察結束 · 未取得線索":runtime.paused?"已暫停 · 尚未取得線索":"觀察中 · 尚未取得線索";
  const message=f.kind==="event"?'在 '+number(snap.firstSense.time,2)+' 模型秒，一個前沿首次取得食物線索。事件距離 '+number(snap.firstSense.distance,1)+'，不超過設定範圍 '+number(snap.firstSense.radius)+'。':
    f.kind==="start"?'這只是起始擺放。即使燕麥已在畫面上，也不能把它當成模型已取得線索的記錄。':
    f.kind==="unfound"?'本次到達觀察上限，沒有首次感知事件；不把它記成成功。':
    '目前 '+number(snap.time||0,2)+' 模型秒。前沿仍在探索；圈線只是所選前沿的教學感知範圍。';
  return '<p class="eyebrow">'+title+' · '+p+'</p><div class="sense-perspectives"><p><strong>你看得到</strong><span>燕麥在'+p+'，位置由你選擇。</span></p><p><strong>模型的記錄</strong><span>'+message+'</span></p></div>';
}
export function sensingDock(s,runtime,controls){
  const f=sensingFrame(s,runtime);
  return '<div class="first-dock sensing-dock"><section id="sensing-live" tabindex="-1" aria-label="玩家視野與模型線索">'+sensingLive(s,runtime)+'</section>'+
    '<div class="sense-views" role="group" aria-label="回看同一次觀察">'+
    button("sense-start","sense-view","看起始條件",runtime.running,'data-view="start" aria-pressed="'+(f.kind==="start")+'"')+
    button("sense-event","sense-view","看首次感知",runtime.running||!f.recorded,'data-view="event" aria-pressed="'+(f.kind==="event")+'"')+'</div>'+
    '<p class="microcopy">回看不會新增試驗。關掉圈線只隱藏圖層，不會改變模型。</p>'+
    (f.kind==="event"&&!s.trials[s.choice==="near"?"far":"near"]?button("sense-next-placement","sense-next","換到"+(s.choice==="near"?"遠處":"近處")+"，做一次對照 →"):'')+
    controls+'</div>';
}
export function chapterOneReviewView(r,link=true){
  if(!r)return "";
  const notes=[
    ["001","初見","我在觀察誰？",'我看過'+r.observations.join('、')+'，再把分支連回同一個原質團。',"生物結構示意"],
    ["002","探索","線索何時出現？",'同一種子下：近處 '+number(r.nearTime,2)+'、遠處 '+number(r.farTime,2)+' 模型秒，才首次取得線索。',"簡化生長模型"],
    ["003","尋路","下一步值得走嗎？",'我用了 '+r.spent+' / '+r.budget+' 次機會；留下第 '+r.decisionStep+' 步，結果是「'+r.decisionResult+'」。',"探索預算謎題"],
  ];
  return '<section class="chapter-one-review" aria-label="第一章發現回顧"><p class="eyebrow">THREE DISCOVERIES / 培養皿角 · 3 / 3</p><h2>帶走三個發現，再去連一張網。</h2><p>下面是你已收進卡背的記錄，不是額外測驗或學習分數。</p><div class="chapter-note-grid">'+notes.map(([id,name,question,record,kind])=>
    '<article><span class="chapter-note-number">'+id+' / '+name+'</span><h3>'+question+'</h3><p>'+esc(record)+'</p><small>'+kind+'</small><button type="button" data-card="'+id+'" class="text-button">翻開「'+name+'」的記錄 →</button></article>').join('')+
    '</div><p class="chapter-bridge">小禾的新問題：如果有三處資源，一定要各鋪一條路嗎？把這份觀察手帳帶到網路實驗桌，試試共享連接。</p>'+(link?'<a class="secondary" href="#level/004">前往第二章 · 連接成網 →</a>':'')+'</section>';
}
