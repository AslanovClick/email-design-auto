// Общие типы и мост для перетаскивания: холст сообщает, в какую позицию письма попадает курсор.

import type { BlockType } from '@/model/types';

export type DragData =
  | { kind: 'lib'; type: BlockType; v: number; label: string }
  | { kind: 'move'; id: string; label: string }
  | { kind: 'layer'; id: string; label: string };

/** Холст регистрирует функцию: экранные координаты → индекс вставки в письмо (или null — мимо).
 *  pointer — последняя позиция курсора во время перетаскивания: по ней холст докручивается у краёв
 *  и пересчитывает место вставки, когда письмо прокручивается под неподвижным курсором. */
export const dropBridge: {
  indexAt: (x: number, y: number) => number | null;
  pointer: { x: number; y: number } | null;
  /** Левый верхний угол перетаскиваемого элемента в момент старта — от него dnd-kit отсчитывает плашку у курсора. */
  origin: { x: number; y: number } | null;
} = {
  indexAt: () => null,
  pointer: null,
  origin: null,
};
