import JSZip from 'jszip';
import { expect, test } from 'vitest';
import { BRIEF_MAX, cleanBrief, readBriefFile } from './clean';
import { hasExamples, readExample } from './fixtures/examples';

// ТЗ клиентов (examples/, только локально) — как их загрузит пользователь; проверки — по устройству, не по текстам
test.skipIf(!hasExamples)('Markdown из Google Docs: без ** и \\!, метки и списки на месте', async () => {
  const t = await readBriefFile('a.md', readExample('Planbet No Deposit Freebet Sport.md'));
  expect(t).not.toMatch(/\*\*|\\!/);
  expect(t).toMatch(/^Title: \S/m);
  expect(t).toMatch(/^- \S/m);
});

test.skipIf(!hasExamples)('встроенные картинки вырезаны, ссылки остались', async () => {
  const t = await readBriefFile('p.md', readExample('Playbaze  Cashback 09.11.2026.md'));
  expect(t).not.toContain('base64');
  expect(t).toContain('[картинка]');
  expect(t.length).toBeLessThan(BRIEF_MAX);
  expect(t).toMatch(/https:\/\/\S+\.png/);
});

test.skipIf(!hasExamples)('docx клиента: абзацы, строки деталей, пункты списка', async () => {
  const t = await readBriefFile('x.docx', readExample('22bit France - Turkey UEFA Nations League.docx'));
  expect(t).toContain('Детали матча:');
  expect(t).toMatch(/^\d+ .+ \d+$/m);
  const c = await readBriefFile('c.docx', readExample('20Bet top win Casino October 2026.docx'));
  expect(c).toMatch(/^- Провайдер: \S/m);
});

/** Минимальный .docx: абзацы word/document.xml как в Google Docs. */
async function docx(paras: string[]): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file('word/document.xml', `<w:document><w:body>${paras.map((p) => `<w:p>${p}</w:p>`).join('')}</w:body></w:document>`);
  return zip.generateAsync({ type: 'arraybuffer' });
}
const run = (t: string) => `<w:r><w:t xml:space="preserve">${t}</w:t></w:r>`;
const item = (t: string) => `<w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>${run(t)}`;

test('docx: пункты списка — «- », табуляция, перенос строки, сущности XML', async () => {
  const t = await readBriefFile('s.docx', await docx([
    run('Mailer top:'), run('Ставка:') + '<w:tab/>' + run('2 EUR'), run('Удача') + '<w:br/>' + run('ждёт &amp; вас &#33;'),
    run('Dragon Fortune Deluxe'), item('Провайдер: Hacksaw Gaming'), item('Free Spins'),
  ]));
  expect(t).toBe('Mailer top:\nСтавка:\t2 EUR\nУдача\nждёт & вас !\nDragon Fortune Deluxe\n- Провайдер: Hacksaw Gaming\n- Free Spins');
});

test('docx без текста документа — понятная ошибка', async () => {
  const zip = new JSZip();
  zip.file('x.txt', 'x');
  await expect(readBriefFile('e.docx', await zip.generateAsync({ type: 'arraybuffer' }))).rejects.toThrow('повреждён');
});

test('чужой формат — понятная ошибка', async () =>
  await expect(readBriefFile('a.pdf', new ArrayBuffer(1))).rejects.toThrow('.docx, .md и .txt'));

test('вставленный Markdown чистится так же', () => expect(cleanBrief('**Title:** A\\!')).toBe('Title: A!'));

test('обычный текст не портится: __ внутри слова, «#1», одиночные звёздочки', () =>
  expect(cleanBrief('Код: BONUS__2026\n#1 в рейтинге\n## Заголовок\n__жирный__ и **жирный**\nx*2 = 10'))
    .toBe('Код: BONUS__2026\n#1 в рейтинге\nЗаголовок\nжирный и жирный\nx*2 = 10'));

test('ссылки, звёздочки списков, переводы строк и пустые строки', () =>
  expect(cleanBrief('# Заголовок\r\n* пункт\r\n\r\n\r\n\r\n[тут](https://x.y)\n[image1]: <data:image/png;base64,AAAA>'))
    .toBe('Заголовок\n- пункт\n\nтут (https://x.y)'));
