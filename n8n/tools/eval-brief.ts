// Сравнение моделей OpenRouter на ТЗ: все файлы examples/ и придуманные src/brief/fixtures/synthetic/.
//   node --import ./n8n/tools/alias.mjs n8n/tools/eval-brief.ts [--models a,b,c] [--only имя,имя] [--record]
// Ключ — OPENROUTER_API_KEY из .env.local (в git не попадает). Для каждой пары «ТЗ × модель»: сырой ответ,
// замечания validateBrief, текст плана, время, токены, цена → n8n/out/brief-eval/<модель>/; сводка — summary.md.
// --record: ответы первой модели списка → приёмочные тесты: по ТЗ клиентов — examples/answers/<имя>.json
// (только локально, в git их нет), по синтетике — src/brief/fixtures/answers/<имя>.json. --only — только эти ТЗ.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { planFromBrief } from '@/brief/build';
import { BRIEF_MAX, cleanBrief, readBriefFile } from '@/brief/clean';
import { parsePlan, planToText } from '@/brief/planText';
import { MODEL, openRouterRequest } from '@/brief/prompt';
import { validateBrief } from '@/brief/schema';

const ROOT = new URL('../../', import.meta.url);
const OUT = new URL('n8n/out/brief-eval/', ROOT);

const args = process.argv.slice(2);
const opt = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const models = (opt('--models') ?? MODEL).split(',').map((m) => m.trim()).filter(Boolean);
const record = args.includes('--record');
const only = opt('--only')?.split(',').map((x) => x.trim());

const envFile = new URL('.env.local', ROOT);
const env = existsSync(envFile)
  ? Object.fromEntries(readFileSync(envFile, 'utf8').split(/\r?\n/).filter((l) => /^\w+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
  : {};
const KEY = process.env.OPENROUTER_API_KEY || env.OPENROUTER_API_KEY;
if (!KEY) {
  console.error('Нет OPENROUTER_API_KEY: впишите его в .env.local');
  process.exit(2);
}

// ---------- ТЗ

const toBuffer = (b: Buffer) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
let briefs: { name: string; text: string; answers: URL }[] = [];
const examples = new URL('examples/', ROOT);
if (existsSync(examples)) {
  for (const f of readdirSync(examples).filter((f) => /\.(docx|md|txt)$/i.test(f))) {
    briefs.push({ name: f.replace(/\.[^.]+$/, ''), text: await readBriefFile(f, toBuffer(readFileSync(new URL(f, examples)))), answers: new URL('answers/', examples) });
  }
}
const synthetic = new URL('src/brief/fixtures/synthetic/', ROOT);
for (const f of readdirSync(synthetic)) {
  briefs.push({ name: f.replace(/\.[^.]+$/, ''), text: cleanBrief(readFileSync(new URL(f, synthetic), 'utf8')), answers: new URL('src/brief/fixtures/answers/', ROOT) });
}
if (only) briefs = briefs.filter((b) => only.includes(b.name));

// ---------- запрос

interface Usage { prompt_tokens?: number; completion_tokens?: number; cost?: number }
interface Result { name: string; model: string; served?: string; ms: number; usage?: Usage; content?: string; error?: string; issues?: string[]; blocks?: string; planErrors?: number }

async function run(model: string, name: string, text: string): Promise<Result> {
  const body = { ...openRouterRequest(text.slice(0, BRIEF_MAX)), models: undefined, model };
  const t0 = Date.now();
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', 'X-Title': 'Clickable Mail brief eval' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });
    const ms = Date.now() - t0;
    const raw = await res.text();
    let data: { choices?: { message?: { content?: string } }[]; model?: string; usage?: Usage; error?: { message?: string } };
    try { data = JSON.parse(raw); } catch { return { name, model, ms, error: `HTTP ${res.status}: ${raw.slice(0, 200)}` }; }
    if (!res.ok || data.error) return { name, model, ms, error: `HTTP ${res.status}: ${data.error?.message ?? raw.slice(0, 200)}` };
    const content = data.choices?.[0]?.message?.content ?? '';
    const r: Result = { name, model, served: data.model, ms, usage: data.usage, content };
    let json: unknown;
    try { json = JSON.parse(content.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, '')); } catch (e) { return { ...r, error: `не JSON: ${(e as Error).message}` }; }
    const { brief, issues } = validateBrief(json);
    const plan = planFromBrief(brief, brief.client ?? '20bet');
    const planText = planToText(plan);
    const dir = new URL(`${model.replace(/[/:]/g, '_')}/`, OUT);
    mkdirSync(dir, { recursive: true });
    writeFileSync(new URL(`${name}.plan.txt`, dir), planText);
    return { ...r, issues, blocks: plan.blocks.map((p) => p.block.type).join(' '), planErrors: parsePlan(planText, '20bet').errors.length };
  } catch (e) {
    return { name, model, ms: Date.now() - t0, error: String((e as Error).message ?? e) };
  }
}

// ---------- прогон: модели параллельно, ТЗ у каждой по очереди

mkdirSync(OUT, { recursive: true });
const results: Result[] = [];
await Promise.all(models.map(async (model) => {
  for (const b of briefs) {
    const r = await run(model, b.name, b.text);
    results.push(r);
    const dir = new URL(`${model.replace(/[/:]/g, '_')}/`, OUT);
    mkdirSync(dir, { recursive: true });
    writeFileSync(new URL(`${b.name}.json`, dir), JSON.stringify(r, null, 2));
    console.log(`${model} · ${b.name}: ${r.error ? `ошибка — ${r.error}` : `${(r.ms / 1000).toFixed(1)} с, замечаний ${r.issues?.length ?? 0}`}`);
    if (record && model === models[0] && r.content) {
      mkdirSync(b.answers, { recursive: true });
      writeFileSync(new URL(`${b.name}.json`, b.answers), JSON.stringify({ model: r.served ?? r.model, content: r.content }, null, 2) + '\n');
    }
  }
}));

results.sort((a, b) => models.indexOf(a.model) - models.indexOf(b.model) || a.name.localeCompare(b.name));
const cell = (s: string) => s.replace(/\|/g, '/').replace(/\n/g, ' ');
const md = [
  '| модель | ТЗ | сек | $ | токены вх/вых | замечания | ошибок плана | блоки | ошибка |',
  '|---|---|---|---|---|---|---|---|---|',
  ...results.map((r) => `| ${r.model} | ${r.name} | ${(r.ms / 1000).toFixed(1)} | ${r.usage?.cost?.toFixed(5) ?? ''} | ${r.usage?.prompt_tokens ?? ''}/${r.usage?.completion_tokens ?? ''} | ${cell(r.issues?.join('; ') ?? '')} | ${r.planErrors ?? ''} | ${r.blocks ?? ''} | ${cell(r.error ?? '')} |`),
];
writeFileSync(new URL('summary.md', OUT), md.join('\n') + '\n');
const cost = results.reduce((s, r) => s + (r.usage?.cost ?? 0), 0);
console.log(`\nСводка: n8n/out/brief-eval/summary.md · всего $${cost.toFixed(4)}`);
