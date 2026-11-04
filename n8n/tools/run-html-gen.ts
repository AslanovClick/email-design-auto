// Локальный прогон html_gen без n8n (payload — из «Скачать JSON» в окне экспорта).
//   node n8n/tools/run-html-gen.ts <payload.json> <папка>
// Пишет <папка>/index.html (ссылки на demo.promo заменены на images/<файл>) и images/ из bgImageData.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { nodeCode, patchForApp, runHtmlGen, type Workflow } from './html-gen.ts';

const [src, out] = process.argv.slice(2);
if (!src || !out) {
  console.error('Использование: node n8n/tools/run-html-gen.ts <payload.json> <папка>');
  process.exit(2);
}
const HOST = 'https://demo.promo/sv/public_html/email_images/';
const WORKFLOW = new URL('../clickable-mail.json', import.meta.url);
const read = (f: URL | string) => readFileSync(f, 'utf8');

// код узла из воркфлоу — то, что реально крутится в n8n; до его появления — снимок плагина с патчами
const code = existsSync(WORKFLOW)
  ? nodeCode(JSON.parse(read(WORKFLOW)) as Workflow, 'html_gen')
  : patchForApp(read(new URL('./fixtures/html_gen.plugin-v5.js', import.meta.url)));

const body = JSON.parse(read(src));
let html = await runHtmlGen(code, body);
mkdirSync(join(out, 'images'), { recursive: true });
for (const n of body.imageNodes ?? []) {
  const url = HOST + encodeURIComponent(String(n.folder).replace(/\//g, '--') + '--' + n.file);
  html = html.split(url).join('images/' + n.file);
  writeFileSync(join(out, 'images', n.file), Buffer.from(n.bgImageData, 'base64'));
}
writeFileSync(join(out, 'index.html'), html);
console.log(`${join(out, 'index.html')}: ${(Buffer.byteLength(html) / 1024).toFixed(1)} КБ, картинок ${body.imageNodes?.length ?? 0}`);
