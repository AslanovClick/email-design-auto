// Генератор html_gen из воркфлоу плагина: снимок v5-части, патчи для приложения и запуск кода
// Code-узла n8n вне n8n (тесты, локальный прогон). Без Node API — модуль грузят и браузерные тесты.

export interface WfNode {
  name: string;
  type: string;
  typeVersion: number;
  parameters: Record<string, any>;
  onError?: string;
  credentials?: object;
  id: string;
  position: [number, number];
}

export interface Workflow {
  name: string;
  nodes: WfNode[];
  connections: Record<string, { main: { node: string; type: 'main'; index: number }[][] }>;
  settings?: object;
}

export function nodeCode(wf: Workflow, name: string): string {
  const code = wf.nodes.find((n) => n.name === name)?.parameters.jsCode;
  if (typeof code !== 'string') throw new Error(`В воркфлоу нет Code-узла «${name}»`);
  return code;
}

// v5-часть: всё до прежнего генератора, без хвостовых пустых строк и комментариев
export function extractV5(code: string): string {
  const i = code.indexOf('function legacyGenerate');
  const lines = (i < 0 ? code : code.slice(0, i)).split('\n');
  while (lines.length && /^\s*(\/\/.*)?$/.test(lines[lines.length - 1])) lines.pop();
  return lines.join('\n') + '\n';
}

function replaceOnce(src: string, from: string, to: string): string {
  const i = src.indexOf(from);
  if (i < 0) throw new Error(`patchForApp: якорь не найден: ${from.trim().slice(0, 60)}`);
  return src.slice(0, i) + to + src.slice(i + from.length);
}

// Отличия копии приложения от плагинной: без plan — ошибка (прежнего генератора нет), скрытый прехедер после <body>
export function patchForApp(v5: string): string {
  let s = replaceOnce(v5, ' Старые выгрузки без plan собирает прежний генератор (legacyGenerate ниже).',
    ' Копия для Clickable Mail: без plan — ошибка, есть прехедер.');
  s = replaceOnce(s, 'if (!body.plan) return legacyGenerate();', "if (!body.plan) throw new Error('В запросе нет plan');");
  s = replaceOnce(s, 'const html = `<!DOCTYPE',
    '// прехедер из приложения (у плагина его нет): скрытый текст превью письма в почтовике\n'
    + 'const preheader = body.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${esc(body.preheader)}</div>\\n` : \'\';\n'
    + 'const html = `<!DOCTYPE');
  return replaceOnce(s, '<body style="margin:0;padding:0;">\n', '<body style="margin:0;padding:0;">\n${preheader}');
}

type Item = { json: any; binary?: any };
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;

// Код Code-узла (режим «все элементы») с тем, что он берёт у n8n: $('Узел'), $input, $json, $binary, this.helpers
export async function runCode(code: string, ctx: { body: unknown; input?: Item[]; helpers?: object }): Promise<Item[]> {
  const input = ctx.input ?? [{ json: { body: ctx.body } }];
  const hook = { json: { body: ctx.body } };
  const $ = () => ({ first: () => hook, item: hook, all: () => [hook] });
  const $input = { all: () => input, first: () => input[0], item: input[0] };
  const fn = new AsyncFunction('$', '$input', '$json', '$binary', code);
  const out = await fn.call({ helpers: ctx.helpers ?? {} }, $, $input, input[0]?.json, input[0]?.binary);
  return (Array.isArray(out) ? out : [out]).map((o: any) => ('json' in o ? o : { json: o }));
}

export async function runHtmlGen(code: string, body: unknown): Promise<string> {
  return (await runCode(code, { body }))[0].json.output;
}
