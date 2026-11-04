import { expect, test } from 'vitest';
import { contentHash, FileNamer, folderFor, ftpName, hostedUrl, normLink, slug } from './names';

test('slug как в плагине', () => {
  expect(slug('Матч дня')).toBe('Match-dnya');
  expect(slug('22Bet — Бонус!')).toBe('22Bet-Bonus');
  expect(slug('Щука Ёж')).toBe('Schuka-Ezh');
  expect(slug('x'.repeat(70))).toHaveLength(60);
});

test('папка письма', () => expect(folderFor({ id: 'e4y343j0b', name: 'Матч дня' }, '20Bet')).toBe('cm/20Bet/Match-dnya-e4y343j0b'));

test('пустое название — email', () => expect(folderFor({ id: 'e1', name: '!!!' }, 'Vave')).toBe('cm/Vave/email-e1'));

test('имя на FTP и ссылка', () => {
  expect(ftpName('cm/20Bet/x-e1', 'bg-aa11bb.png')).toBe('cm--20Bet--x-e1--bg-aa11bb.png');
  expect(hostedUrl('cm/20Bet/x-e1', 'bg-aa11bb.png')).toBe('https://demo.promo/sv/public_html/email_images/cm--20Bet--x-e1--bg-aa11bb.png');
});

test('отпечаток — первые 6 hex sha-1', async () => expect(await contentHash(new Blob(['abc']))).toBe('a9993e'));

test('ссылки', () => {
  expect(normLink('')).toBe('https://www.google.com/');
  expect(normLink('#')).toBe('https://www.google.com/');
  expect(normLink(null)).toBe('https://www.google.com/');
  expect(normLink(' https://x.com ')).toBe('https://x.com');
  expect(normLink('mailto:a@b.c')).toBe('mailto:a@b.c');
  expect(normLink('{{unsubscribe}}')).toBe('{{unsubscribe}}');
});

test('FileNamer: повтор содержимого — тот же файл, повтор базы — -2', () => {
  const n = new FileNamer();
  expect(n.name('btn', 'a1b2c3', 'png')).toBe('btn-a1b2c3.png');
  expect(n.name('btn', 'a1b2c3', 'png')).toBe('btn-a1b2c3.png');
  expect(n.name('logo', 'a1b2c3', 'png')).toBe('btn-a1b2c3.png');
  expect(n.name('btn', 'ffffff', 'png')).toBe('btn-2-ffffff.png');
  expect(n.name('btn', 'eeeeee', 'jpg')).toBe('btn-3-eeeeee.jpg');
});

test('FileNamer: база в нижнем регистре и без лишних знаков', () =>
  expect(new FileNamer().name('App Store!', 'abcdef', 'png')).toBe('app-store-abcdef.png'));
