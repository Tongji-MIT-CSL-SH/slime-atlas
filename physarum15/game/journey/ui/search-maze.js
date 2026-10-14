import { SEARCH_BOARDS } from "../core/search-boards.js";
import { searchSnapshot } from "../core/search.js";
import { esc } from "./art.js";
export function mazeArt(state){
 const b=SEARCH_BOARDS[state.sheet],s=searchSnapshot(state),seen=new Set(["S",...s.rows.map(r=>r.node)]);
 const visible=new Set([...seen,...s.choices.map(c=>c.node)]);
 const text=(x,y,t,c="")=>`<text x="${x}" y="${y}" text-anchor="middle" class="${c}">${esc(t)}</text>`;
 let body='<rect x="40" y="42" width="880" height="425" rx="40" class="dish"/>'+text(480,73,b.name);
 const drawn=new Set();
 for(const from of seen)for(const to of Object.values(b.exits[from])){
  if(!visible.has(to))continue;
  const key=[from,to].sort().join("-");if(drawn.has(key))continue;drawn.add(key);
  const [x,y]=b.nodes[from],[tx,ty]=b.nodes[to];
  const walked=s.rows.some(r=>[r.from,r.node].sort().join("-")===key),last=s.rows.at(-1);
  const latest=last&&[last.from,last.node].sort().join("-")===key;
  body+=`<path d="M${x} ${y} Q${(x+tx)/2} ${y+12} ${tx} ${ty}" class="search-link ${walked?'revealed':''} ${latest?'search-latest-link':''}"/>`;
 }
 for(const id of visible){
  const [x,y,name]=b.nodes[id],row=s.rows.filter(r=>r.node===id).at(-1);
  const choice=s.choices.find(c=>c.node===id&&s.frontiers.includes(c.branch));
  body+=`<g class="search-point ${choice?'frontier':''} ${id===s.cursor?'search-current':''}" ${choice?`role="button" tabindex="0" id="frontier-${choice.branch}" data-action="search-step" data-branch="${choice.branch}" aria-label="走向${seen.has(id)?name:'未知路口'}，花費一次機會"`:''}>`+
   (choice?`<circle cx="${x}" cy="${y}" r="58" class="search-hit"/>`:'')+
   (id===s.cursor?`<circle cx="${x}" cy="${y}" r="36" class="search-position-ring"/>`:'')+
   `<circle cx="${x}" cy="${y}" r="27" class="${seen.has(id)?'revealed '+(row?.signal||'quiet'):'unknown'}"/>`+
   text(x,y+6,id===s.cursor?'●':row?row.index+1:id==='S'?'起':'?')+text(x,y+48,seen.has(id)?name:'未知路口 '+(choice?.branch==='upper'?'①':choice?.branch==='lower'?'②':''))+
   (row?text(x,y-40,row.result,'search-signal'):'')+'</g>';
 }
 body+=text(480,450,s.found?'找到燕麥。回看你改變方向的那一步。':s.exhausted?'機會用完：撤回一步，保留已收集的卡。':'● 你的位置；只有附近路口與走過的痕跡可見。','search-signal search-board-note');
 return '<svg class="search-board-art" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 510" role="group" aria-label="局部揭露的探索底紙；同樣操作也在圖下按鈕提供">'+body+'</svg>';
}
