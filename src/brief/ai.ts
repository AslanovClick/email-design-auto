// План письма по ТЗ через ИИ: текст ТЗ → вебхук n8n (n8n/brief-plan.json) → OpenRouter → Brief.
// Ключ OpenRouter — только в креденшле n8n; приложение шлёт один текст ТЗ, модель и промпт задаёт воркфлоу.
// Адрес — VITE_N8N_BRIEF_WEBHOOK_URL (.env.local) или BRIEF_WEBHOOK.

import { norm, parseBrief, type Brief } from './parse';
import { validateBrief } from './schema';

/** Production URL вебхука из узла Webhook воркфлоу brief-plan.json (см. n8n/README.md). Пусто — разбор без ИИ. */
export const BRIEF_WEBHOOK = 'https://n8n.clickable.space/webhook/8b81f737-1a23-4c23-9657-13fc88fb0f4a';

export const briefWebhookUrl = (): string => import.meta.env.VITE_N8N_BRIEF_WEBHOOK_URL || BRIEF_WEBHOOK;

const TIMEOUT_MS = 60_000;

/** Brief от модели после проверки; issues — что из ответа выброшено. Закрытие окна (signal) — AbortError. */
export async function requestBrief(text: string, url = briefWebhookUrl(), signal?: AbortSignal): Promise<{ brief: Brief; issues: string[]; model: string }> {
  if (!url) throw new Error('Вебхук ИИ не настроен — см. n8n/README.md');
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, source: 'clickable-mail' }),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    if (e instanceof DOMException && e.name === 'TimeoutError') throw new Error('ИИ не ответил за минуту');
    throw new Error(`Нет связи с n8n: ${e instanceof Error ? e.message : e}`);
  }
  if (!res.ok) throw new Error(`n8n ответил ${res.status}`);
  let data: { ok?: boolean; error?: string; brief?: unknown; model?: string };
  try {
    data = await res.json();
  } catch {
    throw new Error('n8n вернул не JSON');
  }
  if (data.ok === false) throw new Error(data.error || 'n8n вернул ошибку');
  if (data.brief == null) throw new Error('ИИ не вернул план');
  const { brief, issues } = validateBrief(data.brief);
  fillFromRules(brief, parseBrief(text));
  return { brief, issues, model: data.model ?? '' };
}

/** Что модель иногда пропускает, а правила по меткам находят надёжно: тему и прехедер («Title:» модель путает
 *  с названием рассылки), характеристики слота из списка «- Провайдер: …». Берём, только если у модели меньше. */
function fillFromRules(brief: Brief, rules: Brief) {
  brief.subject ||= rules.subject;
  brief.preheader ||= rules.preheader;
  const ruleSlots = rules.sections.flatMap((s) => (s.k === 'slots' ? s.slots : []));
  for (const s of brief.sections) {
    if (s.k !== 'slots') continue;
    for (const slot of s.slots) {
      const r = ruleSlots.find((x) => norm(x.name) === norm(slot.name));
      if (!r) continue;
      if ((r.features?.length ?? 0) > (slot.features?.length ?? 0)) slot.features = r.features;
      if (!slot.about && r.about) slot.about = r.about;
    }
  }
}
