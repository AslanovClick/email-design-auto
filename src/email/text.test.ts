import { expect, test } from 'vitest';
import { fieldsFor } from '@/model/catalog';
import { createBlock } from '@/model/factory';
import { renderText } from './elements';

test('«Подзаголовок и оффер»: строка под оффером — в поле блока и в письме', () => {
  expect(fieldsFor('text', 4).map((f) => f.key)).toEqual(['kicker', 'offer', 'tagline']);
  const html = renderText(createBlock('text', 4, { kicker: 'Ставка: 2 EUR', offer: 'Выигрыш: 4,210.50 EUR', tagline: 'Удача ждёт вас!' }));
  expect(html).toMatch(/<div class="kick">Ставка: 2 EUR<\/div><div class="offer">Выигрыш: 4,210.50 EUR<\/div><div class="kick">Удача ждёт вас!<\/div>/);
});

test('«Подзаголовок и оффер»: пустых строк в письме нет', () => {
  const html = renderText(createBlock('text', 4, { kicker: '', offer: 'Приз: 100 EUR' }));
  expect(html).not.toContain('kick');
  expect(html).toContain('<div class="offer">Приз: 100 EUR</div>');
});

test('абзацы текста: /так/ — выделение акцентом, «EUR / USD» не трогаем', () => {
  const html = renderText(createBlock('text', 0, { title: '', titleOn: false, text: 'Игрок /lex***/ поймал /x2105,25/ — до 500 EUR / USD' }));
  expect(html).toContain('Игрок <b class="hl">lex***</b> поймал <b class="hl">x2105,25</b> — до 500 EUR / USD');
});

test('карточка «Картинка слева»: строки текста — переносами, как характеристики слота у дизайнера', async () => {
  const { renderContent } = await import('./content');
  const html = renderContent(createBlock('bullets', 4, { title: 'Dragon Fortune', sub: 'Hacksaw Gaming', text: 'Free Spins\nHold and Win' }));
  expect(html).toContain('<p>Free Spins<br>Hold and Win</p>');
});
