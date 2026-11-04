// Рекомендации, лига, таймер и контент по компонентам Figma:
// [odds] Recomended Odds, [text] Soccer league, [text] Timer, [text] Bullet points.

import { BONUS_ITEMS, CONTENT_ITEMS, STEP_ITEMS, parseItems, type Item } from '@/model/items';
import { clientPreset } from '@/model/presets';
import type { Block, BlockData, EmailDoc } from '@/model/types';
import { renderCtaButton } from './elements';
import { isLightBg } from './hero';

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
/** Текст с выделением: /так/ — жирно и цветом акцента. Слеши без пробелов внутри у краёв, «EUR / USD» не трогаем. */
export const withAccent = (s: unknown) => esc(s).replace(/\/(?=\S)([^/\n]*?\S)\//g, '<b class="hl">$1</b>');
const split = (s: unknown) => String(s ?? '').split('/').map((x) => x.trim());
const brand = (s: unknown, doc: EmailDoc) => esc(String(s ?? '').replace(/\{\{brand\}\}/g, clientPreset(doc.client).name));

/** Кнопка внутри блока — любой из стилей «Кнопки» (поле btn), по умолчанию — заданный вариантом. */
const innerBtn = (d: BlockData, def: number, small = false) =>
  renderCtaButton(Number(d.btn ?? def), String(d.cta ?? ''), String(d.link ?? ''), small, !!d.caps, true);

export function renderRecodds(b: Block, doc: EmailDoc) {
  const d = b.data;
  // два вида текста: «ставка + крупный кэф» и «ставка + с коэффициентом X + подпись»
  const inline = [3, 5, 6].includes(b.v);
  const body = inline
    ? `<p class="pk">${esc(d.pick)}</p><p class="cf">с коэффициентом <span>${esc(d.coef)}</span></p>${b.v !== 5 && d.suffix ? `<p class="pk">${brand(d.suffix, doc)}</p>` : ''}`
    : `<p class="pk">${esc(d.pick)}</p><p class="big">${esc(d.coef)}</p>`;
  const card = `<div class="e-rc r${b.v} e-frame">${body}</div>`;
  // «Уголки»: треугольники акцента выглядывают из-под карточки по диагонали
  return `<div class="e-pad">${b.v === 6 ? `<div class="rc-corners">${card}</div>` : card}</div>`;
}

export function renderLeague(b: Block, doc: EmailDoc) {
  const d = b.data;
  const logo = isLightBg(doc) && d.leagueLogoLight ? d.leagueLogoLight : d.leagueLogo;
  const pic = logo ? `<img src="${esc(logo)}" alt="${esc(d.league)}">` : `<span class="txt">${esc(d.league)}</span>`;
  if (b.v === 1) {
    return `<div class="e-pad"><div class="e-lgb l1">
      <div class="top"><i class="ray l"></i><span class="pic">${pic}</span><i class="ray r"></i></div>
      <div class="tt">${esc(d.title).replace(/\n/g, '<br>')}</div>
      <p>${esc(d.text)}</p>${innerBtn(d, 3)}</div></div>`;
  }
  return `<div class="e-pad"><div class="e-lgb l0 e-frame">
    <div class="head"><span class="pic">${pic}</span><div><div class="tt">${esc(d.date)}<br>${esc(d.title)}</div><div class="sub">${esc(d.sub)}</div></div></div>
    <p>${esc(d.text)}</p>${innerBtn(d, 13)}</div></div>`;
}

export function renderTimer(b: Block) {
  const d = b.data;
  const vals = split(d.values);
  const labels = split(d.labels);
  const cells = vals.map((v, i) => ({ v, l: labels[i] ?? '' }));
  const title = d.title ? `<div class="tt">${esc(d.title)}</div>` : '';
  let row = '';
  switch (b.v) {
    case 2:
      row = `<div class="row board">${cells.map((c, i) => `${i ? '<b class="colon">:</b>' : ''}<span class="cell"><b>${esc(c.v)}</b><small>${esc(c.l)}</small></span>`).join('')}</div>`;
      break;
    case 3:
      row = `<div class="row line">${cells.map((c) => `<span><b>${esc(c.v)}</b> ${esc(c.l).toLowerCase()}</span>`).join('')}</div>`;
      break;
    default:
      row = `<div class="row">${cells.map((c) => `<span class="cell e-frame"><b>${esc(c.v)}</b><small>${esc(c.l)}</small></span>`).join('')}</div>`;
  }
  return `<div class="e-pad"><div class="e-tm2 t${b.v}">${title}${row}</div></div>`;
}

/** Картинка или заглушка «загрузите картинку» (в Figma на этих местах тоже заглушки). */
const imgOr = (url: unknown, cls: string, alt: unknown = '') => url
  ? `<img class="${cls}" src="${esc(url)}" alt="${esc(alt)}">`
  : `<span class="${cls} e-ph"></span>`;
// у старых черновиков картинки пунктов лежали отдельно: pic1…pic4
const withPics = (d: BlockData, xs: Item[]): Item[] => xs.map((it, i) => ({ ...it, image: it.image || String(d[`pic${i + 1}`] ?? '') }));

export function renderContent(b: Block) {
  const d = b.data;
  const items = withPics(d, parseItems(d.items, CONTENT_ITEMS));
  switch (b.v) {
    case 0:
    case 1:
      return `<div class="e-pad"><div class="e-ct cols c${b.v}">${items.map((it) =>
        `<div class="it">${imgOr(it.image, 'pic', it.title)}<b>${esc(it.title)}</b><span>${esc(it.text)}</span></div>`).join('')}</div></div>`;
    case 2:
      return `<div class="e-pad"><div class="e-ct rows c2">${items.map((it) =>
        `<div class="it">${imgOr(it.image, 'pic', it.title)}<div><b>${esc(it.title)}</b><span>${esc(it.text)}</span></div></div>`).join('')}</div></div>`;
    case 3:
      return `<div class="e-pad"><div class="e-ct rows c3">${withPics(d, parseItems(d.steps, STEP_ITEMS)).map((it) =>
        `<div class="it">${imgOr(it.image, 'pic')}<span>${withAccent(it.text)}</span></div>`).join('')}</div></div>`;
    case 8:
      // без картинки карточка просто без неё — заглушка тут только мешает
      return `<div class="e-pad"><div class="e-ct c8${d.image ? '' : ' noimg'}"><div class="card e-frame">${d.image ? `<img class="pic" src="${esc(d.image)}" alt="${esc(d.alt)}">` : ''}
        <b class="t">${esc(d.title)}</b><b class="big">${esc(d.big)}</b><span>${esc(d.sub)}</span></div></div></div>`;
    case 10:
      return `<div class="e-pad"><div class="e-ct c10">${parseItems(d.cards, BONUS_ITEMS).map((c) =>
        `<div class="bc e-frame"><b class="t">${esc(c.title)}</b><b class="big">${esc(c.big)}</b><span class="s">${esc(c.sub)}</span><p>${esc(c.text)}</p></div>`).join('')}</div></div>`;
    case 9:
      return `<div class="e-pad"><div class="e-ct c9">${imgOr(d.image, 'hero', d.alt)}
        <b class="t">${esc(d.title)}</b><p>${esc(d.text)}</p>${innerBtn(d, 13)}</div></div>`;
    default: {
      // 4–7: картинка слева/справа, с кнопкой или без
      const right = b.v === 5 || b.v === 7;
      const withCta = b.v >= 6;
      const text = `<div class="tx"><b class="t">${esc(d.title)}</b><span class="s">${esc(d.sub)}</span><p>${esc(d.text)}</p>${withCta ? innerBtn(d, 13, true) : ''}</div>`;
      const img = imgOr(d.image, `side ${withCta ? 'lg' : ''}`, d.alt);
      return `<div class="e-pad"><div class="e-ct mirror e-frame">${right ? text + img : img + text}</div></div>`;
    }
  }
}
