// Цвета, скругления и фон письма → CSS-переменные для рендера.

import { variantBorder, variantRadius } from '@/model/catalog';
import type { Block, EmailDoc, FontName, PatternName, Radius, Theme } from '@/model/types';

export const radCss = (r: Radius) => (Array.isArray(r) ? r.map((x) => `${x}px`).join(' ') : `${r}px`);

export function hexToRgb(h: string): [number, number, number] {
  const m = h.replace('#', '');
  const n = parseInt(m.length === 3 ? m.split('').map((c) => c + c).join('') : m, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgbToHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('');
const luminance = (h: string) => { const [r, g, b] = hexToRgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
/** Цвет текста поверх заливки: тёмный на светлом, белый на тёмном. */
export const inkFor = (h: string) => (luminance(h) > 0.6 ? '#111111' : '#ffffff');
export const isHex = (v: string) => /^#[0-9a-f]{6}$/i.test(v);

const mix = (h: string, to: [number, number, number], k: number) => {
  const c = hexToRgb(h);
  return rgbToHex(c[0] + (to[0] - c[0]) * k, c[1] + (to[1] - c[1]) * k, c[2] + (to[2] - c[2]) * k);
};
/** Затемнить/осветлить цвет, пока его яркость не попадёт в нужную сторону от порога. */
function towards(h: string, dark: boolean, limit: number) {
  let c = h;
  for (let i = 0; i < 20 && (dark ? luminance(c) > limit : luminance(c) < limit); i++) c = mix(c, dark ? [0, 0, 0] : [255, 255, 255], 0.12);
  return c;
}

/**
 * Цвета кнопки: кнопка уходит в картинку, поэтому градиент держим в диапазоне, где текст читается.
 * Белый текст (по умолчанию) — заливка не светлее порога; тёмный текст — не темнее.
 */
export function buttonVars(accent: string, ink = '#ffffff') {
  const white = luminance(ink) > 0.5;
  const top = white ? towards(accent, true, 0.5) : towards(accent, false, 0.62);
  const bot = white ? mix(top, [0, 0, 0], 0.4) : towards(mix(top, [0, 0, 0], 0.15), false, 0.5);
  const hi = mix(top, [255, 255, 255], white ? 0.22 : 0.35);
  return `--btn-top:${top};--btn-bot:${bot};--btn-hi:${hi};--btn-ink:${ink};`;
}

export const FONT_STACK: Record<FontName, string> = {
  Verdana: 'Verdana, Geneva, sans-serif',
  Arial: 'Arial, Helvetica, sans-serif',
  Tahoma: 'Tahoma, Geneva, sans-serif',
  Roboto: "'Roboto', Arial, sans-serif",
};

export function emailVars(doc: EmailDoc) {
  const t = doc.theme;
  return `--bg:${t.bg};--card:${t.card};--acc:${t.accent};--acc-ink:${inkFor(t.accent)};`
    + `--txt:${t.text};--rad:${radCss(t.radius)};--font:${FONT_STACK[t.font]};${buttonVars(t.accent)}`;
}

/** Действующая обводка блока: своя из «Стиля блока» или та, что задана вариантом в Figma. */
export const effectiveBorder = (b: Block): Radius => b.style.borderW ?? variantBorder(b.type, b.v) ?? 0;

/** Обводка есть: толщина > 0 хотя бы с одной стороны. */
export const hasBorder = (b: Block) => {
  const w = effectiveBorder(b);
  return Array.isArray(w) ? w.some((x) => x > 0) : !!w;
};

export function blockVars(b: Block, doc?: EmailDoc) {
  const st = b.style;
  let v = '';
  // кнопки блока: свой акцент или свой цвет текста кнопки пересчитывают заливку
  if (doc && (st.accent || (b.type === 'cta' && st.text))) v += buttonVars(st.accent ?? doc.theme.accent, b.type === 'cta' ? st.text : undefined);
  if (st.card) v += `--card:${st.card};`;
  if (st.accent) v += `--acc:${st.accent};--acc-ink:${inkFor(st.accent)};`;
  if (st.text && b.type !== 'cta') v += `--txt:${st.text};`;
  // плашку убрали — все заливки блока цвета плашек становятся прозрачными
  if (st.cardMode === 'off') v += '--card:transparent;';
  // у кнопок своё скругление — общее скругление макета на них не распространяется
  const vr = variantRadius(b.type, b.v);
  if (st.radius != null) v += `${b.type === 'cta' ? '--btn-rad' : '--rad'}:${radCss(st.radius)};`;
  else if (vr != null) v += `--rad:${vr}px;`;
  // цвет обводки по умолчанию — акцент (своего или общего стиля)
  if (hasBorder(b)) v += `--bd-c:${st.border ?? 'var(--acc)'};--bd-w:${radCss(effectiveBorder(b))};`;
  return v;
}

/** Тайл-SVG с тонкой линией: размер тайла = z, линия всегда 1px — паттерн не шумит при любом масштабе. */
const svgTile = (w: number, h: number, body: string, c: string) =>
  `url('data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" fill="none" stroke="${c}" stroke-width="1">${body}</svg>`)}') 0 0/${w}px ${h}px`;

// спокойные паттерны: линии в 1px и много воздуха
export const PATTERN_CSS: Record<PatternName, (z: number, c?: string) => string> = {
  diag: (z, c = '#fff') => `repeating-linear-gradient(135deg,${c} 0 1px,transparent 1px ${z / 2}px)`,
  dots: (z, c = '#fff') => `radial-gradient(${c} 1px,transparent 1.5px) 0 0/${z / 2}px ${z / 2}px`,
  grid: (z, c = '#fff') => `linear-gradient(${c} 1px,transparent 1px) 0 0/${z}px ${z}px,linear-gradient(90deg,${c} 1px,transparent 1px) 0 0/${z}px ${z}px`,
  plus: (z, c = '#fff') => { const m = z / 2; return svgTile(z, z, `<path d="M${m} ${m - 3}v6M${m - 3} ${m}h6"/>`, c); },
  diamond: (z, c = '#fff') => { const m = z / 2; return svgTile(z, z, `<path d="M${m} 0.5L${z - 0.5} ${m}L${m} ${z - 0.5}L0.5 ${m}Z"/>`, c); },
  waves: (z, c = '#fff') => { const h = z / 2; return svgTile(z, h, `<path d="M0 ${h / 2}Q${z / 4} ${h / 2 - z / 8} ${z / 2} ${h / 2}T${z} ${h / 2}"/>`, c); },
  circles: (z, c = '#fff') => { const m = z / 2; return svgTile(z, z, `<circle cx="${m}" cy="${m}" r="${z / 3}"/>`, c); },
  chevron: (z, c = '#fff') => { const h = z / 2; return svgTile(z, h, `<path d="M0 ${h * 0.75}L${z / 2} ${h * 0.25}L${z} ${h * 0.75}"/>`, c); },
};

/** CSS слоя поверх цвета фона письма; пустая строка — слоя нет. */
export function bgLayerCss(doc: EmailDoc) {
  const g = doc.bg;
  if (g.mode === 'pattern') {
    // у старых черновиков могут быть паттерны, которых больше нет
    const bg = g.tile ? `url('${g.tile}') 0 0/${g.scale * 3}px auto repeat` : (PATTERN_CSS[g.pattern] ?? PATTERN_CSS.diamond)(g.scale);
    return `background:${bg};opacity:${g.opacity / 100};`;
  }
  if (g.mode === 'image' && g.image) {
    const fit = { 'repeat-y': '0 0/100% auto repeat-y', top: '0 0/100% auto no-repeat', cover: 'center/cover no-repeat' }[g.fit];
    return `background:url('${g.image}') ${fit};opacity:${g.opacity / 100};`;
  }
  return '';
}

type Palette = Pick<Theme, 'bg' | 'card' | 'accent' | 'text'>;

/** Палитра по картинке: самый тёмный тон → фон, самый насыщенный → акцент. */
export function paletteFromImage(url: string): Promise<Palette | null> {
  return new Promise((resolve) => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas');
      c.width = c.height = 24;
      const x = c.getContext('2d');
      if (!x) return resolve(null);
      x.drawImage(im, 0, 0, 24, 24);
      const d = x.getImageData(0, 0, 24, 24).data;
      const px: { r: number; g: number; b: number; l: number; sat: number }[] = [];
      for (let i = 0; i < d.length; i += 4) {
        const [r, g, b] = [d[i], d[i + 1], d[i + 2]];
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        px.push({ r, g, b, l: (r + g + b) / 3, sat: mx ? (mx - mn) / mx : 0 });
      }
      px.sort((a, b) => a.l - b.l);
      const dark = px[Math.floor(px.length * 0.08)];
      const vivid = [...px].filter((p) => p.l > 60).sort((a, b) => b.sat - a.sat)[0] ?? px[px.length - 1];
      const mix = (p: typeof dark, k: number) => rgbToHex(p.r * k, p.g * k, p.b * k);
      resolve({ bg: mix(dark, 0.55), card: mix(dark, 0.9), accent: rgbToHex(vivid.r, vivid.g, vivid.b), text: '#f2f4f5' });
    };
    im.onerror = () => resolve(null);
    im.src = url;
  });
}
