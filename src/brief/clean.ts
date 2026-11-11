// Сколько знаков ТЗ уходит модели (после очистки; длиннее — обрезается)
export const BRIEF_MAX = 20_000;

const PICTURE = '[картинка]';

// Текст ТЗ без разметки: Markdown из Google Docs, вставленный текст — одинаково.
export function cleanBrief(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    // встроенные картинки: определения [imageN]: <data:…> — долой, ссылки на них и сами data URL — пометкой
    .replace(/^ *\[[^\]\n]+\]: *<?data:image\/[^\n]*$/gm, '')
    .replace(/!\[[^\]\n]*\]\[[^\]\n]*\]|!\[[^\]\n]*\]\([^)\n]*\)/g, PICTURE)
    .replace(/data:image\/[\w.+-]+;base64,[A-Za-z0-9+/=]+/g, PICTURE)
    // пункты списков «* » / «+ » → «- »
    .replace(/^(\s*)[*+] +/gm, '$1- ')
    // выделение — только парами вокруг текста: **жирный**, __жирный__, *курсив* («BONUS__2026», «x*2» не трогаем)
    .replace(/(?<!\\)\*\*(?=\S)([^\n]*?\S)(?<!\\)\*\*/g, '$1')
    .replace(/(?<![\\\p{L}\p{N}_])__(?=\S)([^\n]*?\S)(?<!\\)__(?![\p{L}\p{N}_])/gu, '$1')
    .replace(/(?<![\\\w*])\*(?=\S)([^*\n]*?\S)(?<!\\)\*(?![\w*])/g, '$1')
    // заголовки «# …» (после решётки — пробел; «#1» — обычный текст)
    .replace(/^#{1,6}(?:[ \t]+|$)/gm, '')
    // [текст](url) → «текст (url)», если текст — сам адрес, то просто адрес
    .replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (_, t: string, url: string) => {
      const label = unescape(t);
      return label === url ? url : `${label} (${url})`;
    })
    .replace(/\\([!-/:-@[-`{-~])/g, '$1')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const unescape = (s: string) => s.replace(/\\([!-/:-@[-`{-~])/g, '$1');

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

// Абзацы word/document.xml: пункт списка → «- », перевод строки и табуляция — как в документе
async function docxText(data: ArrayBuffer): Promise<string> {
  // JSZip — отдельным чанком, как в экспорте: в основной бандл не тянем
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(data);
  const xml = await zip.file('word/document.xml')?.async('string');
  if (xml == null) throw new Error('Файл .docx повреждён: нет текста документа');
  return xml
    .split('</w:p>')
    .map((p) => (p.includes('<w:numPr>') ? '- ' : '') + p.replace(/<w:tab\/>/g, '\t').replace(/<w:br\b[^>]*\/>/g, '\n').replace(/<[^>]+>/g, ''))
    .join('\n')
    .replace(/&(amp|lt|gt|quot|apos);|&#(\d+);|&#x([0-9a-f]+);/gi, (_, name?: string, dec?: string, hex?: string) =>
      name ? ENTITIES[name.toLowerCase()] : String.fromCodePoint(dec ? Number(dec) : parseInt(hex!, 16)));
}

// Текст ТЗ из загруженного файла (.docx, .md, .txt), уже очищенный
export async function readBriefFile(name: string, data: ArrayBuffer): Promise<string> {
  const ext = /\.([^.]+)$/.exec(name)?.[1]?.toLowerCase();
  if (ext === 'docx') return cleanBrief(await docxText(data));
  if (ext === 'md' || ext === 'txt') return cleanBrief(new TextDecoder('utf-8').decode(data));
  throw new Error('Поддерживаются файлы .docx, .md и .txt');
}
