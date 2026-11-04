import { expect, test } from 'vitest';
import { fontStack, lineHeight, normColor, parseColor, styleDiff, textStyle } from './style';

test('стеки шрифтов', () => {
  expect(fontStack('Verdana, Geneva, sans-serif')).toBe('Verdana, Arial, Helvetica, sans-serif');
  expect(fontStack('"Roboto", Arial, sans-serif')).toBe('Arial, Helvetica, sans-serif');
  expect(fontStack('Tahoma, Geneva, sans-serif')).toBe('Tahoma, Verdana, Arial, sans-serif');
  expect(fontStack("'Trebuchet MS', sans-serif")).toBe("'Trebuchet MS', Arial, sans-serif");
  expect(fontStack('Comic Neue')).toBe('Verdana, Arial, Helvetica, sans-serif');
});

test('разбор цвета', () => {
  expect(parseColor('#fff')).toEqual([255, 255, 255, 1]);
  expect(parseColor('#22b33a80')).toEqual([34, 179, 58, 128 / 255]);
  expect(parseColor('rgb(1 2 3 / 0.5)')).toEqual([1, 2, 3, 0.5]);
  expect(parseColor('transparent')).toEqual([0, 0, 0, 0]);
  expect(parseColor('linear-gradient(red, blue)')).toBeNull();
});

test('цвет', () => {
  expect(normColor('rgb(255, 255, 255)', '#0b171b')).toBe('#fdfdfd');
  expect(normColor('rgba(255, 255, 255, 0.5)', '#000000')).toBe('#808080');
  expect(normColor('rgba(0, 0, 0, 0)', '#000000')).toBeNull();
  expect(normColor('color(srgb 1 0 0)', '#000000')).toBe('#ff0000');
  expect(normColor('rgb(34, 179, 58)', '#000000')).toBe('#22b33a');
});

test('межстрочный относительный', () => {
  expect(lineHeight({ lineHeight: '21px', fontSize: '14px' })).toBe('1.5');
  expect(lineHeight({ lineHeight: 'normal', fontSize: '14px' })).toBe('1.2');
  expect(lineHeight({ lineHeight: '25.3px', fontSize: '22px' })).toBe('1.15');
});

test('стиль и отличия', () => {
  const st = textStyle({ fontFamily: 'Verdana', fontSize: '14px', fontWeight: '700', color: 'rgb(255, 255, 255)',
    lineHeight: '21px', textTransform: 'uppercase', letterSpacing: 'normal', textDecorationLine: 'none' }, '#000000');
  expect(st).toEqual({ ff: 'Verdana, Arial, Helvetica, sans-serif', fs: 14, fw: 700, c: '#fdfdfd', lh: '1.5', tt: 'uppercase', ls: null, dec: null });
  expect(styleDiff(st, { ...st, fw: 400, c: '#22b33a', tt: null })).toEqual({ fw: 400, c: '#22b33a', tt: 'none' });
  expect(styleDiff(st, { ...st, dec: 'underline' })).toEqual({ dec: 'underline' });
  expect(styleDiff(st, st)).toEqual({});
});

test('межбуквенный и подчёркивание', () => {
  const st = textStyle({ fontFamily: 'Arial', fontSize: '12.5px', fontWeight: '400', color: 'rgb(0, 0, 0)',
    lineHeight: 'normal', textTransform: 'none', letterSpacing: '0.5px', textDecorationLine: 'underline' }, '#ffffff');
  expect([st.fs, st.ls, st.dec, st.tt]).toEqual([12.5, '0.5px', 'underline', null]);
});
