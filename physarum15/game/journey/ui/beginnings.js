import { OBSERVATION_POINTS } from "../core/meet.js";
import { SEARCH_BUDGET, SEARCH_BRANCHES, SEARCH_NAMES, SIGNAL_TEXT, searchSnapshot } from "../core/search.js";
import { esc } from "./art.js";
import { SEARCH_BOARDS } from "../core/search-boards.js";
import { mazeArt } from "./search-maze.js";
const action=(name,label,disabled=false,attrs="")=>'<button type="button" class="secondary" data-action="'+name+'" '+attrs+(disabled?' disabled':'')+'>'+label+'</button>';
const wrap=(body,label)=>'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 510" role="group" aria-label="'+label+'">'+body+'</svg>';
const text=(x,y,value,attrs="")=>'<text x="'+x+'" y="'+y+'" '+attrs+'>'+esc(value)+'</text>';
export function meetArt(state) {
  const network="M195 275 Q270 310 340 265 Q395 230 420 270 Q485 260 530 207 L580 170 M420 270 Q485 300 510 325 L555 350 M340 265 L320 170 L365 126 M320 170 L250 132 M510 325 L478 390 M530 207 L470 152 M555 350 L622 365 M580 170 L625 160 M195 275 L185 205 M195 275 L130 318 M340 265 L310 350";
  let body='<ellipse cx="430" cy="260" rx="365" ry="205" class="dish"/><ellipse cx="430" cy="264" rx="355" ry="197" class="dish-rim"/>'+
    '<path d="'+network+'" class="meet-body '+(state.traced?'traced':'')+'"/><path d="'+network+'" class="meet-thread"/>'+
    '<ellipse cx="204" cy="277" rx="30" ry="21" class="oat"/>'+text(113,70,"PETRI DISH / 01",'class="svg-note"');
  body+='<g id="meet-oat-point" role="button" tabindex="0" data-action="place-oat" class="observation-point" aria-label="放下第一粒燕麥">'+
    '<circle cx="665" cy="131" r="58" class="meet-hit"/><circle cx="665" cy="131" r="30" class="observation-ring"/>'+
    (state.food?'<ellipse cx="665" cy="131" rx="10" ry="20" transform="rotate(24 665 131)" class="oat"/>':text(665,137,"+",'text-anchor="middle"'))+
    text(665,91,state.food?"已放下燕麥":"放一粒燕麥",'text-anchor="middle"')+'</g>';
  for(const point of OBSERVATION_POINTS){
    body+='<g id="meet-point-'+point.id+'"'+(state.food?' role="button" tabindex="0" data-action="observe-meet" data-point="'+point.id+'"':'')+
      ' class="observation-point" aria-label="觀察'+point.name+'"><circle cx="'+point.x+'" cy="'+point.y+'" r="58" class="meet-hit"/><circle cx="'+point.x+'" cy="'+point.y+'" r="'+(state.selected===point.id?42:28)+'" class="observation-ring '+(state.observed.includes(point.id)?'seen':'')+'"/>'+
      text(point.x,point.y+61,point.name+(state.observed.includes(point.id)?" ✓":""),'text-anchor="middle"')+'</g>';
  }
  if(state.traced){
    body+='<g class="cell-inset"><rect x="710" y="240" width="220" height="200" rx="12"/>'+
      text(820,269,"細胞結構示意",'text-anchor="middle"')+
      '<ellipse cx="820" cy="337" rx="83" ry="47"/>'+
      [[780,326],[804,314],[835,320],[865,336],[829,348],[794,354]].map(([x,y])=>'<circle cx="'+x+'" cy="'+y+'" r="5"/>').join("")+
      text(820,407,"一個細胞 · 許多細胞核",'text-anchor="middle"')+'</g>';
  }
  body+=text(430,478,state.traced?"不同分支，連回同一個原質團":"點選兩個部位，沿著細線往回看",'text-anchor="middle"');
  return wrap(body,"原質團的預繪教學示意。可放置燕麥，選擇觀察點；同樣操作也在圖下按鈕提供。").replace("<svg ","<svg class=\"meet-art\" ");
}
export function meetControls(state){
  return '<fieldset><legend>1. 與它打個招呼</legend>'+action("place-oat",state.food?"✓ 已放下第一粒燕麥":"放下第一粒燕麥",state.food,'id="place-oat"')+
    '</fieldset><fieldset'+(!state.food?' hidden':'')+'><legend>2. 移動你的觀察鏡</legend><div class="action-stack">'+OBSERVATION_POINTS.map(point=>
    action("observe-meet",point.name+(state.observed.includes(point.id)?" · 已觀察":""),!state.food,'id="observe-'+point.id+'" data-point="'+point.id+'" aria-pressed="'+(state.selected===point.id)+'"')).join("")+
    '</div></fieldset><fieldset'+(state.observed.length<2?' hidden':'')+'><legend>3. 退回全景，認識它</legend>'+action("trace-meet",state.traced?"✓ 已記下它的身分":"沿細線，連回同一個身體",state.observed.length<2,'id="trace-meet"')+
    '</fieldset><p class="microcopy">點位記錄的是你觀察了哪裡，不是知識掌握分數。本關不模擬食物引起的生長。</p>';
}
export function meetMetrics(state){
  const selected=OBSERVATION_POINTS.find(point=>point.id===state.selected);
  return '<div class="observation-note"><strong>'+ (selected?selected.name:"第一份觀察")+'</strong><p>'+
    (selected?selected.note:"放下一粒燕麥，再選擇兩個不同部位查看。")+'</p></div>'+
    (state.traced?'<div class="identity-note"><h3>我們觀察的是誰？</h3><p>這裡介紹的是<strong>多頭絨泡菌的原質團階段</strong>：一個連續的大型多核細胞，而不是許多小動物。</p><p>「多核」指同一細胞內有許多細胞核；不是每條分支各是一個細胞。右上小圖是結構示意，並非這隻觀察鏡真的看見了細胞核。</p></div>':"");
}
const coordinates={upper:[[320,171],[475,132],[635,102],[807,90]],lower:[[320,339],[475,378],[635,408],[807,420]]};
export function searchArt(state){
  if(SEARCH_BOARDS[state.sheet])return mazeArt(state);
  const snapshot=searchSnapshot(state);
  let body='<rect x="40" y="42" width="880" height="425" rx="40" class="dish"/>'+text(73,80,"EXPLORATION SHEET / "+(state.sheet+1),'class="svg-note"')+
    '<circle cx="145" cy="255" r="22" class="slime-origin"/>'+text(145,301,"探索起點",'text-anchor="middle"');
  for(const branch of SEARCH_BRANCHES){
    let previous=[145,255];
    coordinates[branch].forEach(([x,y],i)=>{
      const row=snapshot.rows.find(item=>item.branch===branch && item.step===i+1);
      const frontier=snapshot.frontiers.includes(branch) && snapshot.counts[branch]===i;
      body+='<path d="M'+previous.join(" ")+' Q'+((previous[0]+x)/2)+' '+previous[1]+' '+x+' '+y+'" class="search-link '+(row?'revealed':'')+(row&&row.index===snapshot.rows.length-1?' search-latest-link':'')+'"/>';
      body+='<g class="search-point '+(frontier?'frontier':'')+'"'+(frontier?' role="button" tabindex="0" id="frontier-'+branch+'" data-action="search-step" data-branch="'+branch+'" aria-label="探索'+SEARCH_NAMES[branch]+'，花費一次機會"':'')+'>'+
        (frontier?'<circle cx="'+x+'" cy="'+y+'" r="58" class="search-hit"/>':'')+
        (row&&row.index===snapshot.rows.length-1?'<circle cx="'+x+'" cy="'+y+'" r="36" class="search-position-ring"/>':'')+
        '<circle cx="'+x+'" cy="'+y+'" r="27" class="'+(row?'revealed '+row.signal:'unknown')+'"/>'+
        (row?.signal==="food"?'<ellipse cx="'+x+'" cy="'+y+'" rx="9" ry="18" transform="rotate(24 '+x+' '+y+')" class="oat"/>':
          text(x,y+7,row?String(row.index+1):"?",'text-anchor="middle"'))+
        (row?text(x,y+(branch==="upper"?-42:50),row.result,'text-anchor="middle" class="search-signal"'):frontier?text(x,y+(branch==="upper"?-42:50),"可探索 · 1 次",'text-anchor="middle" class="search-signal"'):"")+'</g>';
      previous=[x,y];
    });
  }
  body+=text(480,268,snapshot.found?"發現食物！回看一次改變方向的選擇。":snapshot.exhausted?"機會用完了，可以撤回一步再分配。":"未知不等於沒有。依新線索決定下一步。",'text-anchor="middle" class="search-board-note"');
  return wrap(body,"兩片未知區域的有限探索謎題。只有探索過的點才顯示結果；圖下提供相同的操作按鈕。").replace('<svg ','<svg class="search-board-art" ');
}
export function searchDock(state){
  const snapshot=searchSnapshot(state);
  const board=SEARCH_BOARDS[state.sheet];
  const direction=branch=>{const c=snapshot.choices?.find(c=>c.branch===branch);return c?(c.visited?'回到 '+c.name:'探向未知路口 '+(branch==='upper'?'①':'②')):'暫無通道';};
  return '<div class="field-action-dock search-dock" aria-label="尋路圖面操作"><div class="budget-strip"><span>剩餘探索機會</span><strong>'+snapshot.remaining+' / '+SEARCH_BUDGET+'</strong><span class="budget-ticks" aria-hidden="true">'+Array.from({length:SEARCH_BUDGET},(_,i)=>'<i class="'+(i<snapshot.remaining?'':'spent')+'"></i>').join("")+'</span></div>'+
    '<fieldset class="search-intent"><legend>1. 記下這一步的打算</legend><div class="two-choices">'+
    [["wide","看看尚未了解的地方"],["follow","繼續追蹤已有線索"]].map(([value,label])=>'<label class="choice '+(state.intent===value?'chosen':'')+'"><input type="radio" name="search-intent" id="intent-'+value+'" value="'+value+'"'+(state.intent===value?' checked':'')+'><span><strong>'+label+'</strong></span></label>').join("")+
    '</div></fieldset><fieldset><legend>2. 把一次機會投在哪裡？</legend><div class="action-stack">'+SEARCH_BRANCHES.map(branch=>
      action("search-step",board?direction(branch):"探索"+SEARCH_NAMES[branch],!snapshot.frontiers.includes(branch),'id="search-'+branch+'" data-branch="'+branch+'"')).join("")+
    '</div></fieldset>'+
    '<p id="search-live" class="search-feedback" role="status">'+(snapshot.rows.length?'第 '+snapshot.spent+' 步 · '+(board?board.nodes[snapshot.rows.at(-1).node][2]:SEARCH_NAMES[snapshot.rows.at(-1).branch])+' · '+snapshot.rows.at(-1).result+'。這一步花費 1 次。':'先記下打算，再選一個可探索的方向。')+(snapshot.exhausted?' 機會用完，可撤回調整。':'')+'</p>'+
    '<div class="search-tools">'+action("search-undo","撤回一步",!state.moves.length,'id="search-undo"')+
    action("search-hint","給我一點提示",false,'id="search-hint"')+'</div>'+
    (state.hint?'<p class="gentle-hint">'+(Number(state.hint)>1?'比較剩餘次數和已走過的路。沒有新線索不等於別處也沒有食物；可以先撤回，再把機會分配給另一個方向。':'先看最後一次觀察：有新線索嗎？下一步要了解未知，還是繼續追蹤？再按提示可以看投入的取捨。')+' 撤回是遊戲功能，不代表生物能倒轉時間。</p>':"")+
    (snapshot.found?'<p class="result-note">已找到食物。回看決策記錄，留下一步你想記住的選擇。</p>'+action("search-review","回看我的決策記錄",false,'id="search-review"'):"")+'</div>';
}
export function searchControls(state){
  const board=SEARCH_BOARDS[state.sheet];
  return '<h3>我的探索底紙</h3>'+(board?'<p class="gentle-hint">'+board.note+'</p>':'<p>未知方向不一定有食物；把新線索與剩餘機會一起考慮。</p>')+
    '<p class="microcopy">每次探索花費 1 次機會。金色外圈與粗線標出最近一步；沒有透露下一步的答案。食物位置固定，撤回不會移動它，也不扣已收藏的卡。</p>'+
    action("search-sheet","換一張底紙重試",false,'id="search-sheet"')+
    '<details id="search-challenges"><summary>挑戰不同的路形（會重開本次探索）</summary>'+Object.entries(SEARCH_BOARDS).map(([id,b])=>action("search-board",b.name,false,'id="search-board-'+id+'" data-sheet="'+id+'"')).join('')+'<p class="microcopy">共用同一張尋路卡；不要求反覆刷關。線索固定，食物不會偷偷搬家。</p></details>';
}
export function searchMetrics(state){
  const snapshot=searchSnapshot(state);
  if(!snapshot.rows.length)return '<div class="untested-note">先說說打算，再選一個未知方向探索；結果會逐步記在這裡。</div>';
  return '<ol class="decision-log">'+snapshot.rows.map(row=>'<li><div><strong>第 '+(row.index+1)+' 步 · '+(row.node?SEARCH_BOARDS[state.sheet].nodes[row.node][2]:SEARCH_NAMES[row.branch])+'</strong><small>'+
    (row.intent==="follow"?"打算：追蹤線索":"打算：了解未知")+' · 當時知道：'+esc(SIGNAL_TEXT[row.before] || "這一側還沒試過")+
    '</small><p>'+row.result+'</p></div>'+ (snapshot.found?action("search-record",state.decisionIndex===row.index?"✓ 已留下":"留下這一步",false,'id="record-step-'+row.index+'" data-index="'+row.index+'" aria-pressed="'+(state.decisionIndex===row.index)+'"'):"")+'</li>').join("")+'</ol>'+
    (snapshot.exhausted?'<p class="gentle-hint">這次還沒找到食物，沒關係。撤回幾步，把機會分配給另一個方向試試。</p>':"")+
    '<p class="microcopy">記錄保留打算與當時可見線索，不將猜對方向當作學習得分。撤回會移除該步記錄，已收集的卡片仍保留。</p>';
}
