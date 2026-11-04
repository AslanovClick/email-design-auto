// === Генератор HTML письма v5 (n8n Code node) ===
// Вход: body вебхука. Плагин v5 присылает plan (planEmail в code.js) — раскладываем его по шаблонам
// ручной вёрстки: колонка 600 со строками-отступами, текст стилем на <td>, кнопки «подложка + <a>»,
// баннер «фон + зоны клика». Старые выгрузки без plan собирает прежний генератор (legacyGenerate ниже).
const body = $('Webhook').first().json.body;
if (!body.plan) return legacyGenerate();

const plan = body.plan;
const BASE = 'https://demo.promo/sv/public_html/email_images/';
// Картинки лежат прямо в email_images/ без подпапок (FTP сам папки не создаёт): имя письма — часть имени
// файла, «Папка/Фрейм» + «bg.png» → «Папка--Фрейм--bg.png». Тот же путь собирает узел upload img WinSCP.
const prefix = String(plan.folder || 'email').replace(/\//g, '--');
const url = file => BASE + encodeURIComponent(prefix + '--' + file);   // без ?v= — версию у ссылок не ставим (пользователь)

// ── правила брендов (поверх общих); бренд — по названию файла Figma («22Bet…», «_main_22Bet…»; 22Bit — другой бренд) ──
// 22bet: кнопки — шрифт 32px и отступ текста по бокам 20px; заголовки и текст — ровно 20px по бокам;
//        блок коэффициентов — отступ по бокам 8% ширины; слово «КОЕФ» («Коэф.») в текст не выводим
const BRAND_RULES = {
  '22bet': { btnFont: 32, btnPadX: 20, textSide: 20, oddsPad: 0.08, dropKoef: true }
};
const BRAND_KEY = (() => {
  const s = String(body.fileName || body.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  return Object.keys(BRAND_RULES).find(b => s.indexOf(b) !== -1) || '';
})();
const BR = BRAND_RULES[BRAND_KEY] || {};
const R = Math.round;
const TEXT_SIDE = 24;   // минимальный отступ заголовков и абзацев от краёв колонки письма (больший из макета остаётся)
const esc =s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const BG_FIT = 'background-size:100% 100% !important;background-repeat:no-repeat !important;background-position:left top !important;';
// секция выше своей картинки (наехавший заголовок ниже баннера): картинка по ширине сверху, без растягивания
const BG_TOP = 'background-size:100% auto !important;background-repeat:no-repeat !important;background-position:center top !important;';
// фон всего письма (bg.png): cover — если в почтовике письмо выйдет длиннее макета, фон не растягивается, а заполняет
const BG_COVER = 'background-size:cover !important;background-repeat:no-repeat !important;background-position:left top !important;';

// ── мини-DOM: элементы собираются деревом и печатаются с отступами ──
const BLOCK = { html: 1, head: 1, body: 1, table: 1, tr: 1, td: 1, style: 1 };
const VOID = { img: 1, br: 1, meta: 1 };
function h(tag, attrs, ...children) { return { tag, attrs: attrs || {}, children: children.flat().filter(c => c != null && c !== '') }; }
function attrsHtml(a) {
  return Object.keys(a).filter(k => a[k] != null && a[k] !== false && a[k] !== '').map(k => a[k] === true ? ` ${k}` : ` ${k}="${a[k]}"`).join('');
}
function isBlock(n) { return n && typeof n === 'object' && BLOCK[n.tag]; }
function inline(n) {
  if (typeof n === 'string') return n;
  if (VOID[n.tag]) return `<${n.tag}${attrsHtml(n.attrs)}>`;
  return `<${n.tag}${attrsHtml(n.attrs)}>${n.children.map(inline).join('')}</${n.tag}>`;
}
function print(n, depth) {
  const pad = '  '.repeat(depth);
  if (typeof n === 'string') return pad + n;
  if (!n.children.some(isBlock)) return pad + inline(n);
  return `${pad}<${n.tag}${attrsHtml(n.attrs)}>\n` + n.children.map(c => print(c, depth + 1)).join('\n') + `\n${pad}</${n.tag}>`;
}
// фиксированная ширина таблицы дублируется в min-width (как у верстальщика): иначе почтовик может её сжать
const table = (attrs, ...rows) => {
  if (attrs.style && !/min-width:/.test(attrs.style)) attrs.style = attrs.style.replace(/(^|;)width:(\d+)px;/, '$1width:$2px;min-width:$2px;');
  return h('table', Object.assign({ border: 0, cellpadding: 0, cellspacing: 0 }, attrs), ...rows);
};

// ── стили ──
function padCss(t, r, b, l) {
  [t, r, b, l] = [t, r, b, l].map(v => Math.max(0, R(v || 0)));
  if (!t && !r && !b && !l) return '';
  if (t && !r && !b && !l) return `padding-top:${t}px;`;
  const px = v => (v ? v + 'px' : '0');
  if (r === l) return b ? `padding:${px(t)} ${px(r)} ${px(b)};` : `padding:${px(t)} ${px(r)} 0;`;
  return `padding:${px(t)} ${px(r)} ${px(b)} ${px(l)};`;
}
// порядок свойств — как в ручной вёрстке: color, font-family, font-weight, line-height, font-size, text-transform
function textCss(st) {
  return `color:${st.c};font-family:${st.ff};font-weight:${st.fw};line-height:${st.lh};font-size:${st.fs}px;`
    + (st.tt ? `text-transform:${st.tt};` : '') + (st.ls ? `letter-spacing:${st.ls};` : '') + (st.dec ? `text-decoration:${st.dec};` : '');
}
// текст ячейки, как у верстальщика: <td> — выравнивание и отступы, стиль — на <span>
// (display:block — высоту строки задаёт сам текст, а не шрифт ячейки по умолчанию)
function textEl(it) {
  return h('span', { style: textCss(it.st) + 'display:block;' }, textInner(it));
}
function diffCss(d, skip) {
  let s = '';
  if (d.c && !(skip && skip.c)) s += `color:${d.c};`;
  if (d.ff) s += `font-family:${d.ff};`;
  if (d.fs) s += `font-size:${d.fs}px;`;
  if (d.fw) s += `font-weight:${d.fw};`;
  if (d.lh) s += `line-height:${d.lh};`;
  if (d.tt) s += `text-transform:${d.tt};`;
  if (d.dec && !(skip && skip.dec)) s += `text-decoration:${d.dec};`;
  return s;
}
// бренд без слова «КОЕФ» (22bet): «КОЕФ 2.22», «Коэф.: 7.77» → «2.22», «7.77»; «коэффициент» не трогаем
const KOEF_RE = /(коэф|коеф|кэф)(?![а-яёa-z])\.?:?\s*/gi;
function textInner(it, noLinks) {
  const runs = BR.dropKoef ? it.runs.map(r => Object.assign({}, r, { t: r.t.replace(KOEF_RE, '') })).filter(r => r.t) : it.runs;
  return runs.map(r => {
    const t = esc(r.t).replace(/\r\n|\r|\n|\u2028/g, '<br>');
    if (r.ln && !noLinks) {
      // у ссылки цвет и подчёркивание всегда явно: почтовики иначе красят ссылки в синий
      const c = r.d.c || it.st.c, dec = r.d.dec || it.st.dec || 'none';
      return `<a href="${esc(r.ln)}" target="_blank" style="color:${c};text-decoration:${dec};${diffCss(r.d, { c: 1, dec: 1 })}">${t}</a>`;
    }
    const s = diffCss(r.d);
    return s ? `<span style="${s}">${t}</span>` : t;
  }).join('');
}
function borderCss(bd) {
  if (!bd) return '';
  const [t, r, b, l] = bd.w;
  if (t === r && r === b && b === l) return t ? `border:${t}px solid ${bd.c};` : '';
  return ['top', 'right', 'bottom', 'left'].map((s, i) => bd.w[i] ? `border-${s}:${bd.w[i]}px solid ${bd.c};` : '').join('');
}
function radiusCss(r) {
  if (Array.isArray(r)) return r.some(Boolean) ? `border-radius:${r.map(v => v + 'px').join(' ')};` : '';
  return r ? `border-radius:${r}px;` : '';
}

// ── размещение элемента в контейнере [cx, cx+cw] ──
// ca — выравнивание детей столбика в Figma (MIN/MAX): строки списка встают по одному краю, а не по центру каждая
function place(it, cx, cw, ca) {
  const pl = it.x - cx, pr = cx + cw - (it.x + it.w);
  let align = ca === 'MIN' ? 'left' : ca === 'MAX' ? 'right' : Math.abs(pl - pr) <= 3 ? 'center' : (pl < pr ? 'left' : 'right');
  // текст, который переносится по ширине блока (или многострочный с другим выравниванием) — ограничиваем ширину отступами
  if (it.k === 'text' && (it.wrap || (it.lines > 1 && it.ta !== align))) {
    const ta = it.ta === 'justify' ? 'left' : it.ta;
    // центрированный текст — отступы по бокам поровну (среднее из макета, ширина текста та же): слой в макете стоит
    // со сдвигом на пару пикселей, и выходило «padding:15px 14px 0 15px» / «0 0 0 3px» (карточки бонусов, test block 4/prod 13)
    if (ta === 'center') { const m = (pl + pr) / 2; return { align: ta, pl: m, pr: m }; }
    return { align: ta, pl, pr };
  }
  if (align === 'center') return { align, pl: 0, pr: 0 };
  return align === 'left' ? { align, pl, pr: 0 } : { align, pl: 0, pr };
}

// ── элементы ──
// inRow — картинка в ряду («1 2 3»: иконка + текст, форма команды) — обычный <img>.
// Картинка без ссылки отдельным блоком — фоном таблицы с пустой ячейкой высотой картинки, как у верстальщика:
// у <img> без ссылки Gmail показывает стрелку «скачать». Со ссылкой (логотип, сторы, таймер) — <a><img>.
let rowDepth = 0;   // >0 — рисуем содержимое ряда (в т.ч. вложенные столбики: «5» над иконкой в таблице статистики)
function imgEl(it, inRow) {
  if (it.content && it.content.length) return heroEl(it);   // картинка с элементами поверх → фон секции
  // в ряду <img> только у мелких картинок списков (до 120px); крупная (картинка слота 216px рядом с текстом) — фоном
  if (!it.ln && (!(inRow || rowDepth) || it.w > 120 || it.h > 120)) {
    const w = R(it.w);
    return table({ width: w, background: url(it.file), style: `width:${w}px;${BG_FIT}` },
      h('tr', {}, h('td', { style: `width:${w}px;padding-top:${R(it.h)}px;` })));
  }
  // явные размеры и min-width: иначе max-width:100% из <style> письма сжимает картинку по ширине, когда соседний
  // текст шире макета (иконка в капсуле «lera.vip@20bet.com» выходила сплющенной, test block 4/prod 6)
  const img = h('img',{ src: url(it.file), width: R(it.w), height: R(it.h), alt: esc(it.alt || ''), style: `display:block;border:0;width:${R(it.w)}px;min-width:${R(it.w)}px;height:${R(it.h)}px;` });
  return it.ln ? h('a', { href: esc(it.ln), target: '_blank', style: `display:block;width:${R(it.w)}px;` }, img) : img;
}
function lineEl(it) {
  const w = R(it.w), th = Math.max(1, R(it.h));
  return table({ width: w, style: `width:${w}px;` },
    h('tr', {}, h('td', { height: th, bgcolor: it.c, style: `height:${th}px;font-size:0;line-height:0;background-color:${it.c};` }, '&nbsp;')));
}
// зона клика на баннере, как у верстальщика: пустая ссылка ширины логотипа, высота — паддингами сверху и снизу
function zoneLink(p) {
  const hh = R(p.h), top = Math.floor(hh / 2);
  return h('a', { href: esc(p.ln), target: '_blank', style: `display:block;width:${R(p.w)}px;padding-top:${top}px;padding-bottom:${hh - top}px;` });
}
function heroEl(it) {
  // фон-картинка + строки поверх: зоны клика (прозрачные <a>) и элементы, сгруппированные по высоте —
  // зона и элемент на одной высоте (логотип слева, дата матча по центру) стоят в одной строке рядом
  const W = R(it.w);
  const parts = (it.zones || []).map(z => ({ k: 'zone', x: z.x, y: z.y, w: z.w, h: z.h, ln: z.ln })).concat(it.content || []);
  parts.sort((a, b) => a.y - b.y || a.x - b.x);
  const groups = [];
  parts.forEach(p => {
    const g = groups.find(g => p.y < g.bottom - 2 && p.y + p.h > g.top + 2 && g.items.every(o => p.x >= o.x + o.w - 2 || p.x + p.w <= o.x + 2));
    if (g) { g.items.push(p); g.top = Math.min(g.top, p.y); g.bottom = Math.max(g.bottom, p.y + p.h); }
    else groups.push({ items: [p], top: p.y, bottom: p.y + p.h });
  });
  const rows = [];
  let cur = it.y;
  groups.forEach(g => {
    if (g.items.length === 1 && g.items[0].k !== 'zone') {
      stackRows(g.items, it.x, it.w, cur, null, 0, TEXT_SIDE).forEach(tr => rows.push(tr));
    } else if (g.items.length === 1) {
      // один логотип в строке — одна ячейка: выравнивание и отступы на <td>, без пустых ячеек по бокам
      const p = g.items[0], pl = place(p, it.x, it.w);
      rows.push(h('tr', {}, h('td', { align: pl.align, valign: 'top', style: padCss(g.top - cur, pl.pr, 0, pl.pl) }, zoneLink(p))));
    } else {
      // ячейки по X; вертикальный сдвиг каждой — отступом от верха строки
      let x = it.x;
      const cells = [];
      g.items.sort((a, b) => a.x - b.x).forEach(p => {
        const gap = R(p.x - x);
        if (gap >= 1) cells.push(h('td', { width: gap, style: `width:${gap}px;` }));
        const pad = padCss(p.y - g.top, 0, 0, 0);
        if (p.k === 'zone') {
          cells.push(h('td', { width: R(p.w), valign: 'top', style: `width:${R(p.w)}px;${pad}` }, zoneLink(p)));
        } else {
          cells.push(h('td', { width: R(p.w), valign: 'top', align: p.k === 'text' ? (p.ta === 'justify' ? 'left' : p.ta) : null,
            style: `width:${R(p.w)}px;${pad}` }, inner(p)));
        }
        x = p.x + p.w;
      });
      const tail = R(it.x + it.w - x);
      if (tail >= 1) cells.push(h('td', { width: tail, style: `width:${tail}px;` }));
      rows.push(h('tr', {}, h('td', { style: padCss(g.top - cur, 0, 0, 0) }, table({ width: W, style: `width:${W}px;` }, h('tr', {}, cells)))));
    }
    cur = Math.max(cur, g.bottom);
  });
  const rest = R(it.y + it.h - cur);
  // остаток высоты баннера — паддингом пустой ячейки, как у верстальщика (<td style="padding-top:390px;"></td>):
  // height у пустой ячейки почтовики читают по-разному, padding — везде
  if (rest > 0 || !rows.length) rows.push(h('tr', {}, h('td', { style: `padding-top:${Math.max(rest, 1)}px;` })));
  return table({ width: W, background: url(it.file), style: `width:${W}px;${it.overflow ? BG_TOP : BG_FIT}` }, rows);
}

function btnEl(it) {
  const W = R(it.w);
  let t = it.text;
  const bw = it.border ? (it.border.w[1] + it.border.w[3]) : 0;
  let [pt, pb] = it.pad;
  const bt = it.border ? it.border.w[0] : 0, bb = it.border ? it.border.w[2] : 0;
  let px = 0;
  if (BR.btnFont) {
    // бренд: надпись кнопки — свой кегль (22bet 32px), высота кнопки как в макете — надпись по центру
    t = Object.assign({}, t, { st: Object.assign({}, t.st, { fs: BR.btnFont, lh: '1.2' }),
      runs: t.runs.map(r => Object.assign({}, r, { d: Object.assign({}, r.d, { fs: undefined, lh: undefined }) })) });
    pt = pb = Math.max(0, (it.h - BR.btnFont * 1.2) / 2);
  }
  if (BR.btnPadX) px = BR.btnPadX;   // отступ надписи от краёв кнопки (22bet 20px)
  const a = h('a', { href: esc(it.ln), target: '_blank',
    style: `display:block;width:${W - bw - 2 * px}px;${padCss(pt - bt, px, pb - bb, px)}${textCss(t.st)}text-decoration:none;text-align:center;` }, textInner(t, true));   // надпись без своих ссылок: ссылка в ссылке ломается
  const tAttrs = it.bg
    ? { width: W, background: url(it.bg), style: `width:${W}px;${BG_FIT}` }
    : { width: W, bgcolor: it.fill, style: `width:${W}px;background-color:${it.fill};${radiusCss(it.r)}${borderCss(it.border)}` };
  return table(tAttrs, h('tr', {}, h('td', { align: 'center', valign: 'middle' }, a)));
}
function boxEl(it) {
  const W = R(it.w);
  const bd = it.border ? it.border.w : [0, 0, 0, 0];
  const ix = it.x + bd[3], iw = it.w - bd[1] - bd[3], iy = it.y + bd[0], ih = it.h - bd[0] - bd[2];
  const attrs = { width: W };
  let style = `width:${W}px;`;
  if (it.fill) { attrs.bgcolor = it.fill; style += `background-color:${it.fill};`; }
  if (it.bg) { attrs.background = url(it.bg); style += it.overflow ? BG_TOP : BG_FIT; }
  style += borderCss(it.border) + radiusCss(it.r);
  attrs.style = style;
  const c = it.content;
  let td;
  if (!c) {
    td = h('td', { height: R(ih), style: `height:${R(ih)}px;font-size:0;line-height:0;` }, '&nbsp;');
  } else if (c.k === 'stack') {
    const rows = stackRows(c.items, ix, iw, iy);
    const pb = it.y + it.h - bd[2] - (c.y + c.h);
    td = h('td', { valign: 'top', style: padCss(0, 0, pb, 0) }, table({ width: R(iw), style: `width:${R(iw)}px;` }, rows));
  } else {
    const p = place(c, ix, iw);
    const pt = c.y - iy, pb = iy + ih - (c.y + c.h);
    td = h('td', { align: p.align, valign: 'top', style: padCss(pt, p.pr, pb, p.pl) }, inner(c));
  }
  return table(attrs, h('tr', {}, td));
}
function rowEl(it) {
  let prev = it.x;
  rowDepth++;
  const cells = it.cells.map(c => {
    const gap = Math.max(0, R(c.x - prev));
    prev = c.x + c.w;
    let style = gap ? `padding-left:${gap}px;` : '';
    const attrs = { valign: it.va };
    if (c.k === 'text') {
      attrs.align = c.ta === 'justify' ? 'left' : c.ta;
      if (c.wrap) style += `width:${R(c.w)}px;`;
    }
    if (c.k === 'img') { attrs.width = R(c.w); style += `width:${R(c.w)}px;min-width:${R(c.w)}px;`; }   // ячейка картинки не сжимается
    attrs.style = style;
    return h('td', attrs, c.k === 'img' ? imgEl(c, true) : inner(c));
  });
  rowDepth--;
  return table({}, h('tr', {}, cells));
}
function stackEl(it) {
  return table({ width: R(it.w), style: `width:${R(it.w)}px;` }, stackRows(it.items, it.x, it.w, it.y, it.ca));
}
// Ряд коэффициентов — равные колонки на всю ширину блока, содержимое по центру, по бокам отступ COL_PAD;
// вертикальные линии — узкими ячейками между колонками. Широкий коэффициент («22.22») не ломает ряд.
const COL_PAD = 8;
// shares — ширины колонок (по умолчанию поровну), aligns — выравнивание (по умолчанию по центру),
// pad — отступы у крайних колонок от краёв блока (ряд «значение | подпись | значение», по умолчанию COL_PAD)
function colsEl(it) {
  // бренд: ряд коэффициентов (колонки поровну) — отступ по бокам доля ширины блока (22bet 8%)
  if (BR.oddsPad && !it.shares && !it.inset) {
    const W0 = R(it.w), P = R(W0 * BR.oddsPad);
    return table({ width: W0, style: `width:${W0}px;` }, h('tr', {}, h('td', { align: 'center', style: `padding:0 ${P}px;` },
      colsEl(Object.assign({}, it, { w: W0 - 2 * P, inset: true })))));
  }
  const W = R(it.w), n = it.cells.length;
  const divs = it.dividers || [];
  const divW = divs.reduce((s, l) => s + Math.max(1, R(l.w)), 0);
  const shares = it.shares || it.cells.map(() => 1);
  const total = shares.reduce((s, v) => s + v, 0);
  const widths = shares.map(s => Math.floor((W - divW) * s / total));
  widths[n - 1] = W - divW - widths.slice(0, n - 1).reduce((s, v) => s + v, 0);
  const parts = it.cells.map(c => ({ c, div: false })).concat(divs.map(l => ({ c: l, div: true }))).sort((a, b) => a.c.x - b.c.x);
  let k = 0;
  const tds = parts.map(p => {
    if (p.div) {
      const w = Math.max(1, R(p.c.w));
      return h('td', { width: w, valign: 'middle', style: `width:${w}px;` }, lineEl(p.c));
    }
    const i = k++, w = widths[i];
    const pl = i === 0 && it.pad ? R(it.pad[0]) : COL_PAD, pr = i === n - 1 && it.pad ? R(it.pad[1]) : COL_PAD;
    const align = (it.aligns && it.aligns[i]) || 'center';
    const pad = pl === pr ? `padding:0 ${pl}px;` : `padding:0 ${pr}px 0 ${pl}px;`;
    return h('td', { width: w, align, valign: 'middle', style: `width:${w - pl - pr}px;${pad}` }, colInner(p.c, align));
  });
  return table({ width: W, style: `width:${W}px;` }, h('tr', {}, tds));
}
// содержимое колонки — по выравниванию колонки (по умолчанию по центру), без отступов из макета
function colInner(c, align) {
  align = align || 'center';
  if (c.k === 'text') return textEl(c);
  if (c.k === 'row') { const t = rowEl(c); t.attrs.align = align; return t; }
  if (c.k === 'stack') {
    let prev = c.y;
    return table({ width: '100%' }, c.items.map(x => {
      const pt = x.y - prev;
      prev = Math.max(prev, x.y + x.h);
      return h('tr', {}, h('td', { align, style: padCss(pt, 0, 0, 0) }, x.k === 'row' ? colInner(x, align) : inner(x)));
    }));
  }
  return inner(c);
}
// Колонки многострочного текста «строка к строке» — таблица: каждая строка текста своей <tr>
// (длинная строка справа переносится — ряд растёт целиком, пары строк не расходятся)
function gridEl(it) {
  const W = R(it.w), last = it.cols.length - 1;
  const rows = it.rows.map(cells => h('tr', {}, cells.map((c, ci) => {
    const col = it.cols[ci];
    const gap = ci ? Math.max(0, R(col.x - (it.cols[ci - 1].x + it.cols[ci - 1].w))) : 0;
    const style = (gap ? `padding-left:${gap}px;` : '') + (ci < last ? `width:${R(col.w)}px;` : '');
    return h('td', { align: col.ta, valign: 'top', style }, c ? textEl(c) : '&nbsp;');
  })));
  return table({ width: W, style: `width:${W}px;` }, rows);
}
function inner(it) {
  switch (it.k) {
    case 'cols': return colsEl(it);
    case 'grid': return gridEl(it);
    case 'text': return textEl(it);
    case 'img': return imgEl(it);
    case 'hero': return heroEl(it);
    case 'btn': return btnEl(it);
    case 'box': return boxEl(it);
    case 'line': return lineEl(it);
    case 'row': return rowEl(it);
    case 'stack': return stackEl(it);
    default: return '';
  }
}
// строки столбика: отступ сверху = расстояние от предыдущего элемента, по горизонтали — выравнивание/отступы
// Заголовки и абзацы в колонке письма — не ближе minSide к краям (24px). Больший отступ из макета остаётся.
// Однострочный текст отступ не переносит: добавляем, только пока строка шириной как в макете помещается.
function textSides(it, p, cw, minSide) {
  if (it.k !== 'text') return p;
  // Центрированный текст из узкого текстового слоя («Рекомендуем ставку:» 197px в карточке 580px → отступы по 192px,
  // test block 3/9): огромные боковые отступы в письме не нужны — по 24px. Переносы строк из макета остаются (<br>).
  // Порог 120px: отступы футера 66–97px — обычные (у верстальщика в block 1/5 футер padding 0 88px).
  const side = BR.textSide || TEXT_SIDE;
  // В колонке письма вправо — только текст, выровненный вправо в самом макете. Слой, просто стоящий не по центру
  // («100% до 100 EUR» уходил align=right из-за сдвига на 12px), — по центру, как соседние блоки.
  if (minSide && p.align === 'right' && it.ta !== 'right') p = { align: 'center', pl: 0, pr: 0 };
  // бренд: заголовки и текст в колонке письма — ровно по BR.textSide с боков (22bet 20px), а не из макета
  if (BR.textSide && minSide) return { align: p.align, pl: side, pr: side };
  if (p.align === 'center' && (p.pl > 120 || p.pr > 120)) return { align: 'center', pl: side, pr: side };
  if (!minSide) return p;
  const want = [Math.max(0, minSide - p.pl), Math.max(0, minSide - p.pr)];
  const room = it.wrap ? Infinity : Math.max(0, cw - it.w - p.pl - p.pr);
  return { align: p.align, pl: p.pl + Math.min(want[0], room / 2), pr: p.pr + Math.min(want[1], room / 2) };
}
// pbLast — отступ под последней строкой (низ письма): паддингом её ячейки, как у верстальщика, а не строкой-распоркой
// Ряд-список «иконка + текст» в колонке письма (как активировать бонус, test block 4/prod 1): отступ справа такой же,
// как слева — иначе длинная строка доходила до правого края письма без отступа.
function rowSides(it, p, minSide) {
  if (!minSide || (it.k !== 'row' && it.k !== 'stack')) return p;
  if (p.align === 'left' && p.pr < p.pl) return { align: p.align, pl: p.pl, pr: p.pl };
  if (p.align === 'right' && p.pl < p.pr) return { align: p.align, pl: p.pr, pr: p.pr };
  return p;
}
function stackRows(items, cx, cw, top, ca, pbLast, minSide) {
  const rows = [];
  let prev = top;
  const real = items.filter(it => it.k !== 'gap');
  real.forEach((it, i) => {
    const pt = it.y - prev;
    prev = Math.max(prev, it.y + it.h);
    const p = rowSides(it, textSides(it, place(it, cx, cw, ca), cw, minSide), minSide);
    const style = padCss(pt, p.pr, i === real.length - 1 ? pbLast : 0, p.pl);
    rows.push(h('tr', {}, h('td', { align: p.align, style }, inner(it))));
  });
  return rows;
}

// ── письмо целиком ──
const W = plan.width, items = plan.body ? plan.body.items : [];
const last = items.reduce((m, it) => Math.max(m, it.y + it.h), 0);
const tail = R(plan.height - last);
const rows = stackRows(items, 0, W, 0, null, tail, TEXT_SIDE);
if (!rows.length && tail > 0) rows.push(h('tr', {}, h('td', { style: `padding-top:${tail}px;` })));
const mainAttrs = { width: W, bgcolor: plan.color, style: `width:${W}px;background-color:${plan.color};` + (plan.bg ? BG_COVER : '') };
if (plan.bg) mainAttrs.background = url(plan.bg);
const page = table({ width: '100%' }, h('tr', {}, h('td', { align: 'center' }, table(mainAttrs, rows))));

const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${esc(plan.title || 'Mail')}</title>
  <style type="text/css">
    img { font-size: 0; line-height: 0; display: block; border: none; -ms-interpolation-mode: bicubic; max-width: 100%; }
    body { font-family: sans-serif; -webkit-font-smoothing: antialiased; margin: 0; padding: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; }
    table { border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  </style>
</head>
<body style="margin:0;padding:0;">
${print(page, 0)}
</body>
</html>`;

return [{ json: { output: html } }];
