// Тело запроса в n8n — тот же JSON, что шлёт плагин Figma (buildPayload в ui.html), плюс source и preheader.

import type { EmailDoc } from '@/model/types';
import type { ImageNode, Payload, Plan } from './types';

const MB = 2 ** 20;
const WARN_MB = 8;   // лимит тела запроса n8n — 16 МБ, base64 добавляет треть

export function buildPayload(doc: EmailDoc, client: string, plan: Plan, nodes: ImageNode[]): Payload {
  return {
    name: doc.name,
    // по fileName html_gen включает правила бренда (22bet)
    fileName: `${client} — ${doc.name}`,
    fileKey: null,
    width: 600,
    height: plan.height,
    bgColor: doc.theme.bg,
    frameFills: [],
    colors: {},
    texts: [],
    blocks: [],
    imageNodes: nodes,
    mainAutoLayout: null,
    frameId: doc.id,
    plan,
    tree: null,
    pluginVersion: '5.0',
    referenceImage: null,
    recipientEmail: '',
    source: 'clickable-mail',
    preheader: doc.preheader,
  };
}

export function sizeWarning(bytes: number): string | null {
  if (bytes <= WARN_MB * MB) return null;
  return `Картинки весят ${Math.round((bytes / MB) * 10) / 10} МБ — запрос к n8n может не пройти (лимит 16 МБ)`;
}

/** base64 без префикса data: (как bgImageData у плагина). */
export async function toBase64(b: Blob): Promise<string> {
  const bytes = new Uint8Array(await b.arrayBuffer());
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
