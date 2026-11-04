// Стиль текста для plan — по правилам плагина (ПРАВИЛА_вёрстки_v5, раздел C): почтовые стеки шрифтов,
// белый = #fdfdfd, полупрозрачный цвет смешивается с фоном письма, line-height относительный.

import type { StyleDiff, TextStyle } from './types';

export type CssLike = Pick<CSSStyleDeclaration,
  'fontFamily' | 'fontSize' | 'fontWeight' | 'color' | 'lineHeight' | 'textTransform' | 'letterSpacing' | 'textDecorationLine'>;

// копия SAFE_FONTS из code.js плагина
export const SAFE_FONTS: Record<string, string> = {
  verdana: 'Verdana, Arial, Helvetica, sans-serif',
  arial: 'Arial, Helvetica, sans-serif',
  helvetica: 'Helvetica, Arial, sans-serif',
  tahoma: 'Tahoma, Verdana, Arial, sans-serif',
  'trebuchet ms': "'Trebuchet MS', Arial, sans-serif",
  georgia: "Georgia, 'Times New Roman', serif",
  'times new roman': "'Times New Roman', Times, serif",
  'courier new': "'Courier New', Courier, monospace",
};
// узкие гротески — на Arial: Verdana заметно шире, строка не помещается (NARROW_SANS плагина)
const NARROW_SANS = /^(roboto|inter|open sans|helvetica neue|lato|sf pro.*|source sans.*|noto sans|pt sans|segoe ui)$/;

export function fontStack(fontFamily: string): string {
  const k = fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, '').toLowerCase();
  return SAFE_FONTS[k] ?? (NARROW_SANS.test(k) ? SAFE_FONTS.arial : SAFE_FONTS.verdana);
}

/** [r, g, b, a]: r/g/b 0–255, a 0–1. Градиенты и прочее — null. */
export function parseColor(css: string): [number, number, number, number] | null {
  const s = css.trim().toLowerCase();
  if (s === 'transparent') return [0, 0, 0, 0];
  let m = s.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    const v = (i: number) => parseInt(h.slice(i, i + 2), 16);
    return [v(0), v(2), v(4), h.length === 8 ? v(6) / 255 : 1];
  }
  m = s.match(/^(rgba?|color)\((.*)\)$/);
  if (!m) return null;
  const srgb = m[1] === 'color';
  const body = srgb ? m[2].replace(/^srgb\s+/, '') : m[2];
  const parts = body.split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3) return null;
  const alpha = (p?: string) => (p == null ? 1 : p.endsWith('%') ? parseFloat(p) / 100 : parseFloat(p));
  const chan = (p: string) => (p.endsWith('%') ? parseFloat(p) * 2.55 : srgb ? parseFloat(p) * 255 : parseFloat(p));
  return [chan(parts[0]), chan(parts[1]), chan(parts[2]), alpha(parts[3])];
}

const hex2 = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');

/** #rrggbb поверх фона письма; прозрачный — null; #ffffff → #fdfdfd (конвенция эталонов). */
export function normColor(css: string, page: string): string | null {
  const c = parseColor(css);
  if (!c || c[3] <= 0) return null;
  const u = parseColor(page) ?? [0, 0, 0, 1];
  const [r, g, b] = [0, 1, 2].map((i) => c[i] * c[3] + u[i] * (1 - c[3]));
  const hex = '#' + hex2(r) + hex2(g) + hex2(b);
  return hex === '#ffffff' ? '#fdfdfd' : hex;
}

/** Относительный line-height: normal → 1.2, как у верстальщика. */
export function lineHeight(cs: Pick<CssLike, 'lineHeight' | 'fontSize'>): string {
  const lh = parseFloat(cs.lineHeight), fs = parseFloat(cs.fontSize);
  if (!cs.lineHeight.endsWith('px') || !(lh > 0) || !(fs > 0)) return '1.2';
  return String(Math.round((lh / fs) * 100) / 100);
}

const none = (v: string, empty: string[]) => (!v || empty.includes(v) ? null : v);

export function textStyle(cs: CssLike, page: string): TextStyle {
  return {
    ff: fontStack(cs.fontFamily),
    fs: Math.round(parseFloat(cs.fontSize) * 10) / 10,
    fw: Number(cs.fontWeight) || 400,
    c: normColor(cs.color, page) ?? '#fdfdfd',
    lh: lineHeight(cs),
    tt: none(cs.textTransform, ['none']),
    ls: none(cs.letterSpacing, ['normal', '0px']),
    dec: none(cs.textDecorationLine, ['none']),
  };
}

const DIFF_KEYS = ['c', 'ff', 'fs', 'fw', 'lh', 'tt', 'dec'] as const;

/** Отличия прогона от стиля текста; снятые tt/dec — 'none' (как в плагине). */
export function styleDiff(base: TextStyle, s: TextStyle): StyleDiff {
  const d: Record<string, unknown> = {};
  for (const k of DIFF_KEYS) if (s[k] !== base[k]) d[k] = s[k] ?? 'none';
  return d as StyleDiff;
}
