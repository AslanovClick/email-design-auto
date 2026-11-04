// Экспорт письма для рассылки. HTML собирает n8n (n8n/clickable-mail.json) генератором плагина Figma,
// картинки уже лежат на demo.promo: HTML и Код ссылаются на них. ZIP — тот же HTML с картинками рядом
// (папка images/) для сервисов рассылки, которые сами хостят картинки.

import type { EmailDoc } from '@/model/types';
import type { MailResult } from '@/store/mailBuild';
import type { Payload } from './plan/types';

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'email';

function download(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Ссылки на картинки хостинга → images/<файл>. */
export function localHtml(r: Pick<MailResult, 'html' | 'urls'>): string {
  let html = r.html;
  for (const [file, url] of Object.entries(r.urls)) html = html.split(url).join(`images/${file}`);
  return html;
}

/** ZIP: index.html + images/ — те же файлы, что ушли в n8n (из памяти, не с сервера). */
export async function exportZip(doc: EmailDoc, r: MailResult): Promise<number> {
  // JSZip нужен только при экспорте — грузим отдельным чанком
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  zip.file('index.html', localHtml(r));
  for (const [file, blob] of r.files) zip.file(`images/${file}`, blob);
  download(await zip.generateAsync({ type: 'blob' }), `${slug(doc.name)}.zip`);
  return r.files.size;
}

export function exportHtml(doc: EmailDoc, r: MailResult) {
  download(new Blob([r.html], { type: 'text/html' }), `${slug(doc.name)}.html`);
}

export async function copyHtml(r: MailResult) {
  await navigator.clipboard.writeText(r.html);
}

/** Ровно то, что уходит на вебхук (картинки — base64): для локального прогона n8n/tools/run-html-gen.ts. */
export function downloadPayload(doc: EmailDoc, p: Payload) {
  download(new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' }), `${slug(doc.name)}.json`);
}
