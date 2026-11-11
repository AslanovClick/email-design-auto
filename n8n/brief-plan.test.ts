import { expect, test } from 'vitest';
import { openRouterRequest } from '@/brief/prompt';
import { nodeCode, runCode, type Workflow } from './tools/html-gen.ts';
import json from './brief-plan.json';
import mail from './clickable-mail.json';

const wf = json as unknown as Workflow;
const node = (name: string) => {
  const n = wf.nodes.find((x) => x.name === name);
  if (!n) throw new Error(`нет узла ${name}`);
  return n;
};
const prep = async (body: unknown) => (await runCode(nodeCode(wf, 'Подготовка'), { body }))[0].json;
const parse = async (response: unknown) => (await runCode(nodeCode(wf, 'Разбор ответа'), { body: {}, input: [{ json: response }] }))[0].json;
const answer = (content: string, extra: object = {}) => ({ model: 'anthropic/claude-haiku-5.5', usage: { cost: 0.001 }, choices: [{ message: { content }, finish_reason: 'stop' }], ...extra });

test('Webhook: POST, ответ узлом, CORS *, свой адрес', () => {
  const w = node('Webhook').parameters;
  expect([w.httpMethod, w.responseMode, w.options.allowedOrigins]).toEqual(['POST', 'responseNode', '*']);
  expect(w.path).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  const other = (mail as unknown as Workflow).nodes.find((n) => n.name === 'Webhook')!.parameters.path;
  expect(w.path).not.toBe(other);
});

test('связи ведут на существующие узлы, все концы — ответы', () => {
  const names = new Set(wf.nodes.map((n) => n.name));
  const seen = new Set<string>();
  const walk = (name: string) => {
    if (seen.has(name)) return;
    seen.add(name);
    const outs = (wf.connections[name]?.main ?? []).flat();
    if (!outs.length) expect(node(name).type, `${name} — тупик`).toBe('n8n-nodes-base.respondToWebhook');
    for (const o of outs) { expect(names.has(o.node), `${name} → ${o.node}`).toBe(true); walk(o.node); }
  };
  walk('Webhook');
  expect([...seen].sort()).toEqual([...names].sort());
});

test('ответы — JSON первого элемента с заголовком CORS', () => {
  for (const name of ['Отправить ответ', 'Отправить ошибку']) {
    const n = node(name);
    expect([n.type, n.typeVersion, n.parameters.respondWith]).toEqual(['n8n-nodes-base.respondToWebhook', 1.1, 'firstIncomingItem']);
    expect(n.parameters.options.responseHeaders.entries).toEqual([{ name: 'Access-Control-Allow-Origin', value: '*' }]);
  }
});

test('Подготовка: пустое, не строка, слишком длинное ТЗ — понятная ошибка', async () => {
  expect(await prep({ text: '   ' })).toEqual({ kind: 'error', error: expect.stringMatching(/пуст/i) });
  expect(await prep({ text: 42 })).toEqual({ kind: 'error', error: expect.stringMatching(/нет текста/i) });
  expect(await prep({})).toEqual({ kind: 'error', error: expect.stringMatching(/нет текста/i) });
  expect(await prep({ text: 'a'.repeat(20_001) })).toEqual({ kind: 'error', error: expect.stringMatching(/20 000/) });
});

test('Подготовка: запрос к OpenRouter — промпт и модель из репозитория, текст ТЗ от приложения', async () => {
  const text = 'Planbet\nТема: Тест';
  expect(await prep({ text: `  ${text}\n`, source: 'clickable-mail' })).toEqual({ kind: 'ok', request: openRouterRequest(text) });
  // что-то кроме текста (модель, промпт) из запроса не берётся
  expect(await prep({ text, model: 'openai/gpt-x', messages: [] })).toEqual({ kind: 'ok', request: openRouterRequest(text) });
});

test('промпт в узле — текущий (после правки prompt.ts — sync-brief-plan.ts)', () =>
  expect(nodeCode(wf, 'Подготовка')).toContain(`const REQUEST_TEMPLATE = ${JSON.stringify(openRouterRequest('__TEXT__'), null, 2)};`));

test('Ошибка в запросе? → Ошибка, иначе → OpenRouter', () => {
  expect(wf.connections['Ошибка в запросе?'].main.map((o) => o.map((x) => x.node))).toEqual([['Ошибка'], ['OpenRouter']]);
  expect(node('Ошибка в запросе?').parameters.conditions.conditions[0]).toMatchObject({ leftValue: '={{ $json.kind }}', rightValue: 'error' });
});

test('OpenRouter: адрес, ключ из креденшла, тело, таймаут, ошибки не роняют цепочку', () => {
  const n = node('OpenRouter');
  expect([n.type, n.parameters.method, n.parameters.url]).toEqual(['n8n-nodes-base.httpRequest', 'POST', 'https://openrouter.ai/api/v1/chat/completions']);
  expect([n.parameters.authentication, n.parameters.genericAuthType]).toEqual(['genericCredentialType', 'httpHeaderAuth']);
  expect(n.credentials).toEqual({ httpHeaderAuth: { name: 'OpenRouter' } });
  expect(n.parameters.jsonBody).toBe('={{ JSON.stringify($json.request) }}');
  expect(n.parameters.options.timeout).toBe(60_000);
  expect(n.onError).toBe('continueRegularOutput');
  expect(JSON.stringify(json)).not.toMatch(/sk-or-/);
});

test('Разбор ответа: JSON модели (в т.ч. в ```-ограде) → ok, модель и цена', async () => {
  expect(await parse(answer('{"client":"vave","sections":[]}'))).toEqual({ ok: true, brief: { client: 'vave', sections: [] }, model: 'anthropic/claude-haiku-5.5', usage: { cost: 0.001 } });
  expect(await parse(answer('```json\n{"client":null}\n```'))).toMatchObject({ ok: true, brief: { client: null } });
});

test('Разбор ответа: мусор, обрезанный ответ, ошибка OpenRouter, обрыв — ok:false с причиной', async () => {
  expect(await parse(answer('Вот ваш план: …'))).toEqual({ ok: false, error: expect.stringMatching(/не JSON/) });
  expect(await parse(answer('[1, 2]'))).toEqual({ ok: false, error: expect.stringMatching(/не JSON/) });
  expect(await parse(answer('{"client":', { choices: [{ message: { content: '{"client":' }, finish_reason: 'length' }] }))).toEqual({ ok: false, error: expect.stringMatching(/обрезан/) });
  expect(await parse({ error: { message: 'Rate limit exceeded', code: 429 } })).toEqual({ ok: false, error: expect.stringMatching(/Rate limit/) });
  expect(await parse({ error: 'timeout of 60000ms exceeded' })).toEqual({ ok: false, error: expect.stringMatching(/timeout/) });
  expect(await parse({ choices: [] })).toEqual({ ok: false, error: expect.stringMatching(/не вернула/) });
});

test('Ошибка: kind:error и исключения узлов → ok:false', async () => {
  const run = async (j: object) => (await runCode(nodeCode(wf, 'Ошибка'), { body: {}, input: [{ json: j }] }))[0].json;
  expect(await run({ kind: 'error', error: 'ТЗ пустое' })).toEqual({ ok: false, error: 'ТЗ пустое' });
  expect(await run({ error: { message: 'Code: x is not defined' } })).toEqual({ ok: false, error: 'Code: x is not defined' });
});
