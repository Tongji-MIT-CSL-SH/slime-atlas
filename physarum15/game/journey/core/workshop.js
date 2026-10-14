import { CITY } from "../content/scenes.js";
import { balanceReady, currentRun, testCouncil, evaluateCouncil, proposalReady, cell, QUESTIONS, SCENARIOS, tradeoffs, MEASURES } from "./council.js";
export const FIELD_TOOLS=[
 {id:"008",name:"備路",action:"用這張卡做北橋故障測試",note:"兩份方案同時切斷北橋，重新留下實測記錄。"},
 {id:"012",name:"看見",action:"用這張卡陪河灣住戶走一段",note:"切到河灣住戶的平日路線，不以平均數代替這一組人。"},
 {id:"013",name:"取捨",action:"用這張卡攤開兩份成本帳",note:"並排看建設、一期維護和餘額，沒有免費增益。"},
];
export function useFieldTool(session,id){
 if(!session.council||!session.toolCards?.includes(id)||!FIELD_TOOLS.some(t=>t.id===id))return false;
 if(id==="008"){
  if(!balanceReady(session.council))return false;
  testCouncil(session.council,"bridge");session.conversation="bridge";session.resident="west";
 }
 if(id==="012"){session.resident="bend";session.conversation="daily";}
 if(id==="013")session.conversation="budget";
 session.tool=id;return true;
}
export function residentReply(board,question,resident="west"){
 const id=board.chosen,group=CITY.groups.find(g=>g.id===resident)||CITY.groups[1];
 if(question==="budget"){
  const r=evaluateCouncil(board.plans[id].mask);
  return {key:"",tested:false,speaker:"小鎮記帳員",question:"這個選擇要付出多少？維護也算了嗎？",text:`方案 ${id}：建設 ${r.build}＋一期維護 ${r.maintenance}＝${r.cost} / 7 枚。${r.affordable?'餘額 '+(7-r.cost)+' 枚。':'已超支。'}這是條件帳，不是實測路程；後續各期維護尚未計入。`};
 }
 const scenario=question==="daily"?"normal":"bridge",run=currentRun(board,id,scenario);
 const q=scenario==="normal"?"平日從我們這裡出發，也能在650以內到站嗎？":"北橋封閉時，我們還到得了嗎？";
 if(!run)return {key:id+"."+scenario,tested:false,speaker:group.name+"的居民",question:q,text:"這個版本還沒有對應測試，不能沿用舊結果。先去試煉，或用備路卡安排同場測試。"};
 const r=evaluateCouncil(board.plans[id].mask,scenario),row=r.rows.find(x=>x.id===group.id);
 return {key:id+"."+scenario,tested:true,speaker:group.name+"的居民",question:q,text:`方案 ${id}・${SCENARIOS.find(s=>s.id===scenario).name}：`+(!Number.isFinite(row.distance)?"這組居民不連通，沒有可走路線。":`路程 ${row.distance} 教學單位，${row.served?'在650以內。':'仍超過650，但並非完全失聯。'}`)+" 這回答的是指定路網條件，不代表真實居民的滿意度。"};
}
export function proposalText(board){
 if(!proposalReady(board))return null;
 const r=evaluateCouncil(board.plans[board.chosen].mask);
 return ["黏菌圖鑑｜我的城市提案","推薦方案 "+board.chosen,
  MEASURES.filter(m=>board.plans[board.chosen].mask&m.bit).map(m=>m.name).join("＋"),
  `建設 ${r.build}＋一期維護 ${r.maintenance}＝${r.cost} / 7 枚`,
  "實測證據：",...board.evidenceKeys.map(k=>{const c=cell(board,k);return k+"："+c.result.rows.map(g=>g.name+" "+(Number.isFinite(g.distance)?g.distance:"不連通")).join("；")+"。650內 "+c.result.servedPopulation+" / 140 人。";}),
  "承認的代價："+tradeoffs(board).find(t=>t.id===board.tradeoff).text,
  "未回答的問題："+QUESTIONS.find(q=>q.id===board.question).text,
  board.note?"我的話："+board.note:"", "引用卡牌："+(board.refs.join("、")||"無"),
  "虛構教學小鎮；距離不是實測公尺，籌碼不是工程報價。沒有測試的情景不能推定有效。"].filter(Boolean).join("\n");
}
