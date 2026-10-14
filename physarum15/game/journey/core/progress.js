import { cleanCouncil, cleanCouncilEvidence } from "./council.js";
import { cleanHearing } from "./hearing.js";
import { cleanResidentDraft, residentDraft } from "./residents.js";
import { cleanFieldwork, cleanSearchDraft, cleanBackupDraft } from "./fieldbook.js";
import { replaySearchEvidence } from "./search.js";
import { replayTranslateEvidence } from "./translate.js";
import { replayReachEvidence } from "./reach.js";
import { replayRecoveryEvidence } from "./recovery.js";
import { PLAYABLE } from "../content/catalog.js";
export const STORAGE_KEY = "slimeAtlasJourneyProgressV1";
const initial = () => ({ version: 1, completed: {}, lastLevel: "001", reducedMotion: false, council: cleanCouncil(null), fieldwork:cleanFieldwork(null), hearing:cleanHearing(null), residents:null });
function cleanEvidence(id, value) {
  if (["013","014","015"].includes(id)) return cleanCouncilEvidence(id,value);
  if (!value || typeof value !== "object") return null;
  const fields = {
    "001": ["observations", "observedMask", "foodPlaced", "traced"],
    "003": ["spent", "budget", "decisionStep", "upper", "lower", "sheet", "followed", "pathCode", "intentCode"],
    "002": ["nearTime", "farTime", "radius"],
    "004": ["mask", "sharedEdge", "beforeTotal", "total", "beforeSB", "distanceSB", "beforeBC", "distanceBC"],
    "005": ["model", "target", "prediction", "rounds", "flowBefore", "flowChanged", "flowFinal", "strengthBefore", "strengthAfter"],
    "006": ["model", "prediction", "rounds", "edge", "strengthBefore", "strengthAfter", "flow", "lowCount", "retained"],
    "007": ["model", "baselineLength", "factor", "softLane", "shortRoute", "longRoute", "shortLength", "longLength", "shortCost", "longCost", "wallLane", "escapeRoute", "escapeLength", "escapeCost", "stoppedLength"],
    "008": ["cost", "reached", "failedReached"],
    "009": ["model", "rounds", "actionCode", "markedRound", "restoredAt", "outage", "affectedMask", "finalReached", "initialPreparedLength", "repairBuiltLength", "preparedOutage", "preparedFinalReached", "repairFramesCode", "preparedFramesCode"],
    "010": ["model", "pairMask", "ruleMask", "rejectedCopy", "option", "cost", "threshold", "bendDistance"],
    "011": ["model", "directTried", "option", "steps", "pathCode", "distance", "baselineDistance", "cost", "threshold"],
    "012": ["mean", "worst", "cost", "previousWorst", "population"],
  }[id];
  if (!fields || !fields.every((key) => Number.isFinite(value[key]) && value[key] >= 0)) return null;
  if (id==="010" && !replayTranslateEvidence(value)) return null;
  if (id==="011" && !replayReachEvidence(value)) return null;
  if (id==="009" && !replayRecoveryEvidence(value)) return null;
  if(id==="003"){
    const replay=replaySearchEvidence(value);
    if(!replay?.found||value.budget!==6||value.upper!==replay.counts.upper||value.lower!==replay.counts.lower||!Number.isInteger(value.decisionStep)||!replay.rows[value.decisionStep-1]||value.followed!==(replay.rows[value.decisionStep-1].intent==="follow"?1:0))return null;
  }
  return Object.fromEntries(fields.map((key) => [key, value[key]]));
}
export class JourneyProgress {
  constructor(storage) {
    this.storage = storage;
    this.warning = "";
    this.data = initial();
    try {
      const raw = storage?.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved?.version !== 1) throw new Error("Unsupported version");
        this.data.lastLevel = PLAYABLE.includes(saved.lastLevel) ? saved.lastLevel : "001";
        this.data.reducedMotion = saved.reducedMotion === true;
        this.data.council = cleanCouncil(saved.council);
        this.data.fieldwork = cleanFieldwork(saved.fieldwork);
        this.data.hearing = cleanHearing(saved.hearing);
        this.data.residents = cleanResidentDraft(saved.residents);
        for (const id of PLAYABLE) {
          const evidence = cleanEvidence(id, saved.completed?.[id]?.evidence);
          if (evidence) this.data.completed[id] = { evidence, completedAt: String(saved.completed[id].completedAt || "").slice(0, 40) };
        }
      }
      this.data.council.refs=this.data.council.refs.filter(id=>this.has(id));
      for(const id of ["013","014","015"]){
        const board=this.data.completed[id]?.evidence?.board;
        if(board)board.refs=board.refs.filter(ref=>this.has(ref));
      }
      if (!storage) this.warning = "此瀏覽器無法保存進度，本次仍可遊玩。";
    } catch {
      this.warning = "無法讀取舊進度，本次已使用新記錄；不影響舊實驗室存檔。";
    }
  }
  save() {
    try {
      if (!this.storage) throw new Error("Unavailable");
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch { this.warning = "進度目前只保留在本頁，關閉後可能遺失。"; }
  }
  saveCouncil(board) { this.data.council=cleanCouncil(board); this.data.council.refs=this.data.council.refs.filter(id=>this.has(id)); this.save(); }
  saveHearing(session) {
    if(session.id!=="015")return;
    this.data.hearing=cleanHearing({step:session.hearingStep,resident:session.resident,conversation:session.conversation});
    this.save();
  }
  saveResidents(session) {
    if(session.id!=="012")return;
    this.data.residents=residentDraft(session);this.save();
  }
  saveFieldwork(session) {
    if(session.id==="003")this.data.fieldwork.search=cleanSearchDraft(session.search);
    else if(session.id==="008")this.data.fieldwork.backup=cleanBackupDraft({choice:session.choice,...session.backup});
    else return;
    this.save();
  }
  visit(id) { if (PLAYABLE.includes(id)) { this.data.lastLevel = id; this.save(); } }
  setMotion(value) { this.data.reducedMotion = Boolean(value); this.save(); }
  award(id, evidence) {
    const clean = cleanEvidence(id, evidence);
    if(clean?.board) clean.board.refs=clean.board.refs.filter(ref=>this.has(ref));
    if (!PLAYABLE.includes(id) || !clean) throw new Error("Invalid completion evidence");
    const first = !this.data.completed[id];
    this.data.completed[id] = { evidence: clean, completedAt: new Date().toISOString() };
    this.save();
    return first;
  }
  has(id) { return Boolean(this.data.completed[id]); }
  snapshot() { return JSON.parse(JSON.stringify(this.data)); }
}
