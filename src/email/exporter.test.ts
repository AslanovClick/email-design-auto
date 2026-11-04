import { expect, test } from 'vitest';
import { localHtml } from './exporter';

test('localHtml меняет ссылки хостинга на images/', () => {
  const url = 'https://demo.promo/sv/public_html/email_images/cm--20Bet--x-e1--bg-aa11bb.png';
  expect(localHtml({ html: `<table background="${url}"><img src="${url}">`, urls: { 'bg-aa11bb.png': url } }))
    .toBe('<table background="images/bg-aa11bb.png"><img src="images/bg-aa11bb.png">');
});

test('localHtml не трогает чужие ссылки', () => {
  const html = '<a href="https://20bet.com">x</a>';
  expect(localHtml({ html, urls: { 'a.png': 'https://demo.promo/sv/public_html/email_images/a.png' } })).toBe(html);
});
