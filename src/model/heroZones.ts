// Зоны клика на картинке hero «без хедера»: логотипы нарисованы прямо на картинке, и приложение знает,
// где они, только из этих зон. В письме это прозрачные ссылки поверх картинки (зоны плана v5).
// Хранятся в data.zones строкой JSON: { logo?: [x, y, w, h], league?: [x, y, w, h] } в px картинки шириной 600.

import { ASSET } from './presets';
import type { BlockData } from './types';

export type ZoneKind = 'logo' | 'league';
export type ZoneRect = [number, number, number, number];
export type HeroZones = Partial<Record<ZoneKind, ZoneRect>>;

export const ZONE_KINDS: ZoneKind[] = ['logo', 'league'];

/** Новая зона — в углу хедера, как лого и лига в хедере приложения. */
export const DEFAULT_ZONES: Record<ZoneKind, ZoneRect> = { logo: [24, 18, 150, 56], league: [426, 18, 150, 56] };

// где на картинках шаблонов нарисованы логотипы (размечено по картинкам, с запасом в несколько px)
const TEMPLATE_ZONES: Record<string, HeroZones> = {
  'sport1-hero.png': { logo: [24, 22, 136, 60], league: [432, 20, 146, 66] },
  'sport2-hero.png': { logo: [210, 24, 180, 52], league: [262, 128, 76, 78] },
  'casino1-hero.png': { logo: [20, 16, 154, 52] },
  'casino2-hero.png': { logo: [228, 22, 142, 56] },
  'vip-hero.png': { logo: [196, 22, 208, 52] },
  'promo-hero.png': { logo: [178, 12, 242, 68] },
};
const templateZones = (image: unknown) => {
  const file = Object.keys(TEMPLATE_ZONES).find((f) => image === ASSET(`samples/tpl/${f}`));
  return file ? TEMPLATE_ZONES[file] : {};
};

const isRect = (v: unknown): v is ZoneRect => Array.isArray(v) && v.length === 4 && v.every((n) => typeof n === 'number' && isFinite(n));

/** Свои зоны блока; не задавались — зоны картинки шаблона (так их получают и старые черновики). */
export function zonesOf(d: BlockData): HeroZones {
  if (typeof d.zones !== 'string') return { ...templateZones(d.image) };
  try {
    const raw = JSON.parse(d.zones) as Record<string, unknown>;
    return Object.fromEntries(ZONE_KINDS.filter((k) => isRect(raw?.[k])).map((k) => [k, raw[k]])) as HeroZones;
  } catch {
    return {};
  }
}

export const zonesValue = (z: HeroZones) => JSON.stringify(z);

const MIN = 16;

/** Зона после перетаскивания (move) или растягивания за угол (resize) на dx, dy — в пределах картинки, целые px. */
export function dragZone([x, y, w, h]: ZoneRect, dx: number, dy: number, mode: 'move' | 'resize', b: { w: number; h: number }): ZoneRect {
  const clamp = (v: number, lo: number, hi: number) => Math.round(Math.min(Math.max(v, lo), Math.max(lo, hi)));
  if (mode === 'move') return [clamp(x + dx, 0, b.w - w), clamp(y + dy, 0, b.h - h), w, h];
  return [x, y, clamp(w + dx, MIN, b.w - x), clamp(h + dy, MIN, b.h - y)];
}

// --- Элементы хедера (лого, дата, лига) можно сдвинуть мышью на превью. В data.pos — смещения [dx, dy] от их
// места в раскладке хедера. Зоны клика в письме идут за элементами сами: планировщик берёт их реальное место.

export type DragKind = 'logo' | 'date' | 'league';
export type HeroPos = Partial<Record<DragKind, [number, number]>>;

export const DRAG_KINDS: DragKind[] = ['logo', 'date', 'league'];

const isPair = (v: unknown): v is [number, number] => Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === 'number' && isFinite(n));

export function posOf(d: BlockData): HeroPos {
  if (typeof d.pos !== 'string') return {};
  try {
    const raw = JSON.parse(d.pos) as Record<string, unknown>;
    return Object.fromEntries(DRAG_KINDS.filter((k) => isPair(raw?.[k])).map((k) => [k, raw[k]])) as HeroPos;
  } catch {
    return {};
  }
}

export const posValue = (p: HeroPos) => JSON.stringify(p);

/** Новое смещение элемента: el — его рамка сейчас (уже со смещением cur) в координатах hero; не выходит за hero. */
export function dragPos(cur: [number, number], el: { x: number; y: number; w: number; h: number }, dx: number, dy: number,
  hero: { w: number; h: number }): [number, number] {
  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));
  const x = clamp(el.x + dx, 0, hero.w - el.w), y = clamp(el.y + dy, 0, hero.h - el.h);
  return [Math.round(cur[0] + x - el.x), Math.round(cur[1] + y - el.y)];
}
