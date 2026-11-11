import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { planFromBrief } from '@/brief/build';
import answer from '@/brief/fixtures/answers/topwin.json';
import { validateBrief } from '@/brief/schema';
import { loadDraft } from '@/store/drafts';
import TZ from '@/brief/fixtures/synthetic/topwin.md?raw';
import { BriefDialog } from './BriefDialog';

// Адрес вебхука в приложении зашит (BRIEF_WEBHOOK) — «вебхук не настроен» проверяем подменой
const webhook = vi.hoisted(() => ({ off: false }));
vi.mock('@/brief/ai', async (orig) => {
  const m = await orig<typeof import('@/brief/ai')>();
  return { ...m, briefWebhookUrl: () => (webhook.off ? '' : m.briefWebhookUrl()) };
});

const brief = JSON.parse(answer.content);
const BLOCKS = planFromBrief(validateBrief(brief).brief, 'koi').blocks.length;

let root: Root;
let host: HTMLDivElement;

function Editor() { return <div className="editor-page">{useParams().id}</div>; }

beforeEach(() => {
  vi.stubEnv('VITE_N8N_BRIEF_WEBHOOK_URL', 'https://n8n/brief');
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: true, model: answer.model, usage: {}, brief }))));
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  flushSync(() => root.render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<BriefDialog fallbackClient="20bet" />} />
        <Route path="/email/:id" element={<Editor />} />
      </Routes>
    </MemoryRouter>,
  ));
});
afterEach(() => { root.unmount(); host.remove(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); webhook.off = false; });

const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel);
const button = (text: string) => [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === text)!;
const tab = (name: string) => [...document.querySelectorAll<HTMLButtonElement>('[role=tab]')].find((b) => b.textContent?.trim() === name)!;
const area = () => $<HTMLTextAreaElement>('.brief-area textarea')!;
const panel = () => $('.brief-out')!.textContent ?? '';
/** Ввод в управляемое React-поле. */
const type = (el: HTMLTextAreaElement, value: string) => {
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
};

async function composed(marker = '[Кнопка] Try Now', tz = TZ) {
  $('.brief-card')!.click();
  await vi.waitFor(() => expect(area()).toBeTruthy());
  type(area(), tz);
  button('Составить план').click();
  await vi.waitFor(() => expect(area().value).toContain(marker));
}

test('ТЗ → «Составить план» через ИИ: текст плана во вкладке «План», справа блоки и модель', async () => {
  await composed();
  expect(tab('План').getAttribute('aria-selected')).toBe('true');
  expect(panel()).toContain(`Блоки · ${BLOCKS}`);
  expect(panel()).not.toContain('не найден в ТЗ');
  expect(document.body.textContent).toContain(`План составил ИИ (${answer.model})`);
  const [, init] = vi.mocked(fetch).mock.calls[0];
  expect(JSON.parse(String(init!.body))).toEqual({ text: expect.stringContaining('Title: Звёздный выигрыш недели'), source: 'clickable-mail' });
  // Markdown из Google Docs очищен: жирные метки без **, экранированные \* в нике — звёздочки
  const sent = JSON.parse(String(init!.body)).text as string;
  expect(sent).toContain('Игрок lex*** поставил');
  expect(sent.replace('lex***', '')).not.toMatch(/\*|\\[!]/);
});

test('клиент не найден в ТЗ — предупреждение под выбором клиента, пока клиента не сменили', async () => {
  // ни модель, ни текст ТЗ клиента не знают
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: true, model: 'm', brief: { ...brief, client: null } }))));
  await composed('[Кнопка] Try Now', TZ.replace('KOI Fortune ', ''));
  expect(panel()).toContain('не найден в ТЗ');
  type(area(), area().value.replace(/^Клиент:.*$/m, 'Клиент: Vave'));
  await vi.waitFor(() => expect(panel()).not.toContain('не найден в ТЗ'));
});

test('Esc не стирает план: окно открывается с теми же правками', async () => {
  await composed();
  const edited = area().value.replace('Spin Now', 'Крутить барабаны');
  type(area(), edited);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await vi.waitFor(() => expect($('.brief-dlg')).toBeNull());
  $('.brief-card')!.click();
  await vi.waitFor(() => expect(area()).toBeTruthy());
  tab('План').click();
  await vi.waitFor(() => expect(area().value).toBe(edited));
});

test('правка плана: удалённая кнопка и опечатка видны справа', async () => {
  await composed();
  type(area(), area().value.replace('[Кнопка] Try Now\n', ''));
  await vi.waitFor(() => expect(panel()).toContain(`Блоки · ${BLOCKS - 1}`));
  type(area(), area().value.replace('\nДля дизайнера:', '\n[Кнопкa] X\n\nДля дизайнера:'));
  await vi.waitFor(() => expect(panel()).toContain('Не понял строки'));
  expect(panel()).toMatch(/стр\. \d+: \[Кнопкa\] X/);
});

test('повторное «Составить план» после правок — сначала подтверждение', async () => {
  await composed();
  const edited = area().value.replace('Spin Now', 'Крутить барабаны');
  type(area(), edited);
  tab('ТЗ').click();
  await vi.waitFor(() => expect(button('Составить план')).toBeTruthy());
  button('Составить план').click();
  await vi.waitFor(() => expect(document.body.textContent).toContain('Заменить план? Правки пропадут'));
  expect(fetch).toHaveBeenCalledTimes(1);
  tab('План').click();
  await vi.waitFor(() => expect(area().value).toBe(edited));
  tab('ТЗ').click();
  await vi.waitFor(() => expect(button('Заменить план')).toBeTruthy());
  button('Заменить план').click();
  await vi.waitFor(() => expect(area().value).toContain('Spin Now'));
  expect(fetch).toHaveBeenCalledTimes(2);
});

test('без вебхука — план правилами с подписью', async () => {
  webhook.off = true;
  await composed();
  expect(fetch).not.toHaveBeenCalled();
  expect(document.body.textContent).toContain('План без ИИ: вебхук не настроен');
});

test('ИИ недоступен — план правилами и причина', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('oops', { status: 502 })));
  await composed();
  expect(document.body.textContent).toContain('План без ИИ: n8n ответил 502');
});

test('«Собрать письмо» — черновик с текстом плана, переход в редактор', async () => {
  await composed();
  button('Собрать письмо').click();
  await vi.waitFor(() => expect($('.editor-page')).toBeTruthy());
  const id = $('.editor-page')!.textContent!;
  const doc = await loadDraft(id);
  expect(doc).toMatchObject({ client: 'koi', subject: 'Звёздный выигрыш недели' });
  expect(doc!.blocks).toHaveLength(BLOCKS);
  expect(doc!.brief).toMatchObject({ source: expect.stringContaining('Звёздный выигрыш недели'), plan: expect.stringContaining('[Кнопка] Try Now') });
});
