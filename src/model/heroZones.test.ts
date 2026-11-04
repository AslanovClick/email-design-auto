import { expect, test } from 'vitest';
import { ASSET } from './presets';
import { DEFAULT_ZONES, dragZone, zonesOf, zonesValue } from './heroZones';

const tpl = ASSET('samples/tpl/sport1-hero.png');

test('картинка шаблона без своих зон — зоны шаблона', () =>
  expect(zonesOf({ image: tpl })).toEqual({ logo: [24, 22, 136, 60], league: [432, 20, 146, 66] }));

test('свои зоны важнее шаблонных; пустые — зон нет', () => {
  expect(zonesOf({ image: tpl, zones: zonesValue({ logo: [1, 2, 3, 4] }) })).toEqual({ logo: [1, 2, 3, 4] });
  expect(zonesOf({ image: tpl, zones: zonesValue({}) })).toEqual({});
});

test('своя картинка без зон и испорченное значение — зон нет', () => {
  expect(zonesOf({ image: 'data:image/png;base64,AAAA' })).toEqual({});
  expect(zonesOf({ image: tpl, zones: '{oops' })).toEqual({});
  expect(zonesOf({ zones: '{"logo":[1,2,"x",4],"league":[5,6,7,8]}' })).toEqual({ league: [5, 6, 7, 8] });
});

test('зоны по умолчанию — в углах хедера', () => {
  expect(DEFAULT_ZONES.logo[0]).toBeLessThan(100);
  expect(DEFAULT_ZONES.league[0] + DEFAULT_ZONES.league[2]).toBeGreaterThan(500);
});

test('перетаскивание: сдвиг и размер не выходят за картинку', () => {
  const b = { w: 600, h: 400 };
  expect(dragZone([24, 22, 136, 60], 10, 5, 'move', b)).toEqual([34, 27, 136, 60]);
  expect(dragZone([24, 22, 136, 60], -100, -100, 'move', b)).toEqual([0, 0, 136, 60]);
  expect(dragZone([500, 22, 136, 60], 200, 0, 'move', b)).toEqual([464, 22, 136, 60]);
  expect(dragZone([24, 22, 136, 60], 20, -10, 'resize', b)).toEqual([24, 22, 156, 50]);
  expect(dragZone([24, 22, 136, 60], -500, -500, 'resize', b)).toEqual([24, 22, 16, 16]);
  expect(dragZone([500, 22, 50, 60], 300, 0, 'resize', b)).toEqual([500, 22, 100, 60]);
  expect(dragZone([24.4, 22.6, 136, 60], 0.4, 0.4, 'move', b)).toEqual([25, 23, 136, 60]);
});
