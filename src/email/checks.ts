// Проверки перед экспортом.

import type { EmailDoc } from '@/model/types';
import { renderDocument } from './render';

export interface Check {
  id: string;
  level: 'ok' | 'warn' | 'error';
  title: string;
  hint?: string;
  /** Блоки, к которым относится замечание — по клику переходим к первому. */
  blocks?: string[];
}

/** Лимит Gmail: письма тяжелее обрезаются. */
export const GMAIL_LIMIT_KB = 102;

/** Вес HTML без встроенных картинок: в рассылке они уйдут ссылками на хостинг. */
export function htmlSizeKb(doc: EmailDoc) {
  const html = renderDocument(doc).replace(/data:[^'")\s]+/g, 'https://cdn.example.com/img/xxxxxxxx.png');
  return new Blob([html]).size / 1024;
}

export function runChecks(doc: EmailDoc) {
  const list: Check[] = [];
  const size = htmlSizeKb(doc);
  list.push({
    id: 'size', level: size >= GMAIL_LIMIT_KB ? 'error' : size >= 90 ? 'warn' : 'ok',
    title: `Вес HTML ${size.toFixed(0)} КБ из ${GMAIL_LIMIT_KB}`, hint: 'Gmail обрезает письма тяжелее 102 КБ',
  });

  const needAlt = doc.blocks.filter((b) => 'alt' in b.data && b.data.image && !b.data.alt
    && !(b.type === 'hero' && !b.data.imageOn));
  list.push({ id: 'alt', level: needAlt.length ? 'error' : 'ok',
    title: needAlt.length ? `Нет alt у картинок: ${needAlt.length}` : 'Alt у всех картинок', blocks: needAlt.map((b) => b.id) });

  const noLink = doc.blocks.filter((b) => 'link' in b.data && !b.data.link);
  list.push({ id: 'links', level: noLink.length ? 'error' : 'ok',
    title: noLink.length ? `Пустые ссылки: ${noLink.length}` : 'Все ссылки заполнены', blocks: noLink.map((b) => b.id) });

  const noImg = doc.blocks.filter((b) => b.type === 'hero' && b.data.imageOn && !b.data.image);
  if (noImg.length) list.push({ id: 'heroimg', level: 'warn', title: 'Не загружена картинка hero', blocks: noImg.map((b) => b.id) });

  list.push({ id: 'subject', level: doc.subject ? 'ok' : 'error', title: doc.subject ? 'Тема письма заполнена' : 'Нет темы письма' });
  list.push({ id: 'preheader', level: doc.preheader ? 'ok' : 'warn', title: doc.preheader ? 'Прехедер заполнен' : 'Нет прехедера' });
  const footer = doc.blocks.some((b) => b.type === 'footer');
  list.push({ id: 'unsub', level: footer ? 'ok' : 'error', title: footer ? 'Есть футер с отпиской' : 'Нет футера и ссылки отписки' });

  return {
    list, size,
    errors: list.filter((c) => c.level === 'error').length,
    warns: list.filter((c) => c.level === 'warn').length,
    flagged: new Set(list.flatMap((c) => (c.level === 'ok' ? [] : c.blocks ?? []))),
  };
}
