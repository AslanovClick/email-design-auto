// Повторяющиеся пункты внутри блока (пункты контента, строки фактов).
// Хранятся в data одной JSON-строкой: так они попадают в историю и черновики как обычное поле.

export type Item = Record<string, string>;

export interface ItemField {
  key: string;
  label: string;
  kind?: 'text' | 'textarea' | 'image';
  placeholder?: string;
  /** Рядом с полем — кнопка «очистить» (подпись необязательна). */
  clear?: boolean;
}

/** Тип пункта: у строк фактов их несколько, у пунктов контента — один. */
export interface ItemType {
  id: string;
  label: string;
  fields: ItemField[];
  /** Чем заполняется новый пункт этого типа. */
  sample: Item;
}

export interface ItemsSpec {
  add: string;
  types: ItemType[];
  max?: number;
  /** Разбор старого формата поля (строки текста) — чтобы не сломать сохранённые черновики. */
  legacy?: (s: string) => Item[];
}

const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

export function parseItems(v: unknown, spec?: Pick<ItemsSpec, 'legacy'>): Item[] {
  const s = String(v ?? '').trim();
  if (!s) return [];
  if (s.startsWith('[')) {
    try {
      const a: unknown = JSON.parse(s);
      if (Array.isArray(a)) return a.filter((x): x is Item => !!x && typeof x === 'object');
    } catch { /* не JSON — значит, старый текстовый формат */ }
  }
  return spec?.legacy ? spec.legacy(s) : [];
}

export const itemsValue = (xs: Item[]) => JSON.stringify(xs);

export const typeOf = (spec: ItemsSpec, it: Item) => spec.types.find((t) => t.id === it.t) ?? spec.types[0];

// --- пункты блока «Контент»

const IMG: ItemField = { key: 'image', label: 'Картинка', kind: 'image' };

export const CONTENT_ITEMS: ItemsSpec = {
  add: 'Добавить пункт',
  max: 8,
  types: [{
    id: 'item', label: 'Пункт',
    fields: [IMG, { key: 'title', label: 'Заголовок' }, { key: 'text', label: 'Текст', kind: 'textarea' }],
    sample: { title: 'Новый пункт', text: 'Короткое описание' },
  }],
  legacy: (s) => lines(s).map((l) => {
    const [title, text = ''] = l.split('|').map((x) => x.trim());
    return { title, text };
  }),
};

export const BONUS_ITEMS: ItemsSpec = {
  add: 'Добавить карточку',
  max: 4,
  types: [{
    id: 'card', label: 'Карточка',
    fields: [{ key: 'title', label: 'Заголовок' }, { key: 'big', label: 'Крупная цифра' }, { key: 'sub', label: 'Подзаголовок' }, { key: 'text', label: 'Текст', kind: 'textarea' }],
    sample: { title: 'Бонус', big: '50%', sub: 'до 100 EUR', text: 'Минимальный депозит — 20 EUR.' },
  }],
};

export const STEP_ITEMS: ItemsSpec = {
  add: 'Добавить шаг',
  max: 8,
  types: [{ id: 'step', label: 'Шаг', fields: [IMG, { key: 'text', label: 'Текст', kind: 'textarea' }], sample: { text: 'Новый шаг' } }],
  legacy: (s) => lines(s).map((text) => ({ text })),
};
