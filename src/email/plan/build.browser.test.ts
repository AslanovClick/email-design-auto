import { commands } from 'vitest/browser';
import { expect, test } from 'vitest';
import { TEMPLATES } from '@/model/catalog';
import { createEmail } from '@/model/factory';
import wf from '../../../n8n/clickable-mail.json';
import { nodeCode, runHtmlGen, type Workflow } from '../../../n8n/tools/html-gen.ts';
import { buildMail, type Built } from './build';
import { toBase64 } from './payload';

const htmlGen = nodeCode(wf as unknown as Workflow, 'html_gen');

/** n8n/out/<id>/: index.html (ссылки → images/), images/*, payload.json — для глаз и для run-html-gen. */
async function writeOut(id: string, b: Built, html: string) {
  let local = html;
  for (const [file, url] of Object.entries(b.urls)) local = local.split(url).join(`images/${file}`);
  await commands.writeFile(`n8n/out/${id}/index.html`, local);
  await commands.writeFile(`n8n/out/${id}/payload.json`, JSON.stringify(b.payload, null, 2));
  for (const [file, blob] of b.files) await commands.writeFile(`n8n/out/${id}/images/${file}`, await toBase64(blob), 'base64');
}

test('Матч дня: файлы, ссылки, ключи заменены', async () => {
  const b = await buildMail(createEmail('20bet', 'sport-match'));
  const json = JSON.stringify(b.payload.plan);
  expect(json).not.toContain('#shot');
  expect(b.payload.plan.folder).toMatch(/^cm\/20Bet\/Match-dnya-/);
  expect(b.payload.imageNodes.length).toBe(b.files.size);
  for (const n of b.payload.imageNodes) {
    expect(json).toContain(`"${n.file}"`);
    expect(n.bgImageData.startsWith('data:')).toBe(false);
    expect(n.file).toMatch(/^[a-z0-9-]+-[0-9a-f]{6}\.(png|jpg)$/);
    expect(n.folder).toBe(b.payload.plan.folder);
  }
  expect(b.payload.plan.bg).toMatch(/^bg-/);
  expect(b.payload.plan.assets.map((a) => a.file).sort()).toEqual([...b.files.keys()].sort());
  // три одинаковые кнопки «Bet Now» — один файл
  expect([...b.files.keys()].filter((f) => f.startsWith('btn')).length).toBe(1);
});

test.each(TEMPLATES.map((t) => t.id))('шаблон %s: html_gen собирает без мусора', async (id) => {
  const b = await buildMail(createEmail('20bet', id));
  const html = await runHtmlGen(htmlGen, b.payload);
  for (const bad of ['href="#"', 'href=""', 'undefined', 'NaN', '#shot', '[object']) expect(html).not.toContain(bad);
  for (const url of Object.values(b.urls)) expect(html).toContain(url);
  await writeOut(id, b, html);
});

test('22Bet: правила бренда срабатывают', async () => {
  const b = await buildMail(createEmail('22bet', 'sport-match'));
  expect(b.payload.fileName).toBe('22Bet — Матч дня');
  const html = await runHtmlGen(htmlGen, b.payload);
  expect(html).toContain('font-size:32px');
  await writeOut('22bet-sport-match', b, html);
});

test('iframe убирается и после ошибки', async () => {
  const before = document.querySelectorAll('iframe').length;
  await buildMail(createEmail('20bet', 'blank'));
  expect(document.querySelectorAll('iframe').length).toBe(before);
  const broken = { ...createEmail('20bet', 'blank'), blocks: [{ id: 'x', type: 'nope', v: 0, data: {}, style: {} }] } as never;
  await expect(buildMail(broken)).rejects.toThrow();
  expect(document.querySelectorAll('iframe').length).toBe(before);
});
