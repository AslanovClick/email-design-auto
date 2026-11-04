// Шаблоны писем по макетам из Figma: Casino, Sport, VIP, Promo.
// Картинки — примеры из макетов (лого на некоторых нарисовано прямо в картинке, поэтому у hero нет хедера);
// дизайнер меняет их на свои.

import { FISH_GREETING, FISH_TEXT } from './fish';
import { itemsValue } from './items';
import type { Item } from './items';
import { ASSET } from './presets';
import type { BlockData, Template } from './types';

const T = (f: string) => ASSET(`samples/tpl/${f}`);
const items = (xs: Item[]) => itemsValue(xs);
const NO_TEAMS = { teamsOn: false };
// hero — только картинка, без хедера поверх
const heroPic = (file: string, over: BlockData = {}): BlockData => ({ ...NO_TEAMS, imageOn: true, hv: 7, image: T(file), ...over });
const text = (title: string, text: string, over: BlockData = {}): BlockData => ({ title, text, titleOn: !!title, ...over });
const btn = (text: string, caps = true): BlockData => ({ text, caps });

// рыбный текст первого абзаца: дизайнер собирает макет, тексты приходят из ТЗ
const intro = () => text(FISH_GREETING, FISH_TEXT);

const SLOT_TEXT = 'Провайдер: BGaming · 243 линии · Hold and Win · Bonus Game · Джекпоты';

export const TEMPLATES: Template[] = [
  { id: 'blank', name: 'Пустое письмо', tag: 'С нуля', blocks: [['hero', 0, NO_TEAMS], ['footer', 0]] },

  {
    id: 'sport-match', name: 'Матч дня', tag: 'Sport',
    theme: { bg: '#0b0b0b', card: '#1a0f22', accent: '#c21dd0', text: '#ffffff' },
    bg: { mode: 'pattern', pattern: 'chevron', scale: 48, opacity: 5 },
    blocks: [
      ['hero', 0, heroPic('sport1-hero.png')],
      ['odds', 0, { odds: '7.77 / 7.77 / 7.77' }],
      ['cta', 1, btn('Bet Now', false)],
      ['text', 0, intro()],
      ['recodds', 1, { pick: 'Рекомендуем ставку: ТБ 4.5 + обе забьют', coef: '7.77' }],
      ['cta', 1, btn('Bet Now', false)],
      ['facts', 1, { title: 'Факты матча:', sep: 4, rows: items([
        { t: 'fact', lead: '', text: 'После бодрого старта под руководством Лиама Росеньора синие рухнули: 4 поражения подряд без единого забитого мяча.' },
        { t: 'fact', lead: '', text: 'Вылет из Лиги чемпионов перечеркнул шансы Ливерпуля на трофеи в этом сезоне. Теперь программа-максимум для Арне Слота — зацепиться за топ-5.' },
        { t: 'fact', lead: '', text: 'На фоне кризиса Челси Фернандес тащит команду на себе: он лидер синих по ударам в створ (27) и созданным моментам (51).' },
        { t: 'fact', lead: '', text: 'Уго Экитике, главный снайпер Ливерпуля, порвал ахилл и выбыл до конца сезона.' },
        { t: 'fact', lead: '', text: 'Против МЮ футболисты Челси нанесли 21 удар по воротам, но их качество ужасает: всего 1,55 xG.' },
      ]) }],
      ['cta', 1, btn('Bet Now', false)],
      ['footer', 0],
    ],
  },

  {
    id: 'sport-details', name: 'Детали матча', tag: 'Sport',
    theme: { bg: '#090909', card: '#101a16', accent: '#00ffad', text: '#ffffff' },
    bg: { mode: 'pattern', pattern: 'waves', scale: 52, opacity: 5 },
    blocks: [
      ['hero', 2, heroPic('sport2-hero.png', { teamsOn: true, team1: 'Barcelona', team2: 'Atletic Bilbao', team1Logo: T('sport2-team1.png'), team2Logo: T('sport2-team2.png') })],
      ['odds', 1, { odds: '2.22 / 1.11 / 2.22' }],
      ['cta', 4, btn('Bet now!'), { radius: 24 }],
      ['text', 0, intro()],
      ['recodds', 5, { pick: 'Фора Crystal Palace (0)', coef: '1.85' }],
      ['cta', 4, btn('Bet now!'), { radius: 24 }],
      ['facts', 2, { title: 'Детали матча:', rows: items([
        { t: 'stat', l: '1', label: 'Место в Ла Лиге 25/26', r: '12' },
        { t: 'stat', l: '50%', label: 'Процент побед в предсезонных матчах', r: '50%' },
        { t: 'stat', l: '100%', label: 'Матчи на Тотал больше 2.5', r: '67%' },
        { t: 'stat', l: '4', label: 'Голов пропущено в предсезонных матчах', r: '6' },
        { t: 'h2h', title: '5 последних личных встреч:', vals: '5 / 0 / 0', labels: 'побед Барселоны / ничьих / побед Атлетик' },
      ]) }],
      ['cta', 4, btn('Bet now!'), { radius: 24 }],
      ['footer', 1, { manager: 'Nina', managerEmail: 'nina@granawin.com', hours: 'Working hours from Monday to Friday 9:00 - 17:00 GMT' }],
    ],
  },

  {
    id: 'casino-slots', name: 'Топ слотов', tag: 'Casino',
    theme: { bg: '#121212', card: '#1b1f1e', accent: '#1fc99a', text: '#ffffff' },
    bg: { mode: 'pattern', pattern: 'diag', scale: 40, opacity: 5 },
    blocks: [
      ['hero', 0, heroPic('casino1-hero.png')],
      ['cta', 8, btn('Play now')],
      ['text', 0, intro()],
      ['bullets', 6, { image: T('casino1-pic1.png'), title: 'Wild West Trueways', sub: 'BGaming', text: SLOT_TEXT, cta: 'Play now', caps: true, btn: 8 }, { borderW: [3, 3, 3, 3], radius: 12 }],
      ['bullets', 6, { image: T('casino1-pic2.png'), title: 'Ultra win forever 777', sub: 'BGaming', text: SLOT_TEXT, cta: 'Play now', caps: true, btn: 8 }, { borderW: [3, 3, 3, 3], radius: 12 }],
      ['bullets', 6, { image: T('casino1-pic3.png'), title: 'Big cosmic win', sub: 'BGaming', text: SLOT_TEXT, cta: 'Play now', caps: true, btn: 8 }, { borderW: [3, 3, 3, 3], radius: 12 }],
      ['text', 3, { note: 'Обратите внимание!', text: 'Подробные правила VIP-программы можно найти на сайте в разделе «Промо».' }],
      ['footer', 0],
    ],
  },

  {
    id: 'casino-bonus', name: 'Бонус для казино', tag: 'Casino',
    theme: { bg: '#000736', card: '#0c1550', accent: '#eeaf00', text: '#ffffff' },
    bg: { mode: 'pattern', pattern: 'diamond', scale: 44, opacity: 5 },
    blocks: [
      ['hero', 0, heroPic('casino2-hero.png')],
      ['text', 4, { kicker: 'Бонус для казино', offer: '50% до 3.500 USDT' }],
      ['cta', 2, btn('Get bonus')],
      ['text', 0, intro()],
      ['cta', 2, btn('Get bonus')],
      ['bullets', 2, { items: items([
        { image: T('casino2-pic2.png'), title: 'Слоты', text: 'Зарядитесь энергией удачи и откройте для себя лучшие слоты! Вас ждут как полюбившиеся тысячам игроков хиты, так и самые горячие новинки.' },
        { image: T('casino2-pic1.png'), title: 'LIVE-игры', text: 'Незабываемые эмоции и реальные дилеры — выбирайте стол и наслаждайтесь уютной атмосферой! Продолжайте игру с бонусом 50% до 3.500 USDT.' },
      ]) }],
      ['cta', 2, btn('Get bonus')],
      ['text', 1, text('Как активировать бонус:', '')],
      ['bullets', 3, { steps: items([
        { image: T('casino2-step1.png'), text: 'Войдите в ваш аккаунт' },
        { image: T('casino2-step2.png'), text: 'Выберите бонус' },
        { image: T('casino2-step3.png'), text: 'Сделайте первый депозит от 20 USDT' },
        { image: T('casino2-step4.png'), text: 'Получите казино-бонус 50% до 5.000 USDT!' },
      ]) }],
      ['cta', 2, btn('Claim bonus')],
      ['text', 3, { note: '*Обратите внимание!', text: 'Все бонусы за депозит подлежат x40 отыгрышу суммы пополнения в течение 30 дней после внесения депозита. Подробные бонусные условия вы можете найти на сайте.' }],
      ['footer', 0],
    ],
  },

  {
    id: 'vip-boost', name: 'VIP-буст', tag: 'VIP',
    theme: { bg: '#100804', card: '#1d130c', accent: '#00d9a3', text: '#ffffff' },
    bg: { mode: 'pattern', pattern: 'grid', scale: 44, opacity: 4 },
    blocks: [
      ['hero', 0, heroPic('vip-hero.png')],
      ['text', 0, intro()],
      ['bullets', 10, { cards: items([
        { title: 'Casino bonus', big: '55%', sub: 'up to 500 EUR / USD', text: 'To claim the casino promo, the minimum deposit needs to be 20 EUR / 20 USD.' },
        { title: 'Sports: free bet', big: '50%', sub: 'up to 100 EUR / USD', text: 'To claim the sports promo bonus, the minimum deposit needs to be 20 EUR / 20 USD.' },
      ]) }],
      ['text', 0, text('', 'The wagering requirement is 5x the bonus amount in accumulator or single bets. Each bet must contain at least one selection with total odds of 1.8 or higher.')],
      ['cta', 9, btn('Deposit now')],
      ['text', 0, text('', 'The maximum winnings to be paid out resulting from a bonus are 10,000 EUR / USD or equivalent. *General bonus terms and conditions must be observed.\n\nTo use this promotion, click on Cashier in your account and choose “My Promotion” when depositing.')],
      ['footer', 1, { manager: 'Eren', managerEmail: 'eren@ivibet.com', hours: 'Working hours from Monday to Friday 8:00 - 16:00 GMT' }],
    ],
  },

  {
    id: 'promo-deposit', name: 'Бонус на депозит', tag: 'Promo',
    theme: { bg: '#000000', card: '#141414', accent: '#00e69c', text: '#ffffff' },
    bg: { mode: 'pattern', pattern: 'circles', scale: 56, opacity: 4 },
    blocks: [
      ['hero', 0, heroPic('promo-hero.png')],
      ['text', 0, intro()],
      ['bullets', 4, { image: T('promo-pic1.png'), title: 'Casino: 50% bonus', sub: 'up to 500 EUR / USD / CAD', text: 'The minimum deposit to claim the bonus is 20 EUR / 20 USD / 25 CAD.' }],
      ['bullets', 4, { image: T('promo-pic2.png'), title: 'Sport: free bet 50%', sub: 'up to 100 EUR / USD / CAD', text: 'The minimum deposit to claim the sports promo bonus is 20 EUR / 20 USD / 25 CAD.' }],
      ['text', 0, text('', 'The wagering requirement is 5x the bonus amount in accumulator or single bets. Only unique bets count towards the wagering requirements.')],
      ['cta', 0, btn('Make a deposit')],
      ['text', 0, text('', 'The maximum winnings to be paid out resulting from a bonus are 10,000 EUR / USD / CAD / AUD or equivalent.\n\nTo use this promotion, click on Cashier in your account and choose “My Promotion” when depositing.')],
      ['separator', 2],
      ['footer', 1, { manager: 'Nina', managerEmail: 'nina@granawin.com', hours: 'Working hours from Monday to Friday 9:00 - 17:00 GMT' }],
    ],
  },
];
