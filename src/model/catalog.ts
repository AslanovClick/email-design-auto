// Каталог блоков, клиенты, шаблоны и пресеты. Структура повторяет Figma-файл Mail-Autocode
// (секция New Components). Пока данные лежат в коде; позже придут с бэка.

import { CLIENT_PRESETS, TEAM_LAYOUTS } from './presets';
import { FACT_ROWS, FACTS_PRESETS } from './facts';
import { BONUS_ITEMS, CONTENT_ITEMS, STEP_ITEMS, itemsValue } from './items';
import type {
  BlockType, CatalogGroup, CatalogItem, Client, FieldDef, FontName, PatternName, Theme,
} from './types';

export const CLIENTS: Client[] = CLIENT_PRESETS.map(({ id, name, domain }) => ({ id, name, domain }));


export const CATALOG: CatalogItem[] = [
  // hero = хедер + картинка + команды; variants — как команды стоят относительно картинки. Отдельного хедера нет.
  { type: 'hero', name: 'Hero', group: 'Структура', single: true, required: true, variants: TEAM_LAYOUTS },
  { type: 'footer', name: 'Футер', group: 'Структура', single: true, variants: ['Стандартный', 'VIP'] },
  // старый «Body» — теперь вариант «Картинка сверху» в Контенте; оставлен для старых черновиков
  { type: 'body', name: 'Body', group: 'Контент', hidden: true, variants: ['Картинка сверху', 'Картинка сбоку'] },
  { type: 'inner', name: 'Inner-блок', group: 'Контент',
    variants: ['Команды строкой под картинкой', 'Команды в две строки', 'Гербы на картинке', 'Команды на картинке'] },
  // [text] Body Text — заголовок и абзацы настраиваются в контенте, варианты отличаются оформлением
  { type: 'text', name: 'Текст', group: 'Текст',
    variants: ['Обычный', 'Малый заголовок', 'В рамке', 'Важное примечание', 'Подзаголовок и оффер'] },
  // [text] Bullet points + картинка с текстом и кнопкой
  { type: 'bullets', name: 'Контент', group: 'Контент',
    variants: ['Иконки в ряд', 'Крупные карточки', 'Список с офферами', 'Шаги по порядку', 'Картинка слева', 'Картинка справа',
      'Картинка слева с кнопкой', 'Картинка справа с кнопкой', 'Карточка бонуса', 'Картинка сверху', 'Бонусы карточками'] },
  // [text] Facts — оформление; строки внутри настраиваются отдельно, есть пресеты
  { type: 'facts', name: 'Факты игр', group: 'Спорт',
    variants: ['Детали с полосами', 'Нумерованный список', 'Строки под дугой', 'Факты в общей рамке',
      'Факты карточками', 'Строки в рамках', 'Всё в одной рамке', 'Список в рамках'] },
  // [odds] Match Odds
  { type: 'odds', name: 'Коэффициенты', group: 'Спорт',
    variants: ['В строку', 'Плашка с полосой', 'Подписи сверху', 'Две ставки', 'Пилюля', 'Подписи акцентом',
      'В рамке', 'Лепесток', 'Две ставки крупно', 'Крупные кэфы', 'С иконкой', 'Таблица'] },
  // [odds] Recomended Odds
  { type: 'recodds', name: 'Рекомендуем', group: 'Спорт',
    variants: ['Боковые полосы', 'Пилюля', 'Толстая рамка', 'Боковые линии', 'Шестигранник', 'Линия сверху', 'Уголки'] },
  // [text] Multibet
  { type: 'multibet', name: 'Экспресс', group: 'Спорт', variants: ['Список по видам спорта', 'С картинкой'] },
  // [text] Soccer league
  { type: 'league', name: 'Лига', group: 'Спорт', variants: ['Лига и анонс', 'Лига по центру'] },
  // [text] Timer + свои варианты
  { type: 'timer', name: 'Таймер', group: 'Элементы', variants: ['Боковые линии', 'Плитки', 'Табло', 'Одной строкой'] },
  // [cta_button] Button
  { type: 'cta', name: 'Кнопка', group: 'Элементы',
    variants: ['Глянцевая', 'С ушками', 'Трапеция', 'Лента', 'С рамкой', 'Шестигранник', 'Боковые акценты',
      'Яркая', 'Восьмигранник', 'Капсула с бликом', 'Стрелка', 'Наклонная', 'Асимметричная', 'С тенью'] },
  // [block] Separate
  { type: 'separator', name: 'Разделитель', group: 'Элементы',
    variants: ['Свечение', 'Полоса', 'Пики с ромбом', 'Орнамент', 'Точка', 'Линия с ромбом', 'Скобка'] },
];

export const GROUPS: CatalogGroup[] = ['Структура', 'Контент', 'Спорт', 'Текст', 'Элементы'];

export const catalogOf = (type: BlockType) => CATALOG.find((c) => c.type === type)!;

/** Какие поля нужны конкретному варианту (нет записи — все поля типа). */
const VARIANT_FIELDS: Partial<Record<BlockType, string[][]>> = {
  text: [['title', 'text'], ['title', 'text'], ['title', 'text'], ['note', 'text'], ['kicker', 'offer']],
  bullets: [
    ['items'], ['items'], ['items'], ['steps'],
    ['image', 'alt', 'title', 'sub', 'text'], ['image', 'alt', 'title', 'sub', 'text'],
    ['image', 'alt', 'title', 'sub', 'text', 'cta', 'link'], ['image', 'alt', 'title', 'sub', 'text', 'cta', 'link'],
    ['image', 'alt', 'title', 'big', 'sub'], ['image', 'alt', 'title', 'text', 'cta', 'link'], ['cards'],
  ],
  recodds: [
    ['pick', 'coef', 'link'], ['pick', 'coef', 'link'], ['pick', 'coef', 'link'], ['pick', 'coef', 'suffix', 'link'],
    ['pick', 'coef', 'link'], ['pick', 'coef', 'link'], ['pick', 'coef', 'suffix', 'link'],
  ],
  league: [['league', 'date', 'title', 'sub', 'text', 'cta', 'link'], ['league', 'title', 'text', 'cta', 'link']],
  multibet: [['sports'], ['image', 'alt', 'sports']],
};
type Sides = [number, number, number, number];
/** Обводка, которая есть у варианта в Figma: [верх, право, низ, лево]. Её видно и можно менять в «Стиле блока». */
const VARIANT_BORDER: Partial<Record<BlockType, (Sides | null)[]>> = {
  odds: [null, [2, 0, 0, 0], null, null, [2, 2, 2, 2], null, [2, 2, 2, 2], [2, 2, 2, 2], null, null, [0, 2, 0, 2], [1, 1, 1, 1]],
  text: [null, null, [4, 4, 4, 4], null, null],
  recodds: [[0, 20, 0, 20], [4, 4, 4, 4], [8, 8, 8, 8], [0, 3, 0, 3], null, [2, 0, 0, 0], [1, 1, 1, 1]],
  timer: [[0, 3, 0, 3], null, null, null],
  league: [[4, 4, 4, 4], null],
  bullets: [null, null, null, null, null, null, null, null, [4, 4, 4, 4], null, [5, 5, 5, 5]],
  facts: [null, null, [2, 0, 0, 0], [0, 2, 0, 2], [1, 1, 3, 1], [2, 2, 2, 2], [4, 4, 4, 4], [1, 1, 2, 1]],
  multibet: [[4, 4, 4, 4], [4, 4, 4, 4]],
};
export const variantBorder = (type: BlockType, v: number) => VARIANT_BORDER[type]?.[v] ?? null;

/** Скругление рамки, заданное вариантом (иначе — как в макете). */
const VARIANT_RADIUS: Partial<Record<BlockType, (number | null)[]>> = {
  recodds: [0, 105, 35, 0, null, 2, null],
  timer: [20, null, null, null],
  league: [24, null],
  bullets: [null, null, null, null, null, null, null, null, 24, null, 30],
  facts: [null, null, 24, 16, 12, 8, 14, 6],
  multibet: [24, 24],
};
export const variantRadius = (type: BlockType, v: number) => VARIANT_RADIUS[type]?.[v] ?? null;

export function fieldsFor(type: BlockType, v: number) {
  const keys = VARIANT_FIELDS[type]?.[v];
  return keys ? FIELDS[type].filter((f) => keys.includes(f.key)) : FIELDS[type];
}
export const isSingle = (type: BlockType) => !!catalogOf(type).single;
export const isRequired = (type: BlockType) => !!catalogOf(type).required;

/** Поля инспектора по типам блоков. */
export const FIELDS: Record<BlockType, FieldDef[]> = {
  hero: [
    { key: 'logoLink', label: 'Ссылка с логотипа', kind: 'link', def: '' },
    { key: 'date', label: 'Дата', kind: 'text', def: '14.07' },
    { key: 'year', label: 'Год', kind: 'text', def: '2026' },
    { key: 'time', label: 'Время', kind: 'text', def: '22:00 UTC' },
    { key: 'league', label: 'Лига', kind: 'league', def: 'UEFA Champions League' },
    { key: 'image', label: 'Картинка (фото игроков)', kind: 'image', def: '' },
    { key: 'alt', label: 'Alt-текст', kind: 'text', def: '' },
    { key: 'team1', label: 'Команда 1', kind: 'team', def: 'Liverpool' },
    { key: 'team2', label: 'Команда 2', kind: 'team', def: 'Arsenal' },
    { key: 'vs', label: 'Между командами', kind: 'text', def: 'VS' },
  ],
  body: [
    { key: 'image', label: 'Картинка', kind: 'image', def: '' },
    { key: 'alt', label: 'Alt-текст', kind: 'text', def: '' },
    { key: 'title', label: 'Заголовок', kind: 'text', def: 'Бонус 100% на первый депозит' },
    { key: 'text', label: 'Текст', kind: 'textarea', def: 'Пополните счёт до конца недели и получите удвоенный баланс для ставок.' },
    { key: 'cta', label: 'Кнопка', kind: 'text', def: 'Забрать бонус' },
    { key: 'link', label: 'Ссылка', kind: 'link', def: '' },
  ],
  inner: [
    { key: 'image', label: 'Картинка (дата — на ней)', kind: 'image', def: '' },
    { key: 'alt', label: 'Alt-текст', kind: 'text', def: '' },
    { key: 'team1', label: 'Команда 1', kind: 'team', def: 'Liverpool' },
    { key: 'team2', label: 'Команда 2', kind: 'team', def: 'Arsenal' },
    { key: 'vs', label: 'Между командами', kind: 'text', def: 'VS' },
  ],
  text: [
    { key: 'title', label: 'Заголовок', kind: 'text', def: 'Привет, {{name}}!' },
    { key: 'kicker', label: 'Подзаголовок', kind: 'text', def: 'Новый сезон. Новый бонус' },
    { key: 'offer', label: 'Оффер', kind: 'text', def: '50% Free Bet до 200 EUR' },
    { key: 'note', label: 'Начало примечания', kind: 'text', def: 'Обратите внимание!' },
    { key: 'text', label: 'Абзацы', kind: 'paragraphs', def: 'Главный матч тура уже в эти выходные. Мы подготовили повышенные коэффициенты и бонус на экспресс — успейте сделать ставку до стартового свистка.' },
  ],
  bullets: [
    { key: 'image', label: 'Картинка', kind: 'image', def: '' },
    { key: 'alt', label: 'Alt-текст', kind: 'text', def: '' },
    { key: 'title', label: 'Заголовок', kind: 'text', def: 'Casino: 50% bonus' },
    { key: 'sub', label: 'Подзаголовок', kind: 'text', def: 'up to 500 EUR / USD / CAD' },
    { key: 'big', label: 'Крупная цифра', kind: 'text', def: '50%' },
    { key: 'text', label: 'Текст', kind: 'textarea', def: 'The minimum deposit to claim the bonus is 20 EUR / 20 USD / 25 CAD.' },
    { key: 'items', label: 'Пункты', kind: 'items', items: CONTENT_ITEMS,
      def: itemsValue([{ title: '50 фриспинов', text: 'на депозит от 20 EUR' }, { title: 'Кэшбэк 10%', text: 'каждую неделю' }, { title: 'Без вейджера', text: 'выигрыш сразу на счёт' }]) },
    { key: 'steps', label: 'Шаги', kind: 'items', items: STEP_ITEMS,
      def: itemsValue([{ text: 'Авторизуйтесь на сайте в своём кабинете' }, { text: 'Пополните счёт от 20 EUR' }, { text: 'Получите фриспины автоматически' }]) },
    { key: 'cards', label: 'Карточки', kind: 'items', items: BONUS_ITEMS,
      def: itemsValue([
        { title: 'Casino bonus', big: '55%', sub: 'до 500 EUR / USD', text: 'Минимальный депозит для бонуса — 20 EUR / 20 USD.' },
        { title: 'Sports: free bet', big: '50%', sub: 'до 100 EUR / USD', text: 'Минимальный депозит для фрибета — 20 EUR / 20 USD.' },
      ]) },
    { key: 'cta', label: 'Текст кнопки', kind: 'text', def: 'Bet Now' },
    { key: 'link', label: 'Ссылка', kind: 'link', def: '' },
  ],
  facts: [
    { key: 'title', label: 'Заголовок', kind: 'text', def: FACTS_PRESETS[0].title },
    { key: 'rows', label: 'Строки', kind: 'items', items: FACT_ROWS, def: itemsValue(FACTS_PRESETS[0].rows) },
  ],
  odds: [
    { key: 'odds', label: 'Коэффициенты W1 / X / W2', kind: 'text', def: '2.10 / 3.40 / 3.25' },
    { key: 'labels', label: 'Подписи исходов', kind: 'text', def: 'W1 / X / W2' },
    { key: 'link', label: 'Ссылка', kind: 'link', def: '' },
  ],
  recodds: [
    { key: 'pick', label: 'Ставка', kind: 'text', def: 'Рекомендуем ставку: ТБ 4.5 + обе забьют' },
    { key: 'coef', label: 'Коэффициент', kind: 'text', def: '7.77' },
    { key: 'suffix', label: 'Подпись снизу', kind: 'text', def: 'в линии {{brand}}' },
    { key: 'link', label: 'Ссылка', kind: 'link', def: '' },
  ],
  multibet: [
    { key: 'image', label: 'Картинка', kind: 'image', def: '' },
    { key: 'alt', label: 'Alt-текст', kind: 'text', def: '' },
    { key: 'sports', label: 'Виды спорта: первая строка — название, дальше события', kind: 'paragraphs', addLabel: 'Добавить вид спорта',
      def: 'Football\n-Argentina. Reserve League. Chacarita Juniors II - Club Atletico Atlanta II\n-Croatia. HNL. NK Lokomotiva - Šibenik\n-Denmark. Superliga. Nordsjaelland - Midtjylland\n\nTennis\n-ITF. Charlotte. Women. Berta Bonardi - Julia Adams\n\nTable Tennis\n-Pro Spin Series. Vladislav Sorbalo - Sergey Pavlina' },
  ],
  league: [
    { key: 'league', label: 'Лига', kind: 'league', def: 'Ligue 1' },
    { key: 'date', label: 'Дата', kind: 'text', def: '21.08' },
    { key: 'title', label: 'Заголовок', kind: 'text', def: 'France (Ligue 1) Лига 1' },
    { key: 'sub', label: 'Подзаголовок', kind: 'text', def: 'Кто разрушит монополию ПСЖ?' },
    { key: 'text', label: 'Текст', kind: 'textarea', def: '12 титулов за 14 лет — ПСЖ безоговорочный фаворит. Но на охоту за трофеем выходят Монако, Марсель, Лион и Лилль. Кто бросит вызов парижанам?' },
    { key: 'cta', label: 'Текст кнопки', kind: 'text', def: 'Bet Now' },
    { key: 'link', label: 'Ссылка', kind: 'link', def: '' },
  ],
  timer: [
    { key: 'title', label: 'Подпись', kind: 'text', def: 'Срок действия предложения:' },
    { key: 'values', label: 'Значения (дни / часы / минуты / секунды)', kind: 'text', def: '02 / 14 / 37 / 05' },
    { key: 'labels', label: 'Подписи', kind: 'text', def: 'Дней / Часов / Минут / Секунд' },
    { key: 'date', label: 'Окончание акции', kind: 'text', def: '30.11 · 23:59' },
  ],
  cta: [
    { key: 'text', label: 'Текст кнопки', kind: 'text', def: 'Bet Now' },
    { key: 'link', label: 'Ссылка', kind: 'link', def: '' },
  ],
  separator: [],
  // футер собирается из данных клиента (presets.ts); здесь — то, что можно поменять в конкретном письме
  footer: [
    { key: 'logoLink', label: 'Ссылка с логотипа', kind: 'link', def: '' },
    { key: 'manager', label: 'VIP-менеджер', kind: 'text', def: '' },
    { key: 'managerEmail', label: 'Почта менеджера', kind: 'text', def: '' },
    { key: 'hours', label: 'Часы работы', kind: 'text', def: '' },
    { key: 'supportEmail', label: 'Почта поддержки', kind: 'text', def: '' },
    { key: 'unsub', label: 'Ссылка отписки', kind: 'link', def: '{{unsubscribe}}' },
  ],
};

export { TEMPLATES } from './templates';

export type Palette = Pick<Theme, 'bg' | 'card' | 'accent' | 'text'>;

export const THEME_PRESETS: (Palette & { name: string })[] = [
  { name: 'Изумруд', bg: '#0b171b', card: '#12252b', accent: '#22b33a', text: '#f2f5f6' },
  { name: 'Фиолет', bg: '#1d0f3a', card: '#2a1857', accent: '#2bd45a', text: '#f3efff' },
  { name: 'Ночь', bg: '#0a1330', card: '#13204a', accent: '#18c6c0', text: '#eef3fd' },
  { name: 'Золото', bg: '#17110a', card: '#241a10', accent: '#e9b949', text: '#f6efe4' },
  { name: 'Красный', bg: '#140b0c', card: '#231314', accent: '#e8202a', text: '#f6eeee' },
];

export const THEME_KEYS: [keyof Palette, string][] = [
  ['bg', 'Фон'], ['card', 'Плашки'], ['accent', 'Акцент'], ['text', 'Текст'],
];

/** Шрифты письма. Verdana — по умолчанию. */
export const FONTS: FontName[] = ['Verdana', 'Arial', 'Roboto', 'Tahoma'];
export const DEFAULT_FONT: FontName = 'Verdana';

export const PATTERNS: PatternName[] = ['diag', 'dots', 'grid', 'plus', 'diamond', 'waves', 'circles', 'chevron'];
export const PATTERN_NAMES: Record<PatternName, string> = {
  diag: 'Диагональ', dots: 'Точки', grid: 'Сетка', plus: 'Крестики', diamond: 'Ромбы', waves: 'Волны', circles: 'Кольца', chevron: 'Ёлочка',
};

/** Скругление кнопок по умолчанию — своё у каждого варианта; общее скругление макета на кнопки не распространяется. */
export const BTN_RADIUS_BY_VARIANT = [50, 50, 0, 0, 50, 0, 16, 24, 0, 56, 0, 0, 26, 26];
export const BTN_RADIUS = 12;
