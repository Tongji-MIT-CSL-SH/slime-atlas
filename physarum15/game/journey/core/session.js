import { newCouncil, councilEvidence, councilTask } from "./council.js";
import { newTranslate, translateEvidence, translateTask } from "./translate.js";
import { newReach, reachEvidence, reachTask } from "./reach.js";
import { newRecovery, recoveryEvidence, recoveryTask } from "./recovery.js";
import { newDetour, detourEvidence, detourTask } from "./detour.js";
import { newConnect, connectEvidence } from "./connect.js";
import { newDynamics, dynamicsEvidence } from "./flow.js";
import { newMeet, meetEvidence } from "./meet.js";
import { newSearch, searchSnapshot, searchEvidence } from "./search.js";
import { PLAYABLE } from "../content/catalog.js";
import { evaluateBackup, evaluateCity } from "../content/scenes.js";
import { SENSING_CONFIG } from "./sensing.js";
import { residentFrame } from "./residents.js";
export function newSession(id, council = null) {
  if (!PLAYABLE.includes(id)) throw new Error("Unknown lesson");
  return { id, council: ["013","014","015"].includes(id) ? (council || newCouncil()) : null, ownedCards: [], translate: id==="010" ? newTranslate() : null, reach: id==="011" ? newReach() : null, recovery: id==="009" ? newRecovery() : null, detour: id==="007" ? newDetour() : null, connect: id==="004" ? newConnect() : null, dynamics: ["005","006"].includes(id) ? newDynamics(id) : null, choice: id === "002" ? "near" : "none", trials: {}, prediction: "", identification: "",
    tested: {}, inspectedBend: false, current: null, resident: "centre", tool:"", conversation:"bridge", toolCards:[], backup:{cutEdge:"BC",prediction:"",records:[]}, meet: id === "001" ? newMeet() : null, search: id === "003" ? newSearch() : null };
}
export function selectChoice(session, choice) {
  if (session.id === "002") {
    if (!SENSING_CONFIG.placements[choice]) throw new Error("Unknown placement");
  } else if (session.id === "008") evaluateBackup(choice);
  else if (session.id === "012") evaluateCity(choice);
  else throw new Error("This lesson uses observation actions");
  session.choice = choice;
  session.current = null;
  if(session.id==="002")session.sensingView="";
  if(session.id==="008")session.backup.prediction="";
  if(session.id==="012")session.residentView="current";
}
export function recordTrial(session, trial) {
  const result = trial.snapshot();
  const event = result.firstSense;
  if (session.id !== "002" || !event || event.distance > event.radius || !result.done) return false;
  session.trials[result.placement] = result;
  return true;
}
export function testChoice(session) {
  if (session.id === "008") {
    session.current = evaluateBackup(session.choice, true,session.backup.cutEdge);
    session.backupView = "after";
    session.backup.records.push({option:session.choice,cutEdge:session.backup.cutEdge,prediction:session.backup.prediction});
    session.backup.records=session.backup.records.slice(-12);
  }
  else if (session.id === "012") { session.current = evaluateCity(session.choice);session.residentView="current"; }
  else throw new Error("Use a live sensing trial");
  if(session.id!=="008"||session.backup.cutEdge==="BC")session.tested[session.choice] = session.current;
  return session.current;
}
export function inspectResident(session, id) {
  if (!["centre", "west", "bend"].includes(id)) return;
  session.resident = id;
  if (session.id === "012" && id === "bend") {
    const frame=residentFrame(session);
    if(frame.measured&&frame.result.option==="centre")session.inspectedBend=true;
  }
}
export function completionEvidence(session) {
  if (session.council) return councilEvidence(session.id,session.council);
  if (session.id==="010") return translateEvidence(session.translate);
  if (session.id==="011") return reachEvidence(session.reach);
  if (session.id==="009") return recoveryEvidence(session.recovery);
  if (session.id==="007") return detourEvidence(session.detour);
  if (session.id==="004") return connectEvidence(session.connect);
  if (["005","006"].includes(session.id)) return dynamicsEvidence(session.dynamics);
  if (session.id === "001") return meetEvidence(session.meet);
  if (session.id === "003") return searchEvidence(session.search);
  if (session.id === "002") {
    const near = session.trials.near?.firstSense, far = session.trials.far?.firstSense;
    if (!near || !far || !session.prediction || session.identification !== "local") return null;
    return { nearTime: near.time, farTime: far.time, radius: SENSING_CONFIG.radius };
  }
  if (session.id === "008") {
    const result = session.current;
    if (!session.tested.loop || session.tested.loop.reached.length !== 0
      || !result?.cut || result.cutEdge!=="BC" || !result.affordable || result.reached.length !== 2 || result.option !== session.choice) return null;
    return { cost: result.cost, reached: result.reached.length, failedReached: session.tested.loop.reached.length };
  }
  if (session.id === "012") {
    const result = session.current;
    if (!session.tested.centre || !session.inspectedBend || !result?.allServed || !result.affordable
      || result.option !== session.choice) return null;
    return { mean: result.mean, worst: result.worst, cost: result.cost,
      previousWorst: session.tested.centre.worst, population: result.population };
  }
  return null;
}
export function nextTask(session) {
  if (session.council) return councilTask(session.id,session.council);
  if (completionEvidence(session)) return "你的觀察記錄已經完成。把這次發現收進圖鑑吧。";
  if (session.id==="010") return translateTask(session.translate);
  if (session.id==="011") return reachTask(session.reach);
  if (session.id==="009") return recoveryTask(session.recovery);
  if (session.id==="007") return detourTask(session.detour);
  if (session.id==="004") {
    const s=session.connect;
    if (!s.runs.independent) return "先在「各自連接」接上 SB、SC，計算一次，留下比較起點。";
    if (s.mode!=="shared") return "換到「共享連接」，親手選一組能到達兩處資源的通道。";
    if (!s.current?.connected) return "選好通道後按計算；S 必須能到 B 和 C，不能靠少連一處來省長度。";
    if (!["SB","BC"].every(route=>s.seen.includes(route))) return "分別查看 S 到 B、B 到 C，按記下路線，再比較各自的距離。";
    return "找出 S 到 B、S 到 C 這兩條路共同使用的一段，標記它。";
  }
  if (["005","006"].includes(session.id)) {
    const s=session.dynamics;
    if (!s.prediction) return "先猜一段會改變的連接。你的猜測會保留在卡背，猜錯也沒關係。";
    if (!s.history.length) return "改變需求，把此刻的流量與改變前放在一起看。";
    if (session.id==="005"&&!s.immediateSeen) return "回看第 0 輪，點 SJ：先確認流量已改變，D 卻仍和之前相同。";
    if (s.history.length<4) return "至少推進 3 輪，看看連接強度如何逐步回應。";
    if (s.cursor!==s.history.length-1) return "這是較早的記錄；回到最新一輪，再留下本次發現。";
    return session.id==="005" ? "點選共同通道 SJ，把更新後的流量與強度記下來。" : "點選一段減弱的連接，比較 D，並記下它是否仍然存在。";
  }
  if (session.id === "001") {
    if (!session.meet.food) return "先放下一粒燕麥，與培養皿裡的鄰居打個招呼。";
    if (session.meet.observed.length < 2) return "移動觀察鏡，查看至少兩個不同部位。";
    return "退回全景，沿細線連回同一個身體，記下它的身分。";
  }
  if (session.id === "003") {
    const result=searchSnapshot(session.search);
    if (result.found) return "已找到食物。回看決策記錄，選一步留進卡背，再收卡。";
    if (result.exhausted) return "探索機會已用完。可以撤回幾步，依新線索重新分配。";
    return "記下這一步的打算，選一側探索。你還有 " + result.remaining + " 次機會。";
  }
  if (session.id === "002") {
    if (!session.prediction) return "先猜一猜近、遠哪一次更早取得線索；猜錯也沒關係。";
    if (!session.trials.near) return "把燕麥放在近處，觀察第一次感知。";
    if (!session.trials.far) return "再放到遠處，用同一種子觀察並比較。";
    return "兩次都看過了：模型是在什麼時候取得方向線索的？";
  }
  if (session.id === "008") {
    if(session.backup.cutEdge!=="BC")return "這是另一個斷點的延伸試驗；收卡前回到 B—C，留下同條件的比較。";
    if (!session.tested.loop) return "試一次「連回左側」：這個圈能幫到主路另一側嗎？";
    if (!session.current) return "換一個選擇，再剪斷主路測試。";
    if (!session.current.affordable) return "這個選擇超過 3 枚籌碼。試試較省的備路。";
    return "右側目標仍然失聯。讓備路跨過斷點兩側，再測一次。";
  }
  if (!session.tested.centre) return "先測試「中心街區捷徑」，看看平均距離。";
  if (!session.inspectedBend) return "在中心街區捷徑的測試結果裡，點選「河灣住戶」查看路線。";
  if (!session.current) return "調整措施後，按「測試這個方案」比較。";
  if (!session.current.affordable) return "預算只有 4 枚籌碼，不能把兩項都做完。";
  return "試試其他措施，讓每個居民組都在 650 教學距離單位內到達服務站。";
}
