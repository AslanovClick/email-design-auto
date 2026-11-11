// Приёмка «Собрать по ТЗ» на записанных ответах модели (n8n/tools/eval-brief.ts --record):
// ответ → validateBrief → план → текст плана → разбор текста → письмо. Плюс проверки по каждому ТЗ (спека §10).
// Синтетические ТЗ (fixtures/synthetic) — всегда; ТЗ клиентов (examples/, только локально) — если папка есть,
// их проверки — в examples/checks.ts.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { CLIENTS } from '@/model/catalog';
import type { Block, EmailDoc } from '@/model/types';
import { docFromPlan, planFromBrief, type PlanDoc } from './build';
import { allText, cards, footer, has, hero, of, steps, textVariant, topWin, type Check } from './fixtures/accept-kit';
import { EXAMPLE_ANSWERS, EXAMPLES_DIR, exampleFiles } from './fixtures/examples';
import { parsePlan, planToText } from './planText';
import { validateBrief } from './schema';

const FALLBACK_CLIENT = CLIENTS[0].id;
const ANSWERS = new URL('./fixtures/answers/', import.meta.url);
const base = (f: string) => f.replace(/\.[^.]+$/, '');
const synthetic = readdirSync(new URL('./fixtures/synthetic/', import.meta.url)).map(base);
const examples = exampleFiles().map(base);
const answersOf = (name: string) => (synthetic.includes(name) ? ANSWERS : EXAMPLE_ANSWERS);

interface Case { blocks: Block[]; doc: EmailDoc; plan: PlanDoc; issues: string[]; errors: unknown[] }
function run(name: string): Case {
  const { content } = JSON.parse(readFileSync(new URL(`${name}.json`, answersOf(name)), 'utf8')) as { content: string };
  const { brief, issues } = validateBrief(JSON.parse(content.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, '')));
  const first = planFromBrief(brief, brief.client ?? FALLBACK_CLIENT);
  const { plan, errors } = parsePlan(planToText(first), FALLBACK_CLIENT, first);
  return { blocks: plan.blocks.map((p) => p.block), doc: docFromPlan(plan), plan, issues, errors };
}

const SYNTHETIC_CHECKS: Record<string, Check> = {
  vip: (p) => expect(footer(p)).toMatchObject({ v: 1, data: expect.objectContaining({ manager: 'Remi', managerEmail: 'remi@ivibet.com' }) }),
  cards: (p) => expect(cards(p)).toHaveLength(3),
  weekend: (p, doc, plan) => {
    expect(of(p, 'cta').map((b) => b.data.text)).toEqual(['Забрать фрибет', 'Получить фрибет']);
    expect(steps(p)).toHaveLength(3);
    expect(has(p, 'timer')).toBe(true);
    expect(textVariant(p, 3)).toBe(true);
    expect(hero(p).data.picText).toMatch(/Пятница с фрибетом/);
    expect(doc.subject).toBe('Пятничный фрибет для вас');
    expect(allText(p)).toContain('{{name}}');
    expect(plan.notes.join()).toMatch(/Фрибет 10 EUR ждёт тебя/);
  },
  english: (p) => expect(allText(p)).not.toMatch(/[а-яё]/i),
  topwin: (p, doc) => topWin(p, doc, {
    offer: { kicker: 'Ставка: 2 EUR', offer: 'Выигрыш: 4,210.50 EUR', tagline: 'Удача ждёт вас!' }, buttons: ['Try Now', 'Spin Now'],
    slot: 'Dragon Fortune Deluxe', provider: 'Hacksaw Gaming', features: ['Free Spins', 'Макс. выигрыш: x10,000', 'Hold and Win'],
    subject: 'Звёздный выигрыш недели', nick: 'lex***',
  }),
};
const checksFile = new URL('checks.ts', EXAMPLES_DIR);
const EXAMPLE_CHECKS: Record<string, Check> = existsSync(checksFile)
  ? (await import(/* @vite-ignore */ checksFile.href)).CHECKS
  : {};
const CHECKS = { ...SYNTHETIC_CHECKS, ...EXAMPLE_CHECKS };
// новые ТЗ клиентов, ещё не разобранные (нет записанного ответа), — в списке «todo», а не ошибкой
const recorded = existsSync(EXAMPLE_ANSWERS) ? readdirSync(EXAMPLE_ANSWERS).map(base) : [];
const fresh = examples.filter((n) => !recorded.includes(n));
const names = [...synthetic, ...examples.filter((n) => recorded.includes(n))];

test('ответ записан для каждого синтетического ТЗ и для каждого есть проверка', () => {
  expect(readdirSync(ANSWERS).map(base).sort()).toEqual([...synthetic].sort());
  expect(Object.keys(SYNTHETIC_CHECKS).sort()).toEqual([...synthetic].sort());
});

for (const name of fresh) test.todo(`${name}: новое ТЗ — записать ответ (eval-brief.ts --only "${name}" --record) и проверку`);

describe.each(names)('%s', (name) => {
  test('ответ без замечаний, текст плана читается без ошибок, письмо собрано', () => {
    const c = run(name);
    expect(c.issues).toEqual([]);
    expect(c.errors).toEqual([]);
    expect(c.doc.blocks[0].type).toBe('hero');
    expect(c.doc.blocks.at(-1)!.type).toBe('footer');
  });
  test.skipIf(!CHECKS[name])('содержимое из ТЗ на месте', () => {
    const c = run(name);
    CHECKS[name](c.blocks, c.doc, c.plan);
  });
});
