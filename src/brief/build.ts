// Сборка письма из разобранного ТЗ. Порядок и набор блоков — как в макетах Figma:
// то, чего нет в ТЗ, но есть в дизайне по умолчанию (коэффициенты, кнопки, приветствие), ставим с рыбным текстом.
// Визуал за дизайнером: картинка hero, гербы, которых нет в библиотеке, картинки слотов — оставляем пустыми
// и пишем об этом в заметках. В конце — «Случайный стиль», чтобы макет сразу выглядел живее.

import { randomizeStyle } from '@/editor/randomize';
import { createBlock, createEmail } from '@/model/factory';
import { FISH_GREETING, FISH_SHORT, FISH_TEXT } from '@/model/fish';
import { itemsValue } from '@/model/items';
import { LEAGUE_PRESETS, TEAM_PRESETS, clientPreset, type ImagePreset } from '@/model/presets';
import type { Block, BlockData, BlockType, EmailDoc } from '@/model/types';
import { norm, splitDate, type Brief, type Match, type Section } from './parse';

/** Откуда текст блока — для превью перед созданием. */
export type Origin = 'tz' | 'fish' | 'design';
export interface Planned { block: Block; origin: Origin }

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

/** В шаге выделяем то, что обычно выделено в макетах: суммы («15 EUR», «50%») и латинские названия
 *  в русском тексте (слот, промокод). Выделение — слешами, его видно и можно поправить в редакторе. */
export function accentStep(s: string): string {
  if (s.includes('/')) return s; // уже размечено в ТЗ
  let out = s.replace(/(\d+(?:[.,]\d+)?\s?(?:EUR|USD|USDT|CAD|AUD|€|\$|%))(?![\p{L}\p{N}])/giu, '/$1/');
  if (/\p{Script=Cyrillic}/u.test(s)) {
    out = out.replace(/(?<![\p{L}\p{N}/])([A-Z][\w'’]*(?:\s+(?:[A-Z][\w'’]*|in|of|the|and|x\d+))*!?)(?![\p{L}\p{N}/])/gu,
      (m) => (/^(EUR|USD|USDT|CAD|AUD)$/.test(m) ? m : `/${m}/`));
  }
  return out;
}

// ---------- сборка

export function buildEmail(brief: Brief, clientId: string): { doc: EmailDoc; plan: Planned[] } {
  const plan: Planned[] = [];
  const notes = [...brief.notes];
  const add = (type: BlockType, v: number, data: BlockData = {}, origin: Origin = 'tz') => {
    plan.push({ block: createBlock(type, v, data), origin });
  };
  const missingCrests = new Set<string>();
  const teamData = (m: Match) => {
    const t1 = findTeam(m.team1), t2 = findTeam(m.team2);
    if (!t1) missingCrests.add(m.team1);
    if (!t2 && m.team2) missingCrests.add(m.team2);
    return { team1: m.team1, team2: m.team2, team1Logo: t1?.file ?? '', team2Logo: t2?.file ?? '' };
  };

  // hero: картинку рисует дизайнер — оставляем пустой слот
  const match = brief.matches[0];
  if (match) {
    const league = findLeague(brief.league);
    if (brief.league && !league) notes.push(`Логотипа «${brief.league}» нет в библиотеке — в хедере стоит название, лого добавьте вручную`);
    const { dm, year } = splitDate(match.date);
    const hv = brief.league ? (match.date ? 0 : 3) : match.date ? 1 : 2;
    add('hero', 0, {
      hv, dateStyle: 0, imageOn: true, image: '', teamsOn: true, date: dm, year: year || '2026',
      league: brief.league, leagueLogo: league?.file ?? '', leagueLogoLight: league?.fileOnLight ?? '',
      ...teamData(match),
    });
  } else {
    add('hero', 0, { hv: 4, imageOn: true, image: '', teamsOn: false });
  }
  notes.unshift('Картинка hero — за дизайнером');

  const sections = brief.sections.map((s) => ({ ...s }));
  // приветствие в макетах есть всегда: если текст в ТЗ есть, а приветствия нет — ставим стандартное над первым абзацем;
  // если текста нет совсем — рыбный блок целиком
  const texts = sections.filter((s): s is Extract<Section, { k: 'text' }> => s.k === 'text');
  if (texts.length && !texts.some((s) => s.title)) {
    texts[0].title = FISH_GREETING;
    notes.push('Приветствия в ТЗ нет — над первым абзацем стоит стандартное');
  }
  const hasText = texts.length > 0;
  const intro = () => add('text', 0, { title: FISH_GREETING, titleOn: true, text: FISH_TEXT }, 'fish');
  const footer = () => {
    const s = brief.signature;
    if (s) add('footer', 1, { manager: s.manager, managerEmail: s.email, hours: s.hours });
    else add('footer', 0, {}, 'design');
  };

  const put = (s: Section) => {
    switch (s.k) {
      case 'top':
        // текст шапки рисуется на самой картинке hero — блоком его не ставим
        notes.push(`Текст для картинки hero: «${s.lines.join(' / ')}»`);
        break;
      case 'text':
        add('text', 0, { title: s.title, titleOn: !!s.title, text: s.paras.join('\n\n') });
        break;
      case 'button':
        add('cta', 0, { text: s.text, caps: false });
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
        add('timer', 0, s.title ? { title: s.title } : {});
        notes.push('Таймер: проставьте значения и дату окончания акции');
        break;
      case 'note':
        add('text', 3, { note: s.note, text: s.text });
        break;
      case 'cards':
        add('bullets', 10, { cards: itemsValue(s.cards.slice(0, 4)) });
        break;
      case 'slots':
        for (const sl of s.slots) {
          add('bullets', 6, { image: '', title: sl.name, sub: sl.provider, text: FISH_SHORT, cta: 'Play now', caps: true, btn: 8 });
        }
        notes.push('Картинки слотов — за дизайнером; описания слотов — рыбный текст');
        break;
      case 'facts':
        add('facts', s.details ? 2 : 1, { title: s.title, rows: itemsValue(s.rows) });
        break;
    }
  };

  if (match) {
    // спорт по макету «Матч дня»: коэффициенты, кнопка, приветствие, …, факты, кнопка
    add('odds', 0, {}, 'design');
    add('cta', 1, { text: 'Bet Now' }, 'design');
    const facts = sections.filter((s) => s.k === 'facts');
    const rest = sections.filter((s) => s.k !== 'facts');
    if (!hasText) intro();
    rest.forEach(put);
    for (const m of brief.matches.slice(1)) {
      add('inner', 0, { image: '', teamsOn: true, ...teamData(m) });
      add('odds', 0, {}, 'design');
      add('cta', 1, { text: 'Bet Now' }, 'design');
    }
    if (brief.matches.length > 1) notes.push('Inner-блоки: картинки с датой для остальных матчей — за дизайнером');
    if (brief.matches.length === 1) {
      add('recodds', 1, {}, 'design');
      add('cta', 1, { text: 'Bet Now' }, 'design');
    }
    for (const f of facts) { put(f); add('cta', 1, { text: 'Bet Now' }, 'design'); }
    notes.push('Коэффициенты и «Рекомендуем» — примерные, уточните перед отправкой');
  } else {
    // приветствие идёт после шапки (текст шапки + кнопка), если в ТЗ его нет — рыбное
    let i = 0;
    while (i < sections.length && (sections[i].k === 'top' || sections[i].k === 'button')) put(sections[i++]);
    const slots = sections.some((s) => s.k === 'slots');
    if (slots && !plan.some((p) => p.block.type === 'cta')) add('cta', 8, { text: 'Play now', caps: true }, 'design');
    if (!hasText) intro();
    sections.slice(i).forEach(put);
  }
  footer();

  if (missingCrests.size) notes.push(`Гербов нет в библиотеке: ${[...missingCrests].join(', ')} — названия вписаны, гербы добавьте вручную`);
  if (!brief.subject) notes.push('В ТЗ нет темы письма');
  if (plan.some((p) => p.origin === 'fish')) notes.push('Рыбный текст в приветствии — заменится текстом из ТЗ позже');

  // письмо: клиент, мета, блоки и случайный стиль
  const doc = createEmail(clientId, 'blank');
  const t1 = match?.team1, t2 = match?.team2;
  doc.name = match
    ? `${clientPreset(clientId).name} ${t1}${t2 ? ` – ${t2}` : ''}${brief.league ? ` ${brief.league}` : ''}`
    : brief.title || brief.subject || 'Письмо по ТЗ';
  doc.subject = brief.subject;
  doc.preheader = brief.preheader;
  doc.blocks = plan.map((p) => p.block);
  Object.assign(doc, randomizeStyle(doc));
  // после случайного стиля блоки — новые объекты; превью показывает их же
  plan.forEach((p, i) => { p.block = doc.blocks[i]; });
  doc.brief = { source: '', notes };
  return { doc, plan };
}
