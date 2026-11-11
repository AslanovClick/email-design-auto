import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { CATALOG } from '@/model/catalog';
import { createBlock } from '@/model/factory';
import { planFromBrief, type PlanDoc } from './build';
import { cleanBrief, readBriefFile } from './clean';
import { exampleFiles, hasExamples, readExample } from './fixtures/examples';
import { parseBrief, type Brief } from './parse';
import { parsePlan, planToText } from './planText';

// ТЗ клиентов (examples/, только локально) и синтетические — разбор правилами
const synth = (f: string) => parseBrief(cleanBrief(readFileSync(new URL(`./fixtures/synthetic/${f}`, import.meta.url), 'utf8')));
const EXAMPLES: Record<string, PlanDoc> = {};
for (const f of exampleFiles()) {
  const brief = parseBrief(await readBriefFile(f, readExample(f)));
  EXAMPLES[f] = planFromBrief(brief, brief.client ?? '20bet');
}
const SYNTHETIC: Record<string, PlanDoc> = Object.fromEntries(['weekend.txt', 'topwin.md'].map((f) => {
  const brief = synth(f);
  return [f, planFromBrief(brief, brief.client ?? '20bet')];
}));
const WEEKEND = SYNTHETIC['weekend.txt'];

// пример текста плана из §6.2 спеки — первый ```-блок раздела
const spec = readFileSync(new URL('../../docs/superpowers/specs/2026-11-11-brief-ai-plan-design.md', import.meta.url), 'utf8');
const SPEC_EXAMPLE = /### 6\.2[\s\S]*?```\r?\n([\s\S]*?)```/.exec(spec)![1];

const head: Omit<PlanDoc, 'blocks'> = { client: '20bet', kind: 'promo', name: 'Все блоки', subject: 'Тема', preheader: '', notes: ['заметка'] };
const ALL_KINDS = CATALOG.filter((c) => !c.hidden).flatMap((c) => c.variants.map((_, v) => createBlock(c.type, v)));

const types = (p: PlanDoc) => p.blocks.map((b) => b.block.type);

test.skipIf(!hasExamples)('обратимость на плане из каждого ТЗ клиентов (разбор правилами)', () => {
  for (const [f, p] of Object.entries(EXAMPLES)) {
    const text = planToText(p);
    const { plan, errors } = parsePlan(text, '20bet');
    expect(errors, f).toEqual([]);
    expect(planToText(plan), f).toBe(text);
    expect(types(plan), f).toEqual(types(p));
  }
});

test('обратимость на плане из синтетических ТЗ (разбор правилами)', () => {
  for (const [f, p] of Object.entries(SYNTHETIC)) {
    const text = planToText(p);
    const { plan, errors } = parsePlan(text, '20bet');
    expect(errors, f).toEqual([]);
    expect(planToText(plan), f).toBe(text);
    expect(types(plan), f).toEqual(types(p));
  }
});

test('обратимость на всех видах блоков и вариантах', () => {
  const text = planToText({ ...head, blocks: ALL_KINDS.map((block) => ({ block, origin: 'tz' })) });
  const { plan, errors } = parsePlan(text, '20bet');
  expect(errors).toEqual([]);
  expect(planToText(plan)).toBe(text);
});

test('шапка, кнопка с текстом на строке заголовка, заметки', () => {
  const text = planToText(WEEKEND);
  expect(text).toMatch(/^Клиент: Vave\nТип: Спорт\nНазвание: Vave Friday Freebet\nТема: Пятничный фрибет для вас\n/);
  expect(text).toContain('\n[Кнопка] Забрать фрибет\n');
  expect(text).toContain('[Hero · Только картинка]');
  expect(text).toContain('Текст для картинки: Пятница с фрибетом / 10 EUR без депозита');
  expect(text).toContain('[Контент · Шаги по порядку] Как активировать фрибет:\n- Войдите в свой аккаунт /Vave/');
  expect(text).toMatch(/\nДля дизайнера:\n- Пуш \(в письмо не идёт\): Фрибет 10 EUR ждёт тебя\n$/);
});

test('пример из спеки читается', () => {
  const { plan, errors } = parsePlan(SPEC_EXAMPLE, '20bet');
  expect(errors).toEqual([]);
  expect(types(plan)).toEqual(['hero', 'cta', 'text', 'cta', 'text', 'bullets', 'timer', 'text', 'footer']);
  expect(plan.notes).toEqual(['Промокод действует до воскресенья, 23:59 UTC', 'Ссылка «здесь» в сноске — нужен URL от клиента']);
  expect([plan.client, plan.kind, plan.subject]).toEqual(['vave', 'promo', 'Пятничный фрибет для вас']);
  expect(plan.blocks[0].block.data).toMatchObject({ picText: 'Пятница с фрибетом / 10 EUR без депозита / Промокод: FRIDAY10', teamsOn: false });
  expect(plan.blocks[4].block.data).toMatchObject({ title: 'Как активировать фрибет:', titleOn: true });
});

test('опечатки — ошибки строк, остальное собирается', () => {
  const { plan, errors } = parsePlan('Тема: X\n[Кнопкa] Go\n[Кнопка] Ok\nЦвет: красный\n[Футер]', '20bet');
  expect(errors.map((e) => e.line)).toEqual([2, 4]);
  expect(errors[0]).toMatchObject({ text: '[Кнопкa] Go', message: expect.stringMatching(/блок/i) });
  expect(types(plan)).toEqual(['cta', 'footer']);
  expect(plan.blocks[0].block.data.text).toBe('Ok');
});

test('незнакомый вариант — ошибка, блок остаётся с вариантом по умолчанию', () => {
  const { plan, errors } = parsePlan('[Таймер · Песочные часы] До конца:', '20bet');
  expect(errors.map((e) => e.line)).toEqual([1]);
  expect(plan.blocks[0].block).toMatchObject({ type: 'timer', v: 0, data: { title: 'До конца:' } });
});

test('«[картинка]» посреди абзацев — текст; незнакомый блок с вариантом — ошибка', () => {
  const { plan, errors } = parsePlan('[Текст · Обычный]\nСмотрите:\n[картинка]\nВот так.\n[Текстт · Обычный]\nпотеряно', '20bet');
  expect(plan.blocks[0].block.data.text).toBe('Смотрите:\n[картинка]\nВот так.');
  expect(errors.map((e) => e.line)).toEqual([5]);
});

test('опечатка в подписи поля у текста — ошибка строки, а не абзац', () => {
  const { plan, errors } = parsePlan('[Текст · Обычный]\nЗаголвок: Привет {{name}}!\nОсновной текст.', '20bet');
  expect(errors.map((e) => [e.line, e.message])).toEqual([[2, expect.stringMatching(/Заголвок.*Заголовок/)]]);
  expect(plan.blocks[0].block.data).toMatchObject({ title: '', text: 'Основной текст.' });
});

test('строка с двоеточием в абзаце — текст, а не поле', () => {
  const { plan, errors } = parsePlan('[Текст · Обычный]\nЗаголовок: Привет!\nСрок действия: до 22 ноября.\nУспейте.', '20bet');
  expect(errors).toEqual([]);
  expect(plan.blocks[0].block.data).toMatchObject({ title: 'Привет!', titleOn: true, text: 'Срок действия: до 22 ноября.\nУспейте.' });
});

test('удалённый и переставленный блоки — как в тексте', () => {
  const text = planToText(WEEKEND);
  const blocks = text.split(/\n(?=\[)/);
  const [first, ...rest] = blocks;
  const ctas = rest.filter((b) => b.startsWith('[Кнопка]'));
  const edited = [first, ...rest.filter((b) => !b.startsWith('[Таймер') && !b.startsWith('[Кнопка]')), ...ctas.reverse()].join('\n');
  const { plan, errors } = parsePlan(edited, '20bet');
  expect(errors).toEqual([]);
  expect(types(plan)).not.toContain('timer');
  expect(plan.blocks.filter((b) => b.block.type === 'cta').map((b) => b.block.data.text)).toEqual(['Получить фрибет', 'Забрать фрибет']);
});

test('неизвестный клиент — ошибка и запасной клиент', () => {
  const { plan, errors } = parsePlan('Клиент: Playbaze\n[Футер]', 'vave');
  expect([plan.client, errors[0].line]).toEqual(['vave', 1]);
});

test('факты: строки всех видов туда и обратно', () => {
  const text = '[Факты игр · Детали с полосами] Детали матча:\n- Цифры: 1 | Место в группе | 4\n- Цифры: 10 | Первые голы | 18 | (48%) | (86%)\n- Форма: 0 / 4 / 1 | Динамика (5 последних матчей) | 3 / 1 / 1\n- Три значения: Личные встречи: | 1 / 1 / 3 | победы A / ничьи / победы B\n- Абзац: Просто факт.\n- Факт: Серия. | Пять побед подряд';
  const { plan, errors } = parsePlan(text, '20bet');
  expect(errors).toEqual([]);
  expect(JSON.parse(String(plan.blocks[0].block.data.rows))).toEqual([
    { t: 'stat', l: '1', label: 'Место в группе', r: '4', ls: '', rs: '' },
    { t: 'stat', l: '10', label: 'Первые голы', r: '18', ls: '(48%)', rs: '(86%)' },
    { t: 'form', l: '0 / 4 / 1', label: 'Динамика', sub: '5 последних матчей', r: '3 / 1 / 1' },
    { t: 'h2h', title: 'Личные встречи:', vals: '1 / 1 / 3', labels: 'победы A / ничьи / победы B' },
    { t: 'text', text: 'Просто факт.' },
    { t: 'fact', lead: 'Серия.', text: 'Пять побед подряд' },
  ]);
  expect(planToText({ ...head, blocks: plan.blocks })).toContain(text);
});

test('гербы, которые узнала модель, сохраняются при разборе текста', () => {
  const brief: Brief = { client: '20bet', title: '', subject: '', preheader: '', kind: 'sport', league: 'Лига наций', leagueId: 'uefa-nations', signature: null, notes: [], sections: [],
    matches: [{ date: '15.11.2026', team1: 'Реал', team1Id: 'real-madrid', team2: 'Барса', team2Id: 'fc-barcelona', players: '' }] };
  const p = planFromBrief(brief, '20bet');
  const text = planToText(p);
  expect(parsePlan(text, '20bet', p).plan.blocks[0].block.data).toMatchObject({ team2Logo: expect.stringContaining('fc-barcelona') });
  // без подсказки — по названию, «Барсу» библиотека не знает
  expect(parsePlan(text, '20bet').plan.blocks[0].block.data).toMatchObject({ team1Logo: expect.stringContaining('real-madrid'), team2Logo: '' });
});

test('оффер со строкой под ним и карточка слота с характеристиками строками — туда и обратно', () => {
  const offer = createBlock('text', 4, { kicker: 'Ставка: 2 EUR', offer: 'Выигрыш: 4,210.50 EUR', tagline: 'Удача ждёт вас!' });
  const card = createBlock('bullets', 4, { image: '', title: 'Dragon Fortune Deluxe', sub: 'Hacksaw Gaming', text: 'Макс. выигрыш: x10,000\nFree Spins\nHold and Win' });
  const text = planToText({ ...head, blocks: [offer, card].map((block) => ({ block, origin: 'tz' as const })) });
  expect(text).toContain('[Текст · Подзаголовок и оффер]\nПодзаголовок: Ставка: 2 EUR\nОффер: Выигрыш: 4,210.50 EUR\nПод оффером: Удача ждёт вас!\n');
  const { plan, errors } = parsePlan(text, '20bet');
  expect(errors).toEqual([]);
  expect(plan.blocks[0].block.data).toMatchObject({ kicker: 'Ставка: 2 EUR', offer: 'Выигрыш: 4,210.50 EUR', tagline: 'Удача ждёт вас!' });
  expect(plan.blocks[1].block.data).toMatchObject({ title: 'Dragon Fortune Deluxe', sub: 'Hacksaw Gaming', text: 'Макс. выигрыш: x10,000\nFree Spins\nHold and Win' });
});
