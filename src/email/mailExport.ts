// Экспорт «для рассылки»: вёрстка, которую понимают Gmail и Outlook.
//
// Письмо рисуется в скрытом iframe той же разметкой, что и превью, а потом по готовой раскладке
// собирается заново: каждый элемент — таблица с инлайн-стилями, положение детей берётся из их
// реальных координат (строки и столбцы с распорками). Текст остаётся текстом.
// Картинками становятся кнопки и разделители (так договорились — одинаково во всех клиентах),
// а также всё, чего почта не умеет: маски, clip-path, трансформации, псевдоэлементы, наложения,
// SVG. Растеризация — через SVG foreignObject → canvas, ресурсы встраиваются как data URL.

import type { EmailDoc } from '@/model/types';
import { EMAIL_CSS } from './emailCss';
import { renderDocument } from './render';

type Rect = { left: number; top: number; right: number; bottom: number; width: number; height: number };

interface Ctx {
  win: Window;
  em: HTMLElement;
  emRect: DOMRect;
  css: string;
  data: Map<string, string>;
  /** Файлы ZIP: путь → содержимое. */
  files: Map<string, Blob>;
  /** Исходный URL картинки → путь в ZIP. */
  named: Map<string, string>;
  /** Элементы, которые целиком уходят в картинку (их внутренности почта не покажет). */
  raster: Set<Element>;
  bg: HTMLCanvasElement | null;
  blockN: number;
  imgN: number;
}

const ASSET_URL = /\/assets\/[a-z0-9/_.-]+\.(?:png|jpe?g|gif|webp|svg)/gi;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const px = (v: string) => parseFloat(v) || 0;
const r0 = (n: number) => Math.round(n);

const blobToDataUrl = (b: Blob) => new Promise<string>((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(String(r.result));
  r.onerror = () => rej(r.error);
  r.readAsDataURL(b);
});

// --- цвета: color-mix, oklab и т.п. почта не знает — приводим к hex / rgba

// любой формат (color(srgb …), oklab, color-mix) → рисуем пиксель и читаем, что получилось
const colorCtx = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true })!;
const colorCache = new Map<string, string>();
function color(c: string) {
  if (!c || c === 'transparent') return 'transparent';
  let v = colorCache.get(c);
  if (v) return v;
  colorCtx.clearRect(0, 0, 1, 1);
  colorCtx.fillStyle = '#000';
  colorCtx.fillStyle = c;
  colorCtx.fillRect(0, 0, 1, 1);
  const [r, g, b, al] = colorCtx.getImageData(0, 0, 1, 1).data;
  const hex = '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
  v = al === 0 ? 'transparent' : al === 255 ? hex : `rgba(${r},${g},${b},${(al / 255).toFixed(2)})`;
  colorCache.set(c, v);
  return v;
}
const COLOR_FN = /(?:rgba?|hsla?|color|oklab|oklch|lab|lch)\([^()]*\)/g;
const colors = (s: string) => s.replace(COLOR_FN, (m) => color(m));
const firstColor = (s: string) => { const m = s.match(COLOR_FN); return m ? color(m[0]) : ''; };

// --- подготовка

async function toData(url: string, ctx: Ctx) {
  if (url.startsWith('data:')) return url;
  let d = ctx.data.get(url);
  if (!d) { d = await blobToDataUrl(await (await fetch(url)).blob()); ctx.data.set(url, d); }
  return d;
}

async function inlineAssets(s: string, ctx: Ctx) {
  for (const url of new Set(s.match(ASSET_URL) ?? [])) s = s.split(url).join(await toData(url, ctx));
  return s;
}

/** Путь картинки в ZIP (загруженные дизайнером — data URL, пресеты — /assets/...). */
async function fileFor(src: string, ctx: Ctx) {
  let name = ctx.named.get(src);
  if (name) return name;
  if (src.startsWith('data:')) {
    const ext = ({ 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg' } as Record<string, string>)[src.slice(5, src.indexOf(';'))] ?? 'png';
    name = `images/upload-${ctx.named.size + 1}.${ext}`;
    ctx.files.set(name, await (await fetch(src)).blob());
  } else {
    const path = new URL(src, location.origin).pathname;
    name = `images/${path.replace('/assets/', '').replace(/\//g, '-')}`;
    ctx.files.set(name, await (await fetch(path)).blob());
  }
  ctx.named.set(src, name);
  return name;
}

/** Что почта не покажет — отмечаем заранее: такой элемент уйдёт картинкой целиком. */
function markRaster(ctx: Ctx) {
  const { win, em } = ctx;
  for (const el of em.querySelectorAll<HTMLElement>('.em-blk *')) {
    const cs = win.getComputedStyle(el);
    if (cs.position === 'absolute' || cs.position === 'fixed') {
      // наложение: в картинку уходит тот, относительно кого оно позиционировано
      const host = (el.offsetParent as Element | null) ?? el.closest('.em-blk');
      if (host && host !== em) ctx.raster.add(host);
      continue;
    }
    const pseudo = ['::before', '::after'].some((p) => { const c = win.getComputedStyle(el, p).content; return c !== 'none' && c !== 'normal'; });
    const wkMask = cs.getPropertyValue('-webkit-mask-image');
    const fancy = cs.maskImage !== 'none' || (!!wkMask && wkMask !== 'none')
      || cs.clipPath !== 'none' || cs.transform !== 'none' || cs.filter !== 'none'
      || /radial-gradient|repeating-|conic-gradient|url\(/.test(cs.backgroundImage);
    // у отдельной кнопки тень выходит за её рамку — берём вместе с отступами блока
    if (el.matches('.e-cta') && el.parentElement?.matches('.e-pad') && el.parentElement.childElementCount === 1) ctx.raster.add(el.parentElement);
    else if (el.matches('.e-cta, .e-sp, svg') || pseudo || fancy) ctx.raster.add(el);
    // картинка, обрезанная object-fit, — в картинку уже обрезанной
    if (el instanceof HTMLImageElement && el.naturalWidth && cs.objectFit !== 'fill') {
      const r = el.getBoundingClientRect();
      if (Math.abs(el.naturalWidth / el.naturalHeight - r.width / r.height) > 0.02) ctx.raster.add(el);
    }
  }
  // элемент вылезает за родителя (картинка заходит на рамку карточки) — в картинку тот, кто его вмещает целиком
  for (const el of em.querySelectorAll('.em-blk *')) {
    const r = el.getBoundingClientRect();
    // строчные элементы (крупная цифра в строке) законно выступают за строку — их не считаем
    if (!r.width || !r.height || !el.parentElement || win.getComputedStyle(el).display === 'inline') continue;
    const fits = (p: Element) => { const q = p.getBoundingClientRect(); return r.top >= q.top - 3 && r.bottom <= q.bottom + 3 && r.left >= q.left - 3 && r.right <= q.right + 3; };
    if (fits(el.parentElement)) continue;
    let host: Element | null = el.parentElement.parentElement;
    while (host && !host.matches('.em-blk') && !fits(host)) host = host.parentElement;
    if (host && !host.matches('.em-blk')) ctx.raster.add(host);
  }
  // внутри картинки ничего отдельно не растеризуем
  for (const el of [...ctx.raster]) if ([...ctx.raster].some((o) => o !== el && o.contains(el))) ctx.raster.delete(el);
}

// --- растеризация

const hasAlpha = (c: HTMLCanvasElement) => {
  const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
  for (let i = 3; i < d.length; i += 4) if (d[i] < 250) return true;
  return false;
};

async function drawElement(el: Element, ctx: Ctx, scale: number) {
  const rr = el.getBoundingClientRect();
  const x = rr.left - ctx.emRect.left;
  const y = rr.top - ctx.emRect.top;
  const w = Math.max(1, Math.round(rr.width));
  const h = Math.max(1, Math.round(rr.height));
  el.setAttribute('data-rt', '');
  const clone = ctx.em.cloneNode(true) as HTMLElement;
  el.removeAttribute('data-rt');
  // чужие картинки не тащим в SVG — размеры у них заморожены, раскладка не съедет
  for (const img of clone.querySelectorAll('img')) if (!img.closest('[data-rt]')) img.removeAttribute('src');
  let html = new XMLSerializer().serializeToString(clone);
  html = await inlineAssets(html, ctx);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w * scale}" height="${h * scale}" viewBox="${x} ${y} ${w} ${h}">`
    + `<foreignObject x="0" y="0" width="600" height="${Math.ceil(ctx.emRect.height)}"><div xmlns="http://www.w3.org/1999/xhtml">`
    + `<style>${ctx.css} .em{visibility:hidden;background:transparent!important} .em [data-rt]{visibility:visible!important}</style>${html}</div></foreignObject></svg>`;
  const img = new Image();
  const ready = loaded(img);
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  await ready;
  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return { canvas, x, y, w, h };
}

/** Ждём загрузку картинки событием: decode() в фоновой вкладке может не завершиться. */
const loaded = (img: HTMLImageElement, ms = 8000) => new Promise<void>((res) => {
  if (img.complete && img.naturalWidth) { res(); return; }
  const t = setTimeout(res, ms);
  img.addEventListener('load', () => { clearTimeout(t); res(); }, { once: true });
  img.addEventListener('error', () => { clearTimeout(t); res(); }, { once: true });
});

const toBlob = (c: HTMLCanvasElement, type: string) =>
  new Promise<Blob>((res) => c.toBlob((b) => res(b!), type, 0.86));

/** Элемент → файл картинки. Крупные — JPEG поверх фона письма, мелкие — PNG с прозрачностью. */
async function rasterize(el: Element, ctx: Ctx) {
  const area = el.getBoundingClientRect().width * el.getBoundingClientRect().height;
  const large = area > 120_000;
  const { canvas, x, y, w, h } = await drawElement(el, ctx, large ? 1 : 2);
  let out = canvas;
  let type = 'image/png';
  if (large) {
    // под прозрачные места подкладываем фон письма — иначе JPEG их зальёт чёрным
    if (hasAlpha(canvas) && ctx.bg) {
      out = document.createElement('canvas');
      out.width = canvas.width;
      out.height = canvas.height;
      const c2 = out.getContext('2d')!;
      c2.drawImage(ctx.bg, x, y, w, h, 0, 0, out.width, out.height);
      c2.drawImage(canvas, 0, 0);
    }
    type = 'image/jpeg';
  }
  const name = `images/block-${String(ctx.blockN).padStart(2, '0')}-${++ctx.imgN}.${type === 'image/png' ? 'png' : 'jpg'}`;
  ctx.files.set(name, await toBlob(out, type));
  return { name, w, h };
}

/** Фон письма (цвет + паттерн или картинка) одним холстом во всю высоту. */
async function drawBackground(ctx: Ctx, doc: EmailDoc) {
  const c = document.createElement('canvas');
  c.width = 600;
  c.height = Math.ceil(ctx.emRect.height);
  const g = c.getContext('2d')!;
  g.fillStyle = doc.theme.bg;
  g.fillRect(0, 0, c.width, c.height);
  const layer = ctx.em.querySelector('.e-bgl');
  if (layer) g.drawImage((await drawElement(layer, ctx, 1)).canvas, 0, 0);
  return { canvas: c, layered: !!layer };
}

// --- сборка таблиц

const TABLE = 'role="presentation" cellpadding="0" cellspacing="0" border="0"';
const spacerTd = (w: number) => `<td width="${w}" style="width:${w}px;font-size:0;line-height:0;">&nbsp;</td>`;
const spacerRow = (h: number, cols = 1) => `<tr><td${cols > 1 ? ` colspan="${cols}"` : ''} height="${h}" style="height:${h}px;font-size:0;line-height:0;">&nbsp;</td></tr>`;

function textStyle(cs: CSSStyleDeclaration) {
  const s = [
    `font-family:${cs.fontFamily.replace(/"/g, "'")}`, `font-size:${cs.fontSize}`, `font-weight:${cs.fontWeight}`,
    `line-height:${cs.lineHeight}`, `color:${color(cs.color)}`, `text-align:${cs.textAlign === 'start' ? 'left' : cs.textAlign}`,
  ];
  if (cs.fontStyle !== 'normal') s.push(`font-style:${cs.fontStyle}`);
  if (cs.textTransform !== 'none') s.push(`text-transform:${cs.textTransform}`);
  if (cs.letterSpacing !== 'normal') s.push(`letter-spacing:${cs.letterSpacing}`);
  if (cs.whiteSpace === 'nowrap') s.push('white-space:nowrap');
  if (cs.textShadow !== 'none') s.push(`text-shadow:${colors(cs.textShadow)}`);
  if (cs.textDecorationLine.includes('underline')) s.push('text-decoration:underline');
  return s.join(';');
}

function boxStyle(cs: CSSStyleDeclaration) {
  const s: string[] = [];
  let bgcolor = '';
  const layers = cs.backgroundImage === 'none' ? [] : cs.backgroundImage.split(/,(?![^(]*\))/);
  if (layers.length > 1) {
    // экспресс: заливка плашки + градиентная рамка — в почте простая рамка цвета градиента
    bgcolor = firstColor(layers[0]) || color(cs.backgroundColor);
  } else if (layers.length === 1 && layers[0].includes('linear-gradient')) {
    s.push(`background-image:${colors(layers[0])}`);
    bgcolor = firstColor(layers[0]);
  }
  const bc = color(cs.backgroundColor);
  if (bc !== 'transparent') bgcolor = bgcolor || bc;
  if (bgcolor && bgcolor !== 'transparent') s.unshift(`background-color:${bgcolor}`);
  for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
    const w = px(cs[`border${side}Width`]);
    if (w > 0 && cs[`border${side}Style`] !== 'none') {
      let c = color(cs[`border${side}Color`]);
      if (c === 'transparent' && layers.length > 1) c = firstColor(layers[layers.length - 1]);
      s.push(`border-${side.toLowerCase()}:${w}px solid ${c}`);
    }
  }
  const rad = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius];
  if (rad.some((r) => px(r) > 0)) s.push(`border-radius:${rad.map((r) => `${px(r)}px`).join(' ')}`);
  const pad = [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(px);
  if (pad.some((p) => p > 0)) s.push(`padding:${pad.map((p) => `${r0(p)}px`).join(' ')}`);
  if (px(cs.opacity) < 1 && cs.opacity !== '') s.push(`opacity:${cs.opacity}`);
  return { style: s.join(';'), bgcolor: bgcolor && bgcolor !== 'transparent' && bgcolor.startsWith('#') ? bgcolor : '' };
}

function wrapBox(el: Element, inner: string, opts: { text?: boolean; height?: number; valign?: string; nowrap?: boolean } = {}) {
  const cs = (el.ownerDocument.defaultView as Window).getComputedStyle(el);
  // тексту — запас в пару пикселей: ширина по контенту после округления иначе переносит последнее слово
  const raw = el.getBoundingClientRect().width;
  const w = opts.text ? Math.ceil(raw) + 1 : r0(raw);
  const { style, bgcolor } = boxStyle(cs);
  const tdStyle = [style, opts.text ? textStyle(cs) : '', opts.height ? `height:${opts.height}px` : '', opts.nowrap ? 'white-space:nowrap' : ''].filter(Boolean).join(';');
  const radius = /border-radius:[^;]+/.exec(style)?.[0];
  const table = `<table ${TABLE} width="${w}" style="width:${w}px;border-collapse:separate;${radius ? `${radius};` : ''}"><tr>`
    + `<td${bgcolor ? ` bgcolor="${bgcolor}"` : ''}${opts.valign ? ` valign="${opts.valign}"` : ''} style="${tdStyle}${opts.valign ? `;vertical-align:${opts.valign}` : ''}">${inner}</td></tr></table>`;
  return linkWrap(el, table, cs);
}

function linkWrap(el: Element, html: string, cs?: CSSStyleDeclaration) {
  if (el.tagName !== 'A') return html;
  const href = el.getAttribute('href') || '#';
  return `<a href="${esc(href)}" target="_blank" style="display:block;text-decoration:none;${cs ? `color:${color(cs.color)};` : ''}">${html}</a>`;
}

const visible = (el: Element, win: Window) => {
  const cs = win.getComputedStyle(el);
  const r = el.getBoundingClientRect();
  return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0;
};

const directText = (el: Element) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim());

/** Контейнер, у которого внутри только строчный текст, — собираем как текст, а не раскладкой. */
function isTextBox(el: Element, win: Window) {
  if (directText(el)) return true;
  const kids = [...el.children].filter((k) => visible(k, win) || k.tagName === 'BR');
  return kids.length > 0 && kids.every((k) => k.tagName === 'BR' || win.getComputedStyle(k).display === 'inline');
}

async function inlineHtml(el: Element, ctx: Ctx): Promise<string> {
  const parent = ctx.win.getComputedStyle(el);
  let out = '';
  for (const n of el.childNodes) {
    if (n.nodeType === 3) { out += esc(n.textContent!.replace(/\s+/g, ' ')); continue; }
    if (n.nodeType !== 1) continue;
    const k = n as Element;
    if (k.tagName === 'BR') { out += '<br>'; continue; }
    if (!visible(k, ctx.win)) continue;
    if (ctx.raster.has(k) || k.tagName === 'IMG') { out += await imageHtml(k, ctx, true); continue; }
    const cs = ctx.win.getComputedStyle(k);
    const diff: string[] = [];
    if (cs.color !== parent.color) diff.push(`color:${color(cs.color)}`);
    if (cs.fontSize !== parent.fontSize) diff.push(`font-size:${cs.fontSize}`);
    if (cs.fontWeight !== parent.fontWeight) diff.push(`font-weight:${cs.fontWeight}`);
    if (cs.fontStyle !== parent.fontStyle) diff.push(`font-style:${cs.fontStyle}`);
    if (cs.textTransform !== parent.textTransform) diff.push(`text-transform:${cs.textTransform}`);
    if (cs.lineHeight !== parent.lineHeight) diff.push(`line-height:${cs.lineHeight}`);
    if (cs.textDecorationLine.includes('underline')) diff.push('text-decoration:underline');
    const bg = color(cs.backgroundColor);
    if (bg !== 'transparent') diff.push(`background-color:${bg}`);
    const block = cs.display !== 'inline';
    const tag = k.tagName === 'A' ? 'a' : block ? 'div' : 'span';
    const href = k.tagName === 'A' ? ` href="${esc(k.getAttribute('href') || '#')}" target="_blank"` : '';
    if (k.tagName === 'A' && !diff.some((d) => d.startsWith('text-decoration'))) diff.push('text-decoration:none');
    if (k.tagName === 'A' && !diff.some((d) => d.startsWith('color'))) diff.push(`color:${color(cs.color)}`);
    out += `<${tag}${href}${diff.length ? ` style="${diff.join(';')}"` : ''}>${await inlineHtml(k, ctx)}</${tag}>`;
  }
  return out.replace(/^\s+|\s+$/g, '');
}

async function imageHtml(el: Element, ctx: Ctx, inline = false) {
  const r = el.getBoundingClientRect();
  let src: string;
  let w = r0(r.width);
  let h = r0(r.height);
  const alt = el.tagName === 'IMG' ? el.getAttribute('alt') ?? '' : (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  if (ctx.raster.has(el) || el.tagName !== 'IMG') {
    const out = await rasterize(el, ctx);
    src = out.name; w = out.w; h = out.h;
  } else {
    src = await fileFor(el.getAttribute('src') ?? '', ctx);
  }
  const cs = ctx.win.getComputedStyle(el);
  const rad = el.tagName === 'IMG' && px(cs.borderTopLeftRadius) > 0 ? `border-radius:${cs.borderTopLeftRadius};` : '';
  const img = `<img src="${src}" width="${w}" height="${h}" alt="${esc(alt)}" style="${inline ? 'display:inline-block;vertical-align:middle' : 'display:block'};width:${w}px;height:${h}px;border:0;outline:none;${rad}">`;
  // ссылка: картинка сама ссылка или в ней ссылка (кнопка, лого); внутри чужой ссылки — без своей
  const a = el.tagName === 'A' ? el : el.parentElement?.closest('a') ? null : el.querySelector('a');
  return a ? `<a href="${esc(a.getAttribute('href') || '#')}" target="_blank" style="text-decoration:none;">${img}</a>` : img;
}

const rectOf = (el: Element): Rect => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };

async function compile(el: Element, ctx: Ctx): Promise<string> {
  const { win } = ctx;
  if (ctx.raster.has(el) || el.tagName === 'IMG') return imageHtml(el, ctx);
  const cs = win.getComputedStyle(el);
  const rect = rectOf(el);
  const inner = {
    left: rect.left + px(cs.borderLeftWidth) + px(cs.paddingLeft),
    right: rect.right - px(cs.borderRightWidth) - px(cs.paddingRight),
    top: rect.top + px(cs.borderTopWidth) + px(cs.paddingTop),
    bottom: rect.bottom - px(cs.borderBottomWidth) - px(cs.paddingBottom),
  };
  const contentH = r0(inner.bottom - inner.top);

  if (isTextBox(el, win)) {
    const centered = cs.display.includes('flex') && cs.alignItems === 'center';
    // однострочный текст не должен переноситься из-за округления ширины ячейки
    const lh = px(cs.lineHeight) || px(cs.fontSize) * 1.2;
    const oneLine = !el.querySelector('br') && [...el.querySelectorAll('*')].every((k) => win.getComputedStyle(k).display === 'inline')
      && contentH < Math.max(lh, ...[...el.querySelectorAll('*')].map((k) => px(win.getComputedStyle(k).lineHeight))) * 1.5;
    return wrapBox(el, await inlineHtml(el, ctx), { text: true, height: contentH, valign: centered ? 'middle' : 'top', nowrap: oneLine });
  }
  const kids = [...el.children].filter((k) => visible(k, win) && !['absolute', 'fixed'].includes(win.getComputedStyle(k).position));
  if (!kids.length) return wrapBox(el, '', { height: contentH }).replace('></td>', '>&nbsp;</td>').replace(/(<td[^>]*style=")/, '$1font-size:0;line-height:0;');

  // дети → строки по вертикальному перекрытию, в строке — слева направо
  const items = kids.map((k) => ({ el: k, r: rectOf(k) })).sort((a, b) => a.r.top - b.r.top || a.r.left - b.r.left);
  const lines: { items: typeof items; top: number; bottom: number }[] = [];
  for (const it of items) {
    const line = lines.find((l) => it.r.top < l.bottom - 1 && it.r.bottom > l.top + 1);
    if (line) { line.items.push(it); line.top = Math.min(line.top, it.r.top); line.bottom = Math.max(line.bottom, it.r.bottom); }
    else lines.push({ items: [it], top: it.r.top, bottom: it.r.bottom });
  }
  lines.sort((a, b) => a.top - b.top);
  // дети наезжают друг на друга (гербы на картинке и т.п.) — таблицами так не сложить, контейнер целиком в картинку
  const overlap = lines.some((l) => l.items.length > 1 && l.items.some((a, i) => l.items.some((b, j) => j > i
    && Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left) > 2)));
  if (overlap) { ctx.raster.add(el); return imageHtml(el, ctx); }

  const W = r0(inner.right - inner.left);
  let rows = '';
  let y = inner.top;
  for (const line of lines) {
    const gap = r0(line.top - y);
    if (gap > 0) rows += spacerRow(gap);
    line.items.sort((a, b) => a.r.left - b.r.left);
    let cells = '';
    let x = 0;
    let spaced = false;
    const lh = line.bottom - line.top;
    for (const it of line.items) {
      const l = Math.max(x, r0(it.r.left - inner.left));
      const rgt = Math.max(l, r0(it.r.right - inner.left));
      if (l > x) { cells += spacerTd(l - x); spaced = true; }
      const off = it.r.top - line.top;
      const valign = Math.abs(off - (lh - it.r.height) / 2) < 2 && off > 1 ? 'middle' : off > 1 ? 'bottom' : 'top';
      cells += `<td width="${rgt - l}" valign="${valign}" style="width:${rgt - l}px;vertical-align:${valign};">${await compile(it.el, ctx)}</td>`;
      x = rgt;
    }
    if (W - x > 0) { cells += spacerTd(W - x); spaced = true; }
    // один ребёнок во всю ширину — ячейка прямо в строке, без вложенной таблицы
    rows += line.items.length === 1 && !spaced
      ? `<tr>${cells}</tr>`
      : `<tr><td><table ${TABLE} width="${W}" style="width:${W}px;"><tr>${cells}</tr></table></td></tr>`;
    y = Math.max(y, line.bottom);
  }
  const tail = r0(inner.bottom - y);
  if (tail > 0) rows += spacerRow(tail);
  const table = `<table ${TABLE} width="${W}" style="width:${W}px;">${rows}</table>`;
  const plain = !boxStyle(cs).style && el.tagName !== 'A';
  return plain ? table : wrapBox(el, table);
}

// --- документ

function documentHtml(doc: EmailDoc, body: string, bgFile: string) {
  const bg = doc.theme.bg;
  const font = doc.theme.font === 'Roboto' ? '<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">' : '';
  const bgAttr = bgFile ? ` background="${bgFile}"` : '';
  const bgStyle = bgFile ? `background-image:url('${bgFile}');background-repeat:no-repeat;background-position:top center;` : '';
  return `<!doctype html>
<html lang="ru" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
<title>${esc(doc.subject)}</title>
${font}
<style>
body{margin:0;padding:0;width:100%!important;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0}
img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic}
a{text-decoration:none}
</style>
<!--[if mso]><style>td,th,div,p,a,span{font-family:Arial,sans-serif!important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${bg};" bgcolor="${bg}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${esc(doc.preheader)}</div>
<table ${TABLE} width="100%" bgcolor="${bg}" style="width:100%;background-color:${bg};">
<tr><td align="center" valign="top">
<table ${TABLE} width="600" style="width:600px;">
<tr><td valign="top" bgcolor="${bg}"${bgAttr} style="background-color:${bg};${bgStyle}">
${body}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/** Рендер письма в скрытом iframe шириной 600 — с той же раскладкой, что в превью. */
async function mountHidden(doc: EmailDoc) {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:600px;height:1000px;border:0;';
  document.body.appendChild(frame);
  await new Promise<void>((res) => { frame.onload = () => res(); frame.srcdoc = renderDocument(doc, { preview: true }); });
  const idoc = frame.contentDocument!;
  await Promise.all([...idoc.images].map((i) => loaded(i)));
  await Promise.race([idoc.fonts.ready, new Promise((r) => setTimeout(r, 3000))]);
  return frame;
}

/** ZIP для рассылки: index.html на таблицах + images/ (кнопки, разделители, сложная графика, фон). */
export async function buildMailZip(doc: EmailDoc) {
  const frame = await mountHidden(doc);
  try {
    const win = frame.contentWindow!;
    const em = frame.contentDocument!.querySelector<HTMLElement>('.em')!;
    // размеры картинок замораживаем: при растеризации чужие картинки уходят без src
    for (const img of em.querySelectorAll('img')) {
      const r = img.getBoundingClientRect();
      img.style.width = `${r.width}px`;
      img.style.height = `${r.height}px`;
    }
    const ctx: Ctx = {
      win, em, emRect: em.getBoundingClientRect(), css: '', data: new Map(), files: new Map(), named: new Map(),
      raster: new Set(), bg: null, blockN: 0, imgN: 0,
    };
    ctx.css = await inlineAssets(EMAIL_CSS, ctx);
    markRaster(ctx);

    const back = await drawBackground(ctx, doc);
    ctx.bg = back.canvas;
    let bgFile = '';
    if (back.layered) {
      bgFile = 'images/background.jpg';
      ctx.files.set(bgFile, await toBlob(back.canvas, 'image/jpeg'));
    }

    let body = '';
    for (const blk of em.querySelectorAll<HTMLElement>(':scope > .em-blk')) {
      ctx.blockN++;
      ctx.imgN = 0;
      body += `<!-- ${blk.dataset.blockId} -->\n${await compile(blk, ctx)}\n`;
    }
    const html = documentHtml(doc, body, bgFile);

    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    zip.file('index.html', html);
    for (const [name, blob] of ctx.files) zip.file(name, blob);
    return { zip: await zip.generateAsync({ type: 'blob' }), images: ctx.files.size, kb: new Blob([html]).size / 1024, html };
  } finally {
    frame.remove();
  }
}
