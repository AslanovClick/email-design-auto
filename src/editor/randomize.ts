// «Случайный стиль» меняет только оформление: цвета и заливки, скругления, обводки, стиль кнопок и паттерн фона.
// Состав письма не трогаем: те же блоки, в том же порядке, с теми же вариантами и контентом.
// Это не чистый рандом, а подбор по правилам, чтобы письмо оставалось цельным:
// - палитра строится от одного оттенка: тёмный фон, чуть светлее плашки, яркий акцент в гармоничном сдвиге;
// - одно скругление на всё письмо: плашки, картинки и кнопки (если форма кнопки его допускает);
// - кнопки — одного стиля, разделители — одного вида на всё письмо;
// - обводка у блоков, где она есть, — одной толщины.

import { catalogOf, PATTERNS, THEME_PRESETS, variantBorder } from '@/model/catalog';
import { hasFactsSep } from '@/model/facts';
import type { Background, Block, BlockStyle, EmailDoc, Radius, Theme } from '@/model/types';

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)];

function hsl(h: number, s: number, l: number) {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return '#' + [f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
}

function palette(): Pick<Theme, 'bg' | 'card' | 'accent' | 'text' | 'preset'> {
  // иногда — один из проверенных пресетов, чаще — новая гармоничная палитра
  if (Math.random() < 0.25) {
    const i = Math.floor(Math.random() * THEME_PRESETS.length);
    const { name: _n, ...p } = THEME_PRESETS[i];
    return { ...p, preset: i };
  }
  const h = rnd(0, 360);
  // акцент: тот же тон, соседний или противоположный — так цвета не спорят
  const ah = (h + pick([0, 0, 0, 25, -25, 180])) % 360;
  const sat = rnd(25, 50);
  return {
    bg: hsl(h, sat, rnd(5, 9)),
    card: hsl(h, sat * 0.8, rnd(12, 17)),
    accent: hsl((ah + 360) % 360, rnd(72, 92), rnd(48, 58)),
    text: hsl(h, 20, rnd(94, 97)),
    preset: -1,
  };
}

// скругление на всё письмо: оно же идёт на кнопки, чтобы письмо было цельным
const RADII: Radius[] = [0, 6, 12, 16, 20, 24, [18, 0, 18, 0], [0, 16, 0, 16]];

function background(): Partial<Background> {
  if (Math.random() < 0.3) return { mode: 'color' };
  return { mode: 'pattern', pattern: pick(PATTERNS), tile: '', tileName: '', scale: Math.round(rnd(24, 52)), opacity: Math.round(rnd(4, 9)) };
}

/** Блоки со встроенной кнопкой: её стиль меняется вместе с отдельными кнопками. */
const hasInnerButton = (b: Block) => b.type === 'league' || (b.type === 'bullets' && [6, 7, 9].includes(b.v));

export function randomizeStyle(doc: EmailDoc): Pick<EmailDoc, 'theme' | 'bg' | 'blocks'> {
  const radius = pick(RADII);
  const theme: Theme = { ...doc.theme, ...palette(), radius, btnRadius: radius };
  const bg: Background = { ...doc.bg, ...background() };
  const btnKind = Math.floor(Math.random() * catalogOf('cta').variants.length);
  const borderW = pick([1, 2, 2, 3, 4]);
  // один вид разделителя: и у блоков «Разделитель», и между строками фактов
  const sepKind = Math.floor(Math.random() * catalogOf('separator').variants.length);

  const blocks: Block[] = doc.blocks.map((b) => {
    // свой стиль блока сбрасываем: цвета теперь общие
    const style: BlockStyle = {};
    // у кого обводка задана вариантом — общая толщина по тем же сторонам
    const vb = variantBorder(b.type, b.v);
    if (vb && Math.random() < 0.8) style.borderW = vb.map((x) => (x ? borderW : 0)) as BlockStyle['borderW'];
    if (b.type === 'cta') return { ...b, v: btnKind, style };
    if (b.type === 'separator') return { ...b, v: sepKind, style };
    if (b.type === 'facts' && hasFactsSep(b.v)) return { ...b, style, data: { ...b.data, sep: sepKind } };
    if (hasInnerButton(b)) return { ...b, style, data: { ...b.data, btn: btnKind } };
    return { ...b, style };
  });
  return { theme, bg, blocks };
}
