// Хук загрузчика Node: модули src/ импортируются из скриптов так же, как в приложении.
// «@/x» → src/x; импортам без расширения (относительным внутри src/ и «@/») дописывается .ts / .tsx / /index.ts.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SRC = new URL('../../src/', import.meta.url);

export async function resolve(spec, ctx, next) {
  let url = spec.startsWith('@/') ? new URL(spec.slice(2), SRC).href : null;
  if (!url && (spec.startsWith('./') || spec.startsWith('../')) && ctx.parentURL?.includes('/src/')) url = new URL(spec, ctx.parentURL).href;
  if (url && !/\.[cm]?[jt]sx?$|\.json$/.test(url)) {
    for (const ext of ['.ts', '.tsx', '/index.ts']) if (existsSync(fileURLToPath(url + ext))) { url += ext; break; }
  }
  return next(url ?? spec, ctx);
}
