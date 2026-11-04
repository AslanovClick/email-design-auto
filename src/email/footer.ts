// Футер по компонентам Figma ([footer] Footer): у каждого клиента свои тексты и почта,
// а цвет ссылок и рамок кнопок берётся из акцента макета — футер подстраивается под письмо.
// Вариант 0 — стандартный (лого, платёжки, приложения, юр. текст), 1 — VIP (подпись менеджера + 18+ / safe).

import { ASSET, clientLogo, clientPreset, clientSite } from '@/model/presets';
import type { Block, EmailDoc } from '@/model/types';
import { isLightBg } from './hero';

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

const TEXT = {
  en: {
    app: 'DOWNLOAD OUR MOBILE APP', apple: 'Download the<br>Apple App', android: 'Download the<br>Android App',
    odds: (n: string) => `The odds are valid at time of sending this letter. Please make sure to check with the current odds on the ${n} website.`,
    chat: 'live chat 24/7', auto: 'This is an automated message, please do not reply.<br>Don’t want to get offers and promotions?',
    unsub: 'Unsubscribe', sincerely: 'Sincerely yours,', vip: 'VIP manager',
  },
  ru: {
    app: 'СКАЧАЙТЕ НАШЕ ПРИЛОЖЕНИЕ', apple: 'Скачать для<br>iPhone', android: 'Скачать для<br>Android',
    odds: (n: string) => `Коэффициенты актуальны на момент отправки письма. Проверяйте текущие коэффициенты на сайте ${n}.`,
    chat: 'онлайн-чат 24/7', auto: 'Это автоматическое сообщение, пожалуйста, не отвечайте на него.<br>Не хотите получать новости и специальные предложения?',
    unsub: 'Отписаться', sincerely: 'С уважением,', vip: 'VIP-менеджер',
  },
};

export function renderFooter(b: Block, doc: EmailDoc) {
  const c = clientPreset(doc.client);
  const f = c.footer;
  const t = TEXT[f.lang];
  const d = b.data;
  const pick = (k: string, def: string) => (d[k] ? String(d[k]) : def);

  if (b.v === 1) {
    const email = pick('managerEmail', f.vip.email);
    return `<div class="e-ft vip">
      <p class="sig">${t.sincerely}<br>${esc(pick('manager', f.vip.manager))} ${t.vip}</p>
      <a class="mgr" href="mailto:${esc(email)}">${esc(email)}</a>
      <p class="sig">${esc(pick('hours', f.vip.hours))}</p>
      <img class="safe" data-plan="img" data-plan-name="badge" src="${ASSET('footer/safe-badge.png')}" width="258" alt="18+ · 100% safe and secure">
    </div>`;
  }

  const support = pick('supportEmail', f.supportEmail);
  const showPayments = d.payments ?? f.payments;
  const showApps = d.apps ?? f.apps;
  const showOdds = d.oddsNote ?? f.oddsNote;
  // кнопки сторов в письме — две картинки со своими ссылками (поля ссылок нет — заглушка)
  const btn = (icon: string, w: number, label: string, alt: string) =>
    `<span class="app" data-plan="img" data-plan-name="${icon}" data-plan-link="" data-plan-alt="${alt}"><img src="${ASSET(`footer/${icon}.png`)}" width="${w}" alt=""><span>${label}</span></span>`;
  return `<div class="e-ft">
    <a class="logo-a" data-plan="img" data-plan-name="logo" href="${esc(d.logoLink || clientSite(doc.client))}"><img class="logo" src="${esc(clientLogo(doc.client, isLightBg(doc)))}" alt="${esc(c.name)}"></a>
    ${showPayments ? `<img class="pay" data-plan="img" data-plan-name="payments" src="${ASSET('footer/payments.png')}" width="399" alt="Skrill, Neteller, Maestro, Visa, Mastercard">` : ''}
    ${showApps ? `<div class="apps"><b>${t.app}</b><div class="row">${btn('apple', 22, t.apple, 'Download on the App Store')}<b class="amp">&amp;</b>${btn('android', 34, t.android, 'Get it on Google Play')}</div></div>` : ''}
    <div class="legal">
      ${showOdds ? `<p>${t.odds(esc(c.name))}</p>` : ''}
      <p><a href="mailto:${esc(support)}">${esc(support)}</a> ${t.chat}</p>
      <p>${esc(f.copyright)}</p>
      <p>${t.auto}</p>
      <p><a href="${esc(d.unsub)}">${t.unsub}</a></p>
    </div>
  </div>`;
}
