// Промпт и тело запроса к OpenRouter (src/brief/prompt.ts) → код узла «Подготовка» в n8n/brief-plan.json.
//   node --import ./n8n/tools/alias.mjs n8n/tools/sync-brief-plan.ts [--check]
// Шаблон запроса вписывается между строками «// <<REQUEST» и «// REQUEST>>». После правки prompt.ts — запустить
// и заново импортировать воркфлоу в n8n. --check ничего не пишет: код выхода 1, если узел расходится с prompt.ts.
import { readFileSync, writeFileSync } from 'node:fs';
import { openRouterRequest } from '@/brief/prompt';
import type { Workflow } from './html-gen.ts';

const check = process.argv.includes('--check');
const WORKFLOW = new URL('../brief-plan.json', import.meta.url);

const wf = JSON.parse(readFileSync(WORKFLOW, 'utf8')) as Workflow;
const node = wf.nodes.find((n) => n.name === 'Подготовка');
if (!node) throw new Error('В n8n/brief-plan.json нет узла «Подготовка»');
const code = String(node.parameters.jsCode);
const m = /(\/\/ <<REQUEST\n)[\s\S]*?(\n\/\/ REQUEST>>)/.exec(code);
if (!m) throw new Error('В узле «Подготовка» нет строк «// <<REQUEST» … «// REQUEST>>»');

const template = `const REQUEST_TEMPLATE = ${JSON.stringify(openRouterRequest('__TEXT__'), null, 2)};`;
const next = code.replace(m[0], () => `${m[1]}${template}${m[2]}`);

if (next === code) {
  console.log('Узел «Подготовка» совпадает с src/brief/prompt.ts');
  process.exit(0);
}
if (check) {
  console.log('Узел «Подготовка» в n8n/brief-plan.json расходится с src/brief/prompt.ts — запустите без --check');
  process.exit(1);
}
node.parameters.jsCode = next;
writeFileSync(WORKFLOW, JSON.stringify(wf, null, 2) + '\n');
console.log('Узел «Подготовка» обновлён: n8n/brief-plan.json — импортируйте воркфлоу в n8n заново');
