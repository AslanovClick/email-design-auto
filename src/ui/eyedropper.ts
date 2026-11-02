// Пипетка: цвет с любого места экрана (EyeDropper API — Chrome и Edge).

import { notify } from '@/store/ui';

type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> };

export const hasEyeDropper = () => 'EyeDropper' in window;

/** Взять цвет с экрана; null — браузер не умеет или пользователь нажал Esc. */
export async function pickScreenColor(): Promise<string | null> {
  const Ctor = (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper;
  if (!Ctor) { notify('Пипетка работает в Chrome и Edge'); return null; }
  try {
    return (await new Ctor().open()).sRGBHex;
  } catch {
    return null;
  }
}
