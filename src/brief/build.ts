// Сборка письма из разобранного ТЗ — в два шага: план (блоки по порядку, с пометкой происхождения)
// и письмо из плана. Порядок и набор блоков — как в макетах Figma: то, чего нет в ТЗ, но есть в дизайне
// по умолчанию (коэффициенты, кнопки, приветствие), ставим с рыбным текстом или примерными значениями.
// Визуал за дизайнером: картинка hero, гербы, которых нет в библиотеке, картинки слотов — оставляем пустыми;
// заметки об этом выводятся из самих блоков (derivedNotes), поэтому не устаревают после правок плана.
// В конце — «Случайный стиль», чтобы макет сразу выглядел живее.

import { randomizeStyle } from '@/editor/randomize';
import { fieldsFor } from '@/model/catalog';
import { createBlock, createEmail } from '@/model/factory';
import { FISH_GREETING, FISH_SHORT, FISH_TEXT } from '@/model/fish';
import { itemsValue } from '@/model/items';
import { LEAGUE_PRESETS, TEAM_PRESETS, clientPreset, type ImagePreset } from '@/model/presets';
import type { Block, BlockData, BlockType, EmailDoc } from '@/model/types';
import { norm, splitDate, type Brief, type BriefKind, type Match, type Section } from './parse';

/** Откуда текст блока — для превью перед созданием. */
export type Origin = 'tz' | 'fish' | 'design';
export interface Planned { block: Block; origin: Origin }

/** План письма: шапка, блоки по порядку и заметки из самого ТЗ (выводимые из блоков — derivedNotes). */
export interface PlanDoc {
  client: string;
  kind: BriefKind;
  name: string;
  subject: string;
  preheader: string;
  blocks: Planned[];
  notes: string[];
}

// ---------- библиотека гербов и лиг

const TEAM_ALIASES: Record<string, string> = {
  mancity: 'manchester-city', manutd: 'man-utd', manunited: 'man-utd', bayern: 'bayern-munich', barca: 'fc-barcelona',
  barcelona: 'fc-barcelona', intermilan: 'inter', milan: 'ac-milan', leipzig: 'rb-leipzig', juve: 'juventus',
  реалмадрид: 'real-madrid', реал: 'real-madrid', барселона: 'fc-barcelona', ливерпуль: 'liverpool', челси: 'chelsea',
  арсенал: 'arsenal', манчестерсити: 'manchester-city', манчестерюнайтед: 'man-utd', астонвилла: 'aston-villa',
  бавария: 'bayern-munich', лейпциг: 'rb-leipzig', ювентус: 'juventus', интер: 'inter', милан: 'ac-milan', наполи: 'napoli',
  бетис: 'real-betis', лидс: 'leeds-united',
};
const bare = (s: string) => norm(s).replace(/^(fc|cf|afc|sc)(?=\p{L}{3})|(fc|cf)$/u, '');

export function findTeam(name: string): ImagePreset | null {
  const n = bare(name);
  if (!n) return null;
  const alias = TEAM_ALIASES[n];
  if (alias) return TEAM_PRESETS.find((t) => t.id === alias) ?? null;
  return TEAM_PRESETS.find((t) => bare(t.name) === n) ?? null;
}

const LEAGUE_ALIASES: [string, string][] = [
  ['primeradivision', 'laliga'], ['laliga', 'laliga'], ['лалига', 'laliga'], ['чемпионатиспании', 'laliga'],
  ['premierleague', 'epl'], ['апл', 'epl'], ['английскаяпремьерлига', 'epl'], ['epl', 'epl'],
  ['championsleague', 'uefa-champions'], ['лигачемпионов', 'uefa-champions'], ['ucl', 'uefa-champions'],
  ['europaleague', 'uefa-europa'], ['лигаевропы', 'uefa-europa'], ['conferenceleague', 'uefa-conference'], ['лигаконференций', 'uefa-conference'],
  ['nationsleague', 'uefa-nations'], ['лиганаций', 'uefa-nations'], ['europeanqualifiers', 'uefa-qualifying'],
  ['carabaocup', 'carabao-cup'], ['eflcup', 'carabao-cup'], ['кубоканглийскойлиги', 'carabao-cup'], ['facup', 'fa-cup'],
  ['bundesliga', 'bundesliga'], ['бундеслига', 'bundesliga'], ['seriea', 'serie-a'], ['серияа', 'serie-a'],
  ['ligue1', 'ligue-1'], ['лига1', 'ligue-1'], ['primeiraliga', 'primeira-liga'], ['copadelrey', 'copa-del-rey'],
  ['coppaitalia', 'coppa-italia'], ['coupedefrance', 'coupe-de-france'], ['libertadores', 'conmebol-libertadores'],
  ['clubworldcup', 'fifa-world-2025'], ['worldcup', 'fifa-2026'], ['чемпионатмира', 'fifa-2026'],
];
export function findLeague(name: string): ImagePreset | null {
  const n = norm(name);
  if (!n) return null;
  const hit = LEAGUE_ALIASES.find(([k]) => n.includes(k));
  const id = hit?.[1];
  return (id && LEAGUE_PRESETS.find((l) => l.id === id)) || LEAGUE_PRESETS.find((l) => norm(l.name) === n) || null;
}

/** Герб: по id из библиотеки (его узнала модель), иначе по названию. */
const teamOf = (name: string, id?: string) => (id && TEAM_PRESETS.find((t) => t.id === id)) || findTeam(name);

const CURRENCY = 'EUR|USD|USDT|CAD|AUD|BRL|GBP|PLN|INR|KZT|UAH|RUB|TRY|MXN|ARS|CLP|PEN|COP|NZD|CHF|JPY|NOK|SEK|DKK|CZK|HUF|BTC|ETH';
const AMOUNT = new RegExp(`(?<![\\p{L}\\p{N}/.,])(\\d+(?:[.,]\\d+)*\\s?(?:${CURRENCY}|€|\\$|£|₽|₴|₸|%))(?![\\p{L}\\p{N}])`, 'giu');
const MULTIPLIER = /(?<![\p{L}\p{N}/])([xх×]\d+(?:[.,]\d+)*)(?![\p{L}\p{N}])/giu;
const NICK = /(?<![\p{L}\p{N}/*])(\p{L}[\p{L}\p{N}_]*\*{2,})(?![\p{L}\p{N}*])/gu;
/** Латиница, которую не выделяем: коды валют и часовые пояса («23:59 UTC»). */
const CODE = new RegExp(`^(?:${CURRENCY}|UTC|GMT|CET|CEST|EET|EEST|MSK)$`);

/** Выделяем то, что обычно выделено в макетах: суммы («15 EUR», «3 BRL», «50%»), множители («x5052,20»),
 *  ники игроков («abc***») и латинские названия в русском тексте (слот, промокод).
 *  Выделение — слешами, его видно и можно поправить в редакторе. */
export function accentStep(s: string): string {
  if (s.includes('/')) return s; // уже размечено в ТЗ
  let out = s.replace(AMOUNT, '/$1/').replace(MULTIPLIER, '/$1/').replace(NICK, '/$1/');
  if (/\p{Script=Cyrillic}/u.test(s)) {
    out = out.replace(/(?<![\p{L}\p{N}/])([A-Z][\w'’]*(?:\s+(?:[A-Z][\w'’]*|in|of|the|and|x\d+))*!?)(?![\p{L}\p{N}/])/gu,
      (m) => (CODE.test(m) ? m : `/${m}/`));
  }
  return out;
}

// ---------- план

export function planFromBrief(brief: Brief, clientId: string): PlanDoc {
  const blocks: Planned[] = [];
  const notes = [...brief.notes];
  const add = (type: BlockType, v: number, data: BlockData = {}, origin: Origin = 'tz') => {
    const block = createBlock(type, v, data);
    blocks.push({ block, origin });
    return block;
  };
  const teamData = (m: Match) => {
    const t1 = teamOf(m.team1, m.team1Id), t2 = teamOf(m.team2, m.team2Id);
    return { team1: m.team1, team2: m.team2, team1Logo: t1?.file ?? '', team2Logo: t2?.file ?? '' };
  };
  // настоящие коэффициенты и «Рекомендуем» из ТЗ, иначе — примерные по макету
  const odds = (m: Match) => (m.odds ? add('odds', 0, { odds: m.odds }) : add('odds', 0, {}, 'design'));
  const recodds = (m: Match) => (m.pick || m.coef
    ? add('recodds', 1, { ...(m.pick && { pick: m.pick }), ...(m.coef && { coef: m.coef }) })
    : add('recodds', 1, {}, 'design'));

  // игроки для картинки — заметка дизайнеру (разбор правилами кладёт её сам, модель — не всегда)
  for (const m of brief.matches) {
    if (m.players && !notes.some((n) => n.includes(m.players))) {
      notes.push(`Игроки для картинки ${m.team1}${m.team2 ? ` – ${m.team2}` : ''}: ${m.players}`);
    }
  }

  // hero: картинку рисует дизайнер — оставляем пустой слот, если в ТЗ нет готовой
  const image = brief.heroImage ?? '';
  const match = brief.matches[0];
  let hero: Block;
  if (match) {
    const league = (brief.leagueId && LEAGUE_PRESETS.find((l) => l.id === brief.leagueId)) || findLeague(brief.league);
    const { dm, year } = splitDate(match.date);
    const hv = brief.league ? (match.date ? 0 : 3) : match.date ? 1 : 2;
    hero = add('hero', 0, {
      hv, dateStyle: 0, imageOn: true, image, teamsOn: true, date: dm, year: year || '2026',
      league: brief.league, leagueLogo: league?.file ?? '', leagueLogoLight: league?.fileOnLight ?? '',
      ...teamData(match),
    });
  } else {
    hero = add('hero', 0, { hv: 4, imageOn: true, image, teamsOn: false });
  }

  const sections = brief.sections;
  // приветствие — только из ТЗ (у дизайнеров его нет, если нет в ТЗ); текста в ТЗ нет совсем — рыбный блок целиком
  const hasText = sections.some((s) => s.k === 'text');
  // своя кнопка в ТЗ сразу после слотов — в карточках слотов кнопок нет
  const buttonAfter = new Set(sections.filter((s, i) => s.k === 'slots' && sections[i + 1]?.k === 'button'));
  const intro = () => add('text', 0, { title: FISH_GREETING, titleOn: true, text: FISH_TEXT }, 'fish');
  const footer = () => {
    const s = brief.signature;
    if (s) add('footer', 1, { manager: s.manager, managerEmail: s.email, hours: s.hours });
    else add('footer', 0, {}, 'design');
  };

  const put = (s: Section) => {
    switch (s.k) {
      case 'top':
        // текст шапки рисуется на самой картинке hero — блоком его не ставим, он поле hero
        hero.data.picText = [hero.data.picText, ...s.lines].filter(Boolean).join(' / ');
        break;
      case 'offer': {
        // Mailer top: подзаголовок, крупный оффер и строка под ним; одна строка — это сам оффер.
        // Строки после третьей — в ту же строку под оффером (поле в тексте плана однострочное)
        const [a = '', b, ...rest] = s.lines;
        add('text', 4, b === undefined ? { kicker: '', offer: a, tagline: '' } : { kicker: a, offer: b, tagline: rest.join(' ') });
        break;
      }
      case 'text':
        add('text', 0, { title: s.title, titleOn: !!s.title, text: s.paras.map(accentStep).join('\n\n') });
        break;
      case 'button':
        add('cta', 0, { text: s.text, caps: false, ...(s.link && { link: s.link }) });
        break;
      case 'steps':
        add('text', 1, { title: s.title, titleOn: true, text: '' });
        // картинки шагов (иконки) подставит дизайнер; суммы и названия латиницей сразу выделяем.
        // Длинные шаги — в вариант на всю ширину: в колонке 400 они растягиваются на 4–5 строк
        if (s.steps.length) {
          const long = s.steps.some((t) => t.length > 50);
          add('bullets', long ? 11 : 3, { steps: itemsValue(s.steps.map((text) => ({ image: '', text: accentStep(text) }))) });
        }
        break;
      case 'timer':
        add('timer', 0, { ...(s.title && { title: s.title }), ...(s.until && { date: s.until }) });
        break;
      case 'note':
        add('text', 3, { note: s.note, text: s.text });
        break;
      case 'cards':
        add('bullets', 10, { cards: itemsValue(s.cards.slice(0, 4)) });
        break;
      case 'slots':
        for (const sl of s.slots) {
          // подводка — абзацем над карточкой, характеристики — строками в карточке; картинки слотов — за дизайнером
          if (sl.about) add('text', 0, { title: '', titleOn: false, text: sl.about });
          const text = sl.features?.length ? sl.features.join('\n') : FISH_SHORT;
          if (buttonAfter.has(s)) add('bullets', 4, { image: '', title: sl.name, sub: sl.provider, text });
          else add('bullets', 6, { image: '', title: sl.name, sub: sl.provider, text, cta: 'Play now', caps: true, btn: 8 });
        }
        break;
      case 'facts':
        add('facts', s.details ? 2 : 1, { title: s.title, rows: itemsValue(s.rows) });
        break;
    }
  };

  if (match) {
    // спорт по макету «Матч дня»: коэффициенты, кнопка, приветствие, …, факты, кнопка
    odds(match);
    add('cta', 1, { text: 'Bet Now' }, 'design');
    const facts = sections.filter((s) => s.k === 'facts');
    const rest = sections.filter((s) => s.k !== 'facts');
    if (!hasText) intro();
    rest.forEach(put);
    for (const m of brief.matches.slice(1)) {
      add('inner', 0, { image: '', teamsOn: true, ...teamData(m) });
      odds(m);
      add('cta', 1, { text: 'Bet Now' }, 'design');
    }
    if (brief.matches.length === 1) {
      recodds(match);
      add('cta', 1, { text: 'Bet Now' }, 'design');
    }
    for (const f of facts) { put(f); add('cta', 1, { text: 'Bet Now' }, 'design'); }
  } else {
    // приветствие идёт после шапки (текст шапки + кнопка), если в ТЗ его нет — рыбное
    let i = 0;
    while (i < sections.length && ['top', 'offer', 'button'].includes(sections[i].k)) put(sections[i++]);
    const slots = sections.some((s) => s.k === 'slots');
    if (slots && !blocks.some((p) => p.block.type === 'cta')) add('cta', 8, { text: 'Play now', caps: true }, 'design');
    if (!hasText) intro();
    sections.slice(i).forEach(put);
  }
  footer();

  const t1 = match?.team1, t2 = match?.team2;
  const name = match
    ? `${clientPreset(clientId).name} ${t1}${t2 ? ` – ${t2}` : ''}${brief.league ? ` ${brief.league}` : ''}`
    : brief.title || brief.subject || 'Письмо по ТЗ';
  return { client: clientId, kind: brief.kind, name, subject: brief.subject, preheader: brief.preheader, blocks, notes };
}

// ---------- что следует из блоков

/** Поля блока совпадают с умолчаниями его варианта — значит, данные «по макету», не из ТЗ. */
const isDefault = (b: Block, keys: string[]) => {
  const def = createBlock(b.type, b.v).data;
  return keys.every((k) => (b.data[k] ?? '') === (def[k] ?? ''));
};
const DESIGN_CTA = new Set(['Bet Now', 'Play now']);
/** Рыбные абзацы — только у вариантов, где абзацы видны (у «Подзаголовка и оффера» их нет). */
const fishText = (b: Block) => b.type === 'text' && b.data.text === FISH_TEXT && fieldsFor('text', b.v).some((f) => f.key === 'text');
const FOOTER_KEYS = ['logoLink', 'manager', 'managerEmail', 'hours', 'supportEmail', 'unsub', 'appleLink', 'androidLink'];

/** Происхождение блока по его данным: рыба, умолчания макета или текст из ТЗ. */
export function originOf(b: Block): Origin {
  const d = b.data;
  if (fishText(b)) return 'fish';
  if (b.type === 'odds' && isDefault(b, ['odds'])) return 'design';
  if (b.type === 'recodds' && isDefault(b, ['pick', 'coef'])) return 'design';
  if (b.type === 'cta' && DESIGN_CTA.has(String(d.text ?? ''))) return 'design';
  if (b.type === 'footer' && b.v === 0 && isDefault(b, FOOTER_KEYS)) return 'design';
  return 'tz';
}

/** Заметки дизайнеру, которые следуют из блоков: что осталось пустым, примерным или рыбным. */
export function derivedNotes(blocks: Block[]): string[] {
  const notes = new Set<string>();
  const crests: string[] = [];
  const teams = (b: Block) => {
    if (!b.data.teamsOn) return;
    for (const [t, logo] of [['team1', 'team1Logo'], ['team2', 'team2Logo']]) {
      const name = String(b.data[t] ?? '');
      if (name && !b.data[logo] && !crests.includes(name)) crests.push(name);
    }
  };
  for (const b of blocks) {
    const d = b.data;
    switch (b.type) {
      case 'hero':
        if (d.imageOn && !d.image) notes.add('Картинка hero — за дизайнером');
        if (d.picText) notes.add(`Текст для картинки hero: «${d.picText}»`);
        if (d.league && !d.leagueLogo) notes.add(`Логотипа «${d.league}» нет в библиотеке — в хедере стоит название, лого добавьте вручную`);
        teams(b);
        break;
      case 'inner':
        if (!d.image) notes.add('Inner-блоки: картинки с датой для остальных матчей — за дизайнером');
        teams(b);
        break;
      case 'text':
        if (fishText(b)) notes.add('Рыбный текст в приветствии — заменится текстом из ТЗ позже');
        break;
      case 'timer':
        notes.add(isDefault(b, ['date']) ? 'Таймер: проставьте значения и дату окончания акции' : `Таймер: проставьте значения до ${d.date}`);
        break;
      case 'odds':
      case 'recodds':
        if (originOf(b) === 'design') notes.add('Коэффициенты и «Рекомендуем» — примерные, уточните перед отправкой');
        break;
      case 'bullets':
        if ((b.v === 4 || b.v === 6) && !d.image) {
          notes.add(d.text === FISH_SHORT ? 'Картинки слотов — за дизайнером; описания слотов — рыбный текст' : 'Картинки слотов — за дизайнером');
        }
        break;
    }
  }
  if (crests.length) notes.add(`Гербов нет в библиотеке: ${crests.join(', ')} — названия вписаны, гербы добавьте вручную`);
  return [...notes];
}

// ---------- письмо

/** Письмо из плана: клиент, мета, блоки (hero — первым, футер — последним) и случайный стиль. */
export function docFromPlan(plan: PlanDoc): EmailDoc {
  const doc = createEmail(plan.client, 'blank');
  doc.name = plan.name || 'Письмо по ТЗ';
  doc.subject = plan.subject;
  doc.preheader = plan.preheader;
  const rank = (b: Block) => (b.type === 'hero' ? 0 : b.type === 'footer' ? 2 : 1);
  const blocks = plan.blocks.map((p) => structuredClone(p.block)).sort((a, b) => rank(a) - rank(b));
  // заметки — до случайного стиля: он меняет варианты, а заметки считаются по вариантам из плана
  const notes = [...plan.notes, ...derivedNotes(blocks)];
  if (!plan.subject) notes.push('В ТЗ нет темы письма');
  doc.blocks = blocks;
  Object.assign(doc, randomizeStyle(doc));
  doc.brief = { source: '', notes: [...new Set(notes)] };
  return doc;
}
