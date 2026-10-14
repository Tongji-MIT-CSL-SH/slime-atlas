import { chapterOneReview } from "./onboarding.js";
import { BACKUP, evaluateBackup } from "../content/scenes.js";
import { CARDS, CHAPTERS, getCard } from "../content/catalog.js";

// Viewing a before/after frame never performs a trial or edits its evidence.
export function backupDisplay(s) {
  const after=Boolean(s.current)&&s.backupView!=="before";
  return {after,result:after?s.current:evaluateBackup(s.choice,false,s.backup.cutEdge),
    target:BACKUP.targets.includes(s.backupTarget)?s.backupTarget:null};
}
export function setBackupView(s,view) {
  if(s.id!=="008"||!["before","after"].includes(view)||(view==="after"&&!s.current))return false;
  s.backupView=view;return true;
}
export function setBackupTarget(s,target) {
  if(s.id!=="008"||!["both",...BACKUP.targets].includes(target))return false;
  s.backupTarget=target;return true;
}
export function backupComparison(s) {
  if(!s.current)return null;
  const previous=[...s.backup.records].reverse().find(r=>r.cutEdge===s.current.cutEdge&&r.option!==s.current.option);
  return previous?{before:evaluateBackup(previous.option,true,previous.cutEdge),after:s.current}:null;
}
export function cardMilestone(progress,id,first) {
  const card=getCard(id);if(!card||!progress.has(id))return null;
  const collected=CARDS.filter(c=>c.chapter===card.chapter&&progress.has(c.id)).length;
  return {id,first:first===true,name:card.name,chapter:card.chapter,place:CHAPTERS[card.chapter-1].place,
    review:card.chapter===1?chapterOneReview(progress):null,collected,complete:collected===3,total:CARDS.filter(c=>progress.has(c.id)).length};
}
