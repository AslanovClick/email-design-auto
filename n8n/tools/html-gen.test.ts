import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { extractV5, nodeCode, patchForApp, runCode, runHtmlGen, type Workflow } from './html-gen.ts';
import payload from './fixtures/payload-min.json';

const snapshot = readFileSync(new URL('./fixtures/html_gen.plugin-v5.js', import.meta.url), 'utf8');

test('extractV5 отрезает старый генератор', () =>
  expect(extractV5('A\nreturn [{ json: { output: html } }];\n\n// ═══ Прежний\nfunction legacyGenerate() {}\n'))
    .toBe('A\nreturn [{ json: { output: html } }];\n'));

test('снимок — v5-часть генератора плагина', () => {
  expect(snapshot.startsWith('// === Генератор HTML письма v5 (n8n Code node) ===\n')).toBe(true);
  expect(snapshot.endsWith('return [{ json: { output: html } }];\n')).toBe(true);
  expect(snapshot).not.toContain('function legacyGenerate');
});

test('nodeCode: код узла и ошибка без узла', () => {
  const wf: Workflow = { name: 'w', nodes: [{ name: 'a', type: 'n8n-nodes-base.code', typeVersion: 2, parameters: { jsCode: 'x' }, id: '1', position: [0, 0] }], connections: {} };
  expect(nodeCode(wf, 'a')).toBe('x');
  expect(() => nodeCode(wf, 'b')).toThrow(/b/);
});

test('patchForApp убирает legacyGenerate', () => expect(patchForApp(snapshot)).not.toContain('legacyGenerate'));

test('patchForApp падает без якоря', () => expect(() => patchForApp('x')).toThrow(/якорь/));

test('без прехедера HTML как у плагина', async () =>
  expect(await runHtmlGen(patchForApp(snapshot), payload)).toBe(await runHtmlGen(snapshot, payload)));

test('прехедер — скрытый div сразу после body', async () =>
  expect(await runHtmlGen(patchForApp(snapshot), { ...payload, preheader: 'Привет & пока' })).toContain(
    '<body style="margin:0;padding:0;">\n<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">Привет &amp; пока</div>'));

test('без plan — понятная ошибка', async () =>
  await expect(runHtmlGen(patchForApp(snapshot), { name: 'x' })).rejects.toThrow(/нет plan/));

test('все виды элементов фикстуры попали в HTML', async () => {
  const html = await runHtmlGen(patchForApp(snapshot), payload);
  for (const s of ['main-aaaaaa.jpg', 'Привет, {{name}}!', 'banner-bbbbbb.png', 'btn-cccccc.png', 'Bet Now', 'В рамке', 'icon-dddddd.png', '3.40'])
    expect(html).toContain(s);
});

test('runCode: $input, $json и this.helpers', async () => {
  const out = await runCode('return [{ json: { n: $input.all().length, a: $json.a, b: await this.helpers.f(), w: $("Webhook").item.json.body.x } }];', {
    body: { x: 7 }, input: [{ json: { a: 1 } }, { json: { a: 2 } }], helpers: { f: async () => 'ok' },
  });
  expect(out[0].json).toEqual({ n: 2, a: 1, b: 'ok', w: 7 });
});
