import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { Built } from '@/email/plan/build';
import { createEmail } from '@/model/factory';
import type { EmailDoc } from '@/model/types';
import { useMailBuild } from '@/store/mailBuild';
import { ExportDialog } from './ExportDialog';

const built = (warnings: string[]): Built => ({
  payload: { name: 'x' } as Built['payload'], files: new Map([['a.png', new Blob(['a'])]]), urls: { 'a.png': 'https://h/a.png' }, warnings,
});
let warnings: string[] = [];
vi.mock('@/email/plan/build', () => ({ buildMail: vi.fn(async () => built(warnings)) }));

let release!: () => void;
let root: Root;
let host: HTMLDivElement;
const downloads = vi.fn();
const doc = createEmail('20bet', 'sport-match');

beforeEach(() => {
  warnings = [];
  vi.stubEnv('VITE_N8N_WEBHOOK_URL', 'https://n8n/x');
  // n8n отвечает, когда тест скажет
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((res) => {
    release = () => res(new Response(JSON.stringify({ ok: true, html: '<h>', kb: 1, images: [] })));
  })));
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { downloads(this.download); });
  downloads.mockClear();
  useMailBuild.setState({ key: null, built: null, result: null, busy: null, error: null });
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => { root.unmount(); host.remove(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

const render = (d: EmailDoc) => flushSync(() => root.render(<ExportDialog doc={d} />));
const button = (text: string) => [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === text)!;
const format = (title: string) => [...document.querySelectorAll<HTMLButtonElement>('[role=radio]')].find((b) => b.querySelector('b')?.textContent === title)!;
const action = () => document.querySelector<HTMLButtonElement>('.dialog-foot .btn.primary')!;
const dialogOpen = () => !!document.querySelector('.dialog');
async function startHtmlExport(d: EmailDoc) {
  render(d);
  button('Экспорт').click();
  await vi.waitFor(() => expect(dialogOpen()).toBe(true));
  format('HTML').click();
  await vi.waitFor(() => expect(action().textContent).toContain('Скачать'));
  action().click();
  await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
}
const settle = () => new Promise((r) => setTimeout(r, 50));

test('успех без предупреждений — файл скачан, окно закрыто', async () => {
  await startHtmlExport(doc);
  release();
  await vi.waitFor(() => expect(downloads).toHaveBeenCalledTimes(1));
  await vi.waitFor(() => expect(dialogOpen()).toBe(false));
});

test('«Отмена» во время сборки — ничего не скачивается', async () => {
  await startHtmlExport(doc);
  button('Отмена').click();
  await vi.waitFor(() => expect(dialogOpen()).toBe(false));
  release();
  await settle();
  expect(downloads).not.toHaveBeenCalled();
});

test('письмо изменили во время сборки — старая версия не скачивается', async () => {
  await startHtmlExport(doc);
  render({ ...doc, updatedAt: doc.updatedAt + 1 });
  release();
  await settle();
  expect(downloads).not.toHaveBeenCalled();
});

test('есть предупреждения — файл скачан, окно остаётся с их списком', async () => {
  warnings = ['В блоке «Контент» не загружена картинка — в письме будет заглушка'];
  await startHtmlExport(doc);
  release();
  await vi.waitFor(() => expect(downloads).toHaveBeenCalledTimes(1));
  await settle();
  expect(dialogOpen()).toBe(true);
  expect(document.querySelector('.dialog')!.textContent).toContain('не загружена картинка');
});
