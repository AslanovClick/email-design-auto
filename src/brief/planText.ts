// Текст плана письма: человекочитаемый, правится руками и разбирается обратно без ИИ.
//
//   Клиент: Vave                            ← шапка до первого блока
//   Тип: Промо
//   …
//   [Кнопка] Забрать фрибет                 ← [Блок · Вариант] главное поле
//   [Текст · Обычный]
//   Заголовок: Привет {{name}},             ← поля «Подпись: значение»
//   Начните выходные с подарка…             ← абзацы через пустую строку
//   [Контент · Шаги по порядку] Как активировать фрибет:
//   - Войдите в свой аккаунт                ← пункты списков «- a | b»
//   Для дизайнера:
//   - заметка
//
// Пишутся только поля, отличные от умолчаний блока (главное поле — всегда), поэтому
// planToText(parsePlan(planToText(p)).plan) === planToText(p). Непонятые строки — PlanError, разбор продолжается.

import { CATALOG, CLIENTS, catalogOf, fieldsFor } from '@/model/catalog';
import { createBlock } from '@/model/factory';
import { FACT_ROWS } from '@/model/facts';
import { itemsValue, parseItems, type Item, type ItemsSpec } from '@/model/items';
import { HERO_HEADERS, HERO_PRESETS, type HeroPreset } from '@/model/presets';
import type { Block, BlockData, BlockType, FieldDef } from '@/model/types';
import { findLeague, findTeam, originOf, type PlanDoc, type Planned } from './build';
import { norm, type BriefKind } from './parse';

export interface PlanError { line: number; text: string; message: string }

const KINDS: [BriefKind, string][] = [['sport', 'Спорт'], ['casino', 'Казино'], ['vip', 'VIP'], ['promo', 'Промо']];
const NOTES_HEAD = 'Для дизайнера:';
const HEAD_FIELDS = ['Клиент', 'Тип', 'Название', 'Тема', 'Прехедер'] as const;

// ---------- что и как пишется у блоков

/** Варианты «Контента» с шагами: заголовок шагов — отдельный блок «Текст · Малый заголовок» перед ними. */
const STEPS = new Set([3, 11]);
/** Варианты, которые всё равно задаёт случайный стиль, — в плане не пишутся. */
const NO_VARIANT = new Set<BlockType>(['cta', 'separator']);

/** Главное поле — на строке заголовка блока. */
function mainKey(type: BlockType, v: number): string | null {
  switch (type) {
    case 'cta': return 'text';
    case 'timer': return 'title';
    case 'odds': return 'odds';
    case 'recodds': return 'pick';
    case 'facts': return 'title';
    case 'text': return v === 1 ? 'title' : v === 3 ? 'note' : null;
    case 'bullets': return !STEPS.has(v) && fieldsFor('bullets', v).some((f) => f.key === 'title') ? 'title' : null;
    default: return null;
  }
}
/** Поле со списком — строки «- …». */
const listField = (type: BlockType, v: number) => fieldsFor(type, v).find((f) => f.kind === 'items') ?? null;
/** Поле с абзацами — строки после полей. */
const bodyKey = (type: BlockType, v: number) =>
  fieldsFor(type, v).find((f) => (f.kind === 'paragraphs' || f.kind === 'textarea') && f.key !== mainKey(type, v))?.key ?? null;

/** Содержимое, которого в плане нет, — пустое (оформление и примерные значения — как в каталоге). */
const EMPTY: Partial<Record<BlockType, string[]>> = {
  text: ['title', 'kicker', 'offer', 'text'],
  bullets: ['image', 'alt', 'title', 'sub', 'big', 'text', 'items', 'steps', 'cards'],
  facts: ['title', 'rows'],
  multibet: ['sports'],
};
function emptyContent(type: BlockType, v: number): BlockData {
  const d: BlockData = {};
  for (const k of EMPTY[type] ?? []) d[k] = '';
  const main = mainKey(type, v);
  if (main) d[main] = '';
  return d;
}
const planDefaults = (type: BlockType, v: number) => createBlock(type, v, emptyContent(type, v)).data;

/** Короткие подписи для записи (при разборе годятся и они, и подписи из каталога). */
const SHORT: Partial<Record<BlockType, Record<string, string>>> = {
  hero: { image: 'Картинка' },
  inner: { image: 'Картинка' },
  timer: { date: 'Окончание', values: 'Значения' },
  footer: { manager: 'Менеджер', managerEmail: 'Почта', hours: 'Часы' },
};
const TEAMS = 'Команды';
const HEADER = 'Хедер';
const PIC_TEXT = 'Текст для картинки';

const isUrl = (s: string) => /^https?:\/\/\S+$/i.test(s);
const oneLine = (s: string) => s.replace(/\s*\n\s*/g, ' ').trim();
const cell = (s: string) => oneLine(s).replace(/\|/g, '/');

function heroPreset(d: BlockData, v: number): HeroPreset {
  const img = d.imageOn !== false, teams = d.teamsOn !== false;
  return HERO_PRESETS.find((p) => p.imageOn === img && p.teamsOn === teams && p.v === v)
    ?? HERO_PRESETS.find((p) => p.imageOn === img && p.teamsOn === teams)
    ?? HERO_PRESETS.find((p) => p.imageOn === img)
    ?? HERO_PRESETS[0];
}

/** Значение поля в плане: картинки — только ссылки, заголовок текста — если включён. */
function valueOf(b: Block, f: FieldDef): string {
  const v = String(b.data[f.key] ?? '');
  if (f.kind === 'image') return isUrl(v) ? v : '';
  if (b.type === 'text' && f.key === 'title' && b.data.titleOn === false) return '';
  return v;
}

// ---------- пункты списков

const ROW_NAMES: Record<string, string> = { stat: 'Цифры', form: 'Форма', h2h: 'Три значения', text: 'Абзац', fact: 'Факт' };
const ROW_BY_NAME = new Map(Object.entries(ROW_NAMES).map(([id, name]) => [norm(name), id]));
const dropTail = (xs: string[]) => { while (xs.length && !xs.at(-1)) xs.pop(); return xs; };

/** Порядок подполей пункта: картинки — в конце (обычно пустые). */
const cols = (spec: ItemsSpec) => {
  const fields = spec.types[0].fields;
  return [...fields.filter((f) => f.kind !== 'image'), ...fields.filter((f) => f.kind === 'image')];
};

function itemLine(spec: ItemsSpec, it: Item): string {
  if (spec === FACT_ROWS) {
    const g = (k: string) => cell(it[k] ?? '');
    const t = ROW_NAMES[it.t] ? it.t : 'stat';
    const parts = t === 'stat' ? dropTail([g('l'), g('label'), g('r'), g('ls'), g('rs')])
      : t === 'form' ? [g('l'), g('sub') ? `${g('label')} (${g('sub')})` : g('label'), g('r')]
        : t === 'h2h' ? [g('title'), g('vals'), g('labels')]
          : t === 'text' ? [g('text')]
            : g('lead') ? [g('lead'), g('text')] : [g('text')];
    return `- ${ROW_NAMES[t]}: ${parts.join(' | ')}`;
  }
  const parts = cols(spec).map((f) => (f.kind === 'image' ? (isUrl(it[f.key] ?? '') ? it[f.key] : '') : cell(it[f.key] ?? '')));
  return `- ${dropTail(parts).join(' | ')}`;
}

function parseItem(spec: ItemsSpec, s: string): Item | string {
  const split = (x: string) => x.split(/\s*\|\s*/);
  if (spec === FACT_ROWS) {
    const m = /^([^:|]+):\s*(.*)$/.exec(s);
    const t = m && ROW_BY_NAME.get(norm(m[1]));
    if (!m || !t) return `Строка фактов начинается видом: ${Object.values(ROW_NAMES).join(', ')}`;
    const type = FACT_ROWS.types.find((x) => x.id === t)!;
    const it: Item = { t, ...Object.fromEntries(type.fields.map((f) => [f.key, ''])) };
    const p = split(m[2].trim());
    const at = (i: number) => p[i] ?? '';
    if (t === 'stat') Object.assign(it, { l: at(0), label: at(1), r: at(2), ls: at(3), rs: at(4) });
    if (t === 'form') {
      const lab = /^(.*?)\s*\(([^()]*)\)$/.exec(at(1));
      Object.assign(it, { l: at(0), label: lab ? lab[1] : at(1), sub: lab ? lab[2] : '', r: at(2) });
    }
    if (t === 'h2h') Object.assign(it, { title: at(0), vals: at(1), labels: at(2) });
    if (t === 'text') it.text = m[2].trim();
    if (t === 'fact') Object.assign(it, p.length > 1 ? { lead: at(0), text: p.slice(1).join(' | ') } : { lead: '', text: at(0) });
    return it;
  }
  const p = split(s);
  const it: Item = {};
  cols(spec).forEach((f, i) => {
    const x = p[i] ?? '';
    it[f.key] = f.kind === 'image' && !isUrl(x) ? '' : x;
  });
  return it;
}

// ---------- запись

function blockHead(b: Block, main: string): string {
  const c = catalogOf(b.type);
  const variant = b.type === 'hero' ? heroPreset(b.data, b.v).name : NO_VARIANT.has(b.type) ? '' : c.variants[b.v] ?? c.variants[0];
  return `[${c.name}${variant ? ` · ${variant}` : ''}]${main ? ` ${oneLine(main)}` : ''}`;
}

function paragraphs(s: string): string {
  return s.split(/\n\s*\n/).map((p) => p.split('\n').map((l) => l.trim()).filter(Boolean).join('\n')).filter(Boolean).join('\n\n');
}

function blockLines(b: Block, stepsTitle = ''): string[] {
  const d = b.data;
  const def = planDefaults(b.type, b.v);
  const main = mainKey(b.type, b.v);
  const body = bodyKey(b.type, b.v);
  const list = listField(b.type, b.v);
  const out = [blockHead(b, main ? String(d[main] ?? '') : stepsTitle)];
  const put = (label: string, v: string) => out.push(`${label}: ${oneLine(v)}`);

  if (b.type === 'hero') {
    const p = heroPreset(d, b.v);
    if (Number(d.hv ?? 0) !== p.hv) put(HEADER, HERO_HEADERS[Number(d.hv)] ?? HERO_HEADERS[0]);
  }
  if ((b.type === 'hero' || b.type === 'inner') && d.teamsOn !== false && (d.team1 !== def.team1 || d.team2 !== def.team2)) {
    put(TEAMS, [d.team1, d.team2].map((x) => String(x ?? '')).filter(Boolean).join(' – '));
  }
  for (const f of fieldsFor(b.type, b.v)) {
    if (f.key === main || f.key === body || f.kind === 'items' || f.key === 'team1' || f.key === 'team2') continue;
    const v = valueOf(b, f);
    const dv = valueOf({ ...b, data: def }, f);
    if (v !== dv) put(SHORT[b.type]?.[f.key] ?? f.label, v);
  }
  if (b.type === 'hero' && d.picText) put(PIC_TEXT, String(d.picText));
  if (list) {
    for (const it of parseItems(d[list.key], list.items)) out.push(itemLine(list.items!, it));
  }
  if (body) {
    const text = paragraphs(String(d[body] ?? ''));
    if (text !== paragraphs(String(def[body] ?? ''))) out.push(...text.split('\n'));
  }
  return out;
}

/** «Текст · Малый заголовок» без абзацев перед шагами — заголовок шагов, пишется в их строке. */
const isStepsTitle = (b: Block, next?: Block) =>
  b.type === 'text' && b.v === 1 && b.data.titleOn !== false && !!b.data.title && !paragraphs(String(b.data.text ?? ''))
  && next?.type === 'bullets' && STEPS.has(next.v);

export function planToText(plan: PlanDoc): string {
  const client = CLIENTS.find((c) => c.id === plan.client)?.name ?? plan.client;
  const kind = KINDS.find(([k]) => k === plan.kind)?.[1] ?? 'Промо';
  const out = [
    `Клиент: ${client}`, `Тип: ${kind}`, `Название: ${oneLine(plan.name)}`, `Тема: ${oneLine(plan.subject)}`, `Прехедер: ${oneLine(plan.preheader)}`,
  ];
  const blocks = plan.blocks.map((p) => p.block);
  for (let i = 0; i < blocks.length; i++) {
    out.push('');
    if (isStepsTitle(blocks[i], blocks[i + 1])) { out.push(...blockLines(blocks[i + 1], String(blocks[i].data.title))); i++; continue; }
    out.push(...blockLines(blocks[i]));
  }
  out.push('', NOTES_HEAD, ...plan.notes.map((n) => `- ${oneLine(n)}`));
  return out.join('\n') + '\n';
}

// ---------- разбор

const BLOCKS = CATALOG.filter((c) => !c.hidden);
const VARIANT_SYNONYMS: Partial<Record<BlockType, Record<string, number>>> = { text: { сноска: 3, примечание: 3 } };

/** Точное совпадение, иначе — первое, что начинается с введённого (от 3 букв). */
function lookup<T>(items: T[], key: (x: T) => string, q: string): T | undefined {
  const n = norm(q);
  if (!n) return undefined;
  return items.find((x) => norm(key(x)) === n) ?? (n.length >= 3 ? items.find((x) => norm(key(x)).startsWith(n)) : undefined);
}

/** Подписи полей блока → ключ (подпись из каталога, она же без пояснения в скобках, короткая подпись). */
function labelsOf(type: BlockType, v: number): Map<string, string> {
  const m = new Map<string, string>();
  const main = mainKey(type, v);
  for (const f of fieldsFor(type, v)) {
    if (f.kind === 'items' || f.key === main || f.key === 'team1' || f.key === 'team2') continue;
    for (const l of [f.label, f.label.replace(/\s*\([^)]*\)\s*/g, ' '), SHORT[type]?.[f.key]]) if (l) m.set(norm(l), f.key);
  }
  if (type === 'hero' || type === 'inner') m.set(norm(TEAMS), 'teams');
  if (type === 'hero') { m.set(norm(HEADER), 'hv'); m.set(norm(PIC_TEXT), 'picText'); }
  return m;
}

/** Расстояние Левенштейна — для опечаток в подписях полей. */
function distance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = row;
  }
  return prev[b.length];
}

/** Подпись поля блока, на которую похожа введённая (1 ошибка, у длинных — 2), или null. */
function nearLabel(type: BlockType, v: number, typed: string): string | null {
  const n = norm(typed);
  if (n.length < 4) return null;
  const main = mainKey(type, v);
  const labels = [
    ...fieldsFor(type, v).filter((f) => f.kind !== 'items' && f.key !== main && f.key !== 'team1' && f.key !== 'team2')
      .flatMap((f) => [f.label.replace(/\s*\([^)]*\)\s*/g, ' ').trim(), SHORT[type]?.[f.key]]),
    ...(type === 'hero' || type === 'inner' ? [TEAMS] : []),
    ...(type === 'hero' ? [HEADER, PIC_TEXT] : []),
  ].filter((l): l is string => !!l);
  return labels.find((l) => distance(n, norm(l)) <= (n.length >= 8 ? 2 : 1)) ?? null;
}

interface Open {
  block: Block;
  /** Заголовок шагов со строки блока — станет блоком «Текст · Малый заголовок» перед ним. */
  stepsTitle: string;
  body: string[];
  bodyStarted: boolean;
  items: Item[];
}

export function parsePlan(text: string, fallbackClient: string, known?: PlanDoc): { plan: PlanDoc; errors: PlanError[] } {
  const plan: PlanDoc = { client: fallbackClient, kind: 'promo', name: '', subject: '', preheader: '', blocks: [], notes: [] };
  const errors: PlanError[] = [];
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  let cur: Open | null = null;
  let skipping = false;      // строки блока, который не узнали
  let inNotes = false;

  // гербы и лого, которые узнала модель (по id): название → картинка
  const crests = new Map<string, string>();
  const leagues = new Map<string, BlockData>();
  for (const p of known?.blocks ?? []) {
    const d = p.block.data;
    if (p.block.type !== 'hero' && p.block.type !== 'inner') continue;
    for (const [t, l] of [['team1', 'team1Logo'], ['team2', 'team2Logo']]) if (d[t] && d[l]) crests.set(String(d[t]), String(d[l]));
    if (p.block.type === 'hero' && d.league && d.leagueLogo) leagues.set(String(d.league), { leagueLogo: d.leagueLogo, leagueLogoLight: d.leagueLogoLight ?? '' });
  }

  const close = () => {
    if (!cur) return;
    const { block: b } = cur;
    const body = bodyKey(b.type, b.v);
    const list = listField(b.type, b.v);
    if (body && cur.bodyStarted) b.data[body] = cur.body.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    if (list) b.data[list.key] = itemsValue(cur.items);
    if (b.type === 'text') b.data.titleOn = !!b.data.title;
    if (b.type === 'hero' || b.type === 'inner') {
      for (const [t, l] of [['team1', 'team1Logo'], ['team2', 'team2Logo']]) {
        const name = String(b.data[t] ?? '');
        b.data[l] = crests.get(name) ?? findTeam(name)?.file ?? '';
      }
    }
    if (b.type === 'hero') {
      const lg = findLeague(String(b.data.league ?? ''));
      Object.assign(b.data, leagues.get(String(b.data.league ?? '')) ?? { leagueLogo: lg?.file ?? '', leagueLogoLight: lg?.fileOnLight ?? '' });
    }
    const add = (block: Block) => plan.blocks.push({ block, origin: originOf(block) } satisfies Planned);
    if (cur.stepsTitle) add(createBlock('text', 1, { title: cur.stepsTitle, titleOn: true, text: '' }));
    add(b);
    cur = null;
  };

  lines.forEach((raw, i) => {
    const line = raw.trim();
    const err = (message: string) => errors.push({ line: i + 1, text: raw, message });

    // заголовок блока
    const head = /^\[\s*([^\]·•]*?)\s*(?:([·•])\s*([^\]]*?)\s*)?\]\s*(.*)$/.exec(line);
    const c = head ? lookup(BLOCKS, (x) => x.name, head[1]) ?? BLOCKS.find((x) => norm(x.type) === norm(head[1])) : undefined;
    // «[картинка]» и т.п. посреди абзацев — текст, а не блок: ни варианта, ни текста после скобки
    const inText = !!head && !c && !head[2] && !head[4] && !!cur && !!bodyKey(cur.block.type, cur.block.v) && !skipping && !inNotes;
    if (head && !inText) {
      close();
      inNotes = false;
      const [, name, , variant = '', main] = head;
      if (!c) { err(`Блок «${name}» не найден`); skipping = true; return; }
      skipping = false;
      let v = 0;
      const data: BlockData = {};
      if (c.type === 'hero') {
        const p = variant ? lookup(HERO_PRESETS, (x) => x.name, variant) : HERO_PRESETS[0];
        if (!p) err(`Вариант «${variant}» у блока «${c.name}» не найден — взят «${HERO_PRESETS[0].name}»`);
        const preset = p ?? HERO_PRESETS[0];
        v = preset.v;
        Object.assign(data, { imageOn: preset.imageOn, teamsOn: preset.teamsOn, hv: preset.hv });
      } else if (variant) {
        const syn = VARIANT_SYNONYMS[c.type]?.[norm(variant)];
        const found = syn ?? c.variants.indexOf(lookup(c.variants, (x) => x, variant) ?? '');
        if (found < 0) err(`Вариант «${variant}» у блока «${c.name}» не найден — взят «${c.variants[0]}»`);
        else v = found;
      }
      const block = createBlock(c.type, v, { ...emptyContent(c.type, v), ...data });
      const mk = mainKey(c.type, v);
      let stepsTitle = '';
      if (mk) block.data[mk] = main;
      else if (c.type === 'bullets' && STEPS.has(v)) stepsTitle = main;
      else if (main) err(`У блока «${c.name}» текст на строке заголовка не предусмотрен`);
      cur = { block, stepsTitle, body: [], bodyStarted: false, items: [] };
      return;
    }

    if (norm(line) === norm(NOTES_HEAD) && line.endsWith(':')) { close(); inNotes = true; skipping = false; return; }
    if (inNotes) {
      const n = line.replace(/^[-•]\s*/, '');
      if (n) plan.notes.push(n);
      return;
    }
    if (skipping) return;

    // шапка до первого блока
    if (!cur) {
      if (!line) return;
      const m = /^([^:]+):\s*(.*)$/.exec(line);
      const key = m && HEAD_FIELDS.find((h) => norm(h) === norm(m[1]));
      if (!m || !key) { err(`До первого блока — только ${HEAD_FIELDS.join(', ')}`); return; }
      const v = m[2].trim();
      if (key === 'Клиент') {
        const c = CLIENTS.find((x) => norm(x.name) === norm(v) || x.id === v.toLowerCase());
        if (c) plan.client = c.id;
        else err(`Клиент «${v}» не из списка — взят «${CLIENTS.find((x) => x.id === fallbackClient)?.name ?? fallbackClient}»`);
      }
      if (key === 'Тип') {
        const k = KINDS.find(([, name]) => norm(name) === norm(v));
        if (k) plan.kind = k[0];
        else err(`Тип «${v}» не найден — ${KINDS.map(([, n]) => n).join(', ')}`);
      }
      if (key === 'Название') plan.name = v;
      if (key === 'Тема') plan.subject = v;
      if (key === 'Прехедер') plan.preheader = v;
      return;
    }

    const b = cur.block;
    const body = bodyKey(b.type, b.v);
    const list = listField(b.type, b.v);
    if (!line) { if (cur.bodyStarted) cur.body.push(''); return; }

    // пункт списка
    const dash = /^[-•]\s+(.*)$/.exec(line);
    if (dash && list) {
      const it = parseItem(list.items!, dash[1].trim());
      if (typeof it === 'string') err(it);
      else cur.items.push(it);
      return;
    }

    // поле «Подпись: значение» — до начала абзацев
    const f = !cur.bodyStarted ? /^([^:]{1,60}):\s*(.*)$/.exec(line) : null;
    const key = f && labelsOf(b.type, b.v).get(norm(f[1]));
    // «Заголвок:» — опечатка в подписи, а не абзац: иначе подпись уйдёт в текст письма, а поле останется пустым
    const typo = f && !key ? nearLabel(b.type, b.v, f[1]) : null;
    if (f && typo) { err(`Поле «${f[1].trim()}» не найдено — может, «${typo}»?`); return; }
    if (f && key) {
      const v = f[2].trim();
      if (key === 'teams') {
        const [t1, t2 = ''] = v.split(/\s+[–—-]\s+|\s+vs\.?\s+/i);
        Object.assign(b.data, { team1: t1.trim(), team2: t2.trim() });
      } else if (key === 'hv') {
        const h = lookup(HERO_HEADERS, (x) => x, v);
        if (h) b.data.hv = HERO_HEADERS.indexOf(h);
        else err(`Хедер «${v}» не найден — ${HERO_HEADERS.join(', ')}`);
      } else if (fieldsFor(b.type, b.v).find((x) => x.key === key)?.kind === 'image' && v && !isUrl(v)) {
        err('Картинка — только ссылка http(s)');
      } else {
        b.data[key] = v;
      }
      return;
    }

    // абзацы
    if (body) { cur.bodyStarted = true; cur.body.push(line); return; }
    err(f ? `Поле «${f[1].trim()}» у блока «${catalogOf(b.type).name}» не найдено` : `Строка не понята: у блока «${catalogOf(b.type).name}» нет текста абзацами`);
  });
  close();
  return { plan, errors };
}
