import { ILLUSTRATIONS } from '../content/illustrations.js';
import { getCard, LESSONS } from '../content/catalog.js';

// All labels come from the authored catalogue, not from learner input.
export function illustration(id, { full = false, decorative = false } = {}) {
  const art = ILLUSTRATIONS[id];
  if (!art) return '';
  return `<img class="atlas-illustration" src="${full ? art.full : art.thumbnail}" width="${full ? 768 : 384}" height="${full ? 768 : 384}" alt="${decorative ? '' : art.alt}" loading="${full ? 'eager' : 'lazy'}" decoding="async">`;
}

export function discoveryFront(id) {
  const card = getCard(id), lesson = LESSONS[id];
  return `<article class="discovery-card illustrated-card">
    <span class="card-serial">BIOURBAN ATLAS <span>NO. ${id}</span></span>
    <h2 id="card-dialog-title">${card.name}</h2>
    <p class="card-english">${card.english}</p>
    <div class="discovery-art">${illustration(id, { full: true })}</div>
    <p class="card-topic">${card.topic}</p>
    <p class="finding">${lesson.finding}</p>
    <small>概念插畫 · 你的試驗結果另記於卡背</small>
  </article>`;
}
