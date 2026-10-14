// Authored teaching mazes. Coordinates are not biological distances.
export const SEARCH_BOARDS = {
  2: {name:"岔路與回頭", note:"走入岔路後，回到上一個路口也花 1 次。先看腳邊的線索，再決定深入或回頭。",
    nodes:{S:[125,250,"起點","quiet"],A:[340,125,"北岔口","faint"],B:[340,370,"南岔口","faint"],C:[560,100,"石縫","quiet"],D:[560,385,"葉下","strong"],E:[790,105,"盡頭","empty"],F:[790,385,"終點","food"]},
    exits:{S:{upper:"A",lower:"B"},A:{upper:"C",lower:"S"},B:{upper:"D",lower:"S"},C:{upper:"E",lower:"A"},D:{upper:"F",lower:"B"},E:{upper:"C"},F:{}}},
  3: {name:"兩路匯合", note:"不同入口可能通向同一處。記住走過的路；看到線索不代表每一個方向都有食物。",
    nodes:{S:[120,250,"起點","quiet"],A:[325,120,"北入口","quiet"],B:[325,385,"南入口","faint"],J:[535,250,"匯合口","strong"],X:[785,110,"盡頭","empty"],T:[785,385,"終點","food"]},
    exits:{S:{upper:"A",lower:"B"},A:{upper:"J",lower:"S"},B:{upper:"J",lower:"S"},J:{upper:"X",lower:"T"},X:{upper:"J"},T:{}}},
};
export function mazeSnapshot(state,budget,signalText){
  const board=SEARCH_BOARDS[state.sheet],rows=[],counts={upper:0,lower:0};
  let cursor="S";
  for(const [index,move] of state.moves.entries()){
    const target=board.exits[cursor]?.[move.branch];
    if(!target)throw Error("Invalid maze move");
    const signal=board.nodes[target][3];
    rows.push({...move,index,step:++counts[move.branch],from:cursor,node:target,signal,result:signalText[signal]});
    cursor=target;
  }
  const found=board.nodes[cursor][3]==="food",remaining=budget-rows.length;
  const choices=Object.entries(board.exits[cursor]).map(([branch,node])=>({branch,node,name:board.nodes[node][2],visited:node==="S"||rows.some(r=>r.node===node)}));
  return {rows,counts,cursor,choices,found,remaining,spent:rows.length,frontiers:found||remaining<=0?[]:choices.map(c=>c.branch),exhausted:!found&&remaining===0};
}
