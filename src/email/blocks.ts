// Рендер блоков в HTML — разметка превью. Она же источник для планировщика экспорта (src/email/plan):
// атрибуты data-plan говорят ему, что за элемент. HTML для рассылки собирает n8n (n8n/clickable-mail.json).

import { clientPreset } from '@/model/presets';
import type { Block, BlockData, BlockType, EmailDoc } from '@/model/types';
import { renderContent, renderLeague, renderRecodds, renderTimer } from './content';
import { renderCta, renderOdds, renderSeparator, renderText } from './elements';
import { renderFooter } from './footer';
import { renderHero } from './hero';
import { renderFacts, renderInner, renderMultibet } from './sport';

export { headerRow, heroTeams, renderDate } from './hero';

export const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
export const lines = (s: unknown) => String(s ?? '').split('\n').map((x) => x.trim()).filter(Boolean);

export const clientName = (doc: EmailDoc) => clientPreset(doc.client).name;

const img = (d: BlockData, h: number, label = 'Изображение') => d.image
  ? `<div class="e-img has" style="height:${h}px;background-image:url('${esc(d.image)}')"></div>`
  : `<div class="e-img" style="height:${h}px"><span>${label}</span></div>`;

type Renderer = (b: Block, doc: EmailDoc) => string;

const RENDER: Record<BlockType, Renderer> = {
  hero: renderHero,
  body(b) {
    const d = b.data;
    const text = `<div class="e-col"><div class="e-h2">${esc(d.title)}</div><p class="e-p">${esc(d.text)}</p><span class="e-btn sm">${esc(d.cta)}</span></div>`;
    return `<div class="e-pad">${b.v % 2 === 1 ? `<div class="e-grid2">${img(d, 180)}${text}</div>` : `${img(d, 200)}<div class="e-gap"></div>${text}`}</div>`;
  },
  inner: renderInner,
  text: renderText,
  bullets: renderContent,
  facts: renderFacts,
  odds: renderOdds,
  recodds: renderRecodds,
  multibet: renderMultibet,
  league: renderLeague,
  timer: renderTimer,
  cta: renderCta,
  separator: renderSeparator,
  footer: renderFooter,
};

export const renderBlockInner = (b: Block, doc: EmailDoc) => RENDER[b.type](b, doc);
