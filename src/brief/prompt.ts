// Промпт модели для разбора ТЗ и тело запроса к OpenRouter. Вписывается в узел n8n
// скриптом n8n/tools/sync-brief-plan.ts: модель и промпт задаёт воркфлоу, приложение шлёт только текст ТЗ.
// Примеры в промпте придуманные: examples/ — проверочный набор, модель не должна видеть его ответы.

import { CLIENT_PRESETS, LEAGUE_PRESETS, TEAM_PRESETS } from '@/model/presets';
import { BRIEF_JSON_SCHEMA } from './schema';

export const MODEL = 'anthropic/claude-haiku-5.5';
/** Запасная модель: OpenRouter переключится на неё, если первая недоступна. */
export const FALLBACK = 'deepseek/deepseek-v3.2';

const list = (xs: { id: string; name: string }[]) => xs.map((x) => `${x.id} — ${x.name}`).join('; ');

const EXAMPLE_PROMO_TZ = `Ivibet Weekend Reload
Тема: Выходные с бонусом
Прехедер: +50% к депозиту до воскресенья
Картинка: Reload 50% / до 200 EUR
Кнопка (Забрать бонус)
Текст:
Здравствуйте, [NAME]!
Пополните счёт в выходные — и мы добавим +50% к депозиту.
Как получить бонус:
1. Пополните счёт от 20 EUR
2. Введите промокод WEEKEND50
Предложение заканчивается через: ХХ дней ХХ часов
Обратите внимание! Бонус нужно отыграть x5 за 7 дней.
Пуш: Бонус +50% ждёт тебя
Макет нужен до 25.11`;

const EXAMPLE_PROMO = {
  client: 'ivibet', title: 'Ivibet Weekend Reload', subject: 'Выходные с бонусом', preheader: '+50% к депозиту до воскресенья',
  kind: 'promo', league: '', matches: [],
  sections: [
    { k: 'top', lines: ['Reload 50%', 'до 200 EUR'] },
    { k: 'button', text: 'Забрать бонус' },
    { k: 'text', title: 'Здравствуйте, {{name}}!', paras: ['Пополните счёт в выходные — и мы добавим +50% к депозиту.'] },
    { k: 'steps', title: 'Как получить бонус:', steps: ['Пополните счёт от 20 EUR', 'Введите промокод WEEKEND50'] },
    { k: 'timer', title: 'Предложение заканчивается через:' },
    { k: 'note', note: 'Обратите внимание!', text: 'Бонус нужно отыграть x5 за 7 дней.' },
  ],
  signature: null,
  notes: ['Пуш: Бонус +50% ждёт тебя', 'Макет нужен до 25.11'],
};

const EXAMPLE_MATCH_TZ = `Koi Fortune Milan – Inter Serie A
Турнир: Serie A
Команды: AC Milan – Inter
Дата: 07.12.2026 20:45
Игроки: Leão - Lautaro
Коэффициенты: 2.60 / 3.30 / 2.70
Ставка дня: Обе забьют — 1.75
Детали матча:
2 Место в Серии А 3
5 последних личных встреч: 1 / 1 / 3 победа Милана / ничья / победы Интера
Интер не проигрывает в дерби с 2023 года.`;

const EXAMPLE_MATCH = {
  client: 'koi', title: 'Koi Fortune Milan – Inter Serie A', subject: '', preheader: '',
  kind: 'sport', league: 'Serie A', leagueId: 'serie-a',
  matches: [{ date: '07.12.2026', team1: 'AC Milan', team2: 'Inter', players: 'Leão - Lautaro', odds: '2.60 / 3.30 / 2.70', pick: 'Обе забьют', coef: '1.75', team1Id: 'ac-milan', team2Id: 'inter' }],
  sections: [
    {
      k: 'facts', title: 'Детали матча:', details: true,
      rows: [
        { t: 'stat', l: '2', label: 'Место в Серии А', r: '3', ls: '', rs: '' },
        { t: 'h2h', title: '5 последних личных встреч:', vals: '1 / 1 / 3', labels: 'победа Милана / ничья / победы Интера' },
        { t: 'text', text: 'Интер не проигрывает в дерби с 2023 года.' },
      ],
    },
  ],
  signature: null,
  notes: ['Время матча: 20:45', 'Игроки для картинки AC Milan – Inter: Leão - Lautaro'],
};

const EXAMPLE_CASINO_TZ = `Vave Lucky Spin
Title: Большой выигрыш в Book of Dead
Pre-header: Ставка 1 EUR принесла 2,500 EUR
Mailer top:
Ставка: 1 EUR
Выигрыш: 2,500 EUR
Теперь ваша очередь!
button (Испытать удачу)
Text:
Игрок ann*** поставил всего 1 EUR и сорвал 2,500 EUR в слоте Book of Dead.
Book of Dead
Древний Египет и сокровища фараонов.
- Провайдер: Play'n GO
- Free Spins
- Макс. выигрыш: x5,000
button (Играть)`;

const EXAMPLE_CASINO = {
  client: 'vave', title: 'Vave Lucky Spin', subject: 'Большой выигрыш в Book of Dead', preheader: 'Ставка 1 EUR принесла 2,500 EUR',
  kind: 'casino', league: '', matches: [],
  sections: [
    { k: 'offer', lines: ['Ставка: 1 EUR', 'Выигрыш: 2,500 EUR', 'Теперь ваша очередь!'] },
    { k: 'button', text: 'Испытать удачу' },
    { k: 'text', title: '', paras: ['Игрок ann*** поставил всего 1 EUR и сорвал 2,500 EUR в слоте Book of Dead.'] },
    { k: 'slots', title: 'Book of Dead', provider: "Play'n GO", text: 'Древний Египет и сокровища фараонов.', lines: ['Free Spins', 'Макс. выигрыш: x5,000'] },
    { k: 'button', text: 'Играть' },
  ],
  signature: null,
  notes: [],
};

const json = (x: unknown) => '```json\n' + JSON.stringify(x, null, 1) + '\n```';

export function systemPrompt(): string {
  return `Ты разбираешь ТЗ на e-mail рассылку беттинг- и казино-брендов в структуру для конструктора писем.
Ответ — только JSON-объект по схеме ниже, без пояснений и без Markdown.

Поля ответа:
- client: id клиента из справочника или null, если бренд не из списка.
- title: название рассылки (обычно первая строка ТЗ). subject: тема письма — строка «Title:» или «Тема:» в ТЗ
  (это subject, а не title). preheader: прехедер (Pre-header / Прехедер).
- kind: sport — ставки на матчи; casino — слоты и казино; vip — письмо от VIP-менеджера; promo — бонусы и акции без матчей.
- league: турнир, как написан в ТЗ, или "". leagueId: id лиги из справочника, если узнал её, иначе не указывай.
- heroImage: ссылка http(s) на готовую картинку, если ТЗ просит поставить её в шапку письма (баннер, hero, главная картинка);
  иначе не указывай. Такая ссылка — не заметка: её место в heroImage.
- matches: матчи — date (ДД.ММ.ГГГГ или как в ТЗ), team1, team2 (как в ТЗ), players (игроки для картинки через " - " или ""),
  odds (коэффициенты П1 / Х / П2 через " / ", только если они есть в ТЗ), pick и coef (ставка «Рекомендуем» и её коэффициент, только из ТЗ),
  team1Id / team2Id (id команды из справочника, если узнал её; иначе не указывай).
- sections: содержимое письма по порядку ТЗ:
  {"k":"top","lines":[…]} — текст на самой картинке шапки (в ТЗ под Image / Картинка / Баннер), по строкам;
  {"k":"offer","lines":[…]} — оффер под картинкой шапки (в ТЗ под Mailer top): строки как в ТЗ — подзаголовок,
    крупный оффер, призыв; кнопка после них — отдельной секцией button;
  {"k":"text","title":"…","paras":[…]} — приветствие или заголовок абзаца (иначе "") и абзацы текста;
  {"k":"button","text":"…","link":"…"} — кнопка; link — только если в ТЗ есть URL этой кнопки;
  {"k":"steps","title":"…","steps":[…]} — пошаговая инструкция (как получить/активировать бонус);
  {"k":"timer","title":"…","until":"…"} — таймер: подпись над ним; until — дата и время окончания, если они есть в ТЗ;
  {"k":"note","note":"Обратите внимание!","text":"…"} — сноска с условиями;
  {"k":"cards","cards":[{"title":"…","big":"…","sub":"…","text":"…"}]} — бонусы карточками (big — крупная цифра);
  {"k":"slots","title":"…","provider":"…","text":"…","lines":[…]} — слот, по секции на каждый: title — название,
    provider — только имя провайдера, text — строка-описание под названием (или ""), lines — все остальные пункты списка
    характеристик дословно, в том числе вида «Макс. выигрыш: …» (без строки провайдера). Описание и характеристики слота — только здесь, не повторяй их в text;
  {"k":"facts","title":"…","details":true|false,"rows":[…]} — факты о матче; details: true — цифры команд, false — список фактов.
  Строки фактов: {"t":"stat","l":"…","label":"…","r":"…","ls":"","rs":""} — значение слева, параметр, значение справа (ls/rs — подписи вроде «(48%)»);
  {"t":"form","l":"0 / 4 / 1","label":"…","sub":"…","r":"3 / 1 / 1"} — форма В / П / Н; {"t":"h2h","title":"…","vals":"1 / 1 / 3","labels":"… / … / …"} — три значения;
  {"t":"text","text":"…"} — абзац; {"t":"fact","lead":"…","text":"…"} — факт с выделенным началом.
- signature: подпись VIP-менеджера {"manager":"…","email":"…","hours":"…"} или null.
- notes: всё, что не идёт в текст письма: сроки вёрстки, игроки для картинки, пуш, время матча, ссылки на макеты (Figma, Drive), пометки для дизайнера.
  Только то, что написано в ТЗ: пояснений о том, как ты разобрал ТЗ, в notes не пиши.

Правила:
- Ничего не придумывай. Тексты — дословно из ТЗ, без разметки Markdown. Чего нет в ТЗ — не добавляй (пустые строки и массивы).
- Не переводи: тексты — на языке ТЗ.
- Обращение name / [NAME] / {name} / %name% → {{name}}.
- Кнопка — только то, что в ТЗ прямо названо кнопкой (button / кнопка / CTA). Служебные строки документа
  (стрелки, «развернуть», ссылки на макеты, правки для дизайнера) — не кнопки и не текст письма.
- Значение таймера («ХХ дней ХХ часов…») — не текст письма: только секция timer с подписью.
- Список событий экспресса внутри текста — абзацами текста, как в ТЗ.
- Названия команд и лиг — как в ТЗ; id — только из справочников ниже.
- «[картинка]» в ТЗ — вставленная картинка, её содержимого ты не видишь; это не текст письма.
- Отвечай только JSON.

Справочники (id — название):
Клиенты: ${list(CLIENT_PRESETS)}.
Лиги: ${list(LEAGUE_PRESETS)}.
Команды: ${list(TEAM_PRESETS)}.

Пример 1. ТЗ:
${EXAMPLE_PROMO_TZ}
Ответ:
${json(EXAMPLE_PROMO)}

Пример 2. ТЗ:
${EXAMPLE_MATCH_TZ}
Ответ:
${json(EXAMPLE_MATCH)}

Пример 3. ТЗ:
${EXAMPLE_CASINO_TZ}
Ответ:
${json(EXAMPLE_CASINO)}`;
}

/** Тело запроса Chat Completions OpenRouter. */
export function openRouterRequest(text: string): object {
  return {
    models: [MODEL, FALLBACK],
    messages: [{ role: 'system', content: systemPrompt() }, { role: 'user', content: text }],
    temperature: 0,
    max_tokens: 4000,
    response_format: { type: 'json_schema', json_schema: { name: 'brief', strict: false, schema: BRIEF_JSON_SCHEMA } },
    usage: { include: true },
  };
}
