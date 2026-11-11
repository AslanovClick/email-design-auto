// Ответ модели → Brief. Модели доверять нельзя: всё, что не по схеме, выбрасывается,
// а пользователь видит список замечаний. validateBrief не бросает исключений.

import { FACT_ROWS } from '@/model/facts';
import { BONUS_ITEMS, type Item } from '@/model/items';
import { CLIENT_PRESETS, LEAGUE_PRESETS, TEAM_PRESETS } from '@/model/presets';
import { detectClient, type Brief, type BriefKind, type Match, type Section, type Signature } from './parse';

const KINDS: BriefKind[] = ['sport', 'casino', 'vip', 'promo'];
const CARD_KEYS = BONUS_ITEMS.types[0].fields.map((f) => f.key);
const ROW_KEYS = new Map(FACT_ROWS.types.map((t) => [t.id, t.fields.map((f) => f.key)]));

// ---------- JSON Schema ответа (response_format OpenRouter)
// Плоская: секция — один объект с видом «k» и полями всех видов, строка фактов — с видом «t»; поля обязательные
// (ненужные виду — пустые): у Anthropic не больше 24 необязательных полей на схему.
// Схема с anyOf по видам у Anthropic не проходит («compiled grammar is too large»); что к какому виду
// относится, сказано в промпте, а лишнее выбрасывает validateBrief.

const str = { type: 'string' };
const strs = { type: 'array', items: str };
const obj = (properties: Record<string, object>, required = Object.keys(properties)) =>
  ({ type: 'object', properties, required, additionalProperties: false });

const SECTION_KINDS = ['top', 'offer', 'text', 'button', 'steps', 'timer', 'note', 'cards', 'slots', 'facts'];
const ROW_FIELDS = [...new Set(FACT_ROWS.types.flatMap((t) => t.fields.map((f) => f.key)))];

// Слот — одна секция на слот, своими полями: title — название, provider, text — описание, lines — характеристики.
// Отдельный массив слотов с вложенными объектами не влезает в грамматику Anthropic.
const SECTION = obj({
  k: { type: 'string', enum: SECTION_KINDS },
  title: str, lines: strs, paras: strs, text: str, link: str, steps: strs, until: str, note: str, provider: str,
  cards: { type: 'array', items: obj(Object.fromEntries(CARD_KEYS.map((k) => [k, str]))) },
  details: { type: 'boolean' },
  rows: { type: 'array', items: obj({ t: { type: 'string', enum: FACT_ROWS.types.map((t) => t.id) }, ...Object.fromEntries(ROW_FIELDS.map((k) => [k, str])) }) },
});

export const BRIEF_JSON_SCHEMA = obj({
  client: { type: ['string', 'null'] },
  title: str,
  subject: str,
  preheader: str,
  kind: { type: 'string', enum: KINDS },
  league: str,
  leagueId: str,
  heroImage: str,
  matches: {
    type: 'array',
    items: obj(
      { date: str, team1: str, team2: str, players: str, odds: str, pick: str, coef: str, team1Id: str, team2Id: str },
      ['date', 'team1', 'team2', 'players'],
    ),
  },
  sections: { type: 'array', items: SECTION },
  signature: { type: ['object', 'null'], properties: { manager: str, email: str, hours: str }, required: ['manager', 'email', 'hours'], additionalProperties: false },
  notes: strs,
}, ['client', 'title', 'subject', 'preheader', 'kind', 'league', 'matches', 'sections', 'signature', 'notes']);

// ---------- проверка

type Raw = Record<string, unknown>;
const isObj = (v: unknown): v is Raw => !!v && typeof v === 'object' && !Array.isArray(v);
/** Строка как есть (id, ссылки, даты). */
const plain = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '');
// Обращение из ТЗ → {{name}}. Не withName из parse.ts: тот меняет любое слово «name»,
// а в английском ТЗ это обычное слово («enter your name»). Здесь — только явные метки и «name» после приветствия.
const NAME_TAG = /\[\s*name\s*\]|(?<!\{)\{\s*name\s*\}(?!\})|%name%|\[имя\]/giu;
const NAME_GREETING = /(?<!\p{L})(привет|здравствуй(?:те)?|hi|hello|hey|dear|hola)(,?\s+)name(?!\p{L})/giu;
const placeholder = (s: string) => s.replace(NAME_TAG, '{{name}}').replace(NAME_GREETING, '$1$2{{name}}');
/** Текст письма. */
const text = (v: unknown) => placeholder(plain(v));
const texts = (v: unknown) => (Array.isArray(v) ? v.map(text).filter(Boolean) : []);
const isUrl = (s: string) => /^https?:\/\/\S+$/i.test(s);

const TEAM_IDS = new Set(TEAM_PRESETS.map((t) => t.id));
const LEAGUE_IDS = new Set(LEAGUE_PRESETS.map((l) => l.id));
const CLIENT_IDS = new Set(CLIENT_PRESETS.map((c) => c.id));

const emptyBrief = (): Brief => ({
  client: null, title: '', subject: '', preheader: '', kind: 'promo', league: '', matches: [], sections: [], signature: null, notes: [],
});

/** Необязательное поле: только непустое значение. */
const opt = <K extends string>(key: K, v: string) => (v ? { [key]: v } as Record<K, string> : {});

function match(m: Raw): Match | null {
  const team1 = plain(m.team1), team2 = plain(m.team2);
  if (!team1 && !team2) return null;
  const id = (v: unknown) => (TEAM_IDS.has(plain(v)) ? plain(v) : '');
  return {
    date: plain(m.date), team1, team2, players: plain(m.players),
    ...opt('odds', plain(m.odds)), ...opt('pick', plain(m.pick)), ...opt('coef', plain(m.coef)),
    ...opt('team1Id', id(m.team1Id)), ...opt('team2Id', id(m.team2Id)),
  };
}

/** Пункт списка: только известные поля, все — строки. */
const item = (v: unknown, keys: string[], t?: string): Item | null => {
  if (!isObj(v)) return null;
  const it: Item = t ? { t } : {};
  for (const k of keys) it[k] = text(v[k]);
  return keys.some((k) => it[k]) ? it : null;
};

/** Текст абзацами: массив или строка с пустыми строками между абзацами. */
const parasOf = (v: unknown) => (typeof v === 'string' ? texts(v.split(/\n\s*\n/)) : texts(v));
/** Первый непустой список из полей — модель может положить содержимое не в то поле плоской схемы. */
const firstList = (...xs: string[][]) => xs.find((x) => x.length) ?? [];

function sectionOf(s: Raw, issues: string[]): Section | null {
  const k = plain(s.k);
  switch (k) {
    case 'top':
    case 'offer': { const lines = firstList(texts(s.lines), texts(s.paras)); return lines.length ? { k, lines } : null; }
    case 'text': {
      const title = text(s.title), paras = firstList(texts(s.paras), parasOf(s.text));
      return title || paras.length ? { k, title, paras } : null;
    }
    case 'button': {
      const t = text(s.text) || text(s.title), link = plain(s.link);
      if (!t) return null;
      if (link && !isUrl(link)) issues.push(`Ссылка кнопки «${t}» не http(s) — убрана`);
      return { k, text: t, ...opt('link', isUrl(link) ? link : '') };
    }
    case 'steps': { const steps = firstList(texts(s.steps), texts(s.paras), texts(s.lines)); return steps.length ? { k, title: text(s.title), steps } : null; }
    case 'timer': return { k, title: text(s.title), ...opt('until', plain(s.until)) };
    case 'note': {
      // вся сноска в note — это и есть её текст
      const t = text(s.text), note = text(s.note);
      if (!t) return note ? { k, note: '', text: note } : null;
      return { k, note, text: t };
    }
    case 'cards': {
      const cards = (Array.isArray(s.cards) ? s.cards : []).map((c) => item(c, CARD_KEYS)).filter((c): c is Item => !!c);
      return cards.length ? { k, cards } : null;
    }
    case 'slots': {
      // одна секция — один слот; старые ответы — массивом slots [{ name, provider }]
      const old = (Array.isArray(s.slots) ? s.slots : []).filter(isObj).map((x) => ({ name: plain(x.name), provider: plain(x.provider) }));
      const one = { name: plain(s.title), provider: plain(s.provider), about: text(s.text), features: texts(s.lines) };
      const slots = [...old, one].filter((x) => x.name);
      return slots.length ? { k, slots } : null;
    }
    case 'facts': {
      const rows: Item[] = [];
      for (const r of Array.isArray(s.rows) ? s.rows : []) {
        const t = isObj(r) ? plain(r.t) : '';
        const keys = ROW_KEYS.get(t);
        if (!keys) { issues.push(`Строка фактов вида «${t || '?'}» не узнана — пропущена`); continue; }
        const row = item(r, keys, t);
        if (row) rows.push(row);
      }
      return rows.length ? { k, title: text(s.title), rows, details: s.details === true } : null;
    }
    default:
      issues.push(`Секция «${k || '?'}» не узнана — пропущена`);
      return null;
  }
}

function clientOf(v: unknown, issues: string[]): string | null {
  const c = plain(v);
  if (!c) return null;
  if (CLIENT_IDS.has(c)) return c;
  const found = detectClient(c);
  if (found) return found;
  issues.push(`Клиент «${c}» не из списка — выберите клиента в плане`);
  return null;
}

export function validateBrief(raw: unknown): { brief: Brief; issues: string[] } {
  const issues: string[] = [];
  if (!isObj(raw)) return { brief: emptyBrief(), issues: ['ИИ вернул не объект — план пустой'] };

  const kind = plain(raw.kind) as BriefKind;
  if (raw.kind != null && !KINDS.includes(kind)) issues.push(`Тип письма «${plain(raw.kind)}» не узнан — промо`);

  const sections: Section[] = [];
  for (const s of Array.isArray(raw.sections) ? raw.sections : []) {
    if (!isObj(s)) { issues.push('Секция не объект — пропущена'); continue; }
    const before = issues.length;
    const sec = sectionOf(s, issues);
    const prev = sections.at(-1);
    // слоты подряд — один список (своя кнопка после списка — без кнопок в карточках)
    if (sec?.k === 'slots' && prev?.k === 'slots') prev.slots.push(...sec.slots);
    else if (sec) sections.push(sec);
    else if (issues.length === before) issues.push(`Секция «${plain(s.k)}» пустая — пропущена`);
  }

  const sig = isObj(raw.signature) ? raw.signature : null;
  const signature: Signature | null = sig && (plain(sig.manager) || plain(sig.email))
    ? { manager: plain(sig.manager), email: plain(sig.email), hours: plain(sig.hours) }
    : null;
  const leagueId = plain(raw.leagueId), heroImage = plain(raw.heroImage);

  return {
    brief: {
      client: clientOf(raw.client, issues),
      title: plain(raw.title),
      subject: text(raw.subject),
      preheader: text(raw.preheader),
      kind: KINDS.includes(kind) ? kind : 'promo',
      league: plain(raw.league),
      ...opt('leagueId', LEAGUE_IDS.has(leagueId) ? leagueId : ''),
      ...opt('heroImage', isUrl(heroImage) ? heroImage : ''),
      matches: (Array.isArray(raw.matches) ? raw.matches : []).filter(isObj).map(match).filter((m): m is Match => !!m),
      sections,
      signature,
      notes: (Array.isArray(raw.notes) ? raw.notes : []).map(plain).filter(Boolean),
    },
    issues,
  };
}
