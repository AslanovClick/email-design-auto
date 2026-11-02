import { CLIENTS, DEFAULT_FONT, FIELDS, TEMPLATES, THEME_PRESETS } from './catalog';
import { ASSET } from './presets';
import type { Background, Block, BlockData, BlockType, EmailDoc, Theme } from './types';

export const newId = (prefix = 'b') => prefix + Math.random().toString(36).slice(2, 10);

export function createBlock(type: BlockType, v = 0, over: BlockData = {}): Block {
  const data: BlockData = {};
  FIELDS[type].forEach((f) => { data[f.key] = f.def; });
  if (type === 'hero') {
    Object.assign(data, {
      hv: 0, dateStyle: 0, teamsOn: true, imageOn: true,
      leagueLogo: ASSET('leagues/uefa-champions.png'), team1Logo: ASSET('teams/liverpool.png'), team2Logo: ASSET('teams/arsenal.png'),
    });
  }
  if (type === 'inner') Object.assign(data, { teamsOn: true, team1Logo: ASSET('teams/liverpool.png'), team2Logo: ASSET('teams/arsenal.png') });
  if (type === 'recodds') Object.assign(data, { team1Logo: ASSET('teams/bayern-munich.png'), team2Logo: ASSET('teams/juventus.png') });
  if (type === 'league') Object.assign(data, { leagueLogo: ASSET('leagues/ligue-1.png'), leagueLogoLight: ASSET('leagues/ligue-1-dark.png') });
  Object.assign(data, over);
  return { id: newId(), type, v, data, style: {} };
}

export function defaultTheme(): Theme {
  const { name: _name, ...palette } = THEME_PRESETS[0];
  return { ...palette, font: DEFAULT_FONT, radius: 12, preset: 0 };
}

export function defaultBackground(): Background {
  return { mode: 'pattern', pattern: 'diamond', tile: '', tileName: '', scale: 36, opacity: 7, image: '', imageName: '', fit: 'repeat-y' };
}

export function blocksFromTemplate(templateId: string): Block[] {
  const tpl = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0];
  return tpl.blocks.map(([type, v, over, style]) => ({ ...createBlock(type, v, over), style: { ...style } }));
}

export function createEmail(client = CLIENTS[0].id, templateId = 'match'): EmailDoc {
  const tpl = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0];
  return {
    id: newId('e'),
    name: tpl.id === 'blank' ? 'Новое письмо' : tpl.name,
    client,
    subject: tpl.id === 'blank' ? '' : `${tpl.name} — специально для тебя`,
    preheader: '',
    // у шаблона из макета — его палитра и фон
    theme: tpl.theme ? { ...defaultTheme(), ...tpl.theme, preset: -1 } : defaultTheme(),
    bg: { ...defaultBackground(), ...tpl.bg },
    blocks: blocksFromTemplate(tpl.id),
    updatedAt: Date.now(),
  };
}
