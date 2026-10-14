import { toggleMeasure, testCouncil, selectCouncil, SCENARIOS, balanceReady } from "./core/council.js";
import { pairTranslate, ruleTranslate, chooseTranslate, testTranslate } from "./core/translate.js";
import { tryReachDirect, chooseReach, stepReach, undoReach, restartReach } from "./core/reach.js";
import { activeRecovery, startRecovery, advanceRecovery, finishRecovery, viewRecovery, switchRecovery, resetRecovery, markRecovery } from "./core/recovery.js";
import { placeDetour, clearDetour, setDetourFactor, selectDetourRoute, testDetour } from "./core/detour.js";
import { setConnectMode, toggleConnect, testConnect, inspectConnect, markConnect } from "./core/connect.js";
import { applyDemand, advanceDynamics, viewDynamics, inspectDynamics } from "./core/flow.js";
import { placeOat, observeMeet, traceMeet } from "./core/meet.js";
import { newSearch, exploreSearch, undoSearch, recordSearchDecision } from "./core/search.js";
import { PLAYABLE } from "./content/catalog.js";
import { JourneyProgress } from "./core/progress.js";
import { SensingTrial } from "./core/sensing.js";
import { newSession, selectChoice, recordTrial, testChoice, inspectResident, completionEvidence } from "./core/session.js";
import { mapView, albumView, levelView, sceneView, cardDialogView } from "./ui/views.js";
import { number } from "./ui/art.js";
import { resumeFieldwork } from "./core/fieldbook.js";
import { useFieldTool, proposalText } from "./core/workshop.js";
import { resumeHearing, setHearingStep } from "./core/hearing.js";
import { setBackupView, setBackupTarget, cardMilestone } from "./core/feedback.js";
import { resumeResidents, setResidentView, setResidentReference } from "./core/residents.js";
import { setSensingView } from "./core/onboarding.js";
import { sensingLive } from "./ui/onboarding-view.js";

let storage;
try { storage = window.localStorage; } catch { /* Storage is optional. */ }
const progress = new JourneyProgress(storage);
const main = document.querySelector("#main");
const dialog = document.querySelector("#card-dialog");
const motionToggle = document.querySelector("#motion-toggle");
const sessions = new Map();
const council=progress.snapshot().council;
const runtime = { running:false, paused:false, showSense:true, snapshot:null, trial:null, fast:false, zoom:false };
let activeSession = null;
let frameId = 0;
let framePrevious = 0;
let accumulator = 0;
let returnFocus = null;
let pendingMapReward = null;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
motionToggle.checked = progress.snapshot().reducedMotion || prefersReducedMotion;
document.body.classList.toggle("reduced-motion",motionToggle.checked);

function announce(message) {
  document.querySelector("#announcer").textContent = message;
}
function flashFeedback(kind) {
  if(!motionToggle.checked)main.querySelector(".scene")?.classList.add("feedback-"+kind);
}
function updateShell(route) {
  document.querySelector("#nav-count").textContent = Object.keys(progress.snapshot().completed).length + " / " + PLAYABLE.length;
  const warning=document.querySelector("#storage-warning");
  warning.hidden=!progress.warning;
  warning.textContent=progress.warning;
  for (const link of document.querySelectorAll("[data-nav]")) {
    if (link.dataset.nav===route) link.setAttribute("aria-current","page");
    else link.removeAttribute("aria-current");
  }
}
function halt() {
  cancelAnimationFrame(frameId);
  runtime.running=false;
  runtime.paused=false;
  runtime.trial=null;
}
function renderLesson({responseChanged=false}={}) {
  const focusId=document.activeElement?.id;
  const openDetails=[...main.querySelectorAll("details[id][open]")].filter(el=>!responseChanged||!el.classList.contains("hearing-answer")).map(el=>el.id);
  activeSession.ownedCards=Object.keys(progress.snapshot().completed).filter(id=>Number(id)<13);
  activeSession.toolCards=Object.keys(progress.snapshot().completed);
  progress.saveFieldwork(activeSession);
  progress.saveHearing(activeSession);
  progress.saveResidents(activeSession);
  main.innerHTML=levelView(activeSession,runtime);
  for(const id of openDetails){const el=document.getElementById(id);if(el)el.open=true;}
  if (focusId) document.getElementById(focusId)?.focus({preventScroll:true});
  if(responseChanged&&activeSession.id==="015"&&activeSession.hearingStep==="reply"){
    const next=main.querySelector(".hearing-answer[open]>summary")||document.getElementById("hearing-next");
    // Keep focus on a still-visible input; otherwise advance to the next prompt.
    if(!document.getElementById(focusId)?.checkVisibility?.())next?.focus({preventScroll:true});
  }
  updateShell("level");
}
function navigate() {
  halt();
  if (dialog.open) dialog.close();
  const route=window.location.hash.slice(1) || "map";
  const match=/^level\/(\d{3})$/.exec(route);
  if (match && PLAYABLE.includes(match[1])) {
    const id=match[1];
    if (!sessions.has(id)) sessions.set(id,resumeResidents(resumeHearing(resumeFieldwork(newSession(id,council),progress.snapshot().fieldwork),progress.snapshot().hearing),progress.snapshot().residents));
    activeSession=sessions.get(id);
    runtime.snapshot=activeSession.trials[activeSession.choice] || null;
    progress.visit(id);
    renderLesson();
    document.title=main.querySelector("h1").textContent + "｜黏菌圖鑑";
  } else {
    activeSession=null;
    runtime.snapshot=null;
    main.innerHTML=route==="album" ? albumView(progress) : mapView(progress,pendingMapReward);
    if(route!=="album"&&pendingMapReward){
      const slot=main.querySelector('.map-slots a[href="#level/'+pendingMapReward.id+'"]');
      slot?.classList.add("map-just-lit");
      if(pendingMapReward.complete)slot?.closest(".chapter")?.classList.add("chapter-fresh");
      const map=main.querySelector(".map-scroll");
      if(map&&slot)map.scrollLeft=slot.getBoundingClientRect().left-map.getBoundingClientRect().left-map.clientWidth/2+slot.clientWidth/2;
      pendingMapReward=null;
    }
    updateShell(route==="album" ? "album" : "map");
    document.title=route==="album" ? "我的發現圖鑑｜黏菌圖鑑" : "黏菌圖鑑｜從一粒燕麥到一座城市";
  }
  main.focus({preventScroll:true});
  window.scrollTo({top:0,behavior:"instant"});
}
function displayFrame() {
  if (!activeSession || !runtime.snapshot) return;
  const art=document.querySelector("#scene-art");
  if (art) art.innerHTML=sceneView(activeSession,runtime);
  const live=document.getElementById("sensing-live");
  if(live&&activeSession.id==="002")live.innerHTML=sensingLive(activeSession,runtime);
  const caption=document.querySelector("#scene-caption");
  if (caption) caption.textContent=runtime.paused ? "已暫停，可以切換感知範圍觀察。" :
    "模型時間 " + number(runtime.snapshot.time,2) + " s · 尚未取得食物方向線索。圓圈是教學設定。";
}
function animate(timestamp) {
  if (!runtime.running || !runtime.trial) return;
  const elapsed=framePrevious ? Math.min((timestamp-framePrevious)/1000,0.15) : 0;
  framePrevious=timestamp;
  if (!runtime.paused) {
    accumulator += elapsed * 24 * 2;
    const count=runtime.fast ? 240 : Math.floor(accumulator);
    if (count > 0) {
      if (!runtime.fast) accumulator -= count;
      runtime.snapshot=runtime.trial.advance(count);
      if (!motionToggle.checked || runtime.snapshot.done) displayFrame();
    }
    if (runtime.snapshot?.done) {
      const recorded=recordTrial(activeSession,runtime.trial);
      runtime.running=false;
      runtime.paused=false;
      renderLesson();
      const message=recorded ? "已記下第一次取得線索的時刻。可以換一個食物位置比較。" :
        "這次在觀察上限內沒有取得線索。請重新試驗；未取得線索不會被算成成功。";
      announce(message);
      document.querySelector("#scene-caption").textContent=message;
      const live=document.getElementById("sensing-live");
      if(live&&window.matchMedia("(max-width:760px)").matches){
        live.focus({preventScroll:true});live.scrollIntoView({block:"start",behavior:"instant"});
      }
      return;
    }
  }
  frameId=requestAnimationFrame(animate);
}
function beginTrial(fast=false) {
  if (!activeSession?.prediction) return;
  if (runtime.running) {
    if (fast) { runtime.fast=true; runtime.paused=false; renderLesson(); }
    return;
  }
  halt();
  if (!window.SlimeCityCore?.SlimeSimulation) {
    announce("生長模型尚未載入，請重新整理頁面。");
    return;
  }
  runtime.trial=new SensingTrial(window.SlimeCityCore.SlimeSimulation,activeSession.choice);
  activeSession.sensingView="";
  runtime.snapshot=runtime.trial.snapshot();
  runtime.running=true;
  runtime.fast=fast || motionToggle.checked;
  framePrevious=0;
  accumulator=0;
  renderLesson();
  frameId=requestAnimationFrame(animate);
}
function showCard(id,reward=false,milestone=null) {
  const saved=progress.snapshot().completed[id];
  if (!saved) return;
  if(!dialog.open)returnFocus=document.activeElement;
  dialog.classList.toggle("first-discovery",Boolean(milestone?.first));
  dialog.innerHTML=cardDialogView(id,saved.evidence,reward,milestone);
  dialog.showModal();
  dialog.querySelector(".dialog-close").focus();
}
document.addEventListener("input",(event)=>{
  if(activeSession?.council&&event.target.id==="council-note"){
    selectCouncil(council,"note",event.target.value);progress.saveCouncil(council);
    const art=document.querySelector("#scene-art");
    if(art&&activeSession.id!=="015")art.innerHTML=sceneView(activeSession,runtime);
  }
});
document.addEventListener("change",(event)=>{
  const input=event.target;
  if (input===motionToggle) {
    progress.setMotion(input.checked);
    document.body.classList.toggle("reduced-motion",input.checked);
    if (input.checked && runtime.running) runtime.fast=true;
    updateShell(activeSession ? "level" : window.location.hash.slice(1));
    return;
  }
  if (!activeSession) return;
  if (input.id==="sense-toggle") {
    runtime.showSense=input.checked;
    const art=document.querySelector("#scene-art");
    if (art) art.innerHTML=sceneView(activeSession,runtime);
    return;
  }
  if(activeSession.id==="012"&&input.id==="resident-reference"){
    setResidentReference(activeSession,input.value);renderLesson();
    announce(document.getElementById("resident-frame-label").textContent+"。"+document.getElementById("resident-letter").textContent);return;
  }
  if (activeSession.council) {
    if(input.dataset.council==="note")return;
    const field=input.dataset.council || (input.name?.startsWith("council-") ? input.name.slice(8) : "");
    if(field==="ref"&&activeSession.ownedCards.includes(input.value)){
      council.refs=council.refs.filter(id=>id!==input.value);
      if(input.checked)council.refs.push(input.value);
    }else if(field)selectCouncil(council,field,input.value,input.checked);
    progress.saveCouncil(council);
  }
  if (activeSession.id==="010") {
    const s=activeSession.translate;
    if(input.dataset.pair)pairTranslate(s,input.dataset.pair,input.value);
    if(input.dataset.rule)ruleTranslate(s,input.dataset.rule,input.checked);
    if(input.name==="translate-option")chooseTranslate(s,input.value);
  }
  if (activeSession.id==="011") {
    if(input.name==="reach-option")chooseReach(activeSession.reach,input.value);
    if(input.name==="reach-meaning"&&["line","network"].includes(input.value))activeSession.reach.interpretation=input.value;
  }
  if (activeSession.id==="009") {
    if(input.name==="recovery-mode")switchRecovery(activeSession.recovery,input.value);
    if(input.name==="recovery-meaning"&&["same","gap"].includes(input.value))activeSession.recovery.interpretation=input.value;
  }
  if (activeSession.id==="007") {
    const s=activeSession.detour;
    if(input.name==="detour-tool"&&["resistance","wall"].includes(input.value))s.tool=input.value;
    if(input.name==="detour-factor")setDetourFactor(s,Number(input.value));
    if(input.name==="detour-route")selectDetourRoute(s,input.value);
    if(input.name==="detour-hard")s.hardMeaning=input.value;
    if(input.name==="detour-soft")s.softMeaning=input.value;
  }
  if (activeSession.id==="004") {
    if(input.name==="connect-mode") setConnectMode(activeSession.connect,input.value);
    if(input.name==="connect-route") activeSession.connect.route=input.value;
    if(input.name==="connect-mark") markConnect(activeSession.connect,input.value);
  }
  if (activeSession.dynamics) {
    const s=activeSession.dynamics;
    if(input.name==="flow-target"&&!s.history.length&&["B","C"].includes(input.value))s.target=input.value;
    if(input.name==="flow-prediction"&&!s.history.length)s.prediction=input.value;
    if(input.name==="flow-interpretation")s.interpretation=input.value;
    if(input.id==="flow-history")viewDynamics(s,Number(input.value));
    if(input.id==="flow-overlay")s.overlay=input.checked;
  }
  if (input.name==="search-intent" && activeSession.id==="003") activeSession.search.intent=input.value;
  if(activeSession.id==="008"){
    if(input.name==="backup-prediction"){activeSession.backup.prediction=input.value;activeSession.current=null;}
    if(input.name==="backup-cut"&&["BC","CD"].includes(input.value)){
      activeSession.backup.cutEdge=input.value;activeSession.backup.prediction="";activeSession.current=null;
    }
  }
  if (input.name==="prediction") activeSession.prediction=input.value;
  if (input.name==="placement" && !runtime.running) {
    selectChoice(activeSession,input.value);
    runtime.snapshot=activeSession.trials[input.value] || null;
  }
  if (input.name==="option") selectChoice(activeSession,input.value);
  if (input.name==="identification") activeSession.identification=input.value;
  renderLesson({responseChanged:activeSession.id==="015"&&["evidence","tradeoff","question"].includes(input.dataset.council||input.name?.slice(8))});
});
document.addEventListener("click",(event)=>{
  const target=event.target.closest("button, a, [data-placement], [data-action]");
  if (!target) return;
  if (target.dataset.card) { showCard(target.dataset.card); return; }
  if (target.dataset.placement && activeSession?.id==="002" && !runtime.running) {
    selectChoice(activeSession,target.dataset.placement);
    runtime.snapshot=activeSession.trials[activeSession.choice] || null;
    renderLesson();
    return;
  }
  if (target.dataset.resident && activeSession) {
    if(activeSession.id==="012"&&target.dataset.action==="resident-impact")setResidentView(activeSession,"current");
    inspectResident(activeSession,target.dataset.resident);
    renderLesson();
    if(activeSession.id==="012")flashFeedback("resident");
    if(activeSession.id==="012"&&target.dataset.action==="resident-impact"){
      document.getElementById("map-resident-"+activeSession.resident)?.focus({preventScroll:true});
      document.getElementById("scene-art")?.scrollIntoView({block:"start",behavior:"instant"});
    }
    announce(document.querySelector(".resident-story")?.textContent || "先測試方案，再查看這組居民的實際距離。");
    return;
  }
  const action=target.dataset.action;
  if (action==="close-card") { dialog.close(); return; }
  if (!activeSession) return;
  if(activeSession.id==="002"&&action==="sense-view"){
    if(setSensingView(activeSession,runtime,target.dataset.view)){
      renderLesson();announce(document.getElementById("sensing-live").textContent);
      const art=document.getElementById("scene-art");art?.focus({preventScroll:true});
      art?.scrollIntoView({block:"start",behavior:"instant"});
    }
    return;
  }
  if(activeSession.id==="002"&&action==="sense-next"&&!runtime.running){
    selectChoice(activeSession,activeSession.choice==="near"?"far":"near");
    runtime.snapshot=activeSession.trials[activeSession.choice]||null;renderLesson();
    const run=document.getElementById("run");run?.focus({preventScroll:true});
    run?.scrollIntoView({block:"center",behavior:"instant"});
    announce("已換到另一個食物位置，請開始觀察；切換位置不會自動生成結果。");return;
  }
  if(activeSession.id==="001"&&action==="first-pack"){
    const collect=document.getElementById("collect");collect?.focus({preventScroll:true});
    collect?.scrollIntoView({block:"center",behavior:"instant"});return;
  }
  if(activeSession.id==="012"&&action==="resident-edit"){
    const selected=main.querySelector('.controls input[name="option"]:checked');
    selected?.focus({preventScroll:true});selected?.closest(".controls")?.scrollIntoView({block:"start",behavior:"instant"});return;
  }
  if(activeSession.id==="012"&&["resident-view","resident-note"].includes(action)){
    if(action==="resident-view"&&!setResidentView(activeSession,target.dataset.view))return;
    if(action==="resident-note")inspectResident(activeSession,activeSession.resident);
    renderLesson();
    if(action==="resident-note")document.getElementById("resident-"+activeSession.resident)?.focus({preventScroll:true});
    announce(document.getElementById("resident-frame-label").textContent+"。"+document.getElementById("resident-letter").textContent);return;
  }
  if(activeSession.id==="008"&&["backup-view","backup-target"].includes(action)){
    const changed=action==="backup-view"?setBackupView(activeSession,target.dataset.view):setBackupTarget(activeSession,target.dataset.target);
    if(changed){renderLesson();announce(document.getElementById("backup-live").textContent);}
    return;
  }
  if(activeSession.id==="015"&&action==="hearing-step"){
    if(!setHearingStep(activeSession,target.dataset.step))return;
    renderLesson();
    const heading=document.getElementById("hearing-heading");
    heading?.focus({preventScroll:true});heading?.scrollIntoView({block:"start",behavior:"instant"});
    announce(heading?.textContent||"已換到下一張桌面。");return;
  }
  if(activeSession.id==="015"&&action==="hearing-test"){
    if(!balanceReady(council)||activeSession.conversation==="budget")return;
    const scenario=activeSession.conversation==="daily"?"normal":"bridge";
    testCouncil(council,scenario);progress.saveCouncil(council);renderLesson();
    announce(document.getElementById("town-reply")?.textContent||"已重新測試。");return;
  }
  if(activeSession.council&&action==="field-tool"){
    const used=useFieldTool(activeSession,target.dataset.tool);
    if(used)progress.saveCouncil(council);
    renderLesson();
    announce(used?(document.querySelector('#town-reply')?.textContent||'已使用卡牌。'):'先收集相應卡牌，並在取捨桌留下兩個可比較方案。');
    document.getElementById('town-reply')?.scrollIntoView({block:'center',behavior:'instant'});
    return;
  }
  if(activeSession.council&&action==="town-question"){
    if(['daily','bridge','budget'].includes(target.dataset.question))activeSession.conversation=target.dataset.question;
    renderLesson();announce(document.querySelector('#town-reply').textContent);return;
  }
  if(activeSession.council&&action==="town-attach"){
    selectCouncil(council,'evidence',target.dataset.key,true);progress.saveCouncil(council);renderLesson();announce('已將當前版本的測試紙條貼進提案。');return;
  }
  if(activeSession.council&&action==="export-proposal"){
    const content=proposalText(council);if(!content)return;
    const url=URL.createObjectURL(new Blob(['\uFEFF'+content],{type:'text/plain;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download='Slime_Atlas_Proposal.txt';link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);announce('已下載目前版本的提案文字，沒有上傳。');return;
  }
  if(activeSession.id==='008'&&action==='backup-select'){
    selectChoice(activeSession,activeSession.choice===target.dataset.option?'none':target.dataset.option);renderLesson();
    document.getElementById('backup-map-'+target.dataset.option)?.focus({preventScroll:true});
    announce('已改動備路；目前是預覽，請重新剪斷測試。');return;
  }
  if(activeSession.council&&action?.startsWith("council-")){
    if(action==="council-toggle")toggleMeasure(council,council.active,Number(target.dataset.bit));
    if(action==="council-test")testCouncil(council,target.dataset.scenario);
    if(action==="council-view")selectCouncil(council,"active",target.dataset.plan);
    if(action==="council-scenario"&&SCENARIOS.some(s=>s.id===target.dataset.scenario))council.scenario=target.dataset.scenario;
    progress.saveCouncil(council);renderLesson();announce(document.querySelector("#next-task").textContent);
    return;
  }
  if(activeSession.id==="010"&&action==="translate-test"){
    testTranslate(activeSession.translate);renderLesson();
    announce(document.querySelector(".observations").textContent+" "+document.querySelector("#next-task").textContent);
    return;
  }
  if(activeSession.id==="011"&&action?.startsWith("reach-")){
    const s=activeSession.reach;
    if(action==="reach-direct")tryReachDirect(s);
    if(action==="reach-step")stepReach(s,target.dataset.node);
    if(action==="reach-undo")undoReach(s);
    if(action==="reach-restart")restartReach(s);
    renderLesson();
    if(action==="reach-step"&&target.closest("svg"))(document.querySelector(".reach-steps button")||document.getElementById("reach-undo"))?.focus({preventScroll:true});
    announce(s.note+" "+document.querySelector("#next-task").textContent);
    return;
  }
  if(activeSession.id==="009"&&action?.startsWith("recovery-")){
    const s=activeSession.recovery,run=activeRecovery(s);
    if(action==="recovery-cut")startRecovery(run);
    if(action==="recovery-grow")advanceRecovery(run,target.dataset.edge);
    if(action==="recovery-wait")advanceRecovery(run,"wait");
    if(action==="recovery-finish")finishRecovery(run);
    if(action==="recovery-view")viewRecovery(run,Number(target.dataset.round));
    if(action==="recovery-mark")markRecovery(s);
    if(action==="recovery-reset")resetRecovery(s);
    renderLesson();
    if(action==="recovery-cut"&&target.closest("svg"))document.getElementById(s.mode==="repair"?"recovery-grow-EB":"recovery-wait")?.focus({preventScroll:true});
    announce((document.querySelector(".observations .result-note")?.textContent||"")+" "+document.querySelector("#next-task").textContent);
    return;
  }
  if(activeSession.id==="007"&&action?.startsWith("detour-")){
    const s=activeSession.detour;
    if(action==="detour-place")placeDetour(s,target.dataset.lane);
    if(action==="detour-clear")clearDetour(s,target.dataset.kind);
    if(action==="detour-test")testDetour(s);
    renderLesson();
    announce((document.querySelector(".controls .desk-feedback")?.textContent||"")+" "+document.querySelector("#next-task").textContent);
    return;
  }
  if(activeSession.id==="004"&&action?.startsWith("connect-")){
    const s=activeSession.connect;
    if(action==="connect-edge")toggleConnect(s,target.dataset.edge);
    if(action==="connect-test")testConnect(s);
    if(action==="connect-inspect")inspectConnect(s,s.route);
    renderLesson();announce(document.querySelector("#next-task").textContent);return;
  }
  if(activeSession.dynamics&&action?.startsWith("flow-")){
    const s=activeSession.dynamics;
    if(action==="flow-apply")applyDemand(s);
    if(action==="flow-step")advanceDynamics(s,1);
    if(action==="flow-fast")advanceDynamics(s,3);
    if(action==="flow-inspect"){inspectDynamics(s,target.dataset.edge);s.interpretation="";}
    renderLesson();
    if(action==="flow-apply")document.getElementById("flow-edge-SJ")?.focus({preventScroll:true});
    announce((document.querySelector(".observations .result-note")?.textContent||"")+" "+document.querySelector("#next-task").textContent);
    return;
  }
  if (activeSession.id==="001" && ["place-oat","observe-meet","trace-meet"].includes(action)) {
    if(action==="place-oat") placeOat(activeSession.meet);
    if(action==="observe-meet") observeMeet(activeSession.meet,target.dataset.point);
    if(action==="trace-meet") traceMeet(activeSession.meet);
    renderLesson();
    if(action==="place-oat")document.getElementById("observe-junction")?.focus({preventScroll:true});
    if(action==="trace-meet"){
      const live=document.getElementById("meet-live");live?.focus({preventScroll:true});
      live?.scrollIntoView({block:"start",behavior:"instant"});
    }
    announce(document.querySelector(".identity-note")?.textContent || document.querySelector(".observation-note")?.textContent);
    return;
  }
  if (activeSession.id==="003" && action?.startsWith("search-")) {
    const state=activeSession.search;
    const explored=action==="search-step"&&exploreSearch(state,target.dataset.branch);
    if(action==="search-undo") undoSearch(state);
    if(action==="search-hint") state.hint=Math.min(2,Number(state.hint)+1);
    if(action==="search-record") recordSearchDecision(state,Number(target.dataset.index));
    if(action==="search-sheet") activeSession.search=newSearch(state.sheet===0?1:0);
    if(action==="search-board"&&[2,3].includes(Number(target.dataset.sheet)))activeSession.search=newSearch(Number(target.dataset.sheet));
    renderLesson();
    if(explored)flashFeedback("explore");
    // A revealed frontier is no longer focusable; return keyboard users to its HTML equivalent.
    if(action==="search-step" && target.closest("svg")) {
      const branchButton=document.getElementById("search-"+target.dataset.branch);
      (branchButton?.disabled ? document.getElementById("search-undo") : branchButton)?.focus({preventScroll:true});
    }
    if(action==="search-review") {
      document.getElementById("record-step-0")?.focus({preventScroll:true});
      document.querySelector(".decision-log")?.scrollIntoView({block:"center",behavior:"instant"});
    }
    announce((action==="search-undo"?"已撤回一步，退回一次機會。":"")+(document.getElementById("search-live")?.textContent || "") + " " + document.querySelector("#next-task").textContent);
    return;
  }
  if (action==="zoom") {
    runtime.zoom=!runtime.zoom;
    renderLesson();
    announce(runtime.zoom ? "圖面已放大，可以左右捲動查看。" : "已顯示完整圖面。");
  }
  if (action==="run") beginTrial();
  if (action==="skip") beginTrial(true);
  if (action==="pause") { runtime.paused=!runtime.paused; renderLesson(); }
  if (action==="test") {
    testChoice(activeSession);renderLesson();
    if(activeSession.id==="008")flashFeedback("cut");
    if(activeSession.id==="012"){
      flashFeedback("resident");
      if(window.matchMedia("(max-width:760px)").matches){
        const letter=document.getElementById("resident-letter");letter?.focus({preventScroll:true});letter?.scrollIntoView({block:"start",behavior:"instant"});
      }
    }
    announce((document.getElementById("backup-live")?.textContent||document.getElementById("resident-letter")?.textContent||"")+" "+document.querySelector("#next-task").textContent);
  }
  if (action==="restart") {
    halt();
    const id=activeSession.id;
    activeSession=newSession(id,council);
    sessions.set(id,activeSession);
    runtime.snapshot=null;
    renderLesson();
    announce(activeSession.council ? "已回到本關圖面；跨關方案、測試記錄與卡片保留。修改措施即可開始新版本。" : "本關試驗已重新開始；已收集的卡片仍保留。");
  }
  if (action==="collect") {
    const evidence=completionEvidence(activeSession);
    if (!evidence) return;
    const first=progress.award(activeSession.id,evidence);
    const milestone=cardMilestone(progress,activeSession.id,first);
    if(first)pendingMapReward=milestone;
    updateShell("level");
    showCard(activeSession.id,true,milestone);
  }
});
dialog.addEventListener("close",()=>{ returnFocus?.focus?.({preventScroll:true}); });
document.addEventListener("keydown",(event)=>{
  if ((event.key==="Enter" || event.key===" ") && event.target.matches("svg [role=button]")) {
    event.preventDefault();
    event.target.dispatchEvent(new MouseEvent("click",{bubbles:true}));
  }
});
dialog.addEventListener("click",(event)=>{
  // A hash link may point at the current route; close even if no hashchange fires.
  if (event.target.closest("a[href^='#']")) dialog.close();
});
window.addEventListener("hashchange",navigate);
document.addEventListener("visibilitychange",()=>{
  if (document.hidden && runtime.running) { runtime.paused=true; renderLesson(); }
});
window.addEventListener("pagehide",halt);
navigate();
