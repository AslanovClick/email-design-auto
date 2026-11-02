import type { ItemsSpec } from './items';

// Модель письма. Это же JSON, который в будущем уходит на бэк.

export type BlockType =
  | 'hero' | 'footer' | 'body' | 'inner' | 'text' | 'bullets' | 'facts'
  | 'odds' | 'recodds' | 'multibet' | 'league' | 'timer' | 'cta' | 'separator';

/** Число — одно скругление на все углы, кортеж — [↖, ↗, ↘, ↙]. */
export type Radius = number | [number, number, number, number];

export type BlockData = Record<string, string | number | boolean>;

/** Переопределения стиля макета в конкретном блоке. Нет ключа — наследуется. */
export interface BlockStyle {
  card?: string;
  accent?: string;
  text?: string;
  border?: string;
  /** Толщина обводки: одна на все стороны или [верх, право, низ, лево]. */
  borderW?: number | [number, number, number, number];
  radius?: Radius;
  /** Заливка плашки: нет ключа — как в варианте, 'on' — добавить, 'off' — убрать. */
  cardMode?: 'on' | 'off';
}

export interface Block {
  id: string;
  type: BlockType;
  /** Индекс варианта компонента из Figma. У hero — компоновка команд. */
  v: number;
  data: BlockData;
  style: BlockStyle;
}

export type FontName = 'Verdana' | 'Arial' | 'Roboto' | 'Tahoma';

export interface Theme {
  bg: string;
  card: string;
  accent: string;
  text: string;
  font: FontName;
  radius: Radius;
  /** Индекс пресета, 'auto' — палитра по картинке hero, -1 — свои цвета. */
  preset: number | 'auto';
}

export type BgMode = 'color' | 'pattern' | 'image';
export type PatternName = 'diag' | 'dots' | 'grid' | 'plus' | 'diamond' | 'waves' | 'circles' | 'chevron';
export type BgFit = 'repeat-y' | 'top' | 'cover';

/** Фон письма: цвет есть всегда (он же подложка для Outlook), поверх — паттерн или картинка. */
export interface Background {
  mode: BgMode;
  pattern: PatternName;
  tile: string;
  tileName: string;
  scale: number;
  opacity: number;
  image: string;
  imageName: string;
  fit: BgFit;
}

export interface EmailDoc {
  id: string;
  name: string;
  client: string;
  subject: string;
  preheader: string;
  theme: Theme;
  bg: Background;
  blocks: Block[];
  updatedAt: number;
}

export type FieldKind = 'text' | 'textarea' | 'link' | 'image' | 'images' | 'team' | 'league' | 'list' | 'paragraphs' | 'items';

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  def: string;
  placeholder?: string;
  /** Для kind 'items': какие у пунктов поля и типы. */
  items?: ItemsSpec;
  /** Для kind 'paragraphs': подпись кнопки добавления. */
  addLabel?: string;
}

export interface CatalogItem {
  type: BlockType;
  name: string;
  group: CatalogGroup;
  variants: string[];
  /** Блок может быть в письме только один, его нельзя дублировать и двигать. */
  single?: boolean;
  /** Блок нельзя удалить. */
  required?: boolean;
  /** Не показывать в библиотеке (тип остаётся для старых черновиков). */
  hidden?: boolean;
}

export type CatalogGroup = 'Структура' | 'Контент' | 'Спорт' | 'Текст' | 'Элементы';

export interface Client {
  id: string;
  name: string;
  domain: string;
}

export interface Template {
  id: string;
  name: string;
  tag: string;
  blocks: [BlockType, number, BlockData?, BlockStyle?][];
  /** Палитра и фон из макета; без них — стиль по умолчанию. */
  theme?: Partial<Pick<Theme, 'bg' | 'card' | 'accent' | 'text'>>;
  bg?: Partial<Background>;
}
