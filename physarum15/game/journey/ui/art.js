import { CHAPTERS, CARDS, PLAYABLE } from "../content/catalog.js";
import { CHAPTER_ILLUSTRATIONS } from '../content/illustrations.js';
import { illustration } from './illustrations.js';
import { BACKUP, CITY } from "../content/scenes.js";
import { SENSING_CONFIG } from "../core/sensing.js";
export const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char]);
export const number = (value, digits = 0) => value === null ? "—" : Number.isFinite(value) ? value.toFixed(digits) : "不可達";
const svg = (body, title, viewBox = "0 0 960 510") => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + viewBox + '" role="img" aria-label="' + esc(title) + '">' + body + '</svg>';
const text = (x, y, label, extra = "") => '<text x="' + x + '" y="' + y + '" ' + extra + '>' + esc(label) + '</text>';
const line = (a,b,klass="") => '<path class="' + klass + '" d="M ' + a.x + ' ' + a.y + ' L ' + b.x + ' ' + b.y + '"/>';
export function motif(index) {
  const ink = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  const drawings = [
    '<ellipse cx="60" cy="52" rx="48" ry="34"/><ellipse cx="60" cy="55" rx="44" ry="30"/><path d="M36 63l16-18 18 9 16-19M52 45l-12-9M70 54l7 14M52 45l13-18"/><circle cx="85" cy="34" r="5" fill="#c8ab54"/><circle cx="36" cy="63" r="7" fill="#c8ab54"/>',
    '<path d="M20 66L51 22l47 37-78 7M51 22l8 62 39-25"/><circle cx="20" cy="66" r="8" fill="#ede5ce"/><circle cx="51" cy="22" r="8" fill="#ede5ce"/><circle cx="98" cy="59" r="8" fill="#ede5ce"/><circle cx="59" cy="84" r="8" fill="#ede5ce"/>',
    '<path d="M15 65L45 20l58 45M15 65h30m26 0h32"/><circle cx="15" cy="65" r="7"/><circle cx="103" cy="65" r="7"/><path d="M50 56l15 20m0-20L50 76" stroke="#a06650"/><path d="M45 20l1 4" stroke="#b49a49"/>',
    '<path d="M52 6c-12 28 19 42 7 89M65 5c-12 29 20 40 8 90" stroke="#9aaaa3"/><path d="M42 26h37M42 33h37M15 63V46l14-11 13 11v17zM84 74V54l14-11 13 11v20z"/><path d="M28 63v-9h5v9M94 74V63h7v11"/>',
    '<path d="M28 12l65 3-3 77-65-4zM39 28h37M39 40h30M39 53h20"/><path d="M45 69l8 8 20-18"/><path d="M17 25l-4 58 11 1"/>',
  ];
  return svg('<g ' + ink + '>' + drawings[index % 5] + '</g>', CHAPTERS[index % 5].place, "0 0 120 100");
}
export function mapMarkup(progress) {
  return '<div class="map-scroll"><div class="atlas-board">' +
    '<svg class="map-paths" viewBox="0 0 1100 430" aria-hidden="true"><path class="trail" d="M125 235C175 95 255 95 335 120S425 320 540 255S644 85 750 130S822 300 950 260"/><path class="contour" d="M35 337q120 28 230-1t210 14M617 325q135 28 227 1t199 29M490 38q115 31 251-3"/><text x="55" y="390" class="map-annotation">從培養皿，走到小鎮。</text><path class="compass" d="M1030 47v46m-21-23h42m-21-23-6 14m6-14 6 14"/><text x="1024" y="34">N</text></svg>' +
    CHAPTERS.map((chapter, index) => {
      const cards = CARDS.filter((card) => card.chapter === index + 1);
      const available = cards.filter((card) => PLAYABLE.includes(card.id));
      const complete = cards.every((card) => progress.has(card.id));
      const collected = cards.filter((card) => progress.has(card.id)).length;
      const next = available.find((card)=>!progress.has(card.id)) || available[0];
      const heading = '<span class="chapter-number">CHAPTER 0' + (index+1) + '</span><span class="chapter-art">' + illustration(CHAPTER_ILLUSTRATIONS[index], { decorative: true }) + '</span>' +
        '<strong>' + chapter.name + '</strong><span class="chapter-place">' + chapter.place + '</span>';
      const inner = (next ? '<a class="chapter-entry" href="#level/' + next.id + '">' + heading + '</a>' : heading) +
        '<span class="map-slots">' + cards.map((card) => {
          const klass=progress.has(card.id) ? "lit" : PLAYABLE.includes(card.id) ? "available" : "";
          return PLAYABLE.includes(card.id) ? '<a class="' + klass + '" href="#level/' + card.id + '" aria-label="' + card.id + ' ' + card.name + (progress.has(card.id) ? '，已收集' : '，可以探索') + '">' + card.id + '</a>' :
            '<i>' + card.id + '</i>';
        }).join("") + '</span><span class="chapter-state">' + (complete ? "全章已點亮 · 可以重玩" :
          available.length ? collected + " / 3 格已點亮" : "製作中") + '</span>';
      return '<div class="chapter ' + (available.length ? "open" : "locked") + (complete ? " complete" : "") +
        '" style="left:' + (chapter.x/11) + '%;top:' + (chapter.y/4.3) + '%">' + inner + '</div>';
    }).join("") + '</div></div>';
}
export function sensingArt(snapshot, showSense) {
  const position = SENSING_CONFIG.placements[snapshot?.placement || "near"];
  const origin = SENSING_CONFIG.origin;
  const sense = snapshot?.firstSense;
  const tip = sense || snapshot?.tips?.[0] || origin;
  const paths = (snapshot?.edges || []).filter((edge) => edge.visible !== false)
    .map((edge) => "M" + edge.x1 + " " + edge.y1 + "L" + edge.x2 + " " + edge.y2).join(" ");
  let body = '<rect x="35" y="35" width="890" height="440" rx="80" class="dish"/><rect x="43" y="43" width="874" height="424" rx="76" class="dish-rim"/>';
  if (showSense) body += '<circle cx="' + tip.x + '" cy="' + tip.y + '" r="' + SENSING_CONFIG.radius + '" class="sense-radius"/>';
  body += '<path d="' + paths + '" class="growth"/><circle cx="' + origin.x + '" cy="' + origin.y + '" r="14" class="slime-origin"/>';
  body += text(origin.x, origin.y + 42, "黏菌起點", 'text-anchor="middle"');
  body += '<ellipse cx="' + position.x + '" cy="' + position.y + '" rx="13" ry="21" transform="rotate(24 ' + position.x + ' ' + position.y + ')" class="oat"/>';
  body += text(position.x, position.y - 34, "燕麥", 'text-anchor="middle"');
  body += Object.entries(SENSING_CONFIG.placements).map(([id, point]) =>
    '<g id="point-' + id + '" role="button" tabindex="0" data-placement="' + id + '" class="food-position" aria-label="' + (id==="near" ? "把燕麥放近一點" : "把燕麥放遠一點") + '"><circle cx="' +
    point.x + '" cy="' + point.y + '" r="27"/>' + text(point.x,point.y+52,id==="near" ? "A · 近處" : "B · 遠處",'text-anchor="middle"') + '</g>').join("");
  body += (snapshot?.tips || []).map((front) => '<circle cx="' + front.x + '" cy="' + front.y + '" r="3" class="front"/>').join("");
  if (showSense) body += '<circle cx="' + tip.x + '" cy="' + tip.y + '" r="7" class="selected-front"/>' +
    text(480, 440, sense ? "此刻：一個前沿剛取得局部線索" : "虛線圓：所選前沿的教學感知範圍", 'text-anchor="middle"');
  body += text(76, 85, "PETRI DISH / 02", 'class="svg-note"');
  return svg(body, "局部感知試驗；食物位置、前沿與感知範圍。詳情見下方觀察記錄。").replace('<svg ','<svg class="sensing-art" ');
}
export function backupArt(result, target = null) {
  const nodes = Object.fromEntries(BACKUP.nodes.map((node) => [node.id, node]));
  const route = new Set(BACKUP.targets.includes(target)?result.routes[target]:Object.values(result.routes).flat());
  let body = '<rect x="38" y="40" width="884" height="400" rx="30" class="diagram-frame"/>';
  for (const edge of result.edges) {
    const a = nodes[edge.a], b = nodes[edge.b];
    if (edge.id === (result.cutEdge||"BC") && result.cut) {
      const left = { x: a.x + (b.x-a.x)*0.43, y: a.y }, right = { x: a.x + (b.x-a.x)*0.57, y: a.y };
      body += line(a,left,"network-edge broken") + line(right,b,"network-edge broken") +
        '<path d="M'+((a.x+b.x)/2-10)+' 245l20 20m0-20-20 20" class="cut-mark"/>';
    } else body += line(a,b, "network-edge " + (route.has(edge.id) ? "active-route backup-traced-route " : "") + (BACKUP.edges.includes(edge) ? "" : "extra-edge"));
  }
  body += BACKUP.nodes.map((node) => {
    const target = BACKUP.targets.includes(node.id);
    const lost = target && !result.reached.includes(node.id);
    return '<circle cx="' + node.x + '" cy="' + node.y + '" r="18" class="network-node ' + (lost ? "lost" : "") + '"/>' +
      text(node.x,node.y+6,node.id,'text-anchor="middle" class="node-letter"') +
      text(node.x,node.id==="E"?node.y-42:node.y+48,node.name,'text-anchor="middle"') +
      (target ? text(node.x,node.y+76,lost ? "× 失聯" : "✓ 連通", 'text-anchor="middle" class="' + (lost ? "svg-danger" : "svg-green") + '"') : "");
  }).join("");
  body += text(474, 405, result.cut ? "斷點 "+(result.cutEdge||"BC")+"：誰仍能沿實際路線回到起點？" : "點虛線接備路，再剪斷選定路段。", 'text-anchor="middle" class="backup-legend"');
  if (!result.cut) {const x=result.cutEdge==="CD"?710:470;body += '<g role="button" tabindex="0" data-action="test" class="cut-target" aria-label="切斷選定主路"><circle cx="'+x+'" cy="255" r="28"/><path d="M'+(x-9)+' 246l18 18m0-18-18 18"/><text x="'+x+'" y="365" text-anchor="middle">點此切斷</text></g>';}
  return svg(body,"備用連接試驗；" + result.reached.length + " 個目標可連通。");
}
export function cityArt(result, resident, {interactive=false}={}) {
  const nodes = Object.fromEntries(CITY.nodes.map((node) => [node.id,node]));
  const route = new Set(result.routes[resident] || []);
  const selected = CITY.groups.find((group) => group.id === resident);
  let body = '<path d="M420 15C370 130 448 248 414 340S455 448 430 505L480 505C502 422 454 381 476 325S441 140 475 15Z" class="river"/>' +
    '<path d="M440 60q-10 30 2 53m7 154q8 20 0 47m8 143q12 22 1 38" class="water-line"/>' +
    text(435, 295, "河", 'class="river-label"') + text(390,105,"北橋", 'class="svg-note"');
  const edgePath = (edge) => {
    const a = nodes[edge.a], b = nodes[edge.b];
    return edge.id === "westUpgrade" ? "M"+a.x+" "+a.y+"Q145 280 "+b.x+" "+b.y : edge.id === "shortcut" ? "M"+a.x+" "+a.y+"Q655 260 "+b.x+" "+b.y : "M"+a.x+" "+a.y+"L"+b.x+" "+b.y;
  };
  for (const edge of result.edges) body += '<path d="' + edgePath(edge) + '" class="city-road ' + (CITY.edges.includes(edge) ? "" : "new-road") + '"/>';
  for (const edge of result.edges.filter((item) => route.has(item.id))) body += '<path d="' + edgePath(edge) + '" class="resident-route"/>';
  for (const node of CITY.nodes.filter((item) => item.name)) {
    const isService = node.id === "S", active = node.id === selected?.node;
    const group=interactive&&CITY.groups.find(g=>g.node===node.id);
    body += '<g transform="translate(' + node.x + ' ' + node.y + ')"'+(group?' role="button" tabindex="0" class="resident-map-person" id="map-resident-'+group.id+'" data-action="resident-map" data-resident="'+group.id+'" aria-label="查看'+group.name+'的來信與路線"':'')+'>' +
      (group?'<circle r="55" class="resident-map-hit"/>':'') +
      (active ? '<circle r="32" class="resident-halo"/>' : "") +
      '<path d="M-17 12v-25L0-26l17 13v25zM-5 12V-2h10v14" class="house ' + (isService ? "service-house" : "") + '"/>' +
      (isService ? '<path d="M-7-12h14m-7-7v14" class="house"/>' : "") +
      text(0,39,node.name,'text-anchor="middle"') + '</g>';
  }
  body += '<g class="map-tree"><path d="M118 295v25m-14-8 14-30 14 30zm72 70v25m-14-8 14-30 14 30zm398-240v25m-14-8 14-30 14 30z"/></g>' +
    text(80,55,"河灣鎮 · 虛構教學街區", 'class="svg-note"') +
    text(75,490,"線條表示合法通道；長度以教學資料計算，圖面不按比例。", 'class="svg-note"');
  const art=svg(body,"河灣鎮路網；橙色為所選居民前往服務站的合法路線。");
  return interactive?art.replace('role="img"','role="group" class="resident-city-art"'):art;
}
