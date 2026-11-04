// Hero по компонентам Figma ([hero] Top Banner): картинка с игроками, поверх неё хедер
// (лого клиента, дата, лига), гербы команд заходят на нижний край картинки или стоят строкой с VS.

import { ZONE_KINDS, zonesOf } from '@/model/heroZones';
import { clientLogo, clientPreset, clientSite } from '@/model/presets';
import type { Block, BlockData, EmailDoc } from '@/model/types';
import { hexToRgb } from './theme';

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const str = (d: BlockData, k: string) => String(d[k] ?? '');
const initials = (name: string) => name.split(/[\s-]+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 3).toUpperCase();

export const isLightBg = (doc: EmailDoc) => {
  const [r, g, b] = hexToRgb(doc.theme.bg);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
};

// иконка календаря из компонента даты (var 4); цвет — акцент письма
const CALENDAR = `<svg width="18" height="20" viewBox="0 0 17.6536 19.6151" fill="currentColor" aria-hidden="true"><path d="M15.6921 19.6151H1.96151C0.8782 19.6151 0 18.7369 0 17.6536V3.92303C0 2.83971 0.8782 1.96151 1.96151 1.96151H3.92303V0.980757C3.92303 0.43909 4.36212 0 4.90379 0C5.44545 0 5.88454 0.43909 5.88454 0.980757V1.96151H11.7691V0.980757C11.7691 0.43909 12.2082 0 12.7498 0C13.2915 0 13.7306 0.43909 13.7306 0.980757V1.96151H15.6921C16.7754 1.96151 17.6536 2.83971 17.6536 3.92303V17.6536C17.6536 18.7369 16.7754 19.6151 15.6921 19.6151ZM1.96151 7.84606V17.6536H15.6921V7.84606H1.96151ZM1.96151 3.92303V5.88454H15.6921V3.92303H1.96151ZM13.7306 15.6921H11.7691V13.7306H13.7306V15.6921ZM9.80757 15.6921H7.84606V13.7306H9.80757V15.6921ZM5.88454 15.6921H3.92303V13.7306H5.88454V15.6921ZM13.7306 11.7691H11.7691V9.80757H13.7306V11.7691ZM9.80757 11.7691H7.84606V9.80757H9.80757V11.7691ZM5.88454 11.7691H3.92303V9.80757H5.88454V11.7691Z"/></svg>`;

/** Дата в одном из шести стилей компонента [text] date. */
export function renderDate(d: BlockData) {
  const date = esc(d.date);
  switch (Number(d.dateStyle)) {
    case 1: return `<span class="e-dt d1"><b>${date}</b><i></i><b class="y">${esc(d.year)}</b></span>`;
    case 2: return `<span class="e-dt d2"><b>${date}</b></span>`;
    case 3: return `<span class="e-dt d3"><span class="r">${CALENDAR}<b>${date}</b></span><i></i><b class="t">${esc(d.time)}</b></span>`;
    case 4: return `<span class="e-dt d4"><b>${date}</b></span>`;
    case 5: return `<span class="e-dt d5"><b>${date}</b></span>`;
    default: return `<span class="e-dt d0"><b>${date}</b></span>`;
  }
}

function leagueHtml(d: BlockData, doc: EmailDoc) {
  const logo = isLightBg(doc) && d.leagueLogoLight ? str(d, 'leagueLogoLight') : str(d, 'leagueLogo');
  return logo
    ? `<span class="e-lg" data-plan-zone=""><img src="${esc(logo)}" alt="${esc(d.league)}"></span>`
    : `<span class="e-lg txt" data-plan-zone="">${esc(d.league)}</span>`;
}

// логотип всегда ссылка: своя или на сайт клиента; в письме для рассылки лого и лига — зоны клика на картинке hero
const logoHtml = (doc: EmailDoc, d: BlockData) => {
  const href = esc(d.logoLink || clientSite(doc.client));
  return `<a class="e-brand" href="${href}" data-plan-zone="${href}"><img src="${esc(clientLogo(doc.client, isLightBg(doc)))}" alt="${esc(clientPreset(doc.client).name)}"></a>`;
};

/** Хедер: в «3 элементах» дата строго по центру, лого и лига прижаты к краям. */
export function headerRow(v: number, d: BlockData, doc: EmailDoc) {
  const logo = logoHtml(doc, d);
  const lg = leagueHtml(d, doc);
  const date = renderDate(d);
  switch (v) {
    case 1: return `<div class="e-head g3">${logo}<span></span><span class="end">${date}</span></div>`;
    case 2: return `<div class="e-head g3">${logo}</div>`;
    case 3: return `<div class="e-head g3">${logo}<span></span><span class="end">${lg}</span></div>`;
    case 4: return `<div class="e-head one">${logo}</div>`;
    case 5: return `<div class="e-head col">${logo}${date}${lg}</div>`;
    case 6: return `<div class="e-head g3">${logo}<span></span><span class="end">${lg}</span></div><div class="e-head-date">${date}</div>`;
    case 7: return '';
    default: return `<div class="e-head g3">${logo}<span class="mid">${date}</span><span class="end">${lg}</span></div>`;
  }
}

const crest = (name: string, url: string, w: number, h: number) =>
  `<span class="e-cr" style="width:${w}px;height:${h}px">${url ? `<img src="${esc(url)}" alt="${esc(name)}">` : `<span class="ph">${esc(initials(name))}</span>`}</span>`;

/** Команды относительно картинки: 0 — гербы под картинкой, 1 — крупные гербы, 2 — строкой с VS. */
export function heroTeams(b: Block) {
  const d = b.data;
  const t1 = str(d, 'team1'), t2 = str(d, 'team2');
  const l1 = str(d, 'team1Logo'), l2 = str(d, 'team2Logo');
  if (b.v === 2) {
    return `<div class="e-tm vs">${crest(t1, l1, 114, 80)}
      <div class="e-tm-names">${esc(t1)}<br><span class="e-vs">${esc(d.vs)}</span> ${esc(t2)}</div>${crest(t2, l2, 114, 80)}</div>`;
  }
  const big = b.v === 1;
  const [w, h] = big ? [198, 140] : [170, 120];
  const col = (n: string, l: string) => `<div class="e-tm-col">${crest(n, l, w, h)}<div class="e-tm-name">${esc(n)}</div></div>`;
  return `<div class="e-tm under ${big ? 'big' : ''}">${col(t1, l1)}${col(t2, l2)}</div>`;
}

/**
 * Зоны клика поверх картинки «без хедера»: лого и лига нарисованы на ней самой. В превью невидимы
 * (рамки рисует редактор), в письме — ссылки на картинке hero: лого — своя ссылка или сайт, лига — заглушка.
 */
function zonesHtml(d: BlockData, doc: EmailDoc) {
  const z = zonesOf(d);
  return ZONE_KINDS.filter((k) => z[k]).map((k) => {
    const [x, y, w, h] = z[k]!;
    const href = k === 'logo' ? esc(d.logoLink || clientSite(doc.client)) : '';
    return `<i class="e-zone" data-zone="${k}" data-plan-zone="${href}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"></i>`;
  }).join('');
}

export function renderHero(b: Block, doc: EmailDoc) {
  const d = b.data;
  const head = headerRow(Number(d.hv), d, doc);
  const teams = d.teamsOn ? heroTeams(b) : '';
  // без картинки hero = хедер (+ команды) в потоке письма
  if (!d.imageOn) {
    return `<div class="e-hero flow" data-plan="hero">${head ? `<div class="e-hero-head">${head}</div>` : ''}${teams}</div>`;
  }
  // картинка задаёт высоту hero (ширина всегда 600)
  const pic = d.image
    ? `<img class="e-hero-pic" src="${esc(d.image)}" alt="${esc(d.alt)}" width="600">`
    : `<div class="e-hero-pic empty"><span>Картинка hero · 600×610<br>загружает дизайнер</span></div>`;
  const overlay = head ? `<div class="e-hero-head">${head}</div>` : zonesHtml(d, doc);
  return `<div class="e-hero ${d.teamsOn ? `t${b.v}` : ''}" data-plan="hero"><div class="e-hero-frame">${pic}${overlay}</div>${teams}</div>`;
}
