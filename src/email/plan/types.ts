// Формат plan v5 — ровно то, что читает генератор html_gen (n8n/tools/fixtures/html_gen.plugin-v5.js).
// Координаты — абсолютные, в px от левого верхнего угла письма 600px.

export interface Rect { x: number; y: number; w: number; h: number }

export type Align = 'left' | 'center' | 'right' | 'justify';

export interface TextStyle {
  ff: string;
  fs: number;
  fw: number;
  c: string;
  lh: string;
  tt: string | null;
  ls: string | null;
  dec: string | null;
}

/** Отличия прогона от стиля текста. */
export type StyleDiff = Partial<Pick<TextStyle, 'c' | 'ff' | 'fs' | 'fw' | 'lh' | 'tt' | 'dec'>>;

export interface Run { t: string; d: StyleDiff; ln?: string | null }

export interface Border { w: [number, number, number, number]; c: string }

export type PlanRadius = number | [number, number, number, number];

interface Base extends Rect { id: string; name?: string }

export interface TextItem extends Base {
  k: 'text';
  st: TextStyle;
  runs: Run[];
  ta: Align;
  wrap: boolean;
  lines: number;
}
export interface ImgItem extends Base { k: 'img'; file: string; alt: string; ln?: string }
export interface Zone extends Rect { ln: string }
export interface HeroItem extends Base { k: 'hero'; file: string; zones: Zone[]; content: [] }
export interface BtnItem extends Base {
  k: 'btn';
  text: { st: TextStyle; runs: Run[] };
  ln: string;
  pad: [number, number];
  fill?: string;
  border?: Border;
  r?: PlanRadius;
  bg?: string;
}
export interface BoxItem extends Base { k: 'box'; fill?: string; border?: Border; r?: PlanRadius; bg?: string; content?: PlanItem }
export interface LineItem extends Base { k: 'line'; c: string }
export interface RowItem extends Base { k: 'row'; cells: PlanItem[]; va: 'top' | 'middle' | 'bottom' }
export interface StackItem extends Base { k: 'stack'; items: PlanItem[]; ca?: 'MIN' | 'MAX' }
export interface ColsItem extends Base { k: 'cols'; cells: PlanItem[]; dividers: LineItem[]; shares?: number[]; aligns?: Align[] }

export type PlanItem = TextItem | ImgItem | HeroItem | BtnItem | BoxItem | LineItem | RowItem | StackItem | ColsItem;

export interface PlanAsset { id: string; file: string; w: number; h: number; mode: 'app' }

export interface Plan {
  v: 5;
  width: 600;
  height: number;
  color: string;
  bg: string | null;
  folder: string;
  title: 'Mail';
  assets: PlanAsset[];
  body: StackItem;
  warnings: { id?: string; message: string }[];
}

/** Картинка для n8n: bgImageData — base64 без префикса data:. */
export interface ImageNode {
  id: string;
  name: string;
  file: string;
  folder: string;
  width: number;
  height: number;
  bgImageData: string;
}

/** Тело POST на вебхук: поля и порядок — как buildPayload в ui.html плагина, плюс source и preheader. */
export interface Payload {
  name: string;
  fileName: string;
  fileKey: null;
  width: number;
  height: number;
  bgColor: string;
  frameFills: [];
  colors: Record<string, never>;
  texts: [];
  blocks: [];
  imageNodes: ImageNode[];
  mainAutoLayout: null;
  frameId: string;
  plan: Plan;
  tree: null;
  pluginVersion: '5.0';
  referenceImage: null;
  recipientEmail: '';
  source: 'clickable-mail';
  preheader: string;
}
