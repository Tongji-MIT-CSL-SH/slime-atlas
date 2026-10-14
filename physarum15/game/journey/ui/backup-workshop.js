import { BACKUP, evaluateBackup } from "../content/scenes.js";
import { backupArt } from "./art.js";
import { backupDisplay, backupComparison } from "../core/feedback.js";
const name=id=>BACKUP.options.find(o=>o.id===id).name;
export function backupWorkshopArt(s){
 const {result,target}=backupDisplay(s);
 const nodes=Object.fromEntries(BACKUP.nodes.map(n=>[n.id,n]));
 const candidates=BACKUP.options.filter(o=>o.edges.length).map(o=>{
  // Labels sit below the diagonal fan so a later SVG edge cannot intercept a tap.
  const e=o.edges[0],a=nodes[e.a],b=nodes[e.b],mx=(a.x+b.x)/2,my=(a.y+b.y)/2+38;
  return `<g role="button" tabindex="0" id="backup-map-${o.id}" data-action="backup-select" data-option="${o.id}" aria-label="${s.choice===o.id?'拿掉':'選擇'}${o.name}，${o.cost}枚" class="backup-candidate ${s.choice===o.id?'selected':''}"><path d="M${a.x} ${a.y}L${b.x} ${b.y}"/><text x="${mx}" y="${my}" text-anchor="middle">${o.cost} 枚</text></g>`;
 }).join('');
 return backupArt(result,target).replace('role="img"','class="backup-workshop-art" role="group"').replace('</svg>',candidates+'</svg>');
}
export function backupDock(s){
 const {after,result,target}=backupDisplay(s);
 const viewButton=(id,label,disabled=false)=>`<button type="button" id="backup-view-${id}" class="secondary" data-action="backup-view" data-view="${id}" aria-pressed="${(id==='after')===after}" ${disabled?'disabled':''}>${label}</button>`;
 return '<div class="field-action-dock backup-dock" aria-label="備路圖面操作"><div class="backup-views" role="group" aria-label="對照剪斷前後">'+viewButton('before','剪斷前 · 預覽')+viewButton('after','剪斷後 · 實測',!s.current)+'</div>'+
  '<p id="backup-live" class="search-feedback" role="status">'+(after?'剪斷 '+result.cutEdge+'：'+result.reached.length+' / 2 個目標連通。':'剪斷前的條件預覽：2 / 2 個目標連通。')+(target?' 正在查看目標 '+target+'，'+(result.reached.includes(target)?'綠線可通。':'沒有可通路線。'):' 綠線顯示兩個目標的可通路線。')+'</p>'+
  '<div class="backup-targets" role="group" aria-label="查看哪條路">'+[['both','看兩處'],['C','目標一 C'],['D','目標二 D']].map(([id,label])=>`<button type="button" id="backup-target-${id}" class="secondary" data-action="backup-target" data-target="${id}" aria-pressed="${(target||'both')===id}">${label}</button>`).join('')+'</div>'+
  '<fieldset class="backup-options"><legend>選一條備路 · 維護預算 3 枚</legend><div>'+BACKUP.options.map(o=>`<label class="choice ${s.choice===o.id?'chosen':''}"><input id="option-${o.id}" type="radio" name="option" value="${o.id}" ${s.choice===o.id?'checked':''}><span><strong>${o.name}</strong><small>${o.cost} 枚 · ${o.note}${o.cost>3?'（超支）':''}</small></span></label>`).join('')+'</div></fieldset>'+
  backupPrediction(s)+'<button type="button" id="test" class="primary" data-action="test">剪斷主路 '+s.backup.cutEdge+'，看結果</button><p class="microcopy">只有剪斷測試會留下記錄；切換前後或目標不增加試驗。維護成本 '+result.cost+' / 3 枚'+(result.affordable?'。':'，已超支。')+'</p></div>';
}
export function backupPrediction(s){
 return '<fieldset class="backup-prediction"><legend>剪斷前，你覺得能保住幾個目標？</legend><div class="prediction-chips">'+[['0','0 個'],['1','1 個'],['2','2 個'],['unsure','還不確定']].map(([v,t])=>`<label><input type="radio" name="backup-prediction" value="${v}" ${s.backup.prediction===v?'checked':''}>${t}</label>`).join('')+'</div><p class="microcopy">預測不是得分；先留一個想法，再看實際路線。也可以直接試。</p></fieldset>';
}
export function backupExperiments(s){
 return '<fieldset><legend>延伸：換一個斷點</legend>'+['BC','CD'].map(c=>`<label class="choice"><input type="radio" name="backup-cut" value="${c}" ${s.backup.cutEdge===c?'checked':''}><span>${c==='BC'?'B—C · 本關比較條件':'C—D · 延伸挑戰'}</span></label>`).join('')+'<p class="microcopy">一次只切一段。更換斷點後要重新測試，不能沿用之前的結果。</p></fieldset>';
}
export function backupWorkshopMetrics(s){
 const r=s.current,rows=s.backup.records;
 const pair=backupComparison(s);
 const comparison=pair?'<div class="backup-comparison"><strong>同一斷點 '+r.cutEdge+' · 換一條路之後</strong><p>'+name(pair.before.option)+'：'+pair.before.reached.length+' / 2 連通，'+pair.before.cost+' 枚 → '+name(pair.after.option)+'：'+pair.after.reached.length+' / 2 連通，'+pair.after.cost+' 枚。</p><small>對照最近一次不同備路的實測；換斷點的結果不混在一起。</small></div>':'';
 const prediction=rows.at(-1)?.prediction;
 const feedback=r?'<div class="resident-story"><strong>斷點 '+r.cutEdge+'：'+r.reached.length+' / 2 個目標仍連通</strong><p>'+(prediction&&prediction!=='unsure'?'你原本預測 '+prediction+' 個；本次實算 '+r.reached.length+' 個。':'這次留下了實測結果，可以再換一條備路比較。')+'</p><p>'+BACKUP.targets.map(id=>id+'：'+(r.reached.includes(id)?r.routes[id].join(' → '):'失聯，沒有可通路線')).join('；')+'</p><p>維護 '+r.cost+' / 3 枚 · '+(r.affordable?'可負擔':'超支，不能作為本關解法')+'</p></div>':'<p class="untested-note">點圖上的虛線接上備路。現在是預覽；剪斷後才留下比較記錄。</p>';
 const headline=r?'<div class="metric-row"><div><small>實測連通</small><strong>'+r.reached.length+' / 2</strong></div><div><small>維護</small><strong>'+r.cost+' / 3</strong></div><div><small>本次斷點</small><strong>'+r.cutEdge+'</strong></div></div>':'';
 return headline+feedback+comparison+(rows.length?'<div class="council-table-scroll" tabindex="0" role="region" aria-label="備路實測記錄"><table class="council-matrix"><caption>最近 12 次實測 · 只比較相同斷點的結果</caption><thead><tr><th>備路</th><th>斷點</th><th>預測 / 實測</th><th>維護</th></tr></thead><tbody>'+rows.map(x=>{
  const actual=evaluateBackup(x.option,true,x.cutEdge);
  return '<tr><th>'+name(x.option)+'</th><td>'+x.cutEdge+'</td><td>'+(x.prediction==='unsure'||!x.prediction?'未定':x.prediction)+' / '+actual.reached.length+'</td><td>'+actual.cost+' / 3'+(actual.affordable?'':' 超支')+'</td></tr>';
 }).join('')+'</tbody></table></div>':'')+'<p class="microcopy">新增備路可再次點選拿掉。拓撲表示連接關係，線條不是生物生長；同一備路的作用取決於故障位置。</p>';
}
