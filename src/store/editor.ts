// Состояние редактора: открытое письмо + история изменений (Ctrl+Z / Ctrl+Shift+Z).
// В историю попадает только doc; выделение блока и прочий UI — нет.

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { temporal } from 'zundo';
import { catalogOf, isRequired, isSingle } from '@/model/catalog';
import { createBlock, newId } from '@/model/factory';
import type { Background, BlockData, BlockStyle, BlockType, EmailDoc, Theme } from '@/model/types';
import { notify } from './ui';

interface EditorState {
  doc: EmailDoc | null;
  selected: string | null;

  load: (doc: EmailDoc) => void;
  select: (id: string | null) => void;
  setMeta: (patch: Partial<Pick<EmailDoc, 'name' | 'client' | 'subject' | 'preheader'>>) => void;
  setTheme: (patch: Partial<Theme>) => void;
  setBg: (patch: Partial<Background>) => void;
  replaceBlocks: (blocks: EmailDoc['blocks']) => void;
  /** Заменить стиль письма целиком (одним шагом истории) — для «Случайного стиля». */
  restyle: (patch: Pick<EmailDoc, 'theme' | 'bg' | 'blocks'>) => void;

  insert: (type: BlockType, v: number, index?: number) => string | null;
  insertSmart: (type: BlockType, v: number) => string | null;
  move: (id: string, to: number) => void;
  shift: (id: string, dir: -1 | 1) => void;
  duplicate: (id: string) => boolean;
  remove: (id: string) => boolean;
  setVariant: (id: string, v: number) => void;
  setData: (id: string, patch: BlockData) => void;
  setStyle: (id: string, patch: Partial<BlockStyle>) => void;
  unsetStyle: (id: string, keys: (keyof BlockStyle)[]) => void;
  resetStyle: (id: string) => void;
}

/** Границы, в которых можно двигать обычные блоки: hero всегда первый, футер всегда последний. */
function movableRange(doc: EmailDoc) {
  const b = doc.blocks;
  const min = b[0]?.type === 'hero' ? 1 : 0;
  const max = b[b.length - 1]?.type === 'footer' ? b.length - 1 : b.length;
  return { min, max };
}

export function canShift(doc: EmailDoc, id: string, dir: -1 | 1) {
  const i = doc.blocks.findIndex((b) => b.id === id);
  const j = i + dir;
  return i >= 0 && j >= 0 && j < doc.blocks.length && !isSingle(doc.blocks[i].type) && !isSingle(doc.blocks[j].type);
}

// история пишется не чаще раза в 400 мс, чтобы набор текста не плодил шаг на каждую букву
function throttle<T extends (...a: never[]) => void>(fn: T, ms: number): T {
  let last = 0;
  return ((...args: Parameters<T>) => {
    const now = Date.now();
    if (now - last >= ms) { last = now; fn(...args); }
  }) as T;
}

export const useEditor = create<EditorState>()(
  temporal(
    immer((set, get) => {
      const withDoc = (fn: (doc: EmailDoc) => void) => set((s) => {
        if (!s.doc) return;
        fn(s.doc);
        s.doc.updatedAt = Date.now();
      });
      const blockOf = (doc: EmailDoc, id: string) => doc.blocks.find((b) => b.id === id);

      return {
        doc: null,
        selected: null,

        load: (doc) => set({ doc, selected: null }),
        select: (id) => set({ selected: id }),
        setMeta: (patch) => withDoc((d) => { Object.assign(d, patch); }),
        setTheme: (patch) => withDoc((d) => { Object.assign(d.theme, patch); }),
        setBg: (patch) => withDoc((d) => { Object.assign(d.bg, patch); }),
        replaceBlocks: (blocks) => { withDoc((d) => { d.blocks = blocks; }); set({ selected: null }); },
        restyle: (patch) => withDoc((d) => { Object.assign(d, patch); }),

        insert: (type, v, index) => {
          const doc = get().doc;
          if (!doc) return null;
          if (isSingle(type) && doc.blocks.some((b) => b.type === type)) {
            notify(`${catalogOf(type).name} в письме может быть только один — смените вариант у существующего`);
            return null;
          }
          const block = createBlock(type, v);
          const { min, max } = movableRange(doc);
          let at = Math.max(min, Math.min(max, index ?? max));
          if (type === 'hero') at = 0;
          if (type === 'footer') at = doc.blocks.length;
          withDoc((d) => { d.blocks.splice(at, 0, block); });
          set({ selected: block.id });
          return block.id;
        },
        // вставка после выделенного блока, иначе перед футером
        insertSmart: (type, v) => {
          const { doc, selected, insert } = get();
          if (!doc) return null;
          const i = doc.blocks.findIndex((b) => b.id === selected);
          return insert(type, v, i >= 0 ? i + 1 : undefined);
        },
        move: (id, to) => {
          const doc = get().doc;
          const b = doc && blockOf(doc, id);
          if (!doc || !b || isSingle(b.type)) return;
          const { min, max } = movableRange(doc);
          const target = Math.max(min, Math.min(max, to));
          withDoc((d) => {
            const from = d.blocks.findIndex((x) => x.id === id);
            const [blk] = d.blocks.splice(from, 1);
            d.blocks.splice(target > from ? target - 1 : target, 0, blk);
          });
        },
        shift: (id, dir) => {
          const doc = get().doc;
          if (!doc || !canShift(doc, id, dir)) return;
          withDoc((d) => {
            const i = d.blocks.findIndex((b) => b.id === id);
            const j = i + dir;
            [d.blocks[i], d.blocks[j]] = [d.blocks[j], d.blocks[i]];
          });
        },
        duplicate: (id) => {
          const doc = get().doc;
          const b = doc && blockOf(doc, id);
          if (!doc || !b || isSingle(b.type)) return false;
          const copy = { ...structuredClone(b), id: newId() };
          withDoc((d) => {
            const i = d.blocks.findIndex((x) => x.id === id);
            d.blocks.splice(i + 1, 0, copy);
          });
          set({ selected: copy.id });
          return true;
        },
        remove: (id) => {
          const doc = get().doc;
          const b = doc && blockOf(doc, id);
          if (!doc || !b || isRequired(b.type)) return false;
          withDoc((d) => { d.blocks = d.blocks.filter((x) => x.id !== id); });
          if (get().selected === id) set({ selected: null });
          return true;
        },
        setVariant: (id, v) => withDoc((d) => { const b = blockOf(d, id); if (b) b.v = v; }),
        setData: (id, patch) => withDoc((d) => { const b = blockOf(d, id); if (b) Object.assign(b.data, patch); }),
        setStyle: (id, patch) => withDoc((d) => { const b = blockOf(d, id); if (b) Object.assign(b.style, patch); }),
        unsetStyle: (id, keys) => withDoc((d) => { const b = blockOf(d, id); if (b) keys.forEach((k) => delete b.style[k]); }),
        resetStyle: (id) => withDoc((d) => { const b = blockOf(d, id); if (b) b.style = {}; }),
      };
    }),
    {
      partialize: (s) => ({ doc: s.doc }),
      equality: (a, b) => a.doc === b.doc,
      limit: 100,
      handleSet: (handleSet) => throttle(handleSet, 400),
    },
  ),
);

export const useHistory = () => useEditor.temporal.getState();

/** Текущий выделенный блок. */
export const useSelectedBlock = () => useEditor((s) => s.doc?.blocks.find((b) => b.id === s.selected) ?? null);
