import { expect, test } from 'vitest';
import { createEmail } from '@/model/factory';
import { buildPayload, sizeWarning, toBase64 } from './payload';
import type { Plan } from './types';

const doc = { ...createEmail('20bet', 'sport-match'), preheader: 'Скидка' };
const plan: Plan = {
  v: 5, width: 600, height: 1200, color: doc.theme.bg, bg: null, folder: 'cm/20Bet/x-e1', title: 'Mail', assets: [],
  body: { k: 'stack', id: 'body', x: 0, y: 0, w: 600, h: 1200, items: [] }, warnings: [],
};

test('поля и порядок как у плагина', () => expect(Object.keys(buildPayload(doc, '20Bet', plan, []))).toEqual([
  'name', 'fileName', 'fileKey', 'width', 'height', 'bgColor', 'frameFills', 'colors', 'texts', 'blocks', 'imageNodes',
  'mainAutoLayout', 'frameId', 'plan', 'tree', 'pluginVersion', 'referenceImage', 'recipientEmail', 'source', 'preheader']));

test('значения', () => expect(buildPayload(doc, '22Bet', plan, [])).toMatchObject({
  name: 'Матч дня', fileName: '22Bet — Матч дня', fileKey: null, width: 600, height: 1200, bgColor: doc.theme.bg,
  tree: null, pluginVersion: '5.0', referenceImage: null, recipientEmail: '', source: 'clickable-mail', frameId: doc.id, preheader: 'Скидка', plan,
}));

test('предупреждение о весе', () => {
  expect(sizeWarning(8 * 2 ** 20)).toBeNull();
  expect(sizeWarning(9 * 2 ** 20)).toBe('Картинки весят 9 МБ — запрос к n8n может не пройти (лимит 16 МБ)');
});

test('base64 без префикса data:', async () => {
  expect(await toBase64(new Blob(['abc']))).toBe('YWJj');
  const big = new Uint8Array(100_000).map((_, i) => i % 251);
  expect(await toBase64(new Blob([big]))).toBe(Buffer.from(big).toString('base64'));
});
