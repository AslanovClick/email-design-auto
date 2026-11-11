// ТЗ клиентов (examples/) — только локально: в git их нет (.gitignore), репозиторий открытый.
// Рядом с ними — ответы модели по ним, эталон правил сборки и проверки по каждому ТЗ.
// Тесты на них идут, только если папка есть; в чистом клоне — синтетика (fixtures/synthetic).
import { existsSync, readFileSync, readdirSync } from 'node:fs';

export const EXAMPLES_DIR = new URL('../../../examples/', import.meta.url);
export const hasExamples = existsSync(EXAMPLES_DIR);

/** Файлы ТЗ (.docx / .md / .txt) по алфавиту; без папки — пусто. */
export const exampleFiles = (): string[] =>
  (hasExamples ? readdirSync(EXAMPLES_DIR).filter((f) => /\.(docx|md|txt)$/i.test(f)).sort() : []);

export function readExample(name: string): ArrayBuffer {
  const b = readFileSync(new URL(name, EXAMPLES_DIR));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
}

/** Ответы модели по ТЗ клиентов (n8n/tools/eval-brief.ts --record). */
export const EXAMPLE_ANSWERS = new URL('answers/', EXAMPLES_DIR);
/** Эталон правил сборки по всем ТЗ: блоки, название, заметки. */
export const EXAMPLE_RULES = new URL('build-rules.json', EXAMPLES_DIR);
