// Экспорт письма: HTML (картинки внутри файла) или ZIP (HTML + папка images/).
// Картинки из ZIP потом передаются тем, кто занимается хостингом, и ссылки меняются на их адреса.
// В письме два вида картинок: загруженные дизайнером (data URL) и пресеты из Figma (/assets/...).

import type { EmailDoc } from '@/model/types';
import { renderDocument } from './render';

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'email';

function download(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const DATA_URI = /data:image\/[a-z+]+;base64,[A-Za-z0-9+/=]+/g;
const ASSET_URL = /\/assets\/[a-z0-9/_.-]+\.(?:png|jpe?g|gif|webp|svg)/gi;

const blobToDataUrl = (b: Blob) => new Promise<string>((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(String(r.result));
  r.onerror = () => rej(r.error);
  r.readAsDataURL(b);
});

/** Один файл: пресеты из /assets встраиваем внутрь, чтобы HTML открывался где угодно. */
export async function exportHtml(doc: EmailDoc) {
  let html = renderDocument(doc);
  for (const url of new Set(html.match(ASSET_URL) ?? [])) {
    const data = await blobToDataUrl(await (await fetch(url)).blob());
    html = html.split(url).join(data);
  }
  download(new Blob([html], { type: 'text/html' }), `${slug(doc.name)}.html`);
}

/** Код в буфер: пресеты ссылаются на этот сервер, загруженные картинки — внутри HTML. */
export async function copyHtml(doc: EmailDoc) {
  const html = renderDocument(doc).replace(ASSET_URL, (u) => location.origin + u);
  await navigator.clipboard.writeText(html);
}

const EXT: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg' };

export async function exportZip(doc: EmailDoc) {
  // JSZip нужен только при экспорте — грузим отдельным чанком
  const { default: JSZip } = await import('jszip');
  let html = renderDocument(doc);
  const zip = new JSZip();
  const uploads = [...new Set(html.match(DATA_URI) ?? [])];
  uploads.forEach((uri, i) => {
    const mime = uri.slice(5, uri.indexOf(';'));
    const name = `images/image-${String(i + 1).padStart(2, '0')}.${EXT[mime] ?? 'png'}`;
    zip.file(name, uri.slice(uri.indexOf(',') + 1), { base64: true });
    html = html.split(uri).join(name);
  });
  const assets = [...new Set(html.match(ASSET_URL) ?? [])];
  for (const url of assets) {
    // /assets/teams/arsenal.png → images/teams-arsenal.png
    const name = `images/${url.replace('/assets/', '').replace(/\//g, '-')}`;
    zip.file(name, await (await fetch(url)).blob());
    html = html.split(url).join(name);
  }
  zip.file('index.html', html);
  download(await zip.generateAsync({ type: 'blob' }), `${slug(doc.name)}.zip`);
  return uploads.length + assets.length;
}

/** Для рассылки: таблицы с инлайн-стилями + картинки (см. mailExport.ts). Модуль тяжёлый — грузим по требованию. */
export async function exportMailZip(doc: EmailDoc) {
  const { buildMailZip } = await import('./mailExport');
  const r = await buildMailZip(doc);
  download(r.zip, `${slug(doc.name)}-mail.zip`);
  return r;
}
