// Общие типы и мост для перетаскивания: холст сообщает, в какую позицию письма попадает курсор.

import type { BlockType } from '@/model/types';

export type DragData =
  | { kind: 'lib'; type: BlockType; v: number; label: string }
  | { kind: 'move'; id: string; label: string }
  | { kind: 'layer'; id: string; label: string };

/** Холст регистрирует функцию: экранные координаты → индекс вставки в письмо (или null — мимо). */
export const dropBridge: { indexAt: (x: number, y: number) => number | null } = {
  indexAt: () => null,
};
