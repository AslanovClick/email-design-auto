// Коэффициенты, кнопки, разделители и текстовки по компонентам Figma:
// [odds] Match Odds, [cta_button] Button, [block] Separate, [text] Body Text.
// Все цвета — из стиля макета (акцент, плашки, текст), чтобы блоки подстраивались под письмо.

import type { Block } from '@/model/types';

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const split = (s: unknown) => String(s ?? '').split('/').map((x) => x.trim());

// иконка из стиля кэфов «С иконкой» ([block] Separator 1), цвет — акцент
const ODDS_ICON = `<svg width="46" height="50" viewBox="0 0 68 74" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M23.47 1.01778C21.6244 1.01778 20.1148 2.52778 20.1148 4.37251V37.828L26.8252 44.5354V4.37147C26.8252 2.52673 25.3156 1.01674 23.47 1.01674V1.01778Z"/><path fill-rule="evenodd" d="M45.3469 1.01778C43.5013 1.01778 41.9916 2.52778 41.9916 4.37251V43.7199L48.7021 37.0125V4.37147C48.7021 2.52673 47.1925 1.01674 45.3469 1.01674V1.01778Z"/><path fill-rule="evenodd" d="M34.5675 1.01778C32.722 1.01778 31.2113 2.52778 31.2113 4.37251V48.9204L34.001 51.7078L37.9228 47.7868V4.37147C37.9228 2.52673 36.4131 1.01674 34.5675 1.01674V1.01778Z"/><path d="M24.1356 0H33.5618C34.1168 0 34.5676 0.450495 34.5676 1.00423V1.18151C34.5676 1.73628 34.1168 2.18573 33.5629 2.18573H24.1367C23.5816 2.18573 23.132 1.73524 23.132 1.18151V1.00423C23.1309 0.450495 23.5816 0 24.1356 0Z"/><path d="M44.9995 0H35.5722C35.0174 0 34.5676 0.449608 34.5676 1.00423V1.18255C34.5676 1.73717 35.0174 2.18678 35.5722 2.18678H44.9995C45.5544 2.18678 46.0042 1.73717 46.0042 1.18255V1.00423C46.0042 0.449608 45.5544 0 44.9995 0Z"/><path fill-rule="evenodd" d="M39.2227 57.2597C39.9384 57.9751 41.108 57.9751 41.8237 57.2597L44.6688 54.416L64.096 73.8331C64.3182 74.0553 64.6813 74.0553 64.9035 73.8331L67.8341 70.9039C68.0563 70.6818 68.0563 70.3189 67.8341 70.0968L48.4079 50.6786L51.253 47.8348C51.9687 47.1194 51.9687 45.9505 51.253 45.2351L12.5655 6.56867C11.8498 5.8533 10.6802 5.8533 9.96453 6.56867L0.536255 15.9915C-0.179447 16.7069 -0.179447 17.8759 0.536255 18.5912L39.2217 57.2587L39.2227 57.2597Z"/><path fill-rule="evenodd" d="M3.09729 73.801C3.31951 74.0231 3.68258 74.0231 3.9048 73.801L23.332 54.3839L26.1771 57.2276C26.8928 57.943 28.0623 57.943 28.778 57.2276L67.4635 18.5601C68.1792 17.8448 68.1792 16.6758 67.4635 15.9604L58.0363 6.53653C57.3206 5.82116 56.151 5.82116 55.4353 6.53653L16.7488 45.2029C16.0331 45.9183 16.0331 47.0873 16.7488 47.8027L19.5939 50.6464L0.166667 70.0646C-0.0555556 70.2867 -0.0555556 70.6496 0.166667 70.8717L3.09729 73.801Z"/><path fill-rule="evenodd" d="M32.1116 72.4347C34.7345 73.1376 37.4095 72.2283 39.085 70.3147L27.133 67.1133C27.6275 69.6066 29.4888 71.7319 32.1116 72.4337V72.4347Z"/><path fill-rule="evenodd" d="M35.6797 59.1285C33.0569 58.4267 30.3818 59.3349 28.7063 61.2485L40.6573 64.4499C40.1638 61.9555 38.3015 59.8313 35.6787 59.1295L35.6797 59.1285Z"/><path fill-rule="evenodd" d="M27.2394 63.9984C27.0589 64.67 26.9859 65.3457 27.0068 66.0068L39.7486 69.4189C40.0981 68.8569 40.3714 68.2353 40.5519 67.5638C40.7324 66.8922 40.8054 66.2165 40.7846 65.5553L28.0428 62.1432C27.6933 62.7053 27.4199 63.3268 27.2394 63.9984Z"/></svg>`;

export function renderOdds(b: Block) {
  const [o1, ox, o2] = split(b.data.odds);
  const [l1, lx, l2] = split(b.data.labels || 'W1 / X / W2');
  const three = [[l1, o1], [lx, ox], [l2, o2]];
  const two = [[l1, o1], [l2, o2]];
  const cell = (cls: string, [l, v]: string[], valueFirst = false) => valueFirst
    ? `<span class="${cls}"><b>${esc(v)}</b><small>${esc(l)}</small></span>`
    : `<span class="${cls}"><small>${esc(l)}</small><b>${esc(v)}</b></span>`;
  const inline = ([l, v]: string[]) => `<span class="c"><small>${esc(l)}</small> <b>${esc(v)}</b></span>`;
  const bar = '<i class="sep"></i>';
  let inner = '';
  switch (b.v) {
    case 1: case 6: inner = three.map((c) => cell('col', c)).join(bar); break;
    case 2: inner = three.map((c) => cell('col', c)).join(''); break;
    case 3: inner = two.map((c) => cell('col', c)).join(''); break;
    case 4: case 7: inner = three.map(inline).join(bar); break;
    case 5: inner = three.map(inline).join(''); break;
    case 8: inner = two.map(inline).join(bar); break;
    case 9: inner = three.map((c) => cell('col', c, true)).join(''); break;
    case 10: inner = `${inline(two[0])}<span class="ico">${ODDS_ICON}</span>${inline(two[1])}`; break;
    case 11:
      inner = `<span class="row lbl">${three.map(([l]) => `<span>${esc(l)}</span>`).join('')}</span>`
        + `<span class="row num">${three.map(([, v]) => `<b>${esc(v)}</b>`).join('')}</span>`;
      break;
    default: inner = three.map(inline).join('');
  }
  const framed = [1, 4, 6, 7, 10, 11].includes(b.v);
  return `<div class="e-pad"><div class="e-od o${b.v} ${framed ? 'e-frame' : ''}">${inner}</div></div>`;
}

/**
 * Кнопка любого из 14 стилей — используется и отдельным блоком, и внутри других блоков.
 * Обводка блока ложится на кнопку только у самого блока «Кнопка» (inner = false).
 */
export function renderCtaButton(kind: number, text: string, link: string, small = false, caps = false, inner = false) {
  return `<a class="e-cta k${kind}${inner ? '' : ' e-frame'}${small ? ' sm' : ''}${caps ? ' caps' : ''}" href="${esc(link || '#')}"><span>${esc(text)}</span></a>`;
}

export function renderCta(b: Block) {
  return `<div class="e-pad c">${renderCtaButton(b.v, String(b.data.text ?? ''), String(b.data.link ?? ''), false, !!b.data.caps)}</div>`;
}

export function renderSeparator(b: Block) {
  const k = b.v;
  const dia = '<i class="dia"></i>';
  const inner = [
    '<i class="glow"></i>',
    '<i class="bar"></i>',
    `<i class="spike l"></i>${dia}<i class="spike r"></i>`,
    `<i class="tip l"></i><i class="ln"></i><i class="dia s"></i><i class="dia m"></i>${dia}<i class="dia m"></i><i class="dia s"></i><i class="ln"></i><i class="tip r"></i>`,
    '<i class="dot"></i>',
    `<i class="ln"></i>${dia}<i class="ln"></i>`,
    '<i class="hook l"></i><i class="bar"></i><i class="hook r"></i>',
  ][k] ?? '<i class="glow"></i>';
  return `<div class="e-sp s${k}">${inner}</div>`;
}

/** Абзацы хранятся одной строкой через пустую строку. */
export const paragraphs = (s: unknown) => String(s ?? '').split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);

export function renderText(b: Block) {
  const d = b.data;
  const titleOn = d.titleOn !== false;
  const paras = paragraphs(d.text).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
  let inner: string;
  switch (b.v) {
    case 3: inner = `<p class="note"><b>${esc(d.note)}</b> ${paragraphs(d.text).map(esc).join('<br><br>')}</p>`; break;
    case 4: inner = `<div class="kick">${esc(d.kicker)}</div><div class="offer">${esc(d.offer)}</div>`; break;
    default: inner = (titleOn && d.title ? `<div class="tt">${esc(d.title)}</div>` : '') + paras;
  }
  return `<div class="e-pad"><div class="e-tx x${b.v} ${b.v === 2 ? 'e-frame' : ''}">${inner}</div></div>`;
}
