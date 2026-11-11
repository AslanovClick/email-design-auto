import { afterEach, expect, test, vi } from 'vitest';
import { requestBrief } from './ai';

const URL_ = 'https://n8n/brief';
const mockFetch = (status: number, body: unknown) =>
  vi.stubGlobal('fetch', vi.fn(async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status })));
afterEach(() => vi.unstubAllGlobals());

test('успех: только текст ТЗ и источник; ответ проверен validateBrief', async () => {
  mockFetch(200, { ok: true, model: 'anthropic/claude-haiku-5.5', usage: { cost: 0.001 }, brief: { client: 'playbaze', subject: ' Тема ', sections: [{ k: 'button', text: 'Go' }] } });
  const r = await requestBrief('ТЗ', URL_);
  expect(r.model).toBe('anthropic/claude-haiku-5.5');
  expect(r.brief).toMatchObject({ client: null, subject: 'Тема', sections: [{ k: 'button', text: 'Go' }] });
  expect(r.issues.join()).toMatch(/playbaze/);
  const [url, init] = vi.mocked(fetch).mock.calls[0];
  expect(url).toBe(URL_);
  expect(init).toMatchObject({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'ТЗ', source: 'clickable-mail' }) });
});

test('отмена (окно закрыли) — AbortError, а не текст ошибки', async () => {
  vi.stubGlobal('fetch', vi.fn((_u: string, init: RequestInit) => new Promise((_, reject) =>
    init.signal!.addEventListener('abort', () => reject(init.signal!.reason)))));
  const ctl = new AbortController();
  const p = requestBrief('ТЗ', URL_, ctl.signal);
  ctl.abort();
  await expect(p).rejects.toMatchObject({ name: 'AbortError' });
});

const failFetch = () => { vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); })); return requestBrief('ТЗ', URL_); };
const timeout = () => { vi.stubGlobal('fetch', vi.fn(async () => { throw new DOMException('signal timed out', 'TimeoutError'); })); return requestBrief('ТЗ', URL_); };
const status500 = () => { mockFetch(500, 'oops'); return requestBrief('ТЗ', URL_); };
const notJson = () => { mockFetch(200, '<html>'); return requestBrief('ТЗ', URL_); };
const okFalse = () => { mockFetch(200, { ok: false, error: 'OpenRouter: Rate limit' }); return requestBrief('ТЗ', URL_); };
const noBrief = () => { mockFetch(200, { ok: true, model: 'x' }); return requestBrief('ТЗ', URL_); };

test.each([
  [() => requestBrief('ТЗ', ''), /Вебхук ИИ не настроен/], [failFetch, /Нет связи с n8n: Failed to fetch/], [timeout, /ИИ не ответил за минуту/],
  [status500, /n8n ответил 500/], [notJson, /n8n вернул не JSON/], [okFalse, /^OpenRouter: Rate limit$/], [noBrief, /ИИ не вернул план/],
])('ошибка %#', async (run, re) => await expect(run()).rejects.toThrow(re));

test('тему и прехедер, которые ИИ пропустил, берём из ТЗ по правилам', async () => {
  mockFetch(200, { ok: true, model: 'm', brief: { client: 'koi', title: 'KOI Fortune top win', subject: '', preheader: 'Свой прехедер', sections: [] } });
  const r = await requestBrief('KOI Fortune top win\nTitle: Звёздный выигрыш недели\nPre-header: Узнайте, как выиграть!', URL_);
  expect(r.brief).toMatchObject({ subject: 'Звёздный выигрыш недели', preheader: 'Свой прехедер' });
});

test('характеристики слота, которые ИИ пропустил, берём из списка в ТЗ', async () => {
  mockFetch(200, { ok: true, model: 'm', brief: { client: '20bet', subject: 'Т', preheader: 'П', sections: [
    { k: 'slots', title: 'Dragon Fortune Deluxe', provider: 'Hacksaw Gaming', text: 'Огненные драконы!', lines: ['Hold and Win', 'Megaways'] },
  ] } });
  const tz = 'Text:\nЗагляните к драконам!\nDragon Fortune Deluxe\nОгненные драконы!\n- Провайдер: Hacksaw Gaming\n- Макс. выигрыш: x10,000\n- Hold and Win\n- Megaways\nbutton (Play Now)';
  const r = await requestBrief(tz, URL_);
  expect(r.brief.sections[0]).toMatchObject({ k: 'slots', slots: [{ name: 'Dragon Fortune Deluxe', features: ['Макс. выигрыш: x10,000', 'Hold and Win', 'Megaways'] }] });
});
