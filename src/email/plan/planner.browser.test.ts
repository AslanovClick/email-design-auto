import { expect, test } from 'vitest';
import { createBlock, createEmail } from '@/model/factory';
import type { Block } from '@/model/types';
import snapshot from '../../../n8n/tools/fixtures/html_gen.plugin-v5.js?raw';
import { patchForApp, runHtmlGen } from '../../../n8n/tools/html-gen.ts';
import { planBody, type Draft } from './planner';
import { mountEmail } from './raster';
import type { BoxItem, BtnItem, ColsItem, HeroItem, ImgItem, PlanItem, TextItem } from './types';

const htmlGen = patchForApp(snapshot);

/** Письмо 20Bet: hero без картинки + проверяемые блоки + футер. */
async function planOf(blocks: Block[], client = '20bet'): Promise<Draft> {
  const doc = { ...createEmail(client, 'blank'), blocks: [createBlock('hero', 0, { imageOn: false }), ...blocks, createBlock('footer', 0)] };
  const f = await mountEmail(doc);
  try { return planBody(f, doc); } finally { f.remove(); }
}

const kids = (it: PlanItem): PlanItem[] => {
  switch (it.k) {
    case 'stack': return it.items;
    case 'row': return it.cells;
    case 'cols': return [...it.cells, ...it.dividers];
    case 'box': return it.content ? [it.content] : [];
    default: return [];
  }
};
const flat = (it: PlanItem): PlanItem[] => [it, ...kids(it).flatMap(flat)];
const all = (d: Draft, k: PlanItem['k']) => flat(d.body).filter((i) => i.k === k);
const find = (d: Draft, k: PlanItem['k']) => all(d, k)[0];
const base = (d: Draft, it: PlanItem) => {
  const key = 'file' in it ? it.file : 'bg' in it ? it.bg : undefined;
  return d.shots.find((s) => s.key === key)?.base;
};
const payloadOf = (d: Draft) => ({
  name: 'x', fileName: 'Test',
  plan: { v: 5, width: 600, height: d.body.h, color: '#000000', bg: null, folder: 'cm/t/x-e1', title: 'Mail', assets: [], body: d.body, warnings: d.warnings },
});
const text = (t: TextItem) => t.runs.map((r) => r.t).join('');

test('текст: заголовок и абзацы — живые, в корне письма', async () => {
  const { body } = await planOf([createBlock('text', 0)]);
  const t = body.items.filter((i) => i.k === 'text') as TextItem[];
  expect(text(t[0])).toBe('Привет, {{name}}!');
  expect(t[0].st.ff).toBe('Verdana, Arial, Helvetica, sans-serif');
  expect(t[0].st.c).toBe('#f2f5f6');
  expect(t.length).toBeGreaterThan(1);
  expect(t[1].wrap).toBe(true);
});

test('элементы корня идут сверху вниз и не выходят за письмо', async () => {
  const { body } = await planOf([createBlock('text', 0), createBlock('cta', 0)]);
  for (let i = 1; i < body.items.length; i++) expect(body.items[i].y).toBeGreaterThanOrEqual(body.items[i - 1].y);
  for (const it of flat(body)) { expect(it.x).toBeGreaterThanOrEqual(0); expect(it.x + it.w).toBeLessThanOrEqual(600.5); }
});

test('спецсимволы: сырой текст в runs, экранирование в HTML', async () => {
  const d = await planOf([createBlock('text', 0, { title: 'A & <b> {{name}}' })]);
  expect(JSON.stringify(d.body)).toContain('A & <b> {{name}}');
  expect(await runHtmlGen(htmlGen, payloadOf(d))).toContain('A &amp; &lt;b&gt; {{name}}');
});

test('текст в рамке → box с рамкой 4px', async () => {
  const d = await planOf([createBlock('text', 2)]);
  const box = all(d, 'box').find((b) => (b as BoxItem).border) as BoxItem;
  expect(box.border!.w).toEqual([4, 4, 4, 4]);
  expect(flat(box).some((i) => i.k === 'text')).toBe(true);
});

test('экспресс с градиентной рамкой → подложка + живой текст', async () => {
  const d = await planOf([createBlock('multibet', 0)]);
  const box = all(d, 'box').find((b) => (b as BoxItem).bg) as BoxItem;
  expect(box.bg).toMatch(/^#shot/);
  expect(find(d, 'box')).toBeDefined();
  expect((flat(box).filter((i) => i.k === 'text') as TextItem[]).map(text)).toContain('Football');
});

test('рекомендация со ссылкой: ссылка на текстах', async () => {
  const d = await planOf([createBlock('recodds', 1, { link: 'https://x.com' })]);
  const block = d.body.items.filter((i) => i.id.startsWith(d.body.items.find((x) => flat(x).some((y) => y.k === 'text' && text(y as TextItem).includes('Рекомендуем')))!.id.split(':')[0]));
  const runs = block.flatMap(flat).filter((i) => i.k === 'text').flatMap((t) => (t as TextItem).runs);
  expect(runs.length).toBeGreaterThan(0);
  for (const r of runs) expect(r.ln).toBe('https://x.com');
});

test('нет картинки → заглушка картинкой и предупреждение', async () => {
  const d = await planOf([createBlock('bullets', 9, { image: '' })]);
  expect(all(d, 'img').map((i) => base(d, i))).toContain('img');
  expect(d.warnings.map((w) => w.message).join('\n')).toMatch(/«Контент» не загружена картинка/);
});

test('у каждого блока есть элементы', async () => {
  const doc = createEmail('20bet', 'sport-match');
  const f = await mountEmail(doc);
  const d = planBody(f, doc);
  f.remove();
  const ids = new Set(flat(d.body).map((i) => i.id.split(':')[0]));
  for (const b of doc.blocks) expect(ids.has(b.id), b.type).toBe(true);
});

test('снимки: ключи уникальны и все используются', async () => {
  const d = await planOf([createBlock('multibet', 0), createBlock('bullets', 9, { image: '' })]);
  const keys = d.shots.map((s) => s.key);
  expect(new Set(keys).size).toBe(keys.length);
  const json = JSON.stringify(d.body);
  for (const k of keys) expect(json).toContain(`"${k}"`);
});

// --- подсказки data-plan (задача 7)

test('hero: одна картинка main, зоны лого и лиги', async () => {
  const { body, shots } = await planOf([]);   // hero по умолчанию: hv 0 (лого · дата · лига)
  const h = body.items[0] as HeroItem;
  expect(h.k).toBe('hero');
  expect(shots.find((s) => s.key === h.file)!.base).toBe('main');
  expect(h.zones.map((z) => z.ln)).toEqual(['https://20bet.com', 'https://www.google.com/']);
  for (const z of h.zones) { expect(z.y).toBeGreaterThanOrEqual(h.y); expect(z.y + z.h).toBeLessThanOrEqual(h.y + h.h + 0.5); }
});

test('hero со ссылкой лого из поля', async () => {
  const doc = { ...createEmail('20bet', 'blank'), blocks: [createBlock('hero', 3, { imageOn: false, logoLink: 'https://x.com/promo' })] };
  const f = await mountEmail(doc);
  const h = planBody(f, doc).body.items[0] as HeroItem;
  f.remove();
  expect(h.zones.map((z) => z.ln)).toEqual(['https://x.com/promo', 'https://www.google.com/']);
});

test('кнопка: подложка без текста, живая надпись, заглушка ссылки, бортик', async () => {
  const d = await planOf([createBlock('cta', 0)]);
  const b = find(d, 'btn') as BtnItem;
  expect(text(b.text as TextItem)).toBe('Bet Now');
  expect(b.ln).toBe('https://www.google.com/');
  expect(b.bg).toMatch(/^#shot/);
  expect(d.shots.find((s) => s.key === b.bg)).toMatchObject({ base: 'btn', mode: 'nobg' });
  expect(b.pad[1]).toBeGreaterThan(b.pad[0]);
  expect(b.text.runs.every((r) => !r.ln)).toBe(true);
});

test('кнопка внутри блока — тоже btn', async () => {
  const d = await planOf([createBlock('bullets', 9, { cta: 'Play', link: 'https://x.com' })]);
  const b = find(d, 'btn') as BtnItem;
  expect([text(b.text as TextItem), b.ln]).toEqual(['Play', 'https://x.com']);
});

test('коэффициенты: 3 равные колонки; в рамке — 2 линии', async () => {
  const a = find(await planOf([createBlock('odds', 0)]), 'cols') as ColsItem;
  expect(a.cells).toHaveLength(3);
  expect(a.shares).toBeUndefined();
  const d = await planOf([createBlock('odds', 1)]);
  const c = find(d, 'cols') as ColsItem;
  expect(c.dividers).toHaveLength(2);
  expect(all(d, 'box').some((b) => (b as BoxItem).content === c)).toBe(true);
});

test('факты: строка статистики — колонки, подпись посередине шире', async () => {
  const c = find(await planOf([createBlock('facts', 0)]), 'cols') as ColsItem;
  expect(c.cells).toHaveLength(3);
  expect(c.shares![1]).toBeGreaterThan(c.shares![0]);
  expect(c.shares![0]).toBe(c.shares![2]);
});

test('таймер: картинка со ссылкой, подпись — текстом', async () => {
  const d = await planOf([createBlock('timer', 0)]);
  const img = (all(d, 'img') as ImgItem[]).find((i) => base(d, i) === 'timer')!;
  expect(img.ln).toBe('https://www.google.com/');
  expect((all(d, 'text') as TextItem[]).map(text)).toContain('Срок действия предложения:');
});

test('иннер и разделитель — картинки', async () => {
  const d = await planOf([createBlock('inner', 2), createBlock('separator', 3)]);
  const bases = (all(d, 'img') as ImgItem[]).map((i) => base(d, i));
  expect(bases).toContain('banner');
  expect(bases).toContain('sep');
  expect((all(d, 'text') as TextItem[]).map(text)).not.toContain('Liverpool');
});

test('футер: лого, платёжки, сторы, почта, отписка', async () => {
  const d = await planOf([]);
  const imgs = all(d, 'img') as ImgItem[];
  expect(imgs.find((i) => base(d, i) === 'logo')!.ln).toBe('https://20bet.com');
  expect(imgs.find((i) => base(d, i) === 'payments')!.ln).toBeUndefined();
  expect(imgs.filter((i) => ['apple', 'android'].includes(base(d, i)!)).map((i) => [i.alt, i.ln])).toEqual([
    ['Download on the App Store', 'https://www.google.com/'], ['Get it on Google Play', 'https://www.google.com/']]);
  const runs = (all(d, 'text') as TextItem[]).flatMap((t) => t.runs);
  expect(runs.find((r) => r.t === 'support@20bet.com')!.ln).toBe('mailto:support@20bet.com');
  expect(runs.find((r) => r.t === 'Unsubscribe')!.ln).toBe('{{unsubscribe}}');
});

test('ни одной пустой ссылки и # в шаблоне', async () => {
  const doc = createEmail('20bet', 'sport-match');
  const f = await mountEmail(doc);
  const d = planBody(f, doc);
  f.remove();
  const html = await runHtmlGen(htmlGen, payloadOf(d));
  expect(html).not.toContain('href="#"');
  expect(html).not.toContain('href=""');
});

test('плашка коэффициентов: колонки по высоте ячеек — у плашки остаются отступы', async () => {
  const d = await planOf([createBlock('odds', 1)]);
  const c = find(d, 'cols') as ColsItem;
  const box = all(d, 'box').find((b) => (b as BoxItem).content === c)!;
  const top = Math.min(...c.cells.map((x) => x.y)), bottom = Math.max(...c.cells.map((x) => x.y + x.h));
  expect([c.y, c.y + c.h]).toEqual([top, bottom]);
  expect(c.y - box.y).toBeGreaterThan(5);
});

test('факты: средняя колонка вмещает подпись с запасом', async () => {
  const doc = createEmail('20bet', 'sport-details');
  const f = await mountEmail(doc);
  const d = planBody(f, doc);
  f.remove();
  for (const c of all(d, 'cols') as ColsItem[]) {
    if (!c.shares) continue;
    const total = c.shares.reduce((s, v) => s + v, 0);
    const mid = (c.w * c.shares[1]) / total - 16;   // минус COL_PAD по бокам в html_gen
    if (!(c.cells[1] as TextItem).wrap) expect(mid).toBeGreaterThanOrEqual(c.cells[1].w + 20);
  }
});
