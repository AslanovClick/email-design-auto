import { expect, test } from 'vitest';
import { BRIEF_JSON_SCHEMA, validateBrief } from './schema';

// Ответ модели на синтетическое ТЗ промо (fixtures/synthetic/weekend.txt)
const SAMPLE = {
  client: 'vave',
  title: 'Vave Friday Freebet',
  subject: 'Пятничный фрибет для вас',
  preheader: 'Фрибет 10 EUR без депозита — только до воскресенья',
  kind: 'promo',
  league: '',
  matches: [],
  sections: [
    { k: 'top', lines: ['Пятница с фрибетом', '10 EUR без депозита', 'Промокод: FRIDAY10'] },
    { k: 'button', text: 'Забрать фрибет' },
    {
      k: 'text', title: 'Привет {{name}},',
      paras: [
        'Начните выходные с подарка: фрибет 10 EUR уже ждёт вас, пополнять счёт не нужно. Активируйте промокод FRIDAY10 до воскресенья, 23:59 UTC.',
        'Ставьте на любимые команды и побеждайте!',
      ],
    },
    { k: 'button', text: 'Получить фрибет' },
    { k: 'steps', title: 'Как активировать фрибет:', steps: ['Войдите в свой аккаунт Vave', 'Введите промокод FRIDAY10 в личном кабинете', 'Ставьте с фрибетом 10 EUR!'] },
    { k: 'timer', title: 'Срок действия предложения:' },
    { k: 'note', note: 'Обратите внимание!', text: 'Фрибет действует 3 дня. Полные условия — на сайте в разделе «Промо».' },
  ],
  signature: null,
  notes: ['Пуш: Фрибет 10 EUR ждёт тебя'],
};

test('нормальный ответ проходит как есть', () => {
  const { brief, issues } = validateBrief(SAMPLE);
  expect(issues).toEqual([]);
  expect(brief.sections.map((s) => s.k)).toEqual(['top', 'button', 'text', 'button', 'steps', 'timer', 'note']);
  expect(brief).toMatchObject({ client: 'vave', subject: SAMPLE.subject, notes: SAMPLE.notes, signature: null });
});

test('чужой клиент и мусор', () => {
  const { brief, issues } = validateBrief({ client: 'playbaze', kind: 'news', subject: ' Тема ', sections: [{ k: 'banner' }, { k: 'button' }, { k: 'button', text: 'Go', link: 'javascript:x' }] });
  expect([brief.client, brief.kind, brief.subject]).toEqual([null, 'promo', 'Тема']);
  expect(brief.sections).toEqual([{ k: 'button', text: 'Go' }]);
  expect(issues.join('\n')).toMatch(/клиент.*playbaze/i);
});

test('клиент названием вместо id узнаётся', () =>
  expect(validateBrief({ client: '20Bet Asia' }).brief.client).toBe('20betasia'));

test('id из библиотеки — только существующие', () => {
  const { brief } = validateBrief({ matches: [{ team1: 'Реал', team1Id: 'real-madrid', team2: 'X', team2Id: 'nope' }], leagueId: 'uefa-nations' });
  expect([brief.matches[0].team1Id, brief.matches[0].team2Id, brief.leagueId]).toEqual(['real-madrid', undefined, 'uefa-nations']);
});

test('новые поля: коэффициенты, ссылка кнопки, окончание таймера, картинка баннера', () => {
  const { brief } = validateBrief({
    heroImage: 'https://img/x.png',
    matches: [{ date: '15.11.2026', team1: 'Spain', team2: 'England', odds: '1.9 / 3.4 / 4.2', pick: 'П1', coef: '1.9' }],
    sections: [{ k: 'button', text: 'Go', link: 'https://x.y/p' }, { k: 'timer', title: 'До конца:', until: '22.11.2026 23:59' }],
  });
  expect(brief.heroImage).toBe('https://img/x.png');
  expect(brief.matches[0]).toMatchObject({ odds: '1.9 / 3.4 / 4.2', pick: 'П1', coef: '1.9', players: '' });
  expect(brief.sections).toEqual([{ k: 'button', text: 'Go', link: 'https://x.y/p' }, { k: 'timer', title: 'До конца:', until: '22.11.2026 23:59' }]);
});

test('плейсхолдер имени → {{name}}', () =>
  expect(validateBrief({ sections: [{ k: 'text', title: 'Привет, [NAME]!', paras: [] }] }).brief.sections[0]).toEqual({ k: 'text', title: 'Привет, {{name}}!', paras: [] }));

test('английское «name» в тексте не трогается, после приветствия — обращение', () =>
  expect(validateBrief({ sections: [{ k: 'text', title: 'Hi name,', paras: ['Enter your name and play.'] }] }).brief.sections[0])
    .toEqual({ k: 'text', title: 'Hi {{name}},', paras: ['Enter your name and play.'] }));

test('текст секции не в том поле плоской схемы не теряется', () => {
  const { brief, issues } = validateBrief({ sections: [
    { k: 'text', title: 'Привет!', paras: [], text: 'Первый абзац.\n\nВторой абзац.' },
    { k: 'note', note: 'Обратите внимание! Условия на сайте.', text: '' },
    { k: 'button', title: 'Забрать', text: '' },
    { k: 'steps', title: 'Как получить:', steps: [], paras: ['Шаг 1', 'Шаг 2'] },
  ] });
  expect(issues).toEqual([]);
  expect(brief.sections).toEqual([
    { k: 'text', title: 'Привет!', paras: ['Первый абзац.', 'Второй абзац.'] },
    { k: 'note', note: '', text: 'Обратите внимание! Условия на сайте.' },
    { k: 'button', text: 'Забрать' },
    { k: 'steps', title: 'Как получить:', steps: ['Шаг 1', 'Шаг 2'] },
  ]);
});

test('строки фактов — только известные виды и их поля', () => {
  const { brief, issues } = validateBrief({ sections: [{ k: 'facts', title: 'Детали матча:', rows: [
    { t: 'stat', label: 'Место', l: '1', r: '4', extra: 'x' },
    { t: 'chart', text: '?' },
    { t: 'fact', lead: 'Серия.', text: '5 побед' },
  ] }] });
  expect(brief.sections[0]).toEqual({ k: 'facts', title: 'Детали матча:', details: false, rows: [
    { t: 'stat', label: 'Место', l: '1', ls: '', r: '4', rs: '' },
    { t: 'fact', lead: 'Серия.', text: '5 побед' },
  ] });
  expect(issues.join()).toMatch(/chart/);
});

test('не объект — пустой Brief и замечание', () => {
  const r = validateBrief('oops');
  expect(r.brief.sections).toEqual([]);
  expect(r.issues.length).toBe(1);
});

test('схема перечисляет все виды секций', () =>
  expect(JSON.stringify(BRIEF_JSON_SCHEMA)).toMatch(/"top".*"offer".*"text".*"button".*"steps".*"timer".*"note".*"cards".*"slots".*"facts"/s));

test('оффер под картинкой; слот — секция на слот, слоты подряд — один список', () => {
  const { brief, issues } = validateBrief({
    ...SAMPLE,
    sections: [
      { k: 'offer', lines: ['Ставка: 2 EUR', 'Выигрыш: 4,210.50 EUR', ''] },
      { k: 'slots', title: 'Dragon Fortune Deluxe', provider: 'Pragmatic Play', text: 'Огненные драконы.', lines: ['Free Spins', '', 'Hold and Win'] },
      { k: 'slots', title: 'Lucky Lantern', provider: 'Pragmatic Play', text: '', lines: [] },
    ],
  });
  expect(issues).toEqual([]);
  expect(brief.sections).toEqual([
    { k: 'offer', lines: ['Ставка: 2 EUR', 'Выигрыш: 4,210.50 EUR'] },
    { k: 'slots', slots: [
      { name: 'Dragon Fortune Deluxe', provider: 'Pragmatic Play', about: 'Огненные драконы.', features: ['Free Spins', 'Hold and Win'] },
      { name: 'Lucky Lantern', provider: 'Pragmatic Play', about: '', features: [] },
    ] },
  ]);
  // в схеме нет вложенного массива слотов — иначе Anthropic отвечает «compiled grammar is too large»
  const section = (BRIEF_JSON_SCHEMA as any).properties.sections.items;
  expect(section.properties.slots).toBeUndefined();
  expect(section.required).toContain('provider');
});

test('старые ответы: слоты массивом name / provider', () => {
  const { brief } = validateBrief({ ...SAMPLE, sections: [{ k: 'slots', slots: [{ name: 'Book of Dead', provider: "Play'n GO" }] }] });
  expect(brief.sections).toEqual([{ k: 'slots', slots: [{ name: 'Book of Dead', provider: "Play'n GO" }] }]);
});
