import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { nodeCode, patchForApp, runCode, type Workflow } from './tools/html-gen.ts';
import json from './clickable-mail.json';

const wf = json as unknown as Workflow;
const snapshot = readFileSync(new URL('./tools/fixtures/html_gen.plugin-v5.js', import.meta.url), 'utf8');
const node = (name: string) => {
  const n = wf.nodes.find((x) => x.name === name);
  if (!n) throw new Error(`нет узла ${name}`);
  return n;
};
// 1×1 PNG; начало JPEG (FF D8 FF E0); PHP-скрипт
const PNG1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const JPG = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBD';
const PHP = Buffer.from('<?php system($_GET["c"]); ?>').toString('base64');
const helpers = {
  prepareBinaryData: async (buf: Buffer, fileName: string, mimeType: string) => ({ data: buf.toString('base64'), fileName, mimeType }),
};
const prep = (imageNodes: object[], body: object = {}) =>
  runCode(nodeCode(wf, 'Подготовка картинок'), { body: { plan: { v: 5 }, imageNodes, ...body }, helpers });

test('Webhook: POST, ответ узлом, CORS *', () => {
  const w = node('Webhook').parameters;
  expect([w.httpMethod, w.responseMode, w.options.allowedOrigins]).toEqual(['POST', 'responseNode', '*']);
  expect(w.path).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  expect(w.path).not.toBe('92797759-2566-413d-8b45-d60e780f8b20');
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

test('FTP: путь как у плагина, креденшл, ошибки не роняют цепочку', () => {
  const f = node('FTP');
  expect(f.parameters.path).toBe('=/public_html/email_images/{{ $json.ftpName }}');
  expect(f.credentials).toEqual({ ftp: { id: 'k2Er5gljEUnhmCRt', name: 'FTP account' } });
  expect(f.onError).toBe('continueRegularOutput');
});

test('html_gen = снимок плагина + патчи', () => expect(nodeCode(wf, 'html_gen')).toBe(patchForApp(snapshot.replace(/\r\n/g, '\n'))));

test('Подготовка: картинка → имя на FTP и бинарные данные', async () => {
  const [it] = await prep([{ file: 'btn-3f9a2c.png', folder: 'cm/20Bet/match-e1', bgImageData: PNG1 }]);
  expect(it.json).toEqual({ kind: 'image', ftpName: 'cm--20Bet--match-e1--btn-3f9a2c.png' });
  expect(it.binary.data.mimeType).toBe('image/png');
  expect(it.binary.data.data).toBe(PNG1);
});

test('Подготовка: jpg — image/jpeg, повтор файла — один раз', async () => {
  const n = { file: 'main-aaaaaa.jpg', folder: 'cm/x', bgImageData: JPG };
  const out = await prep([n, n]);
  expect(out).toHaveLength(1);
  expect(out[0].binary.data.mimeType).toBe('image/jpeg');
});

test('Подготовка: без картинок — kind none', async () => expect((await prep([]))[0].json.kind).toBe('none'));

test('Подготовка: без plan — ошибка', async () => {
  const [it] = await runCode(nodeCode(wf, 'Подготовка картинок'), { body: { imageNodes: [] }, helpers });
  expect(it.json).toEqual({ kind: 'error', error: 'В запросе нет plan' });
});

test.each([
  [{ folder: 'Figma/x', file: 'a.png' }, /cm\//],
  [{ folder: 'cm/../x', file: 'a.png' }, /папк/],
  [{ folder: 'cm', file: 'a.png' }, /cm\//],
  [{ folder: 'cm/x y', file: 'a.png' }, /папк/],
  [{ folder: 'cm/x', file: '../index.php' }, /имя/],
  [{ folder: 'cm/x', file: 'a.php' }, /имя/],
  [{ folder: 'cm/x', file: '.htaccess.png' }, /имя/],
  [{ folder: 'cm/x', file: 'shell.php.png' }, /имя/],
  [{ folder: 'cm/a.php/x', file: 'a.png' }, /папк/],
])('Подготовка отклоняет %o', async (n, re) => {
  const [it] = await prep([{ ...n, bgImageData: PNG1 }]);
  expect(it.json.kind).toBe('error');
  expect(it.json.error).toMatch(re);
});

test.each([
  ['a.png', PHP], ['a.png', JPG], ['a.jpg', PNG1], ['a.gif', PNG1],
])('Подготовка: содержимое %s не той картинки — ошибка', async (file, data) => {
  const [it] = await prep([{ folder: 'cm/x', file, bgImageData: data }]);
  expect(it.json.kind).toBe('error');
  expect(it.json.error).toMatch(/не картинка/);
});

test('Подготовка: пустая картинка — ошибка', async () => {
  const [it] = await prep([{ folder: 'cm/x', file: 'a.png', bgImageData: '' }]);
  expect(it.json.error).toMatch(/пуст/i);
});

test('Подготовка: больше 5 МБ — ошибка', async () => {
  const big = Buffer.alloc(5 * 2 ** 20 + 100).toString('base64');
  const [it] = await prep([{ folder: 'cm/x', file: 'a.png', bgImageData: big }]);
  expect(it.json.kind).toBe('error');
  expect(it.json.error).toMatch(/5 МБ/);
});

test('Подготовка: больше 60 картинок — ошибка', async () => {
  const many = Array.from({ length: 61 }, (_, i) => ({ folder: 'cm/x', file: `a${i}.png`, bgImageData: PNG1 }));
  expect((await prep(many))[0].json.error).toMatch(/60/);
});

test('Все загружены: один элемент дальше', async () => {
  const out = await runCode(nodeCode(wf, 'Все загружены'), { body: {}, input: [{ json: { kind: 'image', ftpName: 'a' } }, { json: { kind: 'image', ftpName: 'b' } }] });
  expect(out).toEqual([{ json: { uploaded: 2 } }]);
});

test('Все загружены: ошибка FTP — исключение с текстом', async () => {
  await expect(runCode(nodeCode(wf, 'Все загружены'), { body: {}, input: [{ json: { kind: 'image', ftpName: 'a' } }, { json: { error: '550 Permission denied' } }] }))
    .rejects.toThrow(/FTP.*550 Permission denied/);
});

test('Ответ: ссылки как у html_gen', async () => {
  const [r] = await runCode(nodeCode(wf, 'Ответ'), { body: { imageNodes: [{ file: 'bg-aa11bb.png', folder: 'cm/20Bet/x-e1' }] }, input: [{ json: { output: '<html>' } }] });
  expect(r.json).toMatchObject({ ok: true, html: '<html>',
    images: [{ file: 'bg-aa11bb.png', url: 'https://demo.promo/sv/public_html/email_images/' + encodeURIComponent('cm--20Bet--x-e1--bg-aa11bb.png') }] });
  expect(r.json.kb).toBe(0);
});

test('Ошибка: строка и объект error', async () => {
  const run = async (j: object) => (await runCode(nodeCode(wf, 'Ошибка'), { body: {}, input: [{ json: j }] }))[0].json;
  expect(await run({ error: 'x' })).toEqual({ ok: false, error: 'x' });
  expect(await run({ error: { message: 'y' } })).toEqual({ ok: false, error: 'y' });
  expect(await run({})).toEqual({ ok: false, error: 'Неизвестная ошибка n8n' });
});
