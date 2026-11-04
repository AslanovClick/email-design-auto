// Сборка письма для рассылки: картинки и payload в приложении, HTML — от n8n. Результат держим в памяти
// для текущей версии письма: письмо не менялось — повторно в n8n не идём.

import { create } from 'zustand';
import { sendToN8n } from '@/email/n8n';
import { buildMail, type Built } from '@/email/plan/build';
import type { EmailDoc } from '@/model/types';

export interface MailResult extends Built { html: string; kb: number }

interface MailBuildState {
  key: string | null;
  built: Built | null;
  result: MailResult | null;
  busy: 'images' | 'send' | null;
  error: string | null;
  /** Картинки и payload (без n8n) — для «Скачать JSON» и как первый шаг сборки. */
  prepare(doc: EmailDoc): Promise<Built>;
  /** Полная сборка: payload → n8n → HTML. */
  build(doc: EmailDoc): Promise<MailResult>;
}

export const buildKey = (doc: EmailDoc) => `${doc.id}:${doc.updatedAt}`;

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

// идущие сборки — повторный клик ждёт ту же, а не запускает вторую
const running = new Map<string, Promise<unknown>>();
function once<T>(key: string, run: () => Promise<T>): Promise<T> {
  let p = running.get(key) as Promise<T> | undefined;
  if (!p) {
    p = run().finally(() => running.delete(key));
    running.set(key, p);
  }
  return p;
}

export const useMailBuild = create<MailBuildState>()((set, get) => {
  // письмо уже другое — устаревший результат в состояние не пишем
  const current = (key: string) => get().key === key;

  return {
    key: null,
    built: null,
    result: null,
    busy: null,
    error: null,

    prepare: (doc) => {
      const key = buildKey(doc);
      const s = get();
      if (s.key === key && s.built) return Promise.resolve(s.built);
      if (s.key !== key) set({ key, built: null, result: null, error: null });
      return once(`images:${key}`, async () => {
        set({ busy: 'images', error: null });
        try {
          const built = await buildMail(doc);
          if (current(key)) set({ built, busy: null });
          return built;
        } catch (e) {
          if (current(key)) set({ error: message(e), busy: null });
          throw e;
        }
      });
    },

    build: (doc) => {
      const key = buildKey(doc);
      const s = get();
      if (s.key === key && s.result) return Promise.resolve(s.result);
      return once(`send:${key}`, async () => {
        const built = await get().prepare(doc);
        set({ busy: 'send', error: null });
        try {
          const r = await sendToN8n(built.payload);
          const urls = { ...built.urls, ...Object.fromEntries(r.images.map((i) => [i.file, i.url])) };
          const result: MailResult = { ...built, urls, html: r.html, kb: r.kb };
          if (current(key)) set({ result, busy: null });
          return result;
        } catch (e) {
          if (current(key)) set({ error: message(e), busy: null });
          throw e;
        }
      });
    },
  };
});
