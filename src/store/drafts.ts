// Черновики писем в IndexedDB браузера. Временная замена бэка: когда появится API,
// эти функции станут запросами к нему, интерфейс останется тем же.

import { del, get, set } from 'idb-keyval';
import type { EmailDoc } from '@/model/types';

export interface DraftMeta {
  id: string;
  name: string;
  client: string;
  updatedAt: number;
  blocks: number;
}

const INDEX = 'drafts:index';
const key = (id: string) => `draft:${id}`;

export async function listDrafts(): Promise<DraftMeta[]> {
  const list = (await get<DraftMeta[]>(INDEX)) ?? [];
  return list.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function loadDraft(id: string): Promise<EmailDoc | undefined> {
  return get<EmailDoc>(key(id));
}

export async function saveDraft(doc: EmailDoc) {
  await set(key(doc.id), doc);
  const list = ((await get<DraftMeta[]>(INDEX)) ?? []).filter((d) => d.id !== doc.id);
  list.push({ id: doc.id, name: doc.name, client: doc.client, updatedAt: doc.updatedAt, blocks: doc.blocks.length });
  await set(INDEX, list);
}

export async function deleteDraft(id: string) {
  await del(key(id));
  const list = ((await get<DraftMeta[]>(INDEX)) ?? []).filter((d) => d.id !== id);
  await set(INDEX, list);
}

/** Удалить несколько черновиков за раз (индекс переписывается один раз). */
export async function deleteDrafts(ids: string[]) {
  const drop = new Set(ids);
  await Promise.all(ids.map((id) => del(key(id))));
  const list = ((await get<DraftMeta[]>(INDEX)) ?? []).filter((d) => !drop.has(d.id));
  await set(INDEX, list);
}
