import { trialEvidenceReady, evaluateCouncil, cell, tradeoffs, QUESTIONS } from "./council.js";

// Presentation state only: visiting a step never creates evidence or awards a card.
export const HEARING_STEPS = [
  { id:"listen", title:"聽見問題", prompt:"先聽一個人，再攤開圖紙。" },
  { id:"check", title:"用卡查證", prompt:"把發現卡放上桌，看看路線與代價。" },
  { id:"reply", title:"作出回應", prompt:"用兩次測試回答，也把限制留下。" },
  { id:"letter", title:"交出提案", prompt:"這是你的選擇，不是唯一答案。" },
];
export function cleanHearing(raw) {
  return {
    step:HEARING_STEPS.some(s=>s.id===raw?.step)?raw.step:"listen",
    resident:["centre","west","bend"].includes(raw?.resident)?raw.resident:"west",
    conversation:["bridge","daily","budget"].includes(raw?.conversation)?raw.conversation:"bridge",
  };
}
export function resumeHearing(session,raw) {
  if(session.id==="015") {
    const saved=cleanHearing(raw);
    Object.assign(session,{hearingStep:saved.step,resident:saved.resident,conversation:saved.conversation});
  }
  return session;
}
export function setHearingStep(session,step) {
  if(session.id!=="015"||!HEARING_STEPS.some(s=>s.id===step))return false;
  session.hearingStep=step;
  return true;
}
export function hearingChecklist(b) {
  return [
    {id:"tests",ok:Boolean(trialEvidenceReady(b)),text:"當前方案的情景測試與弱點",href:"#level/014"},
    {id:"plan",ok:evaluateCouncil(b.plans[b.chosen].mask).allServed,text:"推薦方案達到平日公共底線",step:"listen"},
    {id:"evidence",ok:b.evidenceKeys.length===2&&new Set(b.evidenceKeys).size===2&&b.evidenceKeys.every(k=>cell(b,k))&&b.evidenceKeys.some(k=>k.startsWith(b.chosen+".")),text:"兩張有效紙條，至少一張來自推薦方案",step:"reply"},
    {id:"tradeoff",ok:tradeoffs(b).some(t=>t.id===b.tradeoff),text:"承認一項代價",step:"reply"},
    {id:"question",ok:QUESTIONS.some(q=>q.id===b.question),text:"留下一個未解問題",step:"reply"},
  ];
}
