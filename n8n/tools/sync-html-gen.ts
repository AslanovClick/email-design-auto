// Синхронизация html_gen с генератором плагина.
//   node n8n/tools/sync-html-gen.ts <путь к плагинному Figma_mail_final.json> [--check]
// Пишет снимок v5-части в fixtures/html_gen.plugin-v5.js и (если есть) узел html_gen в n8n/clickable-mail.json.
// --check ничего не пишет: код выхода 1, если снимок или узел расходятся с плагином. Файл плагина только читается.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { extractV5, nodeCode, patchForApp, type Workflow } from './html-gen.ts';

const [src, flag] = process.argv.slice(2);
if (!src) {
  console.error('Использование: node n8n/tools/sync-html-gen.ts <Figma_mail_final.json> [--check]');
  process.exit(2);
}
const check = flag === '--check';
const SNAPSHOT = new URL('./fixtures/html_gen.plugin-v5.js', import.meta.url);
const WORKFLOW = new URL('../clickable-mail.json', import.meta.url);

const read = (f: URL | string) => readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
const snapshot = extractV5(nodeCode(JSON.parse(read(src)) as Workflow, 'html_gen'));
let diff = false;

if (!existsSync(SNAPSHOT) || read(SNAPSHOT) !== snapshot) {
  diff = true;
  if (check) console.log('Снимок fixtures/html_gen.plugin-v5.js расходится с плагином');
  else { writeFileSync(SNAPSHOT, snapshot); console.log('Снимок обновлён: fixtures/html_gen.plugin-v5.js'); }
}

if (existsSync(WORKFLOW)) {
  const wf = JSON.parse(read(WORKFLOW)) as Workflow;
  const node = wf.nodes.find((n) => n.name === 'html_gen');
  if (!node) throw new Error('В n8n/clickable-mail.json нет узла html_gen');
  const code = patchForApp(snapshot);
  if (node.parameters.jsCode !== code) {
    diff = true;
    if (check) console.log('Узел html_gen в n8n/clickable-mail.json расходится с плагином');
    else {
      node.parameters.jsCode = code;
      writeFileSync(WORKFLOW, JSON.stringify(wf, null, 2) + '\n');
      console.log('Узел html_gen обновлён: n8n/clickable-mail.json');
    }
  }
}

if (!diff) console.log('html_gen совпадает с плагином');
process.exit(check && diff ? 1 : 0);
