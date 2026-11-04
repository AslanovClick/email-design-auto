import { expect, test } from 'vitest';
import { createBlock, createEmail } from '@/model/factory';
import { SAMPLE_HERO } from '@/model/presets';
import { mountEmail, relRect, shadowRect, shoot, shootBackground } from './raster';

const doc = createEmail('20bet', 'sport-match');

test('письмо смонтировано в 600px', async () => {
  const f = await mountEmail(doc);
  expect(f.emRect.width).toBe(600);
  expect(f.em.querySelectorAll(':scope > .em-blk').length).toBe(doc.blocks.length);
  expect(f.css).not.toContain("url('/assets/");
  f.remove();
});

test('кнопка: PNG 2×', async () => {
  const f = await mountEmail(doc);
  const el = f.em.querySelector('.e-cta')!;
  const s = await shoot(el, f, { mode: 'whole' });
  const bmp = await createImageBitmap(s.blob);
  expect(s.type).toBe('image/png');
  expect(bmp.width).toBe(Math.round(s.rect.w) * 2);
  expect(s.hash).toMatch(/^[0-9a-f]{6}$/);
  f.remove();
});

test('nobg отличается от whole, одинаковое — одинаковый hash', async () => {
  const f = await mountEmail(doc);
  const [a, b] = [...f.em.querySelectorAll('.e-cta')];
  const whole = await shoot(a, f, { mode: 'whole' });
  const nobg = await shoot(a, f, { mode: 'nobg' });
  expect(nobg.hash).not.toBe(whole.hash);
  expect((await shoot(b, f, { mode: 'nobg' })).hash).toBe(nobg.hash);
  f.remove();
});

test('own: без содержимого, но со своей отрисовкой', async () => {
  const f = await mountEmail(doc);
  const el = f.em.querySelector('.e-cta')!;
  const own = await shoot(el, f, { mode: 'own' });
  const nobg = await shoot(el, f, { mode: 'nobg' });
  expect(own.hash).toBe(nobg.hash);   // у кнопки внутри только надпись
  f.remove();
});

test('бортик: shadowRect ниже рамки кнопки', async () => {
  const f = await mountEmail(doc);
  const el = f.em.querySelector('.e-cta.k1')!;
  const r = relRect(el, f), s = shadowRect(el, f);
  expect(s.h).toBe(r.h + 8);
  expect([s.x, s.y, s.w]).toEqual([r.x, r.y, r.w]);
  const shot = await shoot(el, f, { mode: 'nobg', rect: s });
  expect(shot.rect).toEqual({ x: Math.round(s.x), y: Math.round(s.y), w: Math.round(s.w), h: Math.round(s.h) });
  f.remove();
});

test('фон-паттерн снимается, цветной фон — null', async () => {
  const f = await mountEmail(doc);
  const s = await shootBackground(f, doc);
  expect(s!.type).toBe('image/png');
  expect(Math.round(s!.rect.h)).toBe(Math.round(f.emRect.height));
  expect((await createImageBitmap(s!.blob)).width).toBe(1200);
  f.remove();
  const plain = { ...doc, bg: { ...doc.bg, mode: 'color' as const } };
  const g = await mountEmail(plain);
  expect(await shootBackground(g, plain)).toBeNull();
  g.remove();
});

test('фото-фон — 1×', async () => {
  const photo = { ...doc, bg: { ...doc.bg, mode: 'image' as const, image: SAMPLE_HERO.url, opacity: 100, fit: 'cover' as const } };
  const f = await mountEmail(photo);
  const s = await shootBackground(f, photo);
  expect((await createImageBitmap(s!.blob)).width).toBe(600);
  expect(s!.type).toBe('image/jpeg');
  f.remove();
});

test('крупное фото hero — JPEG', async () => {
  const hero = createBlock('hero', 0, { image: SAMPLE_HERO.url, imageOn: true });
  const d = { ...createEmail('20bet', 'blank'), blocks: [hero] };
  const f = await mountEmail(d);
  const s = await shoot(f.em.querySelector('.em-blk')!, f, { mode: 'whole' });
  expect(s.type).toBe('image/jpeg');
  f.remove();
});

test('hero без фото — PNG с прозрачностью', async () => {
  const hero = createBlock('hero', 0, { imageOn: false });
  const d = { ...createEmail('20bet', 'blank'), blocks: [hero] };
  const f = await mountEmail(d);
  expect((await shoot(f.em.querySelector('.em-blk')!, f, { mode: 'whole' })).type).toBe('image/png');
  f.remove();
});
