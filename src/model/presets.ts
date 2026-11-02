// Пресеты из Figma (Mail-Autocode → New Components): логотипы клиентов, лиги, команды, футеры, hero.
// Картинки лежат в public/assets и выгружены из Figma; в письмо попадают как отдельные файлы.

export const ASSET = (path: string) => `/assets/${path}`;

export interface ClientFooter {
  /** Ссылки и рамки кнопок футера — фирменный цвет клиента. */
  accent: string;
  buttonBorder?: string;
  supportEmail: string;
  copyright: string;
  payments: boolean;
  apps: boolean;
  /** Строка про актуальность коэффициентов — у спортивных брендов. */
  oddsNote: boolean;
  lang: 'en' | 'ru';
  vip: { manager: string; email: string; hours: string };
}

export interface ClientPreset {
  id: string;
  name: string;
  domain: string;
  /** Логотип для тёмного фона (Dark=No в Figma); для светлого — с суффиксом -dark. */
  logo: string;
  logoOnLight?: string;
  footer: ClientFooter;
}

const footer = (p: Partial<ClientFooter> & Pick<ClientFooter, 'accent' | 'supportEmail' | 'copyright'>): ClientFooter => ({
  payments: true, apps: true, oddsNote: true, lang: 'en',
  vip: { manager: 'Alex', email: `alex@${p.supportEmail.split('@')[1]}`, hours: 'Working hours from Monday to Friday 09:00 - 17:00 GMT' },
  ...p,
});

export const CLIENT_PRESETS: ClientPreset[] = [
  { id: '20bet', name: '20Bet', domain: '20bet.com', logo: '20bet', logoOnLight: '20bet-dark',
    footer: footer({ accent: '#00d2a0', supportEmail: 'support@20bet.com', copyright: '© 2026 20Bet',
      vip: { manager: 'Lera', email: 'lera.vip@20bet.com', hours: 'Working hours from Monday to Friday 09:00 - 17:00 GMT' } }) },
  { id: '20betasia', name: '20Bet Asia', domain: '20bet.asia', logo: '20betasia', logoOnLight: '20betasia-dark',
    footer: footer({ accent: '#00d2a0', supportEmail: 'support@20bet.asia', copyright: '© 2026 20Bet Asia' }) },
  { id: '22bet', name: '22Bet', domain: '22bet.com', logo: '22bet', logoOnLight: '22bet-dark',
    footer: footer({ accent: '#ff8400', buttonBorder: '#c96d01', supportEmail: 'support@22bet.com', copyright: '© 2026 22Bet',
      vip: { manager: 'Remi', email: 'remi@22bet.com', hours: 'Working hours from Monday to Friday 09:00 - 17:00 GMT' } }) },
  { id: '22bit', name: '22Bit', domain: '22bit.com', logo: '22bit', logoOnLight: '22bit-dark',
    footer: footer({ accent: '#15f59f', buttonBorder: '#00d007', supportEmail: 'support@22bit.com', copyright: '© 2019-2026 22Bit' }) },
  { id: '22casino', name: '22Casino', domain: '22casino.com', logo: '22casino', logoOnLight: '22casino-dark',
    footer: footer({ accent: '#ff8400', supportEmail: 'support@22casino.com', copyright: '© 2026 22Casino', oddsNote: false }) },
  { id: 'betlabel', name: 'BetLabel', domain: 'betlabel.com', logo: 'betlabel', logoOnLight: 'betlabel-dark',
    footer: footer({ accent: '#92f523', supportEmail: 'support@betlabel.com', copyright: '© 2026 BetLabel' }) },
  { id: 'granawin', name: 'GranaWin', domain: 'granawin.com', logo: 'granawin',
    footer: footer({ accent: '#0ffda8', supportEmail: 'support@granawin.com', copyright: 'Copyright © 2026, GranaWin.', payments: false, apps: false, oddsNote: false,
      vip: { manager: 'Nina', email: 'nina@granawin.com', hours: 'Working hours from Monday to Friday 9:00 - 17:00 GMT' } }) },
  { id: 'ivibet', name: 'Ivibet', domain: 'ivibet.com', logo: 'ivibet', logoOnLight: 'ivibet-dark',
    footer: footer({ accent: '#1ad9b3', supportEmail: 'support@ivibet.com', copyright: '© 2026 iviBet', payments: false, apps: false,
      vip: { manager: 'Eren', email: 'eren@ivibet.com', hours: 'Working hours from Monday to Friday 8:00 - 16:00 GMT' } }) },
  { id: 'iviwin', name: 'Iviwin', domain: 'iviwin.com', logo: 'iviwin', logoOnLight: 'iviwin-dark',
    footer: footer({ accent: '#1ad9b3', supportEmail: 'support@iviwin.com', copyright: '© 2026 Iviwin', payments: false, apps: false, oddsNote: false }) },
  { id: 'koi', name: 'KOI Fortune', domain: 'koifortune.com', logo: 'koi', logoOnLight: 'koi-dark',
    footer: footer({ accent: '#e94e57', supportEmail: 'support@koi.com', copyright: '© 2026 KOI Fortune', apps: false, oddsNote: false }) },
  { id: 'planbet', name: 'Planbet', domain: 'planbet.com', logo: 'planbet', logoOnLight: 'planbet-dark',
    footer: footer({ accent: '#00ffad', supportEmail: 'support@planbet.com', copyright: '© 2026 Planbet', payments: false, oddsNote: false, lang: 'ru' }) },
  { id: 'vave', name: 'Vave', domain: 'vave.com', logo: 'vave', logoOnLight: 'vave-dark',
    footer: footer({ accent: '#00f3b8', supportEmail: 'support@vave.com', copyright: 'Copyright © 2026, Vave.', payments: false, oddsNote: false,
      vip: { manager: 'Harry', email: 'harry@vave.com', hours: 'Working hours from Monday to Friday 09:00 - 17:00 GMT' } }) },
];

export const clientPreset = (id: string) => CLIENT_PRESETS.find((c) => c.id === id) ?? CLIENT_PRESETS[0];

/** Логотип клиента под фон: на светлом фоне — тёмная версия, если она есть. */
/** Куда ведёт логотип по умолчанию — сайт клиента. */
export const clientSite = (id: string) => `https://${clientPreset(id).domain}`;

export function clientLogo(id: string, lightBg: boolean) {
  const c = clientPreset(id);
  return ASSET(`logos/${lightBg && c.logoOnLight ? c.logoOnLight : c.logo}.png`);
}

export interface ImagePreset { id: string; name: string; file: string; fileOnLight?: string }

const league = (id: string, name: string, onLight = true): ImagePreset =>
  ({ id, name, file: ASSET(`leagues/${id}.png`), fileOnLight: onLight ? ASSET(`leagues/${id}-dark.png`) : undefined });

export const LEAGUE_PRESETS: ImagePreset[] = [
  league('uefa-champions', 'UEFA Champions League'),
  league('uefa-europa', 'UEFA Europa League'),
  league('uefa-conference', 'UEFA Conference League'),
  league('uefa-nations', 'UEFA Nations League'),
  league('uefa-qualifying', 'UEFA European Qualifiers'),
  league('epl', 'Premier League'),
  league('laliga', 'LaLiga'),
  league('bundesliga', 'Bundesliga'),
  league('serie-a', 'Serie A'),
  league('ligue-1', 'Ligue 1'),
  league('primeira-liga', 'Primeira Liga'),
  league('fa-cup', 'FA Cup'),
  league('carabao-cup', 'Carabao Cup', false),
  league('copa-del-rey', 'Copa del Rey'),
  league('coppa-italia', 'Coppa Italia'),
  league('coupe-de-france', 'Coupe de France', false),
  league('conmebol-libertadores', 'CONMEBOL Libertadores'),
  league('fifa-2026', 'FIFA World Cup 2026'),
  league('fifa-world-2025', 'FIFA Club World Cup 2025'),
  league('fifa-qualifying-caf', 'FIFA Qualifying · CAF'),
  league('fifa-qualifying-conmebol', 'FIFA Qualifying · CONMEBOL'),
];

const team = (id: string, name: string): ImagePreset => ({ id, name, file: ASSET(`teams/${id}.png`) });

export const TEAM_PRESETS: ImagePreset[] = [
  team('real-madrid', 'Real Madrid'), team('fc-barcelona', 'FC Barcelona'), team('real-betis', 'Real Betis'),
  team('racing-santander', 'Racing Santander'), team('manchester-city', 'Manchester City'), team('man-utd', 'Manchester United'),
  team('man-united', 'Man United (alt)'), team('liverpool', 'Liverpool'), team('arsenal', 'Arsenal'), team('chelsea', 'Chelsea'),
  team('aston-villa', 'Aston Villa'), team('leeds-united', 'Leeds United'), team('bayern-munich', 'Bayern Munich'),
  team('rb-leipzig', 'RB Leipzig'), team('juventus', 'Juventus'), team('ac-milan', 'AC Milan'), team('inter', 'Inter'),
  team('napoli', 'Napoli'), team('al-hilal', 'Al-Hilal'), team('al-nassr', 'Al-Nassr'), team('al-ahli', 'Al-Ahli'),
  team('ittihad', 'Al-Ittihad'), team('qadsiah', 'Al-Qadsiah'), team('altaawoun-fc', 'Al-Taawoun'), team('al-akhdoud', 'Al-Akhdoud'),
  team('al-fayha', 'Al-Fayha'), team('al-kholood', 'Al-Kholood'), team('al-sadd', 'Al-Sadd'), team('al-shamal', 'Al-Shamal'),
  team('al-ain-fc', 'Al Ain'), team('al-jazira', 'Al Jazira'), team('al-wahda-abu-dhabi', 'Al Wahda'), team('al-wasl', 'Al Wasl'),
  team('al-dhafra', 'Al Dhafra'), team('shabab-alahli', 'Shabab Al Ahli'), team('kalba', 'Kalba'), team('ajman', 'Ajman'),
  team('al-kuwait', 'Al Kuwait'), team('far-rabat', 'FAR Rabat'), team('mamelodi-sundowns', 'Mamelodi Sundowns'),
  team('mumbai-indians', 'Mumbai Indians'), team('knight-riders', 'Kolkata Knight Riders'), team('rcb', 'Royal Challengers Bengaluru'),
  team('csk', 'Chennai Super Kings'), team('sunrisers-hyderabad', 'Sunrisers Hyderabad'), team('rajasthan-royals', 'Rajasthan Royals'),
  team('gujarat-titans', 'Gujarat Titans'), team('delhi-capitals', 'Delhi Capitals'), team('lucknow-super-giants', 'Lucknow Super Giants'),
  team('golden-state-warriors', 'Golden State Warriors'), team('los-angeles-lakers', 'Los Angeles Lakers'),
  team('oklahoma-city-thunder', 'Oklahoma City Thunder'), team('brazil', 'Brazil'), team('uruguay', 'Uruguay'),
  team('belgium', 'Belgium'), team('switzerland', 'Switzerland'), team('morocco', 'Morocco'), team('egypt', 'Egypt'),
  team('qatar', 'Qatar'), team('saudi-arabia', 'Saudi Arabia'),
];

/** Стили даты — компонент [text] date в Figma (var 1…6). */
export const DATE_STYLES = ['Просто текст', 'С годом', 'Плашка', 'Со временем', 'В рамке', 'Компактная'];

/** Хедер внутри hero — компонент header в Figma + вариант «дата под хедером». */
export const HERO_HEADERS = [
  'Лого · дата · лига', 'Лого и дата', 'Только лого', 'Лого и лига', 'Лого по центру',
  'Всё по центру', 'Лого и лига, дата ниже', 'Без хедера',
];

/** Как команды стоят относительно картинки. */
export const TEAM_LAYOUTS = ['Гербы на картинке', 'Крупные гербы на картинке', 'Строкой под картинкой'];

export interface HeroPreset {
  name: string;
  hint: string;
  imageOn: boolean;
  teamsOn: boolean;
  /** Компоновка команд (TEAM_LAYOUTS). */
  v: number;
  /** Хедер, который к этой компоновке подходит лучше всего; дату не трогаем. */
  hv: number;
}

/** Основа hero — картинка и где стоят команды; хедер вторичен, дата выбирается отдельно. */
export const HERO_PRESETS: HeroPreset[] = [
  { name: 'Матч: гербы на фото', hint: 'Гербы заходят на низ картинки, названия под ними', imageOn: true, teamsOn: true, v: 0, hv: 0 },
  { name: 'Матч: крупные гербы', hint: 'То же, но гербы и названия крупнее', imageOn: true, teamsOn: true, v: 1, hv: 0 },
  { name: 'Матч строкой', hint: 'Под картинкой строка: герб — «A vs B» — герб', imageOn: true, teamsOn: true, v: 2, hv: 6 },
  { name: 'Только картинка', hint: 'Промо без команд: хедер поверх фото', imageOn: true, teamsOn: false, v: 0, hv: 6 },
  { name: 'Без картинки', hint: 'Хедер и команды на фоне письма', imageOn: false, teamsOn: true, v: 1, hv: 0 },
];

export const SAMPLE_HERO = { url: ASSET('samples/hero-players.jpg'), w: 600, h: 610 };
