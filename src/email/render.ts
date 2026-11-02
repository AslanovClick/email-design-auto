// Сборка письма целиком: одна и та же разметка идёт в превью (iframe) и в экспорт.

import type { Block, EmailDoc } from '@/model/types';
import { renderBlockInner, esc } from './blocks';
import { EMAIL_CSS } from './emailCss';
import { bgLayerCss, blockVars, emailVars, hasBorder } from './theme';

export function renderBlock(b: Block, doc: EmailDoc) {
  const inner = renderBlockInner(b, doc);
  // обводка ложится на главный элемент блока (.e-frame и т.п.), а если его нет — на сам блок
  let cls = hasBorder(b) ? ` has-bd${/e-frame|e-box|e-tile|e-time/.test(inner) ? '' : ' no-frame'}` : '';
  if (b.style.cardMode) cls += ` card-${b.style.cardMode}`;
  return `<div class="em-blk${cls}" data-block-id="${b.id}" style="${blockVars(b, doc)}">${inner}</div>`;
}

export function renderEmailBody(doc: EmailDoc) {
  const layer = bgLayerCss(doc);
  return `<div class="em" style="${emailVars(doc)}">${layer ? `<div class="e-bgl" style="${layer}"></div>` : ''}`
    + doc.blocks.map((b) => renderBlock(b, doc)).join('') + '</div>';
}

const FONT_LINKS: Partial<Record<EmailDoc['theme']['font'], string>> = {
  Roboto: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap',
};

/** Полный HTML-документ письма. */
export function renderDocument(doc: EmailDoc, opts: { preview?: boolean } = {}) {
  const font = FONT_LINKS[doc.theme.font];
  const page = opts.preview
    ? 'html,body{margin:0;padding:0;background:transparent;overflow:hidden}'
    : `html,body{margin:0;padding:0;background:${doc.theme.bg}} .wrap{width:100%;display:flex;justify-content:center}`;
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${esc(doc.subject)}</title>
${font ? `<link href="${font}" rel="stylesheet">` : ''}
<style>${page}${EMAIL_CSS}</style>
</head>
<body>
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(doc.preheader)}</div>
<div class="wrap">${renderEmailBody(doc)}</div>
</body>
</html>`;
}
