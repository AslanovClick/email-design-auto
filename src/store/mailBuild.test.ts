import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createEmail } from '@/model/factory';
import type { Built } from '@/email/plan/build';
import { buildKey, useMailBuild } from './mailBuild';

vi.mock('@/email/plan/build', () => ({
  buildMail: vi.fn(async (): Promise<Built> => ({
    payload: { name: 'x' } as Built['payload'], files: new Map([['a.png', new Blob(['a'])]]), urls: { 'a.png': 'https://h/a.png' }, warnings: ['w'],
  })),
}));
const { buildMail } = await import('@/email/plan/build');

const doc = createEmail('20bet', 'sport-match');
const reply = (body: unknown) => vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body))));
const ok = { ok: true, html: '<h>', kb: 2, images: [{ file: 'a.png', url: 'https://h2/a.png' }] };

beforeEach(() => {
  vi.stubEnv('VITE_N8N_WEBHOOK_URL', 'https://n8n/x');
  useMailBuild.setState({ key: null, built: null, result: null, busy: null, error: null });
  vi.mocked(buildMail).mockClear();
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

test('ключ — письмо и время правки', () => expect(buildKey(doc)).toBe(`${doc.id}:${doc.updatedAt}`));

test('сборка: HTML от n8n, ссылки из ответа, картинки из памяти', async () => {
  reply(ok);
  const r = await useMailBuild.getState().build(doc);
  expect([r.html, r.kb, r.urls['a.png'], r.files.size, r.warnings]).toEqual(['<h>', 2, 'https://h2/a.png', 1, ['w']]);
  expect(useMailBuild.getState()).toMatchObject({ key: buildKey(doc), busy: null, error: null, result: r });
});

test('кэш: то же письмо — без повторной отправки', async () => {
  reply(ok);
  await useMailBuild.getState().build(doc);
  await useMailBuild.getState().build(doc);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(buildMail).toHaveBeenCalledTimes(1);
});

test('письмо изменили — сборка заново', async () => {
  reply(ok);
  await useMailBuild.getState().build(doc);
  await useMailBuild.getState().build({ ...doc, updatedAt: doc.updatedAt + 1 });
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(useMailBuild.getState().key).toBe(`${doc.id}:${doc.updatedAt + 1}`);
});

test('двойной клик — одна отправка', async () => {
  reply(ok);
  const [a, b] = await Promise.all([useMailBuild.getState().build(doc), useMailBuild.getState().build(doc)]);
  expect(a).toBe(b);
  expect(fetch).toHaveBeenCalledTimes(1);
});

test('ошибка n8n — в error, busy снят, результата нет; повтор отправляет снова без пересборки', async () => {
  reply({ ok: false, error: 'FTP упал' });
  await expect(useMailBuild.getState().build(doc)).rejects.toThrow('FTP упал');
  expect(useMailBuild.getState()).toMatchObject({ error: 'FTP упал', busy: null, result: null });
  reply(ok);
  await useMailBuild.getState().build(doc);
  expect(useMailBuild.getState().error).toBeNull();
  expect(buildMail).toHaveBeenCalledTimes(1);
});

test('письмо изменили во время сборки — старая сборка не трогает состояние новой', async () => {
  reply(ok);
  let finishA: (() => void) | undefined;
  const real = vi.mocked(buildMail).getMockImplementation()!;
  vi.mocked(buildMail).mockImplementationOnce((d) => new Promise((res) => { finishA = () => res(real(d)); }));
  const a = useMailBuild.getState().build(doc);
  const b = { ...doc, updatedAt: doc.updatedAt + 5 };
  vi.mocked(buildMail).mockImplementationOnce(() => new Promise(() => {}));   // сборка B ещё идёт
  void useMailBuild.getState().prepare(b);
  await vi.waitFor(() => expect(buildMail).toHaveBeenCalledTimes(2));
  finishA!();
  await a;
  expect(useMailBuild.getState()).toMatchObject({ key: buildKey(b), busy: 'images', result: null });
});

test('prepare — только картинки и payload, без n8n', async () => {
  reply(ok);
  const b = await useMailBuild.getState().prepare(doc);
  expect(b.payload.name).toBe('x');
  expect(fetch).not.toHaveBeenCalled();
});
