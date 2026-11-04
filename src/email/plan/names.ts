// Имена и ссылки картинок письма — как у плагина: папка письма становится префиксом имени файла на FTP
// (подпапок нет), к имени добавляется отпечаток содержимого, чтобы почта не показала старую картинку из кэша.

import type { EmailDoc } from '@/model/types';

/** Заглушка пустых ссылок (решение пользователя в плагине: никаких href="#"). */
export const PLACEHOLDER_URL = 'https://www.google.com/';
export const HOST = 'https://demo.promo/sv/public_html/email_images/';

const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm',
  н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

/** Порт slug() из code.js плагина: транслит кириллицы, остальное — дефисы, до 60 знаков. */
export function slug(s: string): string {
  return String(s || '')
    .replace(/[А-Яа-яЁё]/g, (ch) => {
      const l = ch.toLowerCase(), t = TRANSLIT[l] ?? '';
      return ch === l ? t : t.charAt(0).toUpperCase() + t.slice(1);
    })
    .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

/** cm/<клиент>/<название>-<id письма>; n8n принимает только папки cm/… */
export const folderFor = (doc: Pick<EmailDoc, 'id' | 'name'>, client: string) =>
  `cm/${slug(client) || 'client'}/${slug(doc.name) || 'email'}-${slug(doc.id)}`;

export const ftpName = (folder: string, file: string) => folder.split('/').join('--') + '--' + file;

export const hostedUrl = (folder: string, file: string) => HOST + encodeURIComponent(ftpName(folder, file));

/** Первые 6 hex sha-1 содержимого. */
export async function contentHash(b: Blob): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-1', await b.arrayBuffer()));
  return Array.from(d.slice(0, 3), (x) => x.toString(16).padStart(2, '0')).join('');
}

/** Пустая ссылка и «#» — заглушка; mailto: и плейсхолдеры {{…}} — как есть. */
export function normLink(href: string | null | undefined): string {
  const s = (href ?? '').trim();
  return !s || s === '#' ? PLACEHOLDER_URL : s;
}

/** Имена файлов письма: одно содержимое — один файл, повтор базы с другим содержимым — base-2, base-3. */
export class FileNamer {
  private byHash = new Map<string, string>();
  private bases = new Map<string, number>();

  name(base: string, hash: string, ext: 'png' | 'jpg'): string {
    const known = this.byHash.get(hash);
    if (known) return known;
    const b = slug(base).toLowerCase() || 'img';
    const n = (this.bases.get(b) ?? 0) + 1;
    this.bases.set(b, n);
    const file = `${n > 1 ? `${b}-${n}` : b}-${hash}.${ext}`;
    this.byHash.set(hash, file);
    return file;
  }
}
