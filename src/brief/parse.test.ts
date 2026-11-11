import { expect, test } from 'vitest';
import { parseBrief } from './parse';

// синтетическое ТЗ «top win» в виде, как его отдаёт Google Docs (.docx)
const TOP_WIN = `KOI Fortune top win Casino November 2026
Title: Звёздный выигрыш недели
Mailer top:

Ставка: 2 EUR
Выигрыш: 4,210.50 EUR
Удача ждёт вас!
button (Try Now)
Text:
Немного удачи — и слоты дарят большие выигрыши!
Загляните в мир драконов — сокровища ждут смелых!
Dragon Fortune Deluxe
Огненные драконы и золотые множители.
- Провайдер: Hacksaw Gaming
- Free Spins
- Hold and Win
- Макс. выигрыш: x10,000
button (Spin Now)`;

test('Mailer top — оффер под картинкой, кнопка после него', () => {
  const s = parseBrief(TOP_WIN).sections;
  expect(s.slice(0, 2)).toEqual([
    { k: 'offer', lines: ['Ставка: 2 EUR', 'Выигрыш: 4,210.50 EUR', 'Удача ждёт вас!'] },
    { k: 'button', text: 'Try Now' },
  ]);
});

test('Image / Картинка — по-прежнему текст на картинке шапки', () => {
  const s = parseBrief('Vave\nImage:\n\nПятница с фрибетом\n10 EUR без депозита\n\nText:\nПривет, name!').sections;
  expect(s[0]).toEqual({ k: 'top', lines: ['Пятница с фрибетом', '10 EUR без депозита'] });
});

test('карточка слота: название, подводка, провайдер и характеристики — из ТЗ', () => {
  const s = parseBrief(TOP_WIN).sections;
  expect(s.slice(2)).toEqual([
    { k: 'text', title: '', paras: ['Немного удачи — и слоты дарят большие выигрыши!', 'Загляните в мир драконов — сокровища ждут смелых!'] },
    { k: 'slots', slots: [{
      name: 'Dragon Fortune Deluxe', provider: 'Hacksaw Gaming',
      about: 'Огненные драконы и золотые множители.',
      features: ['Free Spins', 'Hold and Win', 'Макс. выигрыш: x10,000'],
    }] },
    { k: 'button', text: 'Spin Now' },
  ]);
});
