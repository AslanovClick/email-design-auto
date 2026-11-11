// Разбор ТЗ без ИИ: текст делится на строки, каждая строка узнаётся по меткам и словам-признакам
// («Title:», «button (…)», «Как активировать бонус:», «Обратите внимание!» и т.п.).
// Результат — содержание письма по порядку; какие блоки из него собрать, решает build.ts.

import { CLIENT_PRESETS } from '@/model/presets';
import type { Item } from '@/model/items';

export interface Match {
  date: string; team1: string; team2: string; players: string;
  /** Коэффициенты П1 / Х / П2 строкой, как в ТЗ: «2.10 / 3.40 / 3.25». */
  odds?: string;
  /** «Рекомендуем»: исход и коэффициент. */
  pick?: string; coef?: string;
  /** id команд из библиотеки (гербы), названия — как в ТЗ. */
  team1Id?: string; team2Id?: string;
}

/** Слот: название и провайдер; подводка и характеристики — как в ТЗ («Bonus Buy», «Макс. выигрыш: x50,000»). */
export interface Slot { name: string; provider: string; about?: string; features?: string[] }

export type Section =
  /** Текст на картинке шапки (Image / Картинка / Баннер) — его рисует дизайнер. */
  | { k: 'top'; lines: string[] }
  /** Оффер под картинкой шапки (Mailer top): подзаголовок, крупный оффер, призыв — по строкам. */
  | { k: 'offer'; lines: string[] }
  | { k: 'text'; title: string; paras: string[] }
  | { k: 'button'; text: string; link?: string }
  | { k: 'steps'; title: string; steps: string[] }
  /** until — окончание акции, как в ТЗ («22.11.2026 23:59»). */
  | { k: 'timer'; title: string; until?: string }
  | { k: 'note'; note: string; text: string }
  | { k: 'cards'; cards: Item[] }
  | { k: 'slots'; slots: Slot[] }
  | { k: 'facts'; title: string; rows: Item[]; details: boolean };

export interface Signature { manager: string; email: string; hours: string }

export type BriefKind = 'sport' | 'casino' | 'vip' | 'promo';

export interface Brief {
  /** id клиента или null — не нашли в тексте. */
  client: string | null;
  /** Первая строка ТЗ — название рассылки. */
  title: string;
  subject: string;
  preheader: string;
  kind: BriefKind;
  league: string;
  /** id лиги из библиотеки (лого). */
  leagueId?: string;
  /** Готовая картинка баннера из ТЗ (http-ссылка). */
  heroImage?: string;
  matches: Match[];
  sections: Section[];
  signature: Signature | null;
  /** Для дизайнера: игроки, сроки, пуш и всё, что в письмо не идёт. */
  notes: string[];
}

// ---------- помощники

/** Для сравнения: регистр, пробелы, дефисы и диакритика не важны. */
export const norm = (s: string) =>
  s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

const NAME_RE = /\[\s*name\s*\]|\{\{\s*name\s*\}\}|\{\s*name\s*\}|%name%|\bname\b|\[имя\]/i;
/** Плейсхолдер имени из ТЗ («name», «[NAME]», «{name}») → переменная рассылки. */
export const withName = (s: string) => s.replace(NAME_RE, '{{name}}');

/** Клиенты: сначала длинные названия, чтобы «20Bet Asia» не съел «20Bet». */
const CLIENT_RES = CLIENT_PRESETS
  .map((c) => {
    // название и id: у «20Bet Asia» домен 20bet.asia, поэтому домен не берём — иначе он совпадёт с «20bet»
    const words = [c.name, c.id];
    const alt = [...new Set(words)].map((w) => w.split(/(?<=\d)(?=\D)|(?<=\D)(?=\d)|\s+/).map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[\\s-]?'));
    return { id: c.id, len: c.name.length, re: new RegExp(`(^|[^\\p{L}\\p{N}])(${alt.join('|')})(?=$|[^\\p{L}\\p{N}])`, 'iu') };
  })
  .sort((a, b) => b.len - a.len);

export function detectClient(text: string, prefer = ''): string | null {
  for (const src of [prefer, text]) {
    if (!src) continue;
    let best: { id: string; at: number } | null = null;
    for (const c of CLIENT_RES) {
      const m = c.re.exec(src);
      if (m && (!best || m.index < best.at)) best = { id: c.id, at: m.index };
    }
    if (best) return best.id;
  }
  return null;
}

// ---------- узнавание строк

type Label =
  | 'subject' | 'preheader' | 'brand' | 'league' | 'date' | 'teams' | 'players' | 'facts' | 'details'
  | 'text' | 'top' | 'offer' | 'button' | 'push' | 'body';

/** Метки «Ключ: значение». Ключ сравниваем после norm(). */
const LABELS: [Label, string[]][] = [
  ['subject', ['title', 'subject', 'тема', 'темаписьма', 'заголовокписьма']],
  ['preheader', ['preheader', 'прехедер', 'преheader', 'подзаголовокписьма']],
  ['brand', ['бренд', 'brand', 'клиент', 'client']],
  ['league', ['турнир', 'лига', 'чемпионат', 'tournament', 'league', 'competition']],
  ['date', ['датаматча', 'дата', 'date', 'matchdate']],
  ['teams', ['команды', 'teams', 'матч', 'match']],
  ['players', ['игроки', 'players', 'игрокидлякартинки']],
  ['facts', ['факты', 'фактыматча', 'facts', 'matchfacts', 'интересныефакты']],
  ['details', ['деталиматча', 'статистика', 'matchdetails', 'stats', 'details']],
  ['text', ['text', 'текст', 'bodytext', 'основнойтекст']],
  ['top', ['image', 'картинка', 'баннер', 'hero', 'шапка', 'banner']],
  ['offer', ['mailertop', 'topmailer', 'оффер', 'offer']],
  ['button', ['button', 'кнопка', 'cta']],
  ['body', ['body']],
];
const labelOf = (key: string): Label | null => {
  const k = norm(key);
  for (const [l, keys] of LABELS) if (keys.includes(k)) return l;
  return null;
};

const LABEL_LINE = /^([^:]{1,32}):\s*(.*)$/;
const BUTTON_INLINE = /^(?:button|кнопка|cta)\s*(?:\((.+)\)|:\s*(.+))\s*$/i;
const PUSH_LINE = /^(push|пуш|push[- ]?уведомление|push notification)\s*:?\s*$/i;
// \b в JS не видит кириллицу — конец слова задаём через (?![\p{L}\p{N}])
const GREETING = /^(привет|приветствуем|здравствуйте|добрый\s+(?:день|вечер)|доброе\s+утро|hi|hello|hey|dear|greetings|hola)(?![\p{L}\p{N}])/iu;
const STEPS_HEAD = /^(как\s+(?:активировать|получить|забрать|участвовать|воспользоваться)|шаги|что\s+нужно\s+сделать|how\s+to\s+(?:claim|get|activate|join|participate)|steps)(?![\p{L}\p{N}]).*:?$/iu;
const TIMER_HEAD = /(expires?\s+in|ends?\s+in|offer\s+ends|срок\s+действия|до\s+окончания|до\s+конца|осталось|time\s+left|таймер|timer)/i;
const TIMER_FILL = /^(?:[(\[]?\s*(?:timer|таймер)\s*[)\]]?|(?:[XxХх]{1,2}\s*(?:дн\p{L}*|час\p{L}*|мин\p{L}*|сек\p{L}*|d(?:ays?)?|h(?:ours?)?|m(?:in\p{L}*)?|s(?:ec\p{L}*)?)?\s*[:.,]?\s*)+)$/iu;
const NOTE_HEAD = /^\*?\s*(обратите\s+внимание|важно|внимание|please\s+note|note|important)\s*[!:.]?/i;
const LIST_ITEM = /^\s*(?:[-–—•*·]|\d{1,2}[.)])\s+/;
const NUMBERED = /^\s*\d{1,2}[.)]\s*/;
const SLOT_LINE = /^(.{2,60}?)\s*\(([^()]{2,40})\)\s*$/;
const PROVIDER = /^(?:провайдер|разработчик|provider|developer)\s*:\s*(.{2,40})$/i;
const BIG_TOKEN = /(\d+(?:[.,]\d+)?\s?(?:%|fs\b|free\s?spins?|фриспин\w*|eur\b|usd\b|usdt\b|€|\$))/i;
const CARD_PAIR_BIG = /^(?:до\s+|up\s+to\s+)?\d+(?:[.,]\d+)?\s?(?:%|fs|free\s?spins?|фриспин\w*|eur|usd|usdt|€|\$)\s*$/i;
const CARD_PAIR_SUB = /^(?:на|за|for|on|with|при)\s+(?:депозит|deposit|пополнени)/i;
const CARD_LABELED = /^(casino|sports?|sport|казино|спорт|live|лайв|покер|poker)\s*:\s*(.+)$/i;
const SIGN_HEAD = /^(sincerely(?:\s+yours)?|best\s+regards|kind\s+regards|regards|с\s+уважением|ваш\s+vip|yours\s+truly)(?![\p{L}\p{N}])[,!]?\s*(.*)$/iu;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const DEADLINE = /(верстк\w*|вёрстк\w*|дедлайн|deadline)\s+(?:нужна\s+)?(?:до\s+)?(\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?)/i;
const DATE_RE = /\b(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?\b/;

/** «Real Madrid - Villarreal», «England-Croatia», «A vs B». */
export function splitTeams(s: string): [string, string] | null {
  // сначала разделители с пробелами, потом тесный дефис между словами («England-Croatia»), но не «Al-Hilal»
  const tries = [/\s+(?:vs\.?|v\.?|против)\s+/iu, /\s*[—–]\s*/u, /\s+-\s*|\s*-\s+/u, /(?<=\p{Ll})-(?=\p{Lu}\p{Ll}{2})/u];
  for (const re of tries) {
    const parts = s.split(re).map((x) => x.trim()).filter(Boolean);
    if (parts.length === 2) return [parts[0], parts[1]];
  }
  return null;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
/** «EREN» → «Eren», «Nina» остаётся как есть. */
const nameCase = (s: string) => (s === s.toUpperCase() ? s.split(/\s+/).map(cap).join(' ') : s);

/** Карточка бонуса из «CASINO: 55% bonus up to 500 EUR / USD». */
function labeledCard(label: string, value: string): Item {
  const m = BIG_TOKEN.exec(value);
  const title = cap(label.trim());
  if (!m) return { title, big: '', sub: value.trim(), text: '' };
  const before = value.slice(0, m.index).trim();
  let after = value.slice(m.index + m[0].length).trim();
  // слова до «up to / до» относятся к заголовку: «bonus up to 500» → заголовок «Casino bonus»
  const lead = /^(.*?)\s*(?<![\p{L}\p{N}])(up\s+to|до|на|for|on)(?![\p{L}\p{N}])/iu.exec(after);
  let extra = '';
  if (lead && lead[1]) { extra = lead[1]; after = after.slice(lead[1].length).trim(); }
  return { title: [title + (before ? `: ${before}` : ''), extra].filter(Boolean).join(' '), big: m[0].replace(/\s+/g, ' '), sub: after, text: '' };
}

/** Строки «Детали матча»: цифры команд, «5 последних встреч» с тремя значениями, абзацы. */
function detailRows(lines: string[]): Item[] {
  const rows: Item[] = [];
  const NUM = /^[\d.,:%+\-–]+$/;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const stat = /^(\S{1,7})\s+(.+?)\s+(\S{1,7})$/.exec(l);
    if (stat && NUM.test(stat[1]) && NUM.test(stat[3]) && /\p{L}/u.test(stat[2])) {
      rows.push({ t: 'stat', l: stat[1], label: stat[2], r: stat[3], ls: '', rs: '' });
      continue;
    }
    // заголовок и 2–3 строки «число подпись» под ним
    if (/:\s*$/.test(l)) {
      const vals: [string, string][] = [];
      let j = i + 1;
      while (j < lines.length && vals.length < 3) {
        const m = /^(\d+)\s+(.+)$/.exec(lines[j]);
        if (!m || NUM.test(m[2])) break;
        vals.push([m[1], m[2]]);
        j++;
      }
      if (vals.length >= 2) {
        // ничья — посередине, как в компоненте
        const draw = vals.findIndex(([, t]) => /нич|draw/i.test(t));
        if (draw >= 0 && vals.length === 3 && draw !== 1) vals.splice(1, 0, vals.splice(draw, 1)[0]);
        rows.push({ t: 'h2h', title: l, vals: vals.map((v) => v[0]).join(' / '), labels: vals.map((v) => v[1]).join(' / ') });
        i = j - 1;
        continue;
      }
    }
    rows.push({ t: 'text', text: l });
  }
  return rows;
}

/** Факты: по строке на факт; если факты нумерованы, строки без номера — продолжение предыдущего. */
function factRows(lines: string[]): Item[] {
  const numbered = lines.some((l) => NUMBERED.test(l));
  const out: string[] = [];
  for (const l of lines) {
    if (!numbered || NUMBERED.test(l) || !out.length) out.push(l.replace(LIST_ITEM, ''));
    else out[out.length - 1] += ` ${l}`;
  }
  return out.map((text) => ({ t: 'fact', lead: '', text }));
}

/** Строка оборвана посреди фразы, следующая — её продолжение. */
const continues = (prev: string, next: string) => !/[.!?:…»")\]]$/.test(prev) && /^\p{Ll}/u.test(next);

// ---------- разбор

export function parseBrief(raw: string): Brief {
  const src = raw.replace(/\r\n?/g, '\n').replace(/[​ ]/g, ' ');
  const lines = src.split('\n').map((l) => l.replace(/\s+/g, ' ').trim());

  const b: Brief = {
    client: null, title: '', subject: '', preheader: '', kind: 'promo', league: '', matches: [],
    sections: [], signature: null, notes: [],
  };
  let brand = '';
  type Mode = 'none' | 'text' | 'top' | 'offer' | 'facts' | 'details' | 'push' | 'steps' | 'note' | 'signature' | 'slot';
  let mode: Mode = 'none';
  // режим меняется и во вложенных функциях — читаем через cur(), чтобы TS не сужал тип по присваиваниям
  const cur = (): Mode => mode;
  let block: string[] = [];
  let blockTitle = '';
  const push: string[] = [];

  const last = () => b.sections[b.sections.length - 1];
  const textSection = () => {
    const s = last();
    if (s?.k === 'text') return s;
    const t: Section = { k: 'text', title: '', paras: [] };
    b.sections.push(t);
    return t;
  };
  const addPara = (l: string, newPara: boolean) => {
    const t = textSection();
    if (!newPara && t.paras.length && continues(t.paras[t.paras.length - 1], l)) t.paras[t.paras.length - 1] += ` ${l}`;
    else t.paras.push(l);
  };
  const curMatch = () => b.matches[b.matches.length - 1];
  const flush = () => {
    if (cur() === 'facts' && block.length) b.sections.push({ k: 'facts', title: blockTitle, rows: factRows(block), details: false });
    if (cur() === 'details' && block.length) b.sections.push({ k: 'facts', title: blockTitle, rows: detailRows(block), details: true });
    if (cur() === 'top' && block.length) b.sections.push({ k: 'top', lines: block });
    if (cur() === 'offer' && block.length) b.sections.push({ k: 'offer', lines: block });
    if (cur() === 'push' && block.length) push.push(...block);
    block = [];
    blockTitle = '';
  };
  const setMode = (m: Mode, title = '') => { flush(); mode = m; blockTitle = title; };

  let gap = true; // перед строкой была пустая — новый абзац
  let first = true;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    // пустая строка закрывает примечание; шаги — нет: в ТЗ пункты списка часто идут через пустую строку,
    // шаги заканчиваются на первой строке без маркера списка
    if (!l) { gap = true; if (cur() === 'note') mode = 'text'; continue; }
    const newPara = gap;
    gap = false;

    // первая строка — название рассылки («22Bet. Верстка нужна 15.10»), если это не метка вроде «Title:»
    if (first) {
      first = false;
      const lm = LABEL_LINE.exec(l);
      const lab = lm ? labelOf(lm[1]) : null;
      if (lab === 'brand') { brand = lm![2].trim(); continue; }
      if (!lab) {
        const dl = DEADLINE.exec(l);
        if (dl) b.notes.push(`Вёрстка нужна ${dl[2]}`);
        b.title = l.replace(DEADLINE, '').replace(/[:.\s]+$/, '').trim();
        continue;
      }
    }
    if (/^\d{1,2}$/.test(l) && !b.sections.length && cur() === 'none') continue; // номер варианта/пуша

    if (PUSH_LINE.test(l)) { setMode('push'); continue; }
    if (cur() === 'push') { block.push(l); continue; }

    // кнопка в любом месте: «button (Получить)», «Button: DEPOSIT NOW»
    const btn = BUTTON_INLINE.exec(l);
    if (btn) {
      const text = (btn[1] ?? btn[2]).trim().replace(/^[«"']|[»"']$/g, '');
      if (cur() === 'top' || cur() === 'offer') flush();
      if (cur() !== 'facts' && cur() !== 'details') mode = 'text';
      b.sections.push({ k: 'button', text });
      continue;
    }

    // метки «Ключ: значение»
    const lm = LABEL_LINE.exec(l);
    const label = lm ? labelOf(lm[1]) : null;
    if (lm && label) {
      const v = lm[2].trim();
      switch (label) {
        case 'subject': if (!b.subject) b.subject = withName(v); continue;
        case 'preheader': if (!b.preheader) b.preheader = withName(v); continue;
        case 'brand': brand = v; continue;
        case 'league': b.league = v; continue;
        case 'date': {
          const m = curMatch();
          if (!m || m.date) b.matches.push({ date: v, team1: '', team2: '', players: '' });
          else m.date = v;
          continue;
        }
        case 'teams': {
          const t = splitTeams(v);
          const m = curMatch();
          const target = !m || m.team1 ? (b.matches.push({ date: '', team1: '', team2: '', players: '' }), curMatch()) : m;
          if (t) { [target.team1, target.team2] = t; } else target.team1 = v;
          continue;
        }
        case 'players': { const m = curMatch(); if (m) m.players = v; else b.notes.push(`Игроки: ${v}`); continue; }
        case 'facts': setMode('facts', /факт/i.test(lm[1]) && norm(lm[1]) !== 'факты' ? `${lm[1].trim()}:` : 'Факты матча:'); if (v) block.push(v); continue;
        case 'details': setMode('details', `${lm[1].trim()}:`); if (v) block.push(v); continue;
        case 'text': setMode('text'); if (v) addPara(v, true); continue;
        case 'top': setMode('top'); if (v) block.push(v); continue;
        case 'offer': setMode('offer'); if (v) block.push(v); continue;
        case 'body': if (v) addPara(v, newPara); continue;
        default: break;
      }
    }

    if (cur() === 'facts' || cur() === 'details' || cur() === 'top' || cur() === 'offer') {
      // «Детали матча» и факты идут до следующей метки; шапка и оффер — до кнопки или пустой строки
      if ((cur() === 'top' || cur() === 'offer') && newPara && block.length) { flush(); mode = 'text'; }
      else { block.push(l); continue; }
    }

    // подпись VIP-менеджера: имя, почта, часы работы
    const sign = SIGN_HEAD.exec(l);
    if (sign) {
      flush();
      mode = 'signature';
      b.signature = { manager: '', email: '', hours: '' };
      if (sign[2]) i--; // имя могло быть в той же строке — разберём её ещё раз
      continue;
    }
    if (cur() === 'signature' && b.signature) {
      const s = b.signature;
      const mail = EMAIL_RE.exec(l);
      if (mail) { s.email = mail[0]; continue; }
      if (/working\s+hours|часы\s+работы|график/i.test(l)) { s.hours = l; continue; }
      const mgr = /^(.+?)[,\s]+(?:your\s+)?vip[-\s]?(?:manager|менеджер)\b/i.exec(l) ?? /^(?:vip[-\s]?(?:manager|менеджер))[:\s]+(.+)$/i.exec(l);
      if (mgr) { s.manager = nameCase(mgr[1].replace(/^(sincerely(?:\s+yours)?|с\s+уважением)[,\s]*/i, '').trim()); continue; }
      if (/18\+|safe\s*&?\s*secure/i.test(l)) continue;
      if (!s.manager && l.split(/\s+/).length <= 3) { s.manager = nameCase(l); continue; }
      continue;
    }

    // шаги активации
    if (STEPS_HEAD.test(l) && /:\s*$/.test(l)) {
      flush();
      b.sections.push({ k: 'steps', title: l, steps: [] });
      mode = 'steps';
      continue;
    }
    if (cur() === 'steps' && LIST_ITEM.test(l)) {
      const s = last();
      if (s?.k === 'steps') { s.steps.push(l.replace(LIST_ITEM, '')); continue; }
    }
    if (cur() === 'steps') mode = 'text';

    // таймер: заголовок и строка-заглушка «XX XX XX» / «(TIMER)»
    // заглушка может стоять через пустую строку — ищем следующую непустую
    let nx = i + 1;
    while (nx < lines.length && !lines[nx]) nx++;
    const fillNext = TIMER_FILL.test(lines[nx] ?? '');
    if (TIMER_HEAD.test(l) && (/:\s*$/.test(l) || fillNext) && l.length < 80) {
      flush();
      b.sections.push({ k: 'timer', title: l });
      if (fillNext) i = nx;
      mode = 'text';
      continue;
    }
    if (TIMER_FILL.test(l) && /[XxХх]{2}|timer|таймер/i.test(l)) {
      // заглушка сразу после заголовка таймера — это тот же таймер
      if (last()?.k !== 'timer') b.sections.push({ k: 'timer', title: '' });
      continue;
    }

    // «Обратите внимание! …»
    const note = NOTE_HEAD.exec(l);
    if (note) {
      flush();
      const head = l.slice(0, note[0].length).trim();
      b.sections.push({ k: 'note', note: head.replace(/^\*\s*/, '*'), text: l.slice(note[0].length).trim() });
      mode = 'note';
      continue;
    }
    if (cur() === 'note') {
      const s = last();
      if (s?.k === 'note') { s.text = [s.text, l].filter(Boolean).join(' '); continue; }
    }

    // бонусы карточками: «CASINO: 55% …» или пара «15 FS» / «на депозит от 15 EUR»
    const lc = CARD_LABELED.exec(l);
    if (lc && BIG_TOKEN.test(lc[2])) {
      const card = labeledCard(lc[1], lc[2]);
      // следующая строка — условие получения
      let j = i + 1;
      while (j < lines.length && !lines[j]) j++;
      const nx = lines[j] ?? '';
      if (nx && !CARD_LABELED.test(nx) && !BUTTON_INLINE.test(nx) && /депозит|deposit|claim|получ|activate|активир/i.test(nx)) { card.text = nx; i = j; }
      const s = last();
      if (s?.k === 'cards') s.cards.push(card); else b.sections.push({ k: 'cards', cards: [card] });
      mode = 'text';
      gap = true;
      continue;
    }
    if (CARD_PAIR_BIG.test(l) && CARD_PAIR_SUB.test(lines[i + 1] ?? '')) {
      const card: Item = { title: '', big: l, sub: lines[i + 1], text: '' };
      const s = last();
      if (s?.k === 'cards') s.cards.push(card); else b.sections.push({ k: 'cards', cards: [card] });
      i++;
      gap = true;
      continue;
    }

    // карточка слота: название и подводка — последние абзацы перед списком «- Провайдер: …», дальше — характеристики
    const prov = LIST_ITEM.test(l) ? PROVIDER.exec(l.replace(LIST_ITEM, '')) : null;
    if (prov) {
      const t = last();
      const paras = t?.k === 'text' ? t.paras : [];
      const isName = (p = '') => p.length > 1 && p.length <= 60 && !/[.!?:…]$/.test(p);
      const named = isName(paras.at(-2)) ? 2 : isName(paras.at(-1)) ? 1 : 0;
      if (named) {
        const [name, about] = paras.splice(-named);
        flush();
        b.sections.push({ k: 'slots', slots: [{ name, provider: prov[1].trim(), about: about ?? '', features: [] }] });
        mode = 'slot';
        continue;
      }
    }
    if (cur() === 'slot' && LIST_ITEM.test(l)) {
      const s = last();
      if (s?.k === 'slots') { s.slots.at(-1)!.features!.push(l.replace(LIST_ITEM, '')); continue; }
    }
    if (cur() === 'slot') mode = 'text';

    // список слотов «Название (Провайдер)»
    const slot = SLOT_LINE.exec(l);
    if (slot && !/[.!?]$/.test(slot[1]) && (SLOT_LINE.test(lines[i + 1] ?? '') || last()?.k === 'slots')) {
      const s = last();
      const item = { name: slot[1].trim(), provider: slot[2].trim() };
      if (s?.k === 'slots') s.slots.push(item); else b.sections.push({ k: 'slots', slots: [item] });
      continue;
    }

    // приветствие — заголовок текстового блока
    if (GREETING.test(l) && l.length < 60) {
      flush();
      b.sections.push({ k: 'text', title: withName(l), paras: [] });
      mode = 'text';
      continue;
    }

    if (cur() === 'none') mode = 'text';
    addPara(withName(l.replace(LIST_ITEM, (m) => (/\d/.test(m) ? m : '• '))), newPara);
  }
  flush();
  if (push.length) b.notes.push(`Пуш (в письмо не идёт): ${push.join(' · ')}`);

  b.client = detectClient(src, brand || b.title);
  b.matches = b.matches.filter((m) => m.team1);
  for (const m of b.matches) if (m.players) b.notes.push(`Игроки для картинки ${m.team1} – ${m.team2}: ${m.players}`);
  // убираем пустые текстовые секции
  b.sections = b.sections.filter((s) => !(s.k === 'text' && !s.title && !s.paras.length));

  // тип письма — по содержанию
  const all = src.toLowerCase();
  const score = (re: RegExp) => (all.match(re) ?? []).length;
  if (b.matches.length) b.kind = 'sport';
  else if (b.sections.some((s) => s.k === 'slots')) b.kind = 'casino';
  else if (b.signature || /vip/i.test(b.title)) b.kind = 'vip';
  else {
    const sport = score(/фрибет|free\s?bet|ставк|спорт|sport|матч|коэффициент|odds/g);
    const casino = score(/слот|slot|казино|casino|фриспин|\bfs\b|free\s?spins?|джекпот/g);
    b.kind = sport > casino ? 'sport' : casino > 0 ? 'casino' : 'promo';
  }
  return b;
}

/** Дата «10.10.2026» → день.месяц и год. */
export function splitDate(s: string): { dm: string; year: string } {
  const m = DATE_RE.exec(s);
  if (!m) return { dm: s, year: '' };
  const year = m[3] ? (m[3].length === 2 ? `20${m[3]}` : m[3]) : '';
  return { dm: `${m[1].padStart(2, '0')}.${m[2].padStart(2, '0')}`, year };
}
