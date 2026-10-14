import { chapterOneReviewView } from "./onboarding-view.js";
import { getCard } from "../content/catalog.js";
import { esc } from "./art.js";
const futureUse={
  "008":"到「共議」時，可用備路卡為兩份方案安排同場斷橋測試。",
  "012":"到「共議」時，可用看見卡查看河灣居民的實際路線。",
  "013":"到「共議」時，可用取捨卡攤開兩份方案的成本帳。",
};
export function rewardView(m) {
  if(!m)return "";
  return '<section class="discovery-receipt" aria-label="本次收集結果"><span class="receipt-mark" aria-hidden="true">'+(m.first?'✳':'↻')+'</span><div><strong>'+
    (m.first?'「'+esc(m.name)+'」加入圖鑑':'已更新「'+esc(m.name)+'」的發現記錄')+'</strong><p>'+
    (m.first?esc(m.place)+' · '+m.collected+' / 3 格已點亮'+(m.complete?'，這一章的三張卡已齊。':'。'):'沒有新增重複卡；收藏數仍為 '+m.total+' / 15。')+
    '</p>'+(futureUse[m.id]?'<p>'+futureUse[m.id]+'</p>':'')+(m.first?'<a id="reward-map" href="#map">看看剛點亮的位置 →</a>':'')+'</div></section>'+chapterOneReviewView(m.review,false);
}
export function mapRewardView(progress,m) {
  if(!m?.first||!getCard(m.id)||!progress.has(m.id))return "";
  return '<aside class="map-reward" role="status"><strong>地圖多亮了一格：'+esc(m.name)+'</strong><span>'+esc(m.place)+' · '+m.collected+' / 3'+
    (m.complete?'，本章已完成。':'；其他位置還等著你的發現。')+'</span><a href="#album">翻閱這次的發現 →</a></aside>';
}
