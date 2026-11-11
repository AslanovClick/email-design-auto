import { commands } from 'vitest/browser';
import { expect, test } from 'vitest';
import { TEMPLATES } from '@/model/catalog';
import { createBlock, createEmail } from '@/model/factory';
import type { EmailDoc } from '@/model/types';
import { renderDocument } from '../render';
import wf from '../../../n8n/clickable-mail.json';
import { nodeCode, runHtmlGen, type Workflow } from '../../../n8n/tools/html-gen.ts';
import { buildMail, type Built } from './build';
import { toBase64 } from './payload';

const htmlGen = nodeCode(wf as unknown as Workflow, 'html_gen');

// сравнение глазами: превью редактора слева, HTML генератора справа (открывать через dev-сервер — /assets)
const COMPARE = `<!doctype html><meta charset="utf-8"><style>body{margin:0;display:flex;gap:20px;background:#555}iframe{width:640px;border:0;background:#fff}</style>
<iframe src="preview.html"></iframe><iframe src="index.html"></iframe>
<script>for (const f of document.querySelectorAll('iframe')) f.onload = () => { f.style.height = f.contentDocument.documentElement.scrollHeight + 'px'; };</script>`;

/** n8n/out/<id>/: index.html (ссылки → images/), images/*, payload.json, preview.html и compare.html — для глаз и run-html-gen. */
async function writeOut(id: string, doc: EmailDoc, b: Built, html: string) {
  await commands.writeFile(`n8n/out/${id}/preview.html`, renderDocument(doc));
  await commands.writeFile(`n8n/out/${id}/compare.html`, COMPARE);
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
  const doc = createEmail('20bet', id);
  const b = await buildMail(doc);
  const html = await runHtmlGen(htmlGen, b.payload);
  for (const bad of ['href="#"', 'href=""', 'undefined', 'NaN', '#shot', '[object']) expect(html).not.toContain(bad);
  for (const url of Object.values(b.urls)) expect(html).toContain(url);
  await writeOut(id, doc, b, html);
});

test('22Bet: правила бренда срабатывают', async () => {
  const doc = createEmail('22bet', 'sport-match');
  const b = await buildMail(doc);
  expect(b.payload.fileName).toBe('22Bet — Матч дня');
  const html = await runHtmlGen(htmlGen, b.payload);
  expect(html).toContain('font-size:32px');
  await writeOut('22bet-sport-match', doc, b, html);
});

test('iframe убирается и после ошибки', async () => {
  const before = document.querySelectorAll('iframe').length;
  await buildMail(createEmail('20bet', 'blank'));
  expect(document.querySelectorAll('iframe').length).toBe(before);
  const broken = { ...createEmail('20bet', 'blank'), blocks: [{ id: 'x', type: 'nope', v: 0, data: {}, style: {} }] } as never;
  await expect(buildMail(broken)).rejects.toThrow();
  expect(document.querySelectorAll('iframe').length).toBe(before);
});

test('top win из ТЗ: строка под оффером, характеристики слота по строкам и выделение доходят до HTML', async () => {
  const doc = createEmail('koi', 'blank');
  doc.blocks.splice(1, 0,
    createBlock('text', 4, { kicker: 'Ставка: 2 EUR', offer: 'Выигрыш: 4,210.50 EUR', tagline: 'Удача ждёт вас!' }),
    createBlock('text', 0, { title: '', titleOn: false, text: 'Игрок /lex***/ сорвал куш' }),
    createBlock('bullets', 4, { image: '', title: 'Dragon Fortune', sub: 'Hacksaw Gaming', text: 'Free Spins\nHold and Win' }));
  const b = await buildMail(doc);
  const html = await runHtmlGen(htmlGen, b.payload);
  const text = html.replace(/<[^>]+>/g, '|');
  expect(text).toContain('Удача ждёт вас!');
  expect(html).toMatch(/Free Spins\s*<br[^>]*>\s*Hold and Win/);
  expect(html).toMatch(/<[^>]+(?:color|style)[^>]*>lex\*\*\*</);
  await writeOut('top-win', doc, b, html);
});
