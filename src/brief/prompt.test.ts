import { readFileSync, readdirSync } from 'node:fs';
import { expect, test } from 'vitest';
import { CLIENT_PRESETS, LEAGUE_PRESETS, TEAM_PRESETS } from '@/model/presets';
import { cleanBrief, readBriefFile } from './clean';
import { exampleFiles, readExample } from './fixtures/examples';
import { BRIEF_JSON_SCHEMA } from './schema';
import { FALLBACK, MODEL, openRouterRequest, systemPrompt } from './prompt';

const SYNTHETIC = new URL('./fixtures/synthetic/', import.meta.url);

const prompt = systemPrompt();

test('в промпте все справочники: клиенты, лиги, команды — id и названия', () => {
  for (const c of CLIENT_PRESETS) expect(prompt).toContain(`${c.id} — ${c.name}`);
  for (const l of LEAGUE_PRESETS) expect(prompt).toContain(`${l.id} — ${l.name}`);
  for (const t of TEAM_PRESETS) expect(prompt).toContain(`${t.id} — ${t.name}`);
});

// проверочные ТЗ (examples/ — только локально, и синтетические) модель не должна видеть в примерах промпта
test('в промпте нет строк из проверочных ТЗ', async () => {
  const texts = [
    ...await Promise.all(exampleFiles().map((f) => readBriefFile(f, readExample(f)))),
    ...readdirSync(SYNTHETIC).map((f) => cleanBrief(readFileSync(new URL(f, SYNTHETIC), 'utf8'))),
  ];
  for (const t of texts) {
    // длинные строки — содержание ТЗ; короткие («Обратите внимание!», «Text:») бывают где угодно
    for (const line of t.split('\n').map((l) => l.trim()).filter((l) => l.length >= 30)) expect(prompt).not.toContain(line);
  }
});

test('в промпте правила: дословно, {{name}}, заметки, язык ТЗ, только JSON', () => {
  expect(prompt).toMatch(/дословно/);
  expect(prompt).toContain('{{name}}');
  expect(prompt).toMatch(/не переводи/i);
  expect(prompt).toMatch(/только JSON/i);
  expect(prompt).toMatch(/notes/);
});

test('примеры в промпте — корректные ответы по схеме', async () => {
  const { validateBrief } = await import('./schema');
  const blocks = [...prompt.matchAll(/```json\n([\s\S]*?)```/g)].map((m) => m[1]);
  expect(blocks.length).toBe(3);
  for (const b of blocks) expect(validateBrief(JSON.parse(b)).issues).toEqual([]);
  // третий — казино: оффер под картинкой (Mailer top) и карточка слота с описанием и характеристиками
  const casino = validateBrief(JSON.parse(blocks[2])).brief;
  expect(casino.sections.map((s) => s.k)).toEqual(['offer', 'button', 'text', 'slots', 'button']);
  expect(casino.sections[3]).toMatchObject({ slots: [{ name: 'Book of Dead', about: expect.any(String), features: ['Free Spins', 'Макс. выигрыш: x5,000'] }] });
});

test('запрос к OpenRouter: модели, температура, лимит, схема ответа', () => {
  const r = openRouterRequest('ТЗ') as Record<string, any>;
  expect([MODEL, FALLBACK]).toEqual(['anthropic/claude-haiku-5.5', 'deepseek/deepseek-v3.2']);
  expect(r.models).toEqual([MODEL, FALLBACK]);
  expect(r).toMatchObject({ temperature: 0, max_tokens: 4000 });
  expect(r.messages).toEqual([{ role: 'system', content: prompt }, { role: 'user', content: 'ТЗ' }]);
  expect(r.response_format).toEqual({ type: 'json_schema', json_schema: { name: 'brief', strict: false, schema: BRIEF_JSON_SCHEMA } });
});
