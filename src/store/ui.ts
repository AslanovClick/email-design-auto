// UI-состояние редактора, которое не попадает в историю и не сохраняется в письмо.

import { create } from 'zustand';

export type RightTab = 'layout' | 'block' | 'checks';
export type LibTab = 'templates' | 'blocks';
export type PaletteKey = 'bg' | 'card' | 'accent' | 'text';

interface UiState {
  rightTab: RightTab;
  libTab: LibTab;
  layersOpen: boolean;
  /** Позиция вставки, выбранная кнопкой «+» между блоками. */
  insertAt: number | null;
  /** Какой цвет палитры меняет пипетка. */
  activeColor: PaletteKey;
  toast: { id: number; text: string } | null;
  /** Идёт перетаскивание блока на холст (из библиотеки или внутри письма). */
  dragging: boolean;
  /** Куда встанет перетаскиваемый блок. */
  dropAt: number | null;
  /** Что тащат: блок письма (id) или новый блок из библиотеки (id = null); label — подпись для индикатора. */
  drag: { id: string | null; label: string } | null;

  set:(patch: Partial<Omit<UiState, 'set'>>) => void;
}

export const useUi = create<UiState>()((set) => ({
  rightTab: 'layout',
  libTab: 'blocks',
  layersOpen: true,
  insertAt: null,
  activeColor: 'accent',
  toast: null,
  dragging: false,
  dropAt: null,
  drag: null,
  set:(patch) => set(patch),
}));

export function notify(text: string) {
  useUi.getState().set({ toast: { id: Date.now(), text } });
}
