// Отправка письма в автоматизацию n8n (n8n/clickable-mail.json): она заливает картинки на demo.promo
// и отвечает готовым HTML. Адрес вебхука — VITE_N8N_WEBHOOK_URL (.env.local) или DEFAULT_WEBHOOK.

import type { Payload } from './plan/types';

/** Production URL вебхука из узла Webhook воркфлоу (см. n8n/README.md). */
export const DEFAULT_WEBHOOK = 'https://n8n.clickable.space/webhook/ddde128f-8159-4203-95fa-70d0560844ad';

export const webhookUrl = (): string => import.meta.env.VITE_N8N_WEBHOOK_URL || DEFAULT_WEBHOOK;

export interface N8nResult { html: string; kb: number; images: { file: string; url: string }[] }

const TIMEOUT_MS = 180_000;   // картинки идут по FTP по одной — десятки секунд бывают

export async function sendToN8n(payload: Payload, url = webhookUrl()): Promise<N8nResult> {
  if (!url) throw new Error('Вебхук n8n не настроен — см. n8n/README.md');
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'TimeoutError') throw new Error('n8n не ответил за 3 минуты');
    throw new Error(`Нет связи с n8n: ${e instanceof Error ? e.message : e}`);
  }
  if (!res.ok) throw new Error(`n8n ответил ${res.status}`);
  let data: { ok?: boolean; error?: string; html?: unknown; kb?: number; images?: N8nResult['images'] };
  try {
    data = await res.json();
  } catch {
    throw new Error('n8n вернул не JSON');
  }
  if (data.ok === false) throw new Error(data.error || 'n8n вернул ошибку');
  if (typeof data.html !== 'string' || !data.html) throw new Error('n8n не вернул HTML');
  return { html: data.html, kb: data.kb ?? new Blob([data.html]).size / 1024, images: data.images ?? [] };
}
