import { RECOVERY_HORIZON, RECOVERY_EDGES, activeRecovery, recoveryFrame, recoverySummary, replayRecoveryEvidence } from "../core/recovery.js";
import { deskButton as button, deskRadio as radio } from "./network-art.js";
export { recoveryArt } from "./recovery-art.js";
const names={EB:"交會點 B",EC:"目標一 C",ED:"目標二 D"};
const runName=run=>run.prepared?"事先有備路":"故障後再連接";
export function recoveryStrip(run){
 return '<div class="recover-strip" aria-label="'+runName(run)+'的逐輪失聯記錄">'+Array.from({length:RECOVERY_HORIZON},(_,i)=>{
  const f=run.frames[i],recorded=Boolean(run.frames[i+1]);
  return '<span class="'+(!recorded?"pending":f.missing.length?"interrupted":"available")+'"><small>'+i+'–'+(i+1)+' 輪</small><strong>'+(recorded?f.missing.length+" 失聯":"未觀察")+'</strong></span>';
 }).join("")+'</div>';
}
export function recoveryControls(s){
 const run=activeRecovery(s),f=recoveryFrame(run),latest=run.frames.at(-1),ended=run.actions.length===RECOVERY_HORIZON;
 const both=s.repair.actions.length===6&&s.prepared.actions.length===6&&recoverySummary(s.repair)?.finalReached===2;
 return '<fieldset><legend>1. 比較同一處故障</legend>'+
  radio("recovery-mode","repair","故障後再連接",s.mode==="repair")+
  radio("recovery-mode","prepared","事先有備路",s.mode==="prepared")+
  '<p class="microcopy">兩組都剪斷 B—C、觀察 6 輪。第二組提前接好 EC，先投入 350 長度；不是免費多一條路。</p>'+
  button("recovery-cut","剪斷 B—C，留下第 0 輪",run.started,'id="recovery-cut"')+'</fieldset>'+
  '<fieldset><legend>2. 接下來的一輪，做什麼？</legend>'+
  (!run.prepared?'<div class="recover-actions">'+RECOVERY_EDGES.map(e=>button("recovery-grow",'朝'+names[e.id]+'延伸 <small>'+(latest?.built[e.id]||0)+' / '+e.length+'</small>',!run.started||ended||latest?.built[e.id]===e.length,'id="recovery-grow-'+e.id+'" data-edge="'+e.id+'"')).join("")+'</div>':
   '<p>這組保持備路不變，只觀察同一故障之後是否中斷。</p>')+
  button("recovery-wait","保持網路，觀察 1 輪",!run.started||ended,'id="recovery-wait"')+
  button("recovery-finish","保持網路，觀察至第 6 輪",!run.started||ended,'id="recovery-finish"')+
  '<p class="microcopy">每輪只向一個方向延伸，最多 100 教學長度；接完才通行。觀察按鈕不會自動修路。'+(run.started&&run.cursor!==run.frames.length-1?'正在回看舊記錄；新操作仍接在最新一輪之後。':'')+'</p>'+
  button("recovery-reset","只重試這一組",false,'id="recovery-reset"')+'</fieldset>'+
  (run.started?'<fieldset><legend>3. 留住中間發生的事</legend><div class="recover-timeline" aria-label="回看輪次">'+Array.from({length:7},(_,i)=>button("recovery-view",String(i),i>=run.frames.length,'id="recovery-round-'+i+'" data-round="'+i+'" aria-pressed="'+(run.cursor===i)+'"')).join("")+'</div>'+
   '<p class="microcopy">0 = 剛剪斷，1–6 = 每輪操作結束。點數字，圖面會回到當時的記錄。</p>'+
   button("recovery-mark",s.markedRound===null?"把這段失聯留進卡背":"已留下第 "+s.markedRound+" 輪；可重新選",s.mode!=="repair"||!f.missing.length,'id="recovery-mark"')+'</fieldset>':"")+
  (both?'<fieldset><legend>4. 最後都連上，中間也一樣嗎？</legend>'+
   radio("recovery-meaning","same","最後都連上，所以中間沒有差別",s.interpretation==="same")+
   radio("recovery-meaning","gap","終點相同，失聯與恢復的經歷不同",s.interpretation==="gap")+
   (s.interpretation==="same"?'<p class="gentle-hint">看看帶斜線的幾輪：那時的目標還能連到起點嗎？可以修改答案，不扣卡。</p>':"")+'</fieldset>':"");
}
export function recoveryMetrics(s){
 const run=activeRecovery(s),f=recoveryFrame(run),sum=recoverySummary(run);
 const recoveryLabel=a=>a.restoredAt===null?(a.round===6?"觀察窗內未恢復":"尚未恢復"):a.restoredAt===0?"未曾失聯":"第 "+a.restoredAt+" 輪末";
 return '<p class="result-note">'+(!sum?"故障前兩個目標都能連通。剪斷後，再看時間線如何改變。":'目前圖面：第 '+f.round+' 輪，'+f.reached.length+' / 2 連通。'+(f.missing.length?'失聯的是目標一 C、目標二 D。':'這一刻沒有目標失聯。'))+'</p>'+
  (sum?'<div class="metric-row"><div><small>目前回看：累計失聯</small><strong>'+f.outage+'</strong></div><div><small>最新記錄：恢復</small><strong class="recover-small">'+recoveryLabel(sum)+'</strong></div><div><small>已觀察輪次</small><strong>'+sum.round+' / 6</strong></div></div>'+recoveryStrip(run):"")+
  '<p class="microcopy">斜線格保留當輪的失聯目標數。累計失聯 = 每輪失聯目標數相加，單位「目標・輪」。連接於輪末完成，因此完成的那一輪仍計入等待；不是生物時鐘，也不是真實城市停運時間。</p>'+
  (s.repair.started&&s.prepared.started?'<div class="comparison recover-comparison"><h3>'+([s.repair,s.prepared].every(r=>recoverySummary(r)?.finalReached===2)?"同一終點，不同經歷":"兩組的恢復記錄")+'</h3><table><caption>各組最新已觀察記錄；都到 6 輪後才算完整比較</caption><thead><tr><th>觀察項目</th><th>故障後再連接</th><th>事先有備路</th></tr></thead><tbody>'+
   [['已觀察輪次',a=>a.round+' / 6'],['恢復連通',recoveryLabel],['曾失聯目標',a=>a.affected.length?'C、D':'無'],['累計失聯（目標・輪）',a=>a.outage],['故障前額外長度',a=>a.initialLength],['至今額外長度',a=>a.builtLength],['最新連通目標',a=>a.finalReached+' / 2']].map(([label,value])=>'<tr><th scope="row">'+label+'</th>'+[s.repair,s.prepared].map(r=>'<td>'+value(recoverySummary(r))+'</td>').join("")+'</tr>').join("")+
   '</tbody></table><p>額外長度含未接完的投入，不只計成功連接。備路需要提前投入；這次只測 B—C 中斷，不能推論它能承受所有故障。</p></div>':"");
}
export function recoveryCardRecord(e){
 return '我記下第 '+e.markedRound+' 輪的中斷：目標一 C、目標二 D 曾失聯，故障後第 '+e.restoredAt+' 輪末才重新連通。6 輪內累計 '+e.outage+' 目標・輪失聯，新增長度 '+e.repairBuiltLength+'。另一組提前投入 '+e.initialPreparedLength+' 長度留下 EC 備路，在同一 B—C 故障下沒有失聯。最後都是 2 / 2 連通，中間經歷卻不同。';
}
export function recoveryCardTimeline(e){
 const s=replayRecoveryEvidence(e);
 if(!s)return "";
 return '<div class="recover-card-history"><h4>這次操作留下的時間線</h4><p>故障後再連接</p>'+recoveryStrip(s.repair)+'<p>事先有備路</p>'+recoveryStrip(s.prepared)+
  '<p class="microcopy">我的六輪選擇：'+s.repair.actions.map(a=>a==="wait"?"觀察":a).join(" → ")+'。數字是當輪失聯目標數；第 '+e.restoredAt+' 輪末恢復。依本次操作重建記錄，不是另一輪隨機示範。</p></div>';
}
