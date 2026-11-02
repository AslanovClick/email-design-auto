// Факты игр, экспресс и иннер-блок по компонентам Figma:
// [text] Facts, [text] Multibet, [block] Inner.

import { FACT_ROWS, factsSep } from '@/model/facts';
import { parseItems, type Item } from '@/model/items';
import type { Block } from '@/model/types';
import { paragraphs, renderSeparator } from './elements';

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const split = (s: unknown) => String(s ?? '').split('/').map((x) => x.trim());
const br = (s: unknown) => esc(s).replace(/\n/g, '<br>');

// --- Факты игр

const num = (v: string, sub: string) => `<span class="n"><b>${esc(v)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span>`;
// победы / поражения / ничьи — цифры с иконками, как в Figma
const ICONS = ['<i class="ic w">✓</i>', '<i class="ic l">✕</i>', '<i class="ic d"></i>'];
const form = (s: string) => `<span class="fm">${split(s).slice(0, 3).map((v, i) => `<span><b>${esc(v)}</b>${ICONS[i]}</span>`).join('')}</span>`;

function factRow(it: Item, n: number) {
  switch (it.t ?? 'stat') {
    case 'form':
      return `${form(it.l)}<span class="lb">${esc(it.label)}${it.sub ? `<small>${esc(it.sub)}</small>` : ''}</span>${form(it.r)}`;
    case 'h2h': {
      const labels = split(it.labels);
      return `${it.title ? `<div class="h2t">${esc(it.title)}</div>` : ''}<div class="h2">${split(it.vals).map((v, i) =>
        `<span><b>${esc(v)}</b><small>${esc(labels[i] ?? '')}</small></span>`).join('')}</div>`;
    }
    case 'text':
      return `<p>${br(it.text)}</p>`;
    case 'fact':
      return `<p>${n}. ${it.lead ? `<b>${esc(it.lead)}</b> ` : ''}${br(it.text)}</p>`;
    default:
      return `${num(it.l, it.ls)}<span class="lb">${esc(it.label)}</span>${num(it.r, it.rs)}`;
  }
}

/** Разделитель между строками — любой из стилей блока «Разделитель», где он предусмотрен вариантом. */
function sepHtml(v: number, own: unknown) {
  const k = factsSep(v, own);
  return k == null ? '' : renderSeparator({ v: k } as Block);
}

export function renderFacts(b: Block) {
  const d = b.data;
  const v = b.v;
  const rows = parseItems(d.rows ?? d.items, FACT_ROWS);
  // каждая строка в своей рамке / все строки в одной рамке
  const boxed = [2, 4, 5, 7].includes(v);
  const framed = v === 3 || v === 6;
  let n = 0;
  const body = rows.map((it) => {
    if (it.t === 'fact') n++;
    return `<div class="row r-${it.t ?? 'stat'}${boxed ? ' e-frame' : ''}">${factRow(it, n)}</div>`;
  }).join(sepHtml(v, d.sep));
  const title = d.title ? `<div class="tt">${br(d.title)}</div>` : '';
  const inner = framed ? `<div class="frame e-frame">${v === 6 ? title : ''}${body}</div>` : body;
  return `<div class="e-pad"><div class="e-fx f${v}">${v === 6 ? '' : title}${inner}</div></div>`;
}

// --- Экспресс: виды спорта, у каждого заголовок и события по строке

export function renderMultibet(b: Block) {
  const d = b.data;
  const groups = paragraphs(d.sports).map((g) => {
    const [head, ...ls] = g.split('\n');
    return `<div class="sp"><b>${esc(head)}</b>${ls.map((l) => `<span>${esc(l)}</span>`).join('')}</div>`;
  }).join('');
  if (b.v === 1) {
    const pic = d.image ? `<img class="pic" src="${esc(d.image)}" alt="${esc(d.alt)}">` : '<span class="pic e-ph"></span>';
    return `<div class="e-pad"><div class="e-mb m1 e-frame">${pic}<div class="ls">${groups}</div></div></div>`;
  }
  return `<div class="e-pad"><div class="e-mb m0 e-frame">${groups}</div></div>`;
}

// --- Иннер: картинка (дата уже на ней) и команды — строкой под ней, гербами на ней или в рамке

export function renderInner(b: Block) {
  const d = b.data;
  const teams = d.teamsOn !== false;
  const pic = d.image
    ? `<img class="ban" src="${esc(d.image)}" alt="${esc(d.alt)}">`
    : '<span class="ban e-ph"><small>Картинка с датой · 568×170</small></span>';
  const crest = (k: 'team1' | 'team2') => d[`${k}Logo`]
    ? `<img class="crest" src="${esc(d[`${k}Logo`])}" alt="${esc(d[k])}">`
    : '<span class="crest"></span>';
  const vs = `<span class="vs">${esc(d.vs)}</span>`;
  const t1 = esc(d.team1);
  const t2 = esc(d.team2);
  switch (b.v) {
    case 2:
      return `<div class="e-pad"><div class="e-in i2"><div class="ban-w">${pic}${teams ? `<div class="in-ov">${crest('team1')}${crest('team2')}</div>` : ''}</div>
        ${teams ? `<div class="nms"><span>${t1}</span><span>${t2}</span></div>` : ''}</div></div>`;
    case 3:
      return `<div class="e-pad"><div class="e-in i3"><div class="ban-w">${pic}
        ${teams ? `<div class="in-ov">${crest('team1')}<div class="nm">${t1} ${vs}<br>${t2}</div>${crest('team2')}</div>` : ''}</div></div></div>`;
    default: {
      const names = b.v === 1 ? `${t1} ${vs}<br>${t2}` : `${t1} ${vs} ${t2}`;
      return `<div class="e-pad"><div class="e-in i${b.v}"><div class="ban-w">${pic}</div>
        ${teams ? `<div class="tm">${crest('team1')}<div class="nm">${names}</div>${crest('team2')}</div>` : ''}</div></div>`;
    }
  }
}
