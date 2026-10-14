import { councilArt, councilControls, councilMetrics, councilCardRecord, councilCardDetails } from "./council-view.js";
import { translateArt, translateControls, translateMetrics, translateCardRecord } from "./translate-view.js";
import { reachArt, reachControls, reachMetrics, reachCardRecord } from "./reach-view.js";
import { recoveryArt, recoveryControls, recoveryMetrics, recoveryCardRecord, recoveryCardTimeline } from "./recovery-view.js";
import { detourArt, detourControls, detourMetrics, detourCardRecord } from "./detour-view.js";
import { connectArt, connectControls, connectMetrics } from "./connect-view.js";
import { flowArt, flowControls, flowMetrics, networkCardRecord } from "./flow-view.js";
import { CARDS, CHAPTERS, PLAYABLE, LESSONS, getCard } from "../content/catalog.js";
import { illustration, discoveryFront } from './illustrations.js';
import { evaluateCity } from "../content/scenes.js";
import { completionEvidence, nextTask } from "../core/session.js";
import { esc, number, motif, mapMarkup, sensingArt, cityArt } from "./art.js";
import { meetArt, searchArt, searchDock, searchControls, searchMetrics } from "./beginnings.js";
import { replaySearchEvidence, SEARCH_NAMES, SIGNAL_TEXT } from "../core/search.js";
import { SEARCH_BOARDS } from "../core/search-boards.js";
import { fieldbookView } from "./workshop-view.js";
import { backupWorkshopArt, backupDock, backupExperiments, backupWorkshopMetrics } from "./backup-workshop.js";
import { hearingView } from "./hearing-view.js";
import { rewardView, mapRewardView } from "./feedback-view.js";
import { residentHeader, residentDock, residentArt, residentControls, residentMetrics } from "./residents-view.js";
import { chapterOneReview, sensingFrame } from "../core/onboarding.js";
import { meetDock, firstNotes, sensingDock, chapterOneReviewView } from "./onboarding-view.js";
const button = (action, label, { id = action, disabled = false, kind = "primary" } = {}) =>
  '<button type="button" id="' + id + '" class="' + kind + '" data-action="' + action + '"' + (disabled ? " disabled" : "") + '>' + label + '</button>';
const radio = (name, value, title, note, selected, disabled = false) =>
  '<label class="choice ' + (selected ? "chosen" : "") + '"><input id="' + name + '-' + value + '" type="radio" name="' + name + '" value="' + value + '"' +
  (selected ? " checked" : "") + (disabled ? " disabled" : "") + '><span><strong>' + title + '</strong>' + (note ? '<small>' + note + '</small>' : "") + '</span></label>';
export function mapView(progress,notice=null) {
  const count = Object.keys(progress.snapshot().completed).length;
  const next = PLAYABLE.find((id) => !progress.has(id)) || progress.snapshot().lastLevel;
  return '<section class="map-intro"><div><p class="eyebrow">THE SLIME ATLAS / 一份給小鎮的觀察手帳</p>' +
    '<h1>從一粒燕麥，<br>到一座城市。</h1><p class="lede">連上了，就算設計好了嗎？<br>帶著好奇心出發，把每一次發現收進你的圖鑑。</p>' +
    '<a class="primary" href="#level/' + next + '">' + (count ? "繼續我的旅程" : "打開第一份觀察記錄") + ' <span aria-hidden="true">↗</span></a></div>' +
    '<aside class="invitation"><span class="paper-pin" aria-hidden="true"></span><p class="handwritten">給見習觀察員：</p><p>我們想讓每個人都更容易<br>到達小鎮的服務站。</p><p>請帶回一份選擇，<br>也帶回你的理由。</p><span class="signature">— 河灣鎮的小禾</span><div class="letter-stamp">' + motif(3) + '</div></aside></section>' +
    '<section class="map-section" aria-labelledby="map-title"><div class="section-heading"><div><p class="eyebrow">YOUR EXPEDITION</p><h2 id="map-title">讓發現，一格一格亮起來。</h2></div><span class="progress-label">' + count + ' / ' + PLAYABLE.length + ' 張試玩卡已收集</span></div>' +
    '<p class="map-note">五章十五關已可連續遊玩。帶回自己的方案與理由，完成小鎮的委託。<span class="swipe-note">地圖可左右滑動。</span></p>' +
    mapMarkup(progress) + '<div class="map-legend"><span><i class="legend-dot lit"></i>已點亮</span><span><i class="legend-dot available"></i>可以探索</span><span class="legend-tail">這不是競賽。猜錯、求助，都能收下發現。</span></div></section>' +
    mapRewardView(progress,notice)+chapterOneReviewView(chapterOneReview(progress))+fieldbookView(progress)+'<section class="trail-notes"><div><span>01 / 動手試</span><p>改一個條件，看見結果。</p></div><div><span>02 / 再想想</span><p>用一次比較，修正猜測。</p></div><div><span>03 / 收進圖鑑</span><p>讓卡片記住你的發現。</p></div></section>' +
    (count === PLAYABLE.length ? '<aside class="completion-banner"><h2>從一粒燕麥到一份提案，你走完了五章。</h2><p>你看過局部線索、共享連接、流量回饋、動態調整、障礙與阻力、有效備路與恢復過程，走過城市轉譯與合法路線，也看見平均數之外的人。最後用同條件測試支持一份提案，承認代價並留下問題。可以回頭換一種選擇，或帶著發現卡重新比較方案。</p><a href="#album">翻閱我的發現卡 →</a></aside>' : "");
}
export function albumView(progress) {
  const count = Object.keys(progress.snapshot().completed).length;
  return '<section class="album-heading"><p class="eyebrow">MY FIELD NOTES</p><h1>我的發現圖鑑</h1><p class="lede">不是抽到的，是你親手發現的。</p><p>' + count + ' / ' + PLAYABLE.length + ' 張試玩卡 · 五章共 15 張</p><a href="#map">← 回到探索地圖</a></section>' +
    chapterOneReviewView(chapterOneReview(progress))+'<div class="album-grid">' + CARDS.map((card) => {
      const owned = progress.has(card.id), available = PLAYABLE.includes(card.id);
      const contents = '<span class="card-serial">NO. ' + card.id + ' <span>' + card.english + '</span></span>' +
        '<div class="album-art">' + illustration(card.id) + '</div><span class="album-chapter">第 ' + card.chapter + ' 章 · ' + CHAPTERS[card.chapter-1].name + '</span><h2>' + card.name + '</h2><p>' + card.topic + '</p>' +
        '<span class="card-status">' + (owned ? "✓ 已收集 · 翻開記錄" : available ? "尚未收集 · 去探索 →" : "製作中") + '</span>';
      if (owned) return '<button class="album-card owned" data-card="' + card.id + '">' + contents + '</button>';
      if (available) return '<a class="album-card uncollected" href="#level/' + card.id + '">' + contents + '</a>';
      return '<article class="album-card unavailable">' + contents + '</article>';
    }).join("") + '</div>';
}
function sensingControls(s, runtime) {
  const both = s.trials.near && s.trials.far;
  return '<fieldset><legend>1. 先猜一猜（猜錯也能收卡）</legend><div class="two-choices">' +
    radio("prediction","near","近處先取得線索","這是預測，不是考試。",s.prediction==="near",runtime.running) +
    radio("prediction","same","遠近會同時取得線索","它可能一開始就知道？",s.prediction==="same",runtime.running) +
    '</div></fieldset><fieldset><legend>2. 擺放燕麥</legend><div class="two-choices">' +
    radio("placement","near","放近一點",s.trials.near ? "✓ 已觀察" : "位置 A",s.choice==="near",runtime.running) +
    radio("placement","far","放遠一點",s.trials.far ? "✓ 已觀察" : "位置 B",s.choice==="far",runtime.running) +
    '</div></fieldset><label class="toggle-line"><input id="sense-toggle" type="checkbox"' + (runtime.showSense ? " checked" : "") + '> 看見模型的局部感知</label>' +
    '<div class="action-stack">' + button("run","開始觀察", { disabled: !s.prediction || runtime.running }) +
    (runtime.running ? button("pause",runtime.paused ? "繼續播放" : "暫停觀察", { kind: "secondary" }) : "") +
    button("skip","跳到第一次感知", { disabled: !s.prediction, kind: "text-button" }) + '</div>' +
    (both ? '<fieldset class="reflection"><legend>3. 把發現記下來</legend>' +
      radio("identification","global","一開始就知道全圖", "",s.identification==="global") +
      radio("identification","local","前沿接近後，才取得局部線索","請對照剛才的兩次觀察。",s.identification==="local") +
      (s.identification==="global" ? '<p class="gentle-hint">再看遠處那次：最初的前沿有目標嗎？可以修改記錄，不會失去卡片。</p>' : "") + '</fieldset>' : "");
}
function optionControls(s) {
  if(s.id==="008")return '<h3>備路觀察桌</h3><p>多一條路，不一定就能繞過斷點。</p><p class="microcopy">先試左側環路，再改一條備路，對照相同斷點。圖下可切換剪斷前後；下方記錄保留實測結果。</p>'+backupExperiments(s);
  return residentControls(s);
}
export function sceneView(s, runtime) {
  if (s.council) return councilArt(s);
  if (s.id==="010") return translateArt(s.translate);
  if (s.id==="011") return reachArt(s.reach);
  if (s.id==="009") return recoveryArt(s.recovery);
  if (s.id==="007") return detourArt(s.detour);
  if (s.id==="004") return connectArt(s.connect);
  if (["005","006"].includes(s.id)) return flowArt(s.dynamics);
  if (s.id==="001") return meetArt(s.meet);
  if (s.id==="003") return searchArt(s.search);
  if (s.id==="002") return sensingArt(sensingFrame(s,runtime).snapshot,runtime.showSense);
  if (s.id==="008") return backupWorkshopArt(s);
  if (s.id==="012") return residentArt(s);
  return cityArt(s.current || evaluateCity(s.choice),s.resident);
}
function metricsView(s) {
  if(s.id==="008")return backupWorkshopMetrics(s);
  if (s.council) return councilMetrics(s);
  if (s.id==="010") return translateMetrics(s.translate);
  if (s.id==="011") return reachMetrics(s.reach);
  if (s.id==="009") return recoveryMetrics(s.recovery);
  if (s.id==="007") return detourMetrics(s.detour);
  if (s.id==="004") return connectMetrics(s.connect);
  if (["005","006"].includes(s.id)) return flowMetrics(s.dynamics);
  if (s.id==="001") return '<p class="microcopy">已查看 '+s.meet.observed.length+' 個不同部位。'+(s.meet.traced?'已留下身分記錄，可收下初見卡。':'把不同分支連回同一個身體，才算完成這份觀察。')+'</p>';
  if (s.id==="003") return searchMetrics(s.search);
  if (s.id==="002") return '<div class="trial-pair">' + ["near","far"].map((id) => {
    const trial=s.trials[id];
    return '<div class="trial-record"><span>' + (id==="near"?"近處 A":"遠處 B") + '</span><strong>' + (trial ? number(trial.firstSense.time,2) + ' s' : "還未觀察") +
      '</strong><small>首次取得線索的模型時間</small></div>';
  }).join("") + '</div><p class="microcopy">兩次固定種子、起點、步長和感知設定，只改食物位置。s 是模型秒，不代表生物實測時間。</p>';
  return residentMetrics(s);
}
export function levelView(s,runtime) {
  if(s.id==="015")return hearingView(s,runtime);
  const lesson=LESSONS[s.id], card=getCard(s.id), ready=Boolean(completionEvidence(s));
  return '<div class="breadcrumb"><a href="#map">← 探索地圖</a><span>試玩 ' + (PLAYABLE.indexOf(s.id)+1) + ' / ' + PLAYABLE.length + ' · 原篇第 ' + Number(s.id) + ' 關</span><button class="text-button" data-action="restart">' + (s.council ? "重看本關（保留方案）" : "重做本關") + '</button></div>' +
    '<header class="level-heading"><div><p class="eyebrow">FIELD NOTE ' + s.id + ' / ' + lesson.subtitle + '</p><h1>' + lesson.title + '</h1></div><span class="model-label">' + lesson.label + '</span></header>' +
    '<div class="mentor-note"><span class="mentor-avatar" aria-hidden="true">' + (["011","012","013","014","015"].includes(s.id) ? "禾" : "林") + '</span><p><strong>' + lesson.speaker + '：' + lesson.question + '</strong><span>' + lesson.intro + '</span></p></div>' +
    '<div class="workspace' + (["001","002","003","004","005","006","007","008","009","010","011","012","013","014","015"].includes(s.id) ? ' beginnings-workspace' : '') + '"><section class="experiment"><figure class="scene' + (runtime.zoom ? ' zoomed' : '') + '"><div class="scene-toolbar"><span>' + (s.council ? "兩張圖紙，同一份公共委託" : s.id==="010" ? "先檢查草圖，再把條件寫回城市問題" : s.id==="011" ? "點選下一個路口；也可使用旁邊的按鈕" : s.id==="009" ? "同一張網路，沿時間線回看斷開與恢復" : s.id==="007" ? "先選紙片，再點通道中段；按鈕也能放置" : s.id==="004" ? "點選通道接線；用下方路線選擇比較旅程" : ["005","006"].includes(s.id) ? "點選一段連接，分開查看流量與強度" : s.id==="001" ? "放下燕麥，再點選兩個觀察位置" : s.id==="003" ? "點選探索前沿；也可用圖下的按鈕" : s.id==="002" ? "點選圖上的 A／B，即可擺放燕麥" : s.id==="008" ? "選好備路後，可以直接點圖中的斷點" : "選擇居民，沿著高亮路線看看") + '</span><button type="button" id="zoom" class="text-button" data-action="zoom" aria-pressed="' + runtime.zoom + '">' + (runtime.zoom ? "顯示全圖" : "放大圖面 ↗") + '</button></div>' + (s.id==="012"?residentHeader(s):"") + '<div id="scene-art" tabindex="0" aria-label="試驗圖面；放大後可用方向鍵捲動">' + sceneView(s,runtime) + '</div>' + (s.id==="001"?meetDock(s.meet):s.id==="002"?sensingDock(s,runtime,sensingControls(s,runtime)):s.id==="003"?searchDock(s.search):s.id==="008"?backupDock(s):s.id==="012"?residentDock(s):"") + '<figcaption id="scene-caption">' +
    (s.council ? "終章沿用河灣鎮，新委託預算為 7 枚；圖面不按比例。提案與測試保存在此瀏覽器，未上傳外部。" : s.id==="010" ? "與 011–012 共用河灣鎮。直穿河面的虛線是未獲准草圖，不是道路。" : s.id==="011" ? "金色腳印是目前位置；橙線只畫實際走過的道路。跨河虛線僅為方向參考，不可通行，圖面不按比例。" : s.id==="009" ? "預設恢復教學模型，圖面不按比例。黃線未接完前不能通行；輪次不是生物實測時間。" : s.id==="007" ? "預設教學通道，不是生物生長；圖面不按比例。斜線紙片改變中段代價，封閉紙片禁止穿越。" : s.id==="004" ? "預設教學長度，圖面不按比例。高亮線是目前查看的最短路，不是生物生長。" : ["005","006"].includes(s.id) ? "固定網路的簡化教學計算，不是顯微影像或城市預測。虛線外框是你的預測；灰色底圖是先前強度。" : s.id==="001" ? "預繪生物教學示意，不是顯微影像。細胞核小圖只解釋結構，不是實際觀察畫面。" : s.id==="003" ? "預設探索謎題，不是生物生長計算。數字表示探索先後；只有已探索的位置顯示線索。" : s.id==="002" ? "觀察對象：多頭絨泡菌原質團的簡化教學模型。金色為生長軌跡，不是真實顯微影像。" : s.id==="008" ? "本關是預設網路謎題，不是實時黏菌生長。綠線：可通路線；虛線：新增備路。" : "橙色：所選居民的實際路徑。藍灰色：河流。只有畫出的合法通道可以通行。") +
    '</figcaption></figure><section class="observations" aria-label="試驗結果"><p class="eyebrow">WHAT CHANGED / 觀察記錄</p>' + metricsView(s) +
    '</section></section><aside class="controls" aria-label="關卡操作">' + (s.council ? councilControls(s) : s.id==="010" ? translateControls(s.translate) : s.id==="011" ? reachControls(s.reach) : s.id==="009" ? recoveryControls(s.recovery) : s.id==="007" ? detourControls(s.detour) : s.id==="004" ? connectControls(s.connect) : ["005","006"].includes(s.id) ? flowControls(s.dynamics) : s.id==="001" ? firstNotes(s.id) : s.id==="003" ? searchControls(s.search) : s.id==="002" ? firstNotes(s.id) : optionControls(s)) +
    '</aside></div><section class="next-step" aria-label="下一步"><div><span class="eyebrow">' + (ready ? "DISCOVERY MADE" : "YOUR NEXT STEP") + '</span><p id="next-task" role="status">' + nextTask(s) +
    '</p></div>' + button("collect",'收下「' + card.name + '」卡 ↗',{disabled:!ready}) + '</section>' +
    '<details class="knowledge"><summary>詞語解讀與模型邊界</summary><p>' + lesson.explanation + '</p><p>' + lesson.next + '</p></details>';
}
export function cardDialogView(id,evidence,reward=false,milestone=null) {
  const card=getCard(id), lesson=LESSONS[id];
  let record = ["013","014","015"].includes(id) ? councilCardRecord(id,evidence) : id==="010" ? translateCardRecord(evidence) : id==="011" ? reachCardRecord(evidence) : id==="009" ? recoveryCardRecord(evidence) : id==="007" ? detourCardRecord(evidence) : ["004","005","006"].includes(id) ? networkCardRecord(id,evidence) : "";
  if (id==="001") record = "我放下一粒燕麥，觀察了 " + evidence.observations + " 個不同部位，沿細線看見它們連回同一個原質團。這是示意圖中的觀察，不是生物實驗紀錄。";
  if (id==="003") {
    const row=replaySearchEvidence(evidence)?.rows[evidence.decisionStep-1];
    record="我用了 " + evidence.spent + " / " + evidence.budget + " 次機會找到食物。" + (SEARCH_BOARDS[evidence.sheet] ? "底紙：" + SEARCH_BOARDS[evidence.sheet].name + "。走回已知路口也花費機會。" : "上方投入 " + evidence.upper + " 次、下方 " + evidence.lower + " 次。");
    if(row) record+="留下的第 " + evidence.decisionStep + " 步：在" + (SIGNAL_TEXT[row.before] || "這一側尚未探索") +
      "時，選擇" + (row.node?SEARCH_BOARDS[evidence.sheet].nodes[row.node][2]:SEARCH_NAMES[row.branch]) + "；原本打算" + (row.intent==="follow" ? "追蹤線索" : "了解未知") + "，這一步的結果是" + row.result + "。";
  }
  if (id==="002") record = "同一種子下，近處首次感知在 " + number(evidence.nearTime,2) + " 模型秒，遠處在 " + number(evidence.farTime,2) + " 模型秒。兩次都在前沿取得局部線索後才鎖定食物。";
  if (id==="008") record = "左側環路在指定斷點下保住 " + evidence.failedReached + " 個目標；調整備路後保住 " + evidence.reached + " 個，額外維護成本 " + evidence.cost + " 枚籌碼。";
  if (id==="012") record = "我查看了河灣住戶。調整後最不利組距離從 " + evidence.previousWorst + " 變為 " + evidence.worst + "，人口加權平均為 " + number(evidence.mean) + "，投入 " + evidence.cost + " 枚籌碼。";
  const next = milestone?.chapter===1&&milestone.complete ? "004" : PLAYABLE[PLAYABLE.indexOf(id)+1];
  const front = discoveryFront(id);
  return '<button class="dialog-close" data-action="close-card" aria-label="關閉卡片">×</button>' + rewardView(milestone) + '<div class="card-spread">' + front + '<section class="card-notes"><p class="eyebrow">' + (reward ? (milestone?.first===false ? "UPDATED FIELD NOTE / 更新發現" : "NEW FIELD NOTE / 新發現") : "MY FIELD NOTE / 我的記錄") +
    '</p><h3>這一張，是你親手發現的。</h3><h4>我的發現</h4><p>' + record + '</p>' + (["013","014","015"].includes(id) ? councilCardDetails(id,evidence) : id==="009" ? recoveryCardTimeline(evidence) : "") + '<h4>這個詞的意思</h4><p>' + lesson.explanation +
    '</p><h4>下一步試試</h4><p>' + lesson.next + '</p><div class="dialog-actions"><a class="primary" href="' + (next && reward ? "#level/"+next : "#map") + '">' +
    (next && reward ? "帶著發現，前往下一站 →" : "收好，回到探索地圖") + '</a><a href="#album">翻閱我的圖鑑</a></div>' +
    '<p class="illustration-note">卡面插畫幫你記住概念；這份記錄才是你本次操作留下的結果。插畫不是顯微照片，也不是按比例繪製的城市路網。</p></section></div>';
}
