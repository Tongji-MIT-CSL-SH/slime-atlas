import { CITY, CITY_OPTIONS, evaluateCity } from "../content/scenes.js";
export const REACH_NODE_NAMES={S:"服務站",E:"中心街區",W:"西岸住區",H:"小禾家",WN:"北橋西端",EN:"北橋東端",ET:"東岸路口",BR:"南橋東端",R:"南側路口"};
export const newReach=()=>({option:"none",nodes:["H"],edges:[],baseline:null,directTried:false,interpretation:"",note:"先看對岸，再沿允許通行的道路出發。"});
export function reachSnapshot(s){
 const result=evaluateCity(s.option),at=s.nodes.at(-1),arrived=at==="S";
 const available=result.edges.filter(e=>(e.a===at||e.b===at)&&!s.nodes.includes(e.a===at?e.b:e.a));
 const distance=s.edges.reduce((sum,id)=>sum+result.edges.find(e=>e.id===id).length,0);
 return {option:s.option,at,arrived,nodes:[...s.nodes],edges:[...s.edges],distance,cost:result.cost,affordable:result.affordable,
  served:arrived&&distance<=CITY.threshold,network:result,
  choices:arrived?[]:available.map(e=>({node:e.a===at?e.b:e.a,edge:e.id,length:e.length}))};
}
export function tryReachDirect(s){
 if(s.nodes.length!==1||s.nodes[0]!=="H")return false;
 s.directTried=true;s.note="隔河的虛線只表示方向，不是道路。這次沒有移動，也沒有加上假距離。";return true;
}
export function chooseReach(s,option){
 if(!CITY_OPTIONS.some(o=>o.id===option))return false;
 s.option=option;s.nodes=["H"];s.edges=[];s.interpretation="";
 s.note="換了方案，從小禾家重新出發；先前走完的原路記錄仍保留。";return true;
}
export function stepReach(s,node){
 const snap=reachSnapshot(s),move=snap.choices.find(c=>c.node===node);
 if(!move)return false;
 s.nodes.push(node);s.edges.push(move.edge);
 const next=reachSnapshot(s);
 s.note=next.arrived?"已到服務站；這次實際走了 "+next.distance+" 教學距離。":"走到"+REACH_NODE_NAMES[node]+"，這一段 "+move.length+"；再選下一段。";
 if(next.arrived&&s.option==="none")s.baseline={nodes:[...s.nodes],edges:[...s.edges],distance:next.distance};
 return true;
}
export function undoReach(s){
 if(!s.edges.length)return false;
 s.nodes.pop();s.edges.pop();s.interpretation="";s.note="退回上一個路口，重新選擇；這是重做記錄，不是真實倒退的時間模擬。";return true;
}
export function restartReach(s){return chooseReach(s,s.option);}
function encodeNodes(nodes){
 return nodes.reduce((code,id,i)=>code+(CITY.nodes.findIndex(n=>n.id===id)+1)*10**i,0);
}
export function reachEvidence(s){
 const r=reachSnapshot(s);
 if(!s.directTried||!s.baseline||s.interpretation!=="network"||!r.served||!r.affordable)return null;
 return {model:1,directTried:1,option:CITY_OPTIONS.findIndex(o=>o.id===s.option),steps:r.edges.length,
  pathCode:encodeNodes(r.nodes),distance:r.distance,baselineDistance:s.baseline.distance,cost:r.cost,threshold:CITY.threshold};
}
export function replayReachEvidence(e){
 if(!e||e.model!==1||!Number.isInteger(e.steps)||e.steps<1||e.steps>=CITY.nodes.length
  ||!Number.isInteger(e.pathCode)||e.pathCode<0||e.pathCode>=10**(e.steps+1)||!Number.isInteger(e.option)||!CITY_OPTIONS[e.option])return null;
 const s=newReach();tryReachDirect(s);
 for(const node of ["W","WN","EN","ET","S"])stepReach(s,node);
 chooseReach(s,CITY_OPTIONS[e.option].id);
 const ids=Array.from({length:e.steps+1},(_,i)=>CITY.nodes[Math.floor(e.pathCode/10**i)%10-1]?.id);
 if(ids[0]!=="H")return null;
 for(const node of ids.slice(1))if(!stepReach(s,node))return null;
 s.interpretation="network";const actual=reachEvidence(s);
 return actual&&Object.keys(actual).every(k=>actual[k]===e[k])?s:null;
}
export function reachTask(s){
 const r=reachSnapshot(s);
 if(!s.directTried)return "先試試直接走向對岸。地圖上的虛線，真的是道路嗎？";
 if(!s.baseline)return s.option==="none"?"先維持原有道路，陪小禾經北橋走到服務站，留下完整原路。":"先選「維持現狀」，把北橋的原路走完，才能比較改變。";
 if(!r.affordable)return "路可以走，但措施超過 4 枚預算。回家換一組可負擔的候選再走。";
 if(!r.arrived)return "點圖上的下一個路口，或用旁邊按鈕，一段一段走到服務站。";
 if(!r.served)return "到了，不等於距離已達標。這次仍超過 650，試試合法候選，再從家走一次。";
 return "這次路程已在 650 以內。把可走路線和直線參考的差別記下來。";
}
