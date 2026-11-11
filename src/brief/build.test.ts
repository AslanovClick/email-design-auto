import { existsSync, readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createBlock } from '@/model/factory';
import { FISH_TEXT } from '@/model/fish';
import { accentStep, derivedNotes, docFromPlan, originOf, planFromBrief } from './build';
import { cleanBrief, readBriefFile } from './clean';
import { EXAMPLE_RULES, exampleFiles, hasExamples, readExample } from './fixtures/examples';
import { parseBrief, type Brief } from './parse';

// синтетическое ТЗ промо: картинка с текстом, две кнопки, приветствие, шаги, таймер, сноска, пуш
const weekend = parseBrief(cleanBrief(readFileSync(new URL('./fixtures/synthetic/weekend.txt', import.meta.url), 'utf8')));

const base: Brief = { client: null, title: 'Тест', subject: 'Тема', preheader: '', kind: 'sport', league: '', matches: [], sections: [], signature: null, notes: [] };

// Эталон правил сборки по ТЗ клиентов (examples/, только локально): блоки (тип/происхождение), название,
// заметки (по алфавиту). Меняется только намеренно — вместе с правилами. Новые ТЗ, которых нет в эталоне, — «todo».
const rules: Record<string, { plan: string; name: string; notes: string[] }> =
  existsSync(EXAMPLE_RULES) ? JSON.parse(readFileSync(EXAMPLE_RULES, 'utf8')) : {};
const examples = exampleFiles();
for (const f of examples.filter((x) => !rules[x])) test.todo(`${f}: нет в эталоне правил сборки (examples/build-rules.json)`);

test.skipIf(!hasExamples)('правила сборки — как в эталоне (ТЗ клиентов)', async () => {
  for (const f of examples.filter((x) => rules[x])) {
    const brief = parseBrief(await readBriefFile(f, readExample(f)));
    const plan = planFromBrief(brief, brief.client ?? '20bet');
    expect(plan.blocks.map((p) => `${p.block.type}/${p.origin}`).join(' '), f).toBe(rules[f].plan);
    expect(plan.name, f).toBe(rules[f].name);
    expect([...docFromPlan(plan).brief!.notes].sort(), f).toEqual(rules[f].notes);
  }
});

test('план не тянет выводимые заметки — только заметки ТЗ', () =>
  expect(planFromBrief(weekend, 'vave').notes).toEqual(['Пуш (в письмо не идёт): Фрибет 10 EUR ждёт тебя']));

test('игроки из матча попадают в заметки, если модель их туда не положила', () => {
  const p = planFromBrief({ ...base, matches: [{ date: '', team1: 'Spain', team2: 'England', players: 'Игрок A - Игрок B' }] }, 'vave');
  expect(p.notes).toEqual(['Игроки для картинки Spain – England: Игрок A - Игрок B']);
});

test('настоящие коэффициенты и «Рекомендуем» из ТЗ', () => {
  const p = planFromBrief({ ...base, matches: [{ date: '15.11', team1: 'Spain', team2: 'England', players: '', odds: '1.9 / 3.4 / 4.2', pick: 'П1', coef: '1.9' }] }, 'vave');
  const odds = p.blocks.find((x) => x.block.type === 'odds')!;
  expect([odds.block.data.odds, odds.origin]).toEqual(['1.9 / 3.4 / 4.2', 'tz']);
  const rec = p.blocks.find((x) => x.block.type === 'recodds')!;
  expect([rec.block.data.pick, rec.block.data.coef, rec.origin]).toEqual(['П1', '1.9', 'tz']);
  expect(derivedNotes(p.blocks.map((x) => x.block)).join()).not.toMatch(/примерные/);
});

test('ссылка кнопки, окончание таймера, картинка баннера', () => {
  const p = planFromBrief({ ...base, kind: 'promo', heroImage: 'https://img/x.png', sections: [{ k: 'button', text: 'Go', link: 'https://x' }, { k: 'timer', title: 'До конца:', until: '22.11.2026 23:59' }] }, 'planbet');
  expect(p.blocks[0].block.data).toMatchObject({ image: 'https://img/x.png', imageOn: true });
  expect(p.blocks.find((x) => x.block.type === 'cta')!.block.data.link).toBe('https://x');
  expect(p.blocks.find((x) => x.block.type === 'timer')!.block.data.date).toBe('22.11.2026 23:59');
  const notes = derivedNotes(p.blocks.map((x) => x.block)).join('\n');
  expect(notes).not.toMatch(/Картинка hero/);
  expect(notes).not.toMatch(/дату окончания/);
});

test('гербы и лого по id, названия — как в ТЗ', () => {
  const p = planFromBrief({ ...base, league: 'Лига наций УЕФА', leagueId: 'uefa-nations', matches: [{ date: '', team1: 'Реал', team1Id: 'real-madrid', team2: 'Барса', team2Id: 'fc-barcelona', players: '' }] }, '20bet');
  expect(p.blocks[0].block.data).toMatchObject({
    team1: 'Реал', team2: 'Барса', league: 'Лига наций УЕФА',
    team1Logo: expect.stringContaining('real-madrid'), team2Logo: expect.stringContaining('fc-barcelona'), leagueLogo: expect.stringContaining('uefa-nations'),
  });
});

test('текст на картинке шапки — поле hero, в заметках — для дизайнера', () => {
  const p = planFromBrief({ ...base, kind: 'promo', sections: [{ k: 'top', lines: ['Зажигайте', '100 EUR'] }] }, 'planbet');
  expect(p.blocks[0].block.data.picText).toBe('Зажигайте / 100 EUR');
  expect(derivedNotes(p.blocks.map((x) => x.block))).toContain('Текст для картинки hero: «Зажигайте / 100 EUR»');
});

test('выводимые заметки следуют за блоками', () => {
  const p = planFromBrief(weekend, 'vave');
  expect(derivedNotes(p.blocks.map((x) => x.block))).toContain('Таймер: проставьте значения и дату окончания акции');
  const noTimer = p.blocks.filter((x) => x.block.type !== 'timer').map((x) => x.block);
  expect(derivedNotes(noTimer).join()).not.toMatch(/Таймер/);
});

test('происхождение блока узнаётся по данным', () => {
  const sport = planFromBrief({ ...base, matches: [{ date: '15.11.2026', team1: 'Spain', team2: 'England', players: '' }] }, 'vave');
  for (const p of [planFromBrief(weekend, 'vave'), sport]) {
    for (const x of p.blocks) expect(originOf(x.block), x.block.type).toBe(x.origin);
  }
  expect(sport.blocks.map((x) => x.origin)).toContain('design');
  expect(originOf(createBlock('text', 0, { text: FISH_TEXT }))).toBe('fish');
  expect(originOf(createBlock('footer', 1, { manager: 'Remi' }))).toBe('tz');
});

test('письмо из плана: клиент, тема, порядок, заметки ТЗ', () => {
  const doc = docFromPlan(planFromBrief(weekend, 'vave'));
  expect([doc.client, doc.subject, doc.blocks[0].type, doc.blocks.at(-1)!.type]).toEqual(['vave', 'Пятничный фрибет для вас', 'hero', 'footer']);
  expect(doc.brief!.notes).toEqual(expect.arrayContaining(weekend.notes));
});

test('письмо из плана: hero первым, футер последним, остальное — как в плане', () => {
  const p = planFromBrief(weekend, 'vave');
  const [hero, ...rest] = p.blocks;
  const footer = rest.pop()!;
  const shuffled = { ...p, blocks: [footer, rest[1], hero, rest[0]] };
  expect(docFromPlan(shuffled).blocks.map((b) => b.type)).toEqual(['hero', rest[1].block.type, rest[0].block.type, 'footer']);
});

test('выделение: суммы в любой валюте, множители, ники, название слота — как у дизайнера', () => {
  expect(accentStep('Игрок lex*** сделал небольшую ставку 2 BRL, поймал множитель x2105,25 и забрал 4,210.50 BRL в слоте Dragon Fortune Deluxe.'))
    .toBe('Игрок /lex***/ сделал небольшую ставку /2 BRL/, поймал множитель /x2105,25/ и забрал /4,210.50 BRL/ в слоте /Dragon Fortune Deluxe/.');
  expect(accentStep('игрок с ником kim*** поставил 0.50 EUR, поймал множитель x10,420.80 и выиграл 5,210.40 EUR в слоте Lucky Lantern.'))
    .toBe('игрок с ником /kim***/ поставил /0.50 EUR/, поймал множитель /x10,420.80/ и выиграл /5,210.40 EUR/ в слоте /Lucky Lantern/.');
});

test('выделение: уже размеченное, часовой пояс и английский текст — не трогаем', () => {
  expect(accentStep('Получите 50% до 500 EUR / USD')).toBe('Получите 50% до 500 EUR / USD');
  expect(accentStep('Spin Lucky Lantern and win 100 EUR')).toBe('Spin Lucky Lantern and win /100 EUR/');
  expect(accentStep('Пополните счёт от 20 EUR')).toBe('Пополните счёт от /20 EUR/');
  expect(accentStep('Активируйте до воскресенья, 23:59 UTC.')).toBe('Активируйте до воскресенья, 23:59 UTC.');
});

test('оффер под картинкой (Mailer top) — блок «Подзаголовок и оффер», кнопка после него', () => {
  const p = planFromBrief({ ...base, kind: 'casino', sections: [
    { k: 'offer', lines: ['Ставка: 2 EUR', 'Выигрыш: 4,210.50 EUR', 'Удача ждёт вас!'] }, { k: 'button', text: 'Try Now' },
    { k: 'text', title: '', paras: ['Игрок lex*** выиграл 4,210.50 EUR'] },
  ] }, 'koi');
  expect(p.blocks.map((x) => `${x.block.type}/${x.block.v}`)).toEqual(['hero/0', 'text/4', 'cta/0', 'text/0', 'footer/0']);
  expect(p.blocks[1].block.data).toMatchObject({ kicker: 'Ставка: 2 EUR', offer: 'Выигрыш: 4,210.50 EUR', tagline: 'Удача ждёт вас!' });
  expect(p.blocks[0].block.data.picText ?? '').toBe('');
  const one = planFromBrief({ ...base, kind: 'casino', sections: [{ k: 'offer', lines: ['Приз: 100 EUR'] }] }, 'koi');
  expect(one.blocks[1].block.data).toMatchObject({ kicker: '', offer: 'Приз: 100 EUR', tagline: '' });
});

test('текст из ТЗ: без приветствия по умолчанию, суммы и названия выделены', () => {
  const p = planFromBrief({ ...base, kind: 'casino', sections: [{ k: 'text', title: '', paras: ['Игрок lex*** выиграл 4,210.50 EUR в слоте Lucky Lantern.'] }] }, 'koi');
  const t = p.blocks.find((x) => x.block.type === 'text')!.block;
  expect(t.data).toMatchObject({ titleOn: false, text: 'Игрок /lex***/ выиграл /4,210.50 EUR/ в слоте /Lucky Lantern/.' });
  expect(derivedNotes(p.blocks.map((x) => x.block)).join()).not.toMatch(/Приветствия в ТЗ нет/);
  const empty = planFromBrief({ ...base, kind: 'casino', sections: [] }, 'koi');
  expect(empty.blocks.find((x) => x.block.type === 'text')).toMatchObject({ origin: 'fish' });
});

test('карточка слота из ТЗ: подводка над ней, характеристики в ней; своя кнопка в ТЗ — без кнопки в карточке', () => {
  const slot = { name: 'Dragon Fortune Deluxe', provider: 'Hacksaw Gaming', about: 'Огненные драконы.', features: ['Free Spins', 'Hold and Win'] };
  const p = planFromBrief({ ...base, kind: 'casino', sections: [{ k: 'slots', slots: [slot] }, { k: 'button', text: 'Spin Now' }] }, 'koi');
  const after = p.blocks.slice(p.blocks.findIndex((x) => x.block.data.text === 'Огненные драконы.'));
  expect(after.map((x) => `${x.block.type}/${x.block.v}`)).toEqual(['text/0', 'bullets/4', 'cta/0', 'footer/0']);
  expect(after[1].block.data).toMatchObject({ title: slot.name, sub: 'Hacksaw Gaming', text: 'Free Spins\nHold and Win', image: '' });
  expect(after[2].block.data.text).toBe('Spin Now');
  expect(derivedNotes(p.blocks.map((x) => x.block))).toContain('Картинки слотов — за дизайнером');
  // кнопки после слота в ТЗ нет — кнопка в карточке, как в шаблоне «Топ слотов»
  const own = planFromBrief({ ...base, kind: 'casino', sections: [{ k: 'slots', slots: [slot] }] }, 'koi');
  expect(own.blocks.find((x) => x.block.type === 'bullets')!.block).toMatchObject({ v: 6, data: expect.objectContaining({ text: 'Free Spins\nHold and Win', cta: 'Play now' }) });
});

test('оффер — не рыба: абзацы по умолчанию у этого варианта не показываются', () => {
  const offer = createBlock('text', 4, { kicker: 'Ставка: 2 EUR', offer: 'Приз: 100 EUR' });
  expect(originOf(offer)).toBe('tz');
  expect(derivedNotes([offer])).toEqual([]);
});
