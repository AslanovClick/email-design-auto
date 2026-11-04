import { afterEach, expect, test, vi } from 'vitest';
import { sendToN8n } from './n8n';
import type { Payload } from './plan/types';

const p = { name: 'x' } as Payload;
const mockFetch = (status: number, body: unknown) =>
  vi.stubGlobal('fetch', vi.fn(async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status })));
afterEach(() => vi.unstubAllGlobals());

test('успех: POST JSON на адрес вебхука', async () => {
  mockFetch(200, { ok: true, html: '<h>', kb: 1.2, images: [{ file: 'a.png', url: 'https://x/a.png' }] });
  expect(await sendToN8n(p, 'https://n8n/x')).toEqual({ html: '<h>', kb: 1.2, images: [{ file: 'a.png', url: 'https://x/a.png' }] });
  const [url, init] = vi.mocked(fetch).mock.calls[0];
  expect(url).toBe('https://n8n/x');
  expect(init).toMatchObject({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
});

const failFetch = () => { vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); })); return sendToN8n(p, 'https://n8n/x'); };
const timeout = () => { vi.stubGlobal('fetch', vi.fn(async () => { throw new DOMException('signal timed out', 'TimeoutError'); })); return sendToN8n(p, 'https://n8n/x'); };
const status500 = () => { mockFetch(500, 'oops'); return sendToN8n(p, 'https://n8n/x'); };
const notJson = () => { mockFetch(200, '<html>'); return sendToN8n(p, 'https://n8n/x'); };
const okFalse = (error: string) => () => { mockFetch(200, { ok: false, error }); return sendToN8n(p, 'https://n8n/x'); };
const noHtml = () => { mockFetch(200, { ok: true }); return sendToN8n(p, 'https://n8n/x'); };

test.each([
  [() => sendToN8n(p, ''), /Вебхук n8n не настроен/], [failFetch, /Нет связи с n8n: Failed to fetch/], [timeout, /не ответил за 3 минуты/],
  [status500, /n8n ответил 500/], [notJson, /n8n вернул не JSON/], [okFalse('FTP упал'), /^FTP упал$/], [noHtml, /n8n не вернул HTML/],
])('ошибка %#', async (run, re) => await expect(run()).rejects.toThrow(re));
