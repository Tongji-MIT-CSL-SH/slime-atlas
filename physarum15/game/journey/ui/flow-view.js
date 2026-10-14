import { FLOW_EDGES, FLOW_RULE, dynamicsFrame, edgeChange } from "../core/flow.js";
import { number } from "./art.js";
import { deskButton as button, deskRadio as radio } from "./network-art.js";
export { flowArt } from "./flow-art.js";
const ids=FLOW_EDGES.map(edge=>edge.id);
export function flowControls(s){
 const started=s.history.length>0,rounds=s.history.length-1,adapt=s.kind==="006";
 const frame=dynamicsFrame(s);
 return '<fieldset><legend>1. '+(adapt?'你猜哪段會減弱？':'你猜哪段會增強？')+'</legend><div class="desk-edge-options">'+ids.map(id=>radio("flow-prediction",id,id,s.prediction===id,started)).join("")+
  '</div><p class="microcopy">先保留猜測，再用結果修正。猜錯也能收卡。</p></fieldset>'+
  (!adapt?'<fieldset><legend>2. 只改一處需求</legend>'+["B","C"].map(id=>radio("flow-target",id,'資源 '+id+'：2 → 5',s.target===id,started)).join("")+'</fieldset>':'<p class="result-note">昨天 B 需要 5、C 需要 1。今天交換為 B 需要 1、C 需要 5；總需求維持 6。</p>')+
  button("flow-apply",adapt?"交換 B、C 需求":"改變需求，先看流量",started||!s.prediction,'id="flow-apply"')+
  (started?'<fieldset><legend>3. 讓連接回應流動</legend><p>已計算 '+rounds+' 輪，正在查看第 '+s.cursor+' 輪。</p><div class="desk-edge-options">'+
   button("flow-step","再調整 1 輪",rounds>=FLOW_RULE.maxRounds,'id="flow-step"')+button("flow-fast","再調整 3 輪",rounds>=FLOW_RULE.maxRounds,'id="flow-fast"')+
   '</div><p class="desk-feedback" role="status">'+s.selected+' · 流量 '+number(Math.abs(frame.flows[s.selected]),2)+' · 強度 '+number(frame.strengths[s.selected],2)+'</p>'+
   '<label class="timeline-label" for="flow-history">回看已記錄的輪次（0–'+rounds+'）</label><input class="flow-timeline" id="flow-history" type="range" min="0" max="'+rounds+'" step="1" value="'+s.cursor+'" aria-valuetext="第 '+s.cursor+' 輪">'+
   '<p class="microcopy">第 0 輪只有需求和流量改變，D 尚未更新。下一次計算從最新一輪接續；最多 12 輪，不代表真實時間。</p></fieldset>':"")+
  (adapt?'<label class="toggle-line"><input id="flow-overlay" type="checkbox"'+(s.overlay?' checked':'')+'> 疊上昨天的網路（灰色虛線）</label>':"")+
  '<fieldset><legend>4. 點一段連接，記下觀察</legend><div class="desk-edge-options">'+ids.map(id=>button("flow-inspect",id,false,'id="flow-edge-'+id+'" data-edge="'+id+'" aria-pressed="'+(s.selected===id)+'"')).join("")+'</div>'+
  '<p class="microcopy">目前查看 '+s.selected+'。'+(!adapt?'請比較第 0 輪與至少第 3 輪的共同通道 SJ。':'先找一段減弱的連接，再看它是否仍存在。')+'</p></fieldset>'+
  (adapt&&started&&rounds>=3?'<fieldset><legend>5. 這段減弱，代表什麼？</legend>'+
   radio("flow-interpretation","deleted","它已經消失，不能通行",s.interpretation==="deleted")+
   radio("flow-interpretation","retained","它仍留在網路裡，只是變弱",s.interpretation==="retained")+
   (s.interpretation==="deleted"?'<p class="gentle-hint">看看 D 和灰色底線：本模型保留最小強度，沒有刪除這段連接。</p>':"")+'</fieldset>':"");
}
export function flowMetrics(s){
 const now=dynamicsFrame(s),change=edgeChange(s,s.selected),zero=s.history[0];
 const low=ids.filter(id=>Math.abs(now.flows[id])<FLOW_RULE.lowFlow);
 const prediction=s.prediction?edgeChange(s,s.prediction):null;
 const label=delta=>delta>0.03?"增強":delta< -0.03?"減弱":"大致不變";
 return '<div class="metric-row"><div><small>目前查看</small><strong>'+s.selected+'</strong></div><div><small>連接強度 D</small><strong>'+number(change.after,2)+'</strong></div><div><small>流量 |Q|</small><strong>'+number(change.flow,2)+'</strong></div></div>'+
  '<p class="result-note">'+(s.history.length?s.selected+' 相較改變前'+label(change.delta)+'；'+(Math.abs(change.delta)>0.03?'D 的改變為 '+number(change.delta,2)+'。':'D 幾乎沒有改變。'):'還未改變需求。先看一眼起點，再留下預測。')+'</p>'+
  '<div class="comparison flow-comparison"><table><caption>'+s.selected+'：流量與連接強度分開看</caption><thead><tr><th>記錄</th><th>流量 |Q|</th><th>強度 D</th></tr></thead><tbody>'+
  [["改變前",s.before],...(zero?[["剛改變 · 第 0 輪",zero],["目前 · 第 "+s.cursor+" 輪",now]]:[])].map(([title,frame])=>'<tr><th scope="row">'+title+'</th><td>'+number(Math.abs(frame.flows[s.selected]),2)+'</td><td>'+number(frame.strengths[s.selected],2)+'</td></tr>').join("")+
  '</tbody></table></div>'+
  (prediction&&s.history.length?'<p class="prediction-note">我原本猜 '+s.prediction+' 會'+(s.kind==="005"?'增強':'減弱')+'；這一輪實際'+label(prediction.delta)+'。預測保留，不會扣分。</p>':"")+
  (s.kind==="006"?'<p class="result-note">低流量留存（|Q| &lt; 0.6）：'+(low.length?low.join("、")+'，共 '+low.length+' 段。':'本輪沒有。')+'所有 4 段仍存在；低流量不等於備路有用，還要另做斷路測試。</p>':"")+
  '<details class="flow-rule"><summary>這張桌子的計算規則</summary><p>固定 4 個節點、4 段連接；食物量以「需求」教學化表示，並非生物實驗。流量 Q 由節點收支平衡與導通能力 D／長度求出。每輪 D 向 0.18 + 0.3|Q| 移動四分之一，再重算流量。</p><p>D 是連接強度，不是細胞管徑。最小 D = 0.18 是遊戲設定，因此本模型不會自動刪線，也不能證明任何城市道路應被撤除。</p></details>';
}
export function networkCardRecord(id,e){
 if(id==="004")return '我比較同一組資源：總長度 '+e.beforeTotal+' → '+e.total+'；S 到 B '+e.beforeSB+' → '+e.distanceSB+'；B 到 C '+e.beforeBC+' → '+e.distanceBC+'。共享一段路，不保證每條旅程都變短。';
 if(id==="005")return '我預測 '+ids[e.prediction]+' 會增強，將 '+(e.target===0?'B':'C')+' 的需求提高。共同通道 SJ 的流量先由 '+number(e.flowBefore,2)+' 變為 '+number(e.flowChanged,2)+'；經 '+e.rounds+' 輪，強度 D 由 '+number(e.strengthBefore,2)+' 變為 '+number(e.strengthAfter,2)+'。';
 return '我原本猜 '+ids[e.prediction]+' 會減弱。需求交換後第 '+e.rounds+' 輪，我查看 '+ids[e.edge]+'：D 由 '+number(e.strengthBefore,2)+' 降為 '+number(e.strengthAfter,2)+'，流量為 '+number(e.flow,2)+'，但連接仍存在。這一輪低流量留存有 '+e.lowCount+' 段；不能由此判定備路是否有效。';
}
