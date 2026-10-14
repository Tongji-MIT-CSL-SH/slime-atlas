// Static concept illustrations. Never used to compute or award a discovery.
const descriptions = [
  '培養皿中的金色分支連回同一個原質團，旁邊是一粒燕麥。',
  '前沿附近的燕麥與遠處的燕麥，提示局部感知的範圍。',
  '向未知延伸的分岔、燕麥線索與有限的探索籌碼。',
  '三處燕麥透過分岔連接，部分路段由多條旅程共享。',
  '兩幅連接草圖比較回饋前後的分支粗細。',
  '疊放的描圖紙保留舊連接與調整後的金色分支。',
  '連接繞過實體障礙，旁邊的斜線區域提示不同阻力。',
  '環路的一段中斷，另一側仍保留連續的繞行路線。',
  '三幅小圖呈現連接、中斷與重新接通的過程。',
  '觀察手帳把培養皿與河灣鎮放在一起，提出轉譯的問題。',
  '河灣住戶沿西岸走向北橋，再到東岸服務站。',
  '同一座小鎮的三組住戶，放大鏡提醒留意河灣居民。',
  '同一座小鎮的兩張方案圖，分別關注中心與西岸的路線。',
  '同一座小鎮的平日、北橋封閉與南側道路封閉三幅草圖。',
  '小鎮方案、三張知識卡與空白證據紙條，等待共同討論。',
];
export const ILLUSTRATIONS = Object.freeze(Object.fromEntries(descriptions.map((alt, index) => {
  const id = String(index + 1).padStart(3, '0');
  return [id, Object.freeze({
    id, alt, thumbnail: `assets/final/card-${id}-384.webp`,
    full: `assets/final/card-${id}-768.webp`, width: 768, height: 768,
  })];
})));
export const CHAPTER_ILLUSTRATIONS = Object.freeze(['001', '004', '008', '011', '015']);
