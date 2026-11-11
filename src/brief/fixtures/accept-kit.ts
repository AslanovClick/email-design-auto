// Помощники приёмочных проверок «Собрать по ТЗ» (accept.test.ts и локальные examples/checks.ts).
import { expect } from 'vitest';
import { fieldsFor } from '@/model/catalog';
import { parseItems, type Item } from '@/model/items';
import type { Block, EmailDoc } from '@/model/types';
import type { PlanDoc } from '../build';

export type Check = (p: Block[], doc: EmailDoc, plan: PlanDoc) => void;

export const of = (p: Block[], type: string) => p.filter((b) => b.type === type);
export const count = (p: Block[], type: string) => of(p, type).length;
export const has = (p: Block[], type: string) => count(p, type) > 0;
export const hero = (p: Block[]) => of(p, 'hero')[0];
export const footer = (p: Block[]) => of(p, 'footer')[0];
export const textVariant = (p: Block[], v: number) => of(p, 'text').some((b) => b.v === v);
export const items = (b: Block, key: string): Item[] => parseItems(b.data[key]);
export const steps = (p: Block[]) => of(p, 'bullets').filter((b) => b.v === 3 || b.v === 11).flatMap((b) => items(b, 'steps'));
export const cards = (p: Block[]) => of(p, 'bullets').filter((b) => b.v === 10).flatMap((b) => items(b, 'cards'));
export const factRows = (p: Block[]) => of(p, 'facts').flatMap((b) => items(b, 'rows'));
export const teams = (p: Block[]) => p.filter((b) => b.type === 'hero' || b.type === 'inner').map((b) => [b.data.team1, b.data.team2]);
/** Весь видимый текст письма: поля варианта и пункты списков. */
export const allText = (p: Block[]) => p.flatMap((b) => fieldsFor(b.type, b.v).flatMap((f) =>
  f.kind === 'items' ? items(b, f.key).flatMap((it) => Object.values(it)) : f.kind === 'image' || f.kind === 'link' ? [] : [String(b.data[f.key] ?? '')])).join('\n');

export interface TopWin {
  offer: Record<string, string>; buttons: [string, string];
  slot: string; provider: string; features: string[]; subject: string; nick: string;
}

/** «Top win» казино — как в макетах дизайнеров: оффер под картинкой и кнопка, текст без чужого приветствия
 *  с выделенными суммами, описание слота, карточка с характеристиками, кнопка. */
export function topWin(p: Block[], doc: EmailDoc, x: TopWin) {
  expect(p.map((b) => `${b.type}/${b.v}`).slice(0, 3)).toEqual(['hero/0', 'text/4', 'cta/0']);
  expect(of(p, 'text')[0].data).toMatchObject(x.offer);
  expect(of(p, 'cta').map((b) => b.data.text)).toEqual(x.buttons);
  const card = of(p, 'bullets');
  expect(card).toHaveLength(1);
  expect(card[0]).toMatchObject({ v: 4, data: expect.objectContaining({ title: x.slot, sub: x.provider }) });
  expect(String(card[0].data.text).split('\n').sort()).toEqual([...x.features].sort());
  expect(doc.subject).toBe(x.subject);
  expect(allText(p)).toContain(`/${x.nick}/`);
  expect(allText(p)).not.toMatch(/Приветствуем|Lorem|Провайдер/);
}
