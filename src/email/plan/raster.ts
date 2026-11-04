// Письмо в скрытом iframe 600px (та же разметка, что в превью) и снятие его элементов картинками:
// SVG foreignObject → canvas, ресурсы встроены data URL. Масштаб 2× (как scale=2 у плагина), размеры в плане — 1×.

import type { EmailDoc } from '@/model/types';
import { EMAIL_CSS } from '../emailCss';
import { renderDocument } from '../render';
import { contentHash } from './names';
import type { Rect } from './types';

export interface Frame {
  win: Window;
  doc: Document;
  em: HTMLElement;
  emRect: DOMRect;
  /** CSS письма с ресурсами в data URL — для SVG. */
  css: string;
  remove(): void;
}

/** whole — целиком; nobg — без текста (раскладка та же); own — только своя отрисовка, без содержимого. */
export type RasterMode = 'whole' | 'nobg' | 'own';

export interface Shot { blob: Blob; type: 'image/png' | 'image/jpeg'; rect: Rect; hash: string }

const ASSET_URL = /\/assets\/[a-z0-9/_.-]+\.(?:png|jpe?g|gif|webp|svg)/gi;
const JPEG_AREA = 120_000;   // картинка крупнее (в 1×) — JPEG
const JPEG_CLEAR = 0.3;      // …если прозрачного в ней не больше 30%: под прозрачное подкладывается фон письма

const blobToDataUrl = (b: Blob) => new Promise<string>((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(String(r.result));
  r.onerror = () => rej(r.error);
  r.readAsDataURL(b);
});

// пресеты из /assets — общие для всех писем, держим встроенными между сборками
const assetData = new Map<string, Promise<string>>();
const toData = (url: string) => {
  let d = assetData.get(url);
  if (!d) {
    d = fetch(url).then((r) => r.blob()).then(blobToDataUrl);
    d.catch(() => assetData.delete(url));
    assetData.set(url, d);
  }
  return d;
};

async function inlineAssets(s: string) {
  for (const url of new Set(s.match(ASSET_URL) ?? [])) s = s.split(url).join(await toData(url));
  return s;
}

/** Ждём загрузку картинки событием: decode() в фоновой вкладке может не завершиться. */
const loaded = (img: HTMLImageElement, ms = 8000) => new Promise<void>((res) => {
  if (img.complete && img.naturalWidth) { res(); return; }
  const t = setTimeout(res, ms);
  img.addEventListener('load', () => { clearTimeout(t); res(); }, { once: true });
  img.addEventListener('error', () => { clearTimeout(t); res(); }, { once: true });
});

/** Рендер письма в скрытом iframe шириной 600 — с той же раскладкой, что в превью. */
export async function mountEmail(doc: EmailDoc): Promise<Frame> {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:600px;height:1000px;border:0;';
  document.body.appendChild(frame);
  try {
    await new Promise<void>((res) => { frame.onload = () => res(); frame.srcdoc = renderDocument(doc, { preview: true }); });
    const idoc = frame.contentDocument!;
    await Promise.all([...idoc.images].map((i) => loaded(i)));
    await Promise.race([idoc.fonts.ready, new Promise((r) => setTimeout(r, 3000))]);
    const em = idoc.querySelector<HTMLElement>('.em')!;
    // размеры картинок замораживаем: при снятии чужие картинки уходят без src
    for (const img of em.querySelectorAll('img')) {
      const r = img.getBoundingClientRect();
      img.style.width = `${r.width}px`;
      img.style.height = `${r.height}px`;
    }
    return { win: frame.contentWindow!, doc: idoc, em, emRect: em.getBoundingClientRect(), css: await inlineAssets(EMAIL_CSS), remove: () => frame.remove() };
  } catch (e) {
    frame.remove();
    throw e;
  }
}

/** Рамка элемента в координатах письма. */
export function relRect(el: Element, f: Frame): Rect {
  const r = el.getBoundingClientRect();
  return { x: r.left - f.emRect.left, y: r.top - f.emRect.top, w: r.width, h: r.height };
}

/** Рамка вместе с наружной тенью (смещение + размытие + разлёт): «бортик» кнопки — часть картинки. */
export function shadowRect(el: Element, f: Frame): Rect {
  const r = relRect(el, f);
  let [x0, y0, x1, y1] = [r.x, r.y, r.x + r.w, r.y + r.h];
  const bs = f.win.getComputedStyle(el).boxShadow;
  if (bs && bs !== 'none') {
    for (const sh of bs.split(/,(?![^(]*\))/)) {
      if (/\binset\b/.test(sh)) continue;
      const [ox = 0, oy = 0, blur = 0, spread = 0] = sh.replace(/[a-z-]+\([^)]*\)/gi, '').match(/-?[\d.]+px/g)?.map(parseFloat) ?? [];
      const e = blur + spread;
      x0 = Math.min(x0, r.x + ox - e); y0 = Math.min(y0, r.y + oy - e);
      x1 = Math.max(x1, r.x + r.w + ox + e); y1 = Math.max(y1, r.y + r.h + oy + e);
    }
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

const MODE_CSS: Record<RasterMode, string> = {
  whole: '',
  // -webkit-text-fill-color, а не color: рамки и заливки на currentColor остаются
  nobg: '.em [data-rt], .em [data-rt] * { -webkit-text-fill-color: transparent !important; text-shadow: none !important; text-decoration-color: transparent !important; }',
  // псевдоэлементы самого элемента — его отрисовка, остаются
  own: '.em [data-rt] * { visibility: hidden !important; } .em [data-rt] { -webkit-text-fill-color: transparent !important; text-shadow: none !important; }',
};

// Начало области — по целым пикселям: одинаковые элементы на дробных y (кнопки 709.09 и 1235.58) снимаются
// побайтно одинаково и становятся одним файлом.
const snap = (r: Rect): Rect => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.max(1, Math.round(r.w)), h: Math.max(1, Math.round(r.h)) });

async function draw(el: Element, f: Frame, mode: RasterMode, scale: number, rect: Rect, backdrop?: string) {
  const { w, h } = rect;
  el.setAttribute('data-rt', '');
  const clone = f.em.cloneNode(true) as HTMLElement;
  el.removeAttribute('data-rt');
  // чужие картинки не тащим в SVG — размеры у них заморожены, раскладка не съедет
  for (const img of clone.querySelectorAll('img')) if (!img.closest('[data-rt]')) img.removeAttribute('src');
  const html = await inlineAssets(new XMLSerializer().serializeToString(clone));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w * scale}" height="${h * scale}" viewBox="${rect.x} ${rect.y} ${w} ${h}">`
    + (backdrop ? `<rect x="${rect.x}" y="${rect.y}" width="${w}" height="${h}" fill="${backdrop}"/>` : '')
    + `<foreignObject x="0" y="0" width="600" height="${Math.ceil(f.emRect.height)}"><div xmlns="http://www.w3.org/1999/xhtml">`
    + `<style>${f.css} .em{visibility:hidden;background:transparent!important} .em [data-rt]${backdrop ? ', .em > .e-bgl' : ''}{visibility:visible!important} ${MODE_CSS[mode]}</style>`
    + `${html}</div></foreignObject></svg>`;
  const img = new Image();
  const ready = loaded(img);
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  await ready;
  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;
  canvas.getContext('2d', { willReadFrequently: true })!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Доля прозрачных пикселей. */
const clearShare = (c: HTMLCanvasElement) => {
  const d = c.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] < 250) n++;
  return n / (d.length / 4);
};

async function toShot(canvas: HTMLCanvasElement, rect: Rect, type: Shot['type']): Promise<Shot> {
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Не удалось снять картинку'))), type, 0.85));
  return { blob, type, rect, hash: await contentHash(blob) };
}

/**
 * Элемент → картинка. rect — область снятия (по умолчанию рамка элемента).
 * Мелкая или с заметной прозрачностью — PNG; крупная (фото hero, баннер) — JPEG, а редкие прозрачные места
 * (полоса под фото) закрываются фоном письма — цветом и слоем фона, как они лягут в письме.
 */
export async function shoot(el: Element, f: Frame, o: { mode: RasterMode; scale?: 1 | 2; rect?: Rect }): Promise<Shot> {
  const rect = snap(o.rect ?? relRect(el, f)), scale = o.scale ?? 2;
  const canvas = await draw(el, f, o.mode, scale, rect);
  if (rect.w * rect.h <= JPEG_AREA) return toShot(canvas, rect, 'image/png');
  const clear = clearShare(canvas);
  if (!clear) return toShot(canvas, rect, 'image/jpeg');
  if (clear > JPEG_CLEAR) return toShot(canvas, rect, 'image/png');
  return toShot(await draw(el, f, o.mode, scale, rect, f.win.getComputedStyle(f.em).backgroundColor), rect, 'image/jpeg');
}

/** Слой фона письма во всю высоту, без сплошного цвета (его даёт plan.color). Паттерн 2×, фото 1×; нет слоя — null. */
export async function shootBackground(f: Frame, doc: EmailDoc): Promise<Shot | null> {
  const layer = f.em.querySelector('.e-bgl');
  if (!layer) return null;
  return shoot(layer, f, { mode: 'whole', scale: doc.bg.mode === 'image' ? 1 : 2, rect: { x: 0, y: 0, w: 600, h: f.emRect.height } });
}
