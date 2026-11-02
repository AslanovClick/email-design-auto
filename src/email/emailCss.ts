// Стили схематичного письма. Всё под .em, чтобы одинаково работать и в iframe превью,
// и в миниатюрах библиотеки внутри интерфейса. Цвета — из переменных темы (--bg, --card, --acc…).

export const EMAIL_CSS = `
.em { width: 600px; position: relative; background: var(--bg); color: var(--txt); font-family: var(--font); font-size: 14px; line-height: 1.5; text-align: left; }
.em * { box-sizing: border-box; }
.em .em-blk { position: relative; z-index: 1; background: var(--sec, transparent); }
.em .e-bgl { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
.em .e-pad { padding: 16px 20px; }
.em .c { text-align: center; }
.em .e-row { display: flex; align-items: center; gap: 10px; }
.em .e-row.sb { justify-content: space-between; }
.em .e-row.c { justify-content: center; }
.em .e-row.gap { gap: 14px; }
.em .e-col { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
.em .e-col.c { align-items: center; }
.em .e-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: center; }
.em .e-gap { height: 14px; }
.em .e-img { background: repeating-linear-gradient(45deg, rgba(255,255,255,.07) 0 10px, rgba(255,255,255,.03) 10px 20px); border-radius: var(--rad); display: grid; place-items: center; color: rgba(255,255,255,.45); font: 500 12px monospace; }
.em .e-img.has { background: center/cover no-repeat; }
.em .e-vs { color: var(--acc); }
.em .e-h2 { font: 700 20px/1.2 var(--font); color: var(--txt); margin-bottom: 8px; text-transform: uppercase; }
.em .e-h3 { font: 700 16px/1.25 var(--font); color: var(--txt); margin-bottom: 8px; }
.em .e-h3.muted { opacity: 0.7; }
.em .e-p { margin: 0 0 10px; color: var(--txt); opacity: 0.8; }
.em .e-hl { color: var(--acc); }
.em .e-small { font: 500 11px var(--font); color: var(--txt); opacity: 0.6; letter-spacing: 0.04em; }
.em .e-crest { width: 48px; height: 34px; display: inline-grid; place-items: center; font: 700 12px var(--font); color: var(--txt); flex: none; }
.em .e-crest img { max-width: 100%; max-height: 100%; }
.em .e-btn { display: inline-block; background: var(--acc); color: var(--acc-ink); font: 700 22px/1 var(--font); padding: 22px; border-radius: var(--btn-rad, 12px); border: 0; text-align: center; }
.em .e-btn.sm { padding: 10px 16px; font-size: 12px; text-transform: uppercase; }
.em .e-btn.v1 { border-radius: 999px; }
.em .em-blk[style*="--btn-rad"] .e-btn.v1 { border-radius: var(--btn-rad); }
.em .e-btn.v2 { background: transparent; border: 2px solid var(--acc); color: var(--acc); }
.em .e-btn.v3 { clip-path: polygon(4% 0, 100% 0, 96% 100%, 0 100%); border-radius: 0; }
.em .e-btn.v4 { box-shadow: inset 0 -5px 0 rgba(0,0,0,.25); }
.em .e-box { background: var(--card); border: 1px solid rgba(255,255,255,.08); border-radius: var(--rad); padding: 16px 20px; }
.em .e-box.accent { border: 2px solid var(--acc); }
.em .e-ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 8px; color: var(--txt); }
.em .e-ul li { display: flex; gap: 12px; align-items: center; }
.em .e-ul li b { font: 700 22px var(--font); color: var(--acc); width: 22px; }
.em .e-tile { background: var(--card); border: 1px solid rgba(255,255,255,.08); border-radius: var(--rad); padding: 14px; font-size: 12px; font-weight: 700; color: var(--txt); display: grid; gap: 8px; justify-items: center; min-width: 120px; }
.em .e-ico { width: 34px; height: 34px; border-radius: 8px; background: var(--acc); opacity: 0.8; }
.em .e-fact { display: flex; justify-content: space-between; padding: 10px 14px; border-top: 1px solid rgba(255,255,255,.08); font-size: 13px; gap: 12px; }
.em .e-box.e-fact { border-top: 1px solid rgba(255,255,255,.08); margin-top: 8px; padding: 12px 16px; }
.em .e-fact b { color: var(--txt); }
.em .e-fact.total { font-weight: 700; }
.em .e-time { display: inline-flex; flex-direction: column; align-items: center; background: var(--card); border: 0; border-radius: var(--rad); padding: 10px 14px; font: 700 26px var(--font); color: var(--txt); min-width: 70px; }
.em .e-time small { font-size: 10px; opacity: 0.6; font-weight: 500; }

/* hero: картинка задаёт высоту, хедер лежит поверх, гербы заходят на нижний край */
.em .e-hero { position: relative; }
.em .e-hero-frame { position: relative; }
.em .e-hero-pic { display: block; width: 100%; height: auto; }
.em .e-hero-pic.empty { height: 610px; background: repeating-linear-gradient(45deg, rgba(255,255,255,.08) 0 12px, rgba(255,255,255,.03) 12px 24px); display: grid; place-items: center; text-align: center; color: rgba(255,255,255,.5); font: 500 12px/1.6 monospace; }
.em .e-hero-head { position: absolute; left: 0; right: 0; top: 0; padding: 18px 24px; z-index: 2; }
.em .e-hero.flow .e-hero-head { position: static; }
.em .e-head { min-height: 56px; align-items: center; }
.em .e-head.g3 { display: grid; grid-template-columns: 1fr auto 1fr; gap: 12px; }
.em .e-head.g3 > :first-child { justify-self: start; }
.em .e-head .mid { justify-self: center; }
.em .e-head .end { justify-self: end; grid-column: 3; }
.em .e-head.one { display: flex; justify-content: center; }
.em .e-head.col { display: flex; flex-direction: column; gap: 10px; align-items: center; }
.em .e-head-date { display: flex; justify-content: center; margin-top: 16px; }
.em .e-brand { display: inline-flex; align-items: center; height: 44px; }
.em .e-brand img { max-height: 40px; max-width: 140px; width: auto; height: auto; display: block; }
.em .e-head.col .e-brand img, .em .e-head.one .e-brand img { max-height: 44px; max-width: 160px; }
.em .e-lg { display: inline-flex; align-items: center; justify-content: center; height: 56px; }
.em .e-lg img { max-height: 56px; max-width: 96px; width: auto; height: auto; display: block; }
.em .e-lg.txt { font: 700 13px/1.15 var(--font); color: var(--txt); text-transform: uppercase; text-align: right; max-width: 120px; }
.em .e-lg.big { height: 56px; }
.em .e-lg.big img { max-height: 56px; max-width: 80px; }

/* дата — 6 стилей компонента [text] date; цвета и скругления — из стиля макета */
.em .e-dt { display: inline-flex; flex-direction: column; align-items: center; color: var(--txt); font-family: var(--font); line-height: 1.1; white-space: nowrap; }
.em .e-dt b { font-weight: 700; }
.em .e-dt.d0 b { font-size: 30px; }
.em .e-dt.d5 b { font-size: 24px; }
.em .e-dt.d1 { background: var(--card); border-top: 2px solid var(--acc); border-radius: var(--rad); padding: 8px 12px; gap: 6px; font-size: 24px; }
.em .e-dt.d1 .y { font-size: 24px; }
.em .e-dt i { display: block; height: 1.5px; width: 56px; background: linear-gradient(90deg, transparent, var(--acc), transparent); }
.em .e-dt.d2 { background: var(--card); border-left: 2px solid var(--acc); border-right: 2px solid var(--acc); border-radius: var(--rad); height: 42px; min-width: 96px; padding: 0 12px; justify-content: center; font-size: 24px; }
.em .e-dt.d3 { background: var(--card); border: 2px solid var(--acc); border-radius: var(--rad); padding: 8px 12px; gap: 6px; }
.em .e-dt.d3 .r { display: inline-flex; align-items: center; gap: 8px; font-size: 24px; color: var(--txt); }
.em .e-dt.d3 svg { color: var(--acc); width: 20px; height: 21px; }
.em .e-dt.d3 i { width: 100px; }
.em .e-dt.d3 .t { font-size: 18px; }
.em .e-dt.d4 { background: var(--card); border: 2px solid var(--acc); border-radius: var(--rad); height: 40px; min-width: 92px; padding: 0 10px; justify-content: center; font-size: 24px; }

/* команды */
.em .e-cr { display: inline-flex; align-items: center; justify-content: center; flex: none; }
.em .e-cr img { max-width: 100%; max-height: 100%; width: auto; height: auto; display: block; }
.em .e-cr .ph { width: 70%; height: 90%; border-radius: 40% 40% 50% 50%; border: 3px solid var(--acc); display: grid; place-items: center; font: 700 22px var(--font); color: var(--txt); background: var(--card); }
.em .e-tm.under { display: flex; justify-content: space-between; padding: 0 0 16px; position: relative; z-index: 3; margin-top: -80px; }
.em .e-tm.under.big { margin-top: -100px; }
.em .e-hero.flow .e-tm.under { margin-top: 0; }
.em .e-tm-col { width: 214px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.em .e-tm-name { font: 700 22px/1.15 var(--font); color: var(--txt); text-transform: uppercase; text-align: center; }
.em .e-tm.big .e-tm-name { font-size: 26px; }
.em .e-tm.vs { display: flex; align-items: center; gap: 12px; padding: 8px 20px 16px; }
.em .e-tm-names { flex: 1; font: 700 26px/1.2 var(--font); color: var(--txt); text-transform: uppercase; text-align: center; }
.em .e-vs { color: var(--acc); }

/* обводка блока: цвет и толщина по сторонам из «Стиля блока» */
.em .em-blk.has-bd :is(.e-frame, .e-box, .e-tile, .e-time), .em .em-blk.has-bd.no-frame { border-style: solid; border-color: var(--bd-c); border-width: var(--bd-w); }
.em .em-blk.has-bd.no-frame { border-radius: var(--rad); }
/* своя плашка у блока, где её нет в варианте: заливка под основным элементом */
.em .em-blk.card-on .e-pad > :first-child { background-color: var(--card); border-radius: var(--rad); width: auto; margin-left: 0; margin-right: 0; box-sizing: border-box; }
.em .em-blk.card-on .e-pad > :first-child:not(.e-frame) { padding: 16px 20px; }
/* без плашки у экспресса остаётся обычная рамка вместо градиентной */
.em .em-blk.card-off.has-bd .e-mb.e-frame { background: none; border-color: var(--bd-c); }

/* коэффициенты ([odds] Match Odds) */
.em .e-od { display: flex; align-items: center; justify-content: center; gap: 48px; color: var(--txt); font-family: var(--font); line-height: 1.15; }
.em .e-od small { font-size: 22px; font-weight: 400; text-transform: uppercase; }
.em .e-od b { font-size: 34px; font-weight: 700; }
.em .e-od .col { display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 110px; }
.em .e-od .sep { display: block; width: 2px; height: 46px; background: var(--acc); opacity: 0.7; }
.em .e-od.o1, .em .e-od.o6 { gap: 34px; height: 80px; border-radius: var(--rad); background: var(--card); }
.em .e-od.o1 small, .em .e-od.o6 small { font-size: 15px; }
.em .e-od.o1 b, .em .e-od.o6 b { color: var(--acc); font-size: 30px; }
.em .e-od.o1 .sep, .em .e-od.o6 .sep { width: 1px; height: 46px; opacity: 0.5; }
.em .e-od.o2, .em .e-od.o3 { gap: 70px; }
.em .e-od.o4, .em .e-od.o7 { gap: 18px; height: 68px; padding: 0 22px; border-radius: 999px; background: var(--card); }
.em .e-od.o7 { border-radius: 30px 0 30px 0; width: 100%; justify-content: space-around; }
.em .e-od.o4 b, .em .e-od.o7 b, .em .e-od.o8 b, .em .e-od.o10 b { color: var(--acc); }
.em .e-od.o4 small, .em .e-od.o7 small, .em .e-od.o8 small, .em .e-od.o10 small { font-weight: 700; }
.em .e-od.o4 b, .em .e-od.o7 b { font-size: 28px; }
.em .e-od.o4 small, .em .e-od.o7 small { font-size: 26px; }
.em .e-od.o4 .sep, .em .e-od.o7 .sep { height: 40px; }
.em .e-od.o5 { gap: 40px; }
.em .e-od.o5 small { color: var(--acc); font-size: 18px; }
.em .e-od.o8 { gap: 32px; }
.em .e-od.o8 small { font-size: 28px; }
.em .e-od.o8 b { font-size: 54px; }
.em .e-od.o8 .sep { width: 4px; background: var(--txt); opacity: 1; }
.em .e-od.o9 { gap: 46px; }
.em .e-od.o9 b { color: var(--acc); font-size: 50px; }
.em .e-od.o9 small { font-size: 20px; }
.em .e-od.o10 { gap: 40px; height: 76px; border-radius: 16px; }
.em .e-od.o10 small { font-size: 26px; }
.em .e-od.o10 b { font-size: 30px; }
.em .e-od.o10 .ico { color: var(--acc); display: inline-flex; }
.em .e-od.o11 { flex-direction: column; gap: 4px; border-radius: var(--rad); padding: 6px 0 4px; }
.em .e-od.o11 .row { display: flex; justify-content: space-around; width: 100%; }
.em .e-od.o11 .lbl span { font-size: 14px; color: var(--acc); text-transform: uppercase; width: 33%; text-align: center; }
.em .e-od.o11 .num { border-top: 1px solid var(--acc); padding-top: 4px; }
.em .e-od.o11 .num b { width: 33%; text-align: center; font-size: 36px; }

/* кнопки ([cta_button] Button) — заливка из акцента, но в диапазоне, где текст читается (см. buttonVars) */
.em .e-cta { display: flex; align-items: center; justify-content: center; width: 100%; height: 84px; margin: 0 auto; position: relative;
  color: var(--btn-ink); font: 700 32px/1 var(--font); text-decoration: none; text-align: center;
  background: linear-gradient(180deg, var(--btn-top), var(--btn-bot)); border-radius: var(--btn-rad, 12px); }
.em .e-cta span { position: relative; z-index: 1; }
.em .e-cta.caps { text-transform: uppercase; }
.em .e-cta.sm { height: 64px; font-size: 24px; }
.em .e-cta.k0 { border-radius: var(--btn-rad, 50px); box-shadow: 0 6px 0 var(--btn-hi); }
.em .e-cta.k1 { border-left: 16px solid var(--btn-hi); border-right: 16px solid var(--btn-hi); border-radius: var(--btn-rad, 50px); box-shadow: 0 8px 0 var(--btn-bot); }
.em .e-cta.k2 { background: linear-gradient(90deg, var(--btn-hi), var(--btn-top) 35%, var(--btn-bot)); -webkit-mask: url('/assets/shapes/btn-trapezoid.svg') center / 100% 100% no-repeat; mask: url('/assets/shapes/btn-trapezoid.svg') center / 100% 100% no-repeat; border-radius: 0; }
.em .e-cta.k3 { background: linear-gradient(90deg, var(--btn-top), var(--btn-bot)); -webkit-mask: url('/assets/shapes/btn-ribbon.svg') center / 100% 100% no-repeat; mask: url('/assets/shapes/btn-ribbon.svg') center / 100% 100% no-repeat; border-radius: 0; }
.em .e-cta.k4 { border: 4px solid var(--btn-hi); border-radius: var(--btn-rad, 50px); box-shadow: 0 8px 0 var(--btn-bot); }
.em .e-cta.k5 { background: linear-gradient(180deg, var(--btn-top), var(--btn-bot)); -webkit-mask: url('/assets/shapes/btn-wings.svg') center / 100% 100% no-repeat; mask: url('/assets/shapes/btn-wings.svg') center / 100% 100% no-repeat; border-radius: 0; }
.em .e-cta.k6 { border-left: 16px solid var(--btn-hi); border-right: 16px solid var(--btn-hi); border-radius: var(--btn-rad, 16px); box-shadow: 0 8px 0 var(--btn-bot); }
.em .e-cta.k7 { height: 76px; background: linear-gradient(180deg, var(--btn-hi), var(--btn-top) 45%, var(--btn-bot)); border: 2px solid var(--btn-bot); border-radius: var(--btn-rad, 24px); }
.em .e-cta.k8 { background: linear-gradient(90deg, var(--btn-top), var(--btn-bot)); -webkit-mask: url('/assets/shapes/btn-octagon.svg') center / 100% 100% no-repeat; mask: url('/assets/shapes/btn-octagon.svg') center / 100% 100% no-repeat; border-radius: 0; }
.em .e-cta.k9 { height: 72px; border-radius: var(--btn-rad, 56px); background: linear-gradient(180deg, var(--btn-top), var(--btn-bot)); overflow: hidden; }
.em .e-cta.k9::after { content: ""; position: absolute; left: 14px; right: 14px; top: 5px; height: 40%; border-radius: 999px; background: linear-gradient(180deg, rgba(255,255,255,.28), rgba(255,255,255,.06)); }
.em .e-cta.k10 { height: 90px; background: linear-gradient(90deg, var(--btn-hi), var(--btn-top) 30%, var(--btn-bot)); -webkit-mask: url('/assets/shapes/btn-arrow.svg') center / 100% 100% no-repeat; mask: url('/assets/shapes/btn-arrow.svg') center / 100% 100% no-repeat; border-radius: 0; }
.em .e-cta.k11 { height: 80px; background: linear-gradient(90deg, var(--btn-top), var(--btn-bot)); -webkit-mask: url('/assets/shapes/btn-slant.svg') center / 100% 100% no-repeat; mask: url('/assets/shapes/btn-slant.svg') center / 100% 100% no-repeat; border-radius: 0; }
.em .e-cta.k12 { background: linear-gradient(180deg, var(--btn-top), var(--btn-bot)); border: 1px solid var(--btn-hi); border-radius: 26px 6px 26px 6px; }
.em .e-cta.k13 { background: linear-gradient(118deg, var(--btn-top), var(--btn-bot)); border-radius: var(--btn-rad, 26px); box-shadow: 0 6px 0 var(--btn-hi); }

/* разделители ([block] Separate) */
.em .e-sp { display: flex; align-items: center; justify-content: center; height: 40px; margin: 6px 0; }
.em .e-sp i { display: block; flex: none; }
.em .e-sp .glow { width: 460px; height: 3px; background: linear-gradient(90deg, transparent, var(--acc), transparent); box-shadow: 0 0 14px var(--acc); border-radius: 3px; }
.em .e-sp .bar { width: 420px; height: 7px; border-radius: 18px; background: var(--acc); }
.em .e-sp .dia { width: 12px; height: 12px; background: var(--acc); transform: rotate(45deg); margin: 0 8px; }
.em .e-sp .dia.m { width: 9px; height: 9px; margin: 0 5px; }
.em .e-sp .dia.s { width: 6px; height: 6px; margin: 0 4px; }
.em .e-sp .spike { width: 130px; height: 12px; background: var(--acc); }
.em .e-sp .spike.l { clip-path: polygon(0 50%, 92% 0, 100% 50%, 92% 100%); }
.em .e-sp .spike.r { clip-path: polygon(0 50%, 8% 0, 100% 50%, 8% 100%); }
.em .e-sp .ln { width: 150px; height: 2px; background: var(--acc); }
.em .e-sp.s5 .ln { width: 230px; }
.em .e-sp .tip { width: 8px; height: 12px; background: var(--acc); }
.em .e-sp .tip.l { clip-path: polygon(0 0, 100% 50%, 0 100%); }
.em .e-sp .tip.r { clip-path: polygon(100% 0, 0 50%, 100% 100%); }
.em .e-sp .dot { width: 24px; height: 24px; border-radius: 50%; background: var(--acc); }
.em .e-sp.s6 .bar { width: 500px; height: 6px; }
.em .e-sp .hook { width: 18px; height: 22px; border: 5px solid var(--acc); }
.em .e-sp .hook.l { border-right: 0; border-radius: 18px 0 0 18px; margin-right: -4px; }
.em .e-sp .hook.r { border-left: 0; border-radius: 0 18px 18px 0; margin-left: -4px; }

/* текст ([text] Body Text) */
.em .e-tx { width: 500px; max-width: 100%; margin: 0 auto; display: flex; flex-direction: column; gap: 12px; align-items: center; text-align: center; color: var(--txt); font-family: var(--font); }
.em .e-tx .tt { font-size: 24px; font-weight: 700; line-height: 1.25; padding: 4px 0; }
.em .e-tx p { margin: 0; font-size: 17px; line-height: 1.45; }
.em .e-tx .note { line-height: 1.5; }
.em .e-tx .note b { color: var(--acc); }
.em .e-tx .kick { font-size: 22px; }
.em .e-tx .offer { font-size: 30px; font-weight: 700; color: var(--acc); }

.em .e-tx.x1 .tt { font-size: 18px; }
.em .e-tx.x2 { border-radius: var(--rad); padding: 16px; }
.em .e-tx.x3 { width: 560px; }
.em .e-tx.x4 { gap: 4px; text-transform: uppercase; }

/* рекомендуемая ставка ([odds] Recomended Odds) */
.em .e-rc { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; min-height: 112px; padding: 14px 24px; text-align: center; color: var(--txt); text-decoration: none; font-family: var(--font); position: relative; }
.em .e-rc p { margin: 0; }
.em .e-rc .pk { font-size: 18px; line-height: 1.3; }
.em .e-rc .big { font-size: 36px; font-weight: 700; line-height: 1.1; }
.em .e-rc .cf { font-size: 22px; font-weight: 700; }
.em .e-rc .cf span { color: var(--acc); }
.em .e-rc.r0 { min-height: 124px; }
.em .e-rc.r1 { border-radius: var(--rad); }
.em .e-rc.r2 { border-radius: var(--rad); min-height: 124px; }
.em .e-rc.r4 { min-height: 130px; }
.em .e-rc.r4::before { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, var(--acc), color-mix(in srgb, var(--acc) 15%, transparent) 30%, color-mix(in srgb, var(--acc) 15%, transparent) 70%, var(--acc));
  -webkit-mask: url('/assets/shapes/rec-hex.svg') center / 100% 100% no-repeat; mask: url('/assets/shapes/rec-hex.svg') center / 100% 100% no-repeat; }
.em .e-rc.r5 .cf { text-transform: uppercase; }
.em .rc-corners { position: relative; padding: 7px; }
.em .rc-corners::before, .em .rc-corners::after { content: ""; position: absolute; width: 66px; height: 66px; background: var(--acc); }
.em .rc-corners::before { left: 0; top: 0; clip-path: polygon(0 0, 100% 0, 0 100%); }
.em .rc-corners::after { right: 0; bottom: 0; clip-path: polygon(100% 0, 100% 100%, 0 100%); }
.em .e-rc.r6 { background: var(--card); z-index: 1; }

/* лига ([text] Soccer league) */
.em .e-lgb { display: flex; flex-direction: column; gap: 16px; color: var(--txt); font-family: var(--font); }
.em .e-lgb p { margin: 0; font-size: 17px; line-height: 1.35; }
.em .e-lgb .tt { font-size: 22px; font-weight: 700; text-transform: uppercase; line-height: 1.2; }
.em .e-lgb .sub { font-size: 17px; margin-top: 6px; }
.em .e-lgb .pic img { max-width: 100px; max-height: 100px; display: block; }
.em .e-lgb .pic .txt { font-weight: 700; font-size: 16px; text-transform: uppercase; }
.em .e-lgb.l0 { padding: 18px 22px 22px; border-radius: var(--rad); }
.em .e-lgb.l0 .head { display: flex; align-items: center; gap: 14px; }
.em .e-lgb.l0 .pic { width: 100px; flex: none; display: flex; justify-content: center; }
.em .e-lgb.l1 { align-items: center; text-align: center; }
.em .e-lgb.l1 .top { display: flex; align-items: center; justify-content: center; gap: 14px; }
.em .e-lgb.l1 .ray { width: 90px; height: 58px; background: linear-gradient(90deg, transparent, var(--acc)); clip-path: polygon(0 50%, 100% 0, 100% 100%); }
.em .e-lgb.l1 .ray.r { transform: scaleX(-1); }
.em .e-lgb.l1 .tt { text-transform: none; font-size: 24px; }

/* таймер ([text] Timer + свои) */
.em .e-tm2 { display: flex; flex-direction: column; align-items: center; gap: 22px; color: var(--txt); font-family: var(--font); text-align: center; }
.em .e-tm2 .tt { font-size: 22px; font-weight: 700; }
.em .e-tm2 .row { display: flex; gap: 6px; width: 100%; justify-content: center; align-items: center; }
.em .e-tm2 .cell { flex: 1; height: 100px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; border-radius: var(--rad); }
.em .e-tm2 .cell b { font-size: 30px; font-weight: 700; }
.em .e-tm2 .cell small { font-size: 15px; text-transform: uppercase; }
.em .e-tm2.t1 .cell { background: var(--card); }
.em .e-tm2.t1 .cell b { color: var(--acc); }
.em .e-tm2.t2 .row { gap: 10px; }
.em .e-tm2.t2 .cell { flex: none; width: 104px; background: var(--card); }
.em .e-tm2.t2 .cell b { font-size: 44px; }
.em .e-tm2.t2 .colon { font-size: 40px; color: var(--acc); }
.em .e-tm2.t3 .row { gap: 14px; font-size: 18px; }
.em .e-tm2.t3 .line b { color: var(--acc); font-size: 26px; }

/* контент ([text] Bullet points + картинка с текстом) */
.em .e-ct { color: var(--txt); font-family: var(--font); }
.em .e-ct img, .em .e-ct .e-ph { display: block; }
.em .e-ph { background: repeating-linear-gradient(45deg, rgba(255,255,255,.10) 0 8px, rgba(255,255,255,.04) 8px 16px); border-radius: var(--rad); }
.em .e-ct.cols { display: flex; justify-content: center; gap: 18px; }
.em .e-ct.cols .it { width: 141px; display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; }
.em .e-ct.cols .it .pic { width: 100px; height: 100px; object-fit: contain; }
.em .e-ct.cols .it b { color: var(--acc); font-size: 18px; }
.em .e-ct.cols .it span { font-size: 15px; line-height: 1.3; }
.em .e-ct.c1 { gap: 30px; }
.em .e-ct.c1 .it { width: 240px; }
.em .e-ct.c1 .it .pic { width: 140px; height: 140px; }
.em .e-ct.c1 .it b { font-size: 24px; }
.em .e-ct.rows { display: flex; flex-direction: column; gap: 14px; }
.em .e-ct.rows .it { display: flex; align-items: center; gap: 14px; }
.em .e-ct.rows .it .pic { width: 100px; height: 100px; object-fit: cover; border-radius: var(--rad); flex: none; }
.em .e-ct.c2 .it b { display: block; color: var(--acc); font-size: 32px; line-height: 1.1; }
.em .e-ct.c2 .it span { font-size: 20px; }
.em .e-ct.c3 .it span { font-size: 20px; line-height: 1.3; }
.em .e-ct.mirror { display: flex; align-items: center; gap: 14px; }
.em .e-ct.mirror .side { width: 141px; height: 141px; object-fit: cover; border-radius: 8px; flex: none; }
.em .e-ct.mirror .side.lg { width: 204px; height: 204px; }
.em .e-ct.mirror .tx { flex: 1; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.em .e-ct .t { color: var(--acc); font-size: 22px; text-transform: uppercase; }
.em .e-ct .s { color: var(--acc); font-size: 17px; }
.em .e-ct.mirror p { margin: 0 0 6px; font-size: 16px; line-height: 1.35; }
.em .e-ct.c8 { display: flex; justify-content: center; padding-top: 24px; }
.em .e-ct.c8 .card { width: 245px; padding: 0 12px 16px; border-radius: var(--rad); display: flex; flex-direction: column; align-items: center; text-align: center; text-transform: uppercase; }
.em .e-ct.c8 .card .pic { width: 150px; height: 150px; object-fit: contain; margin-top: -30px; }
.em .e-ct.c8 .t { font-size: 18px; }
.em .e-ct.c8 .big { color: var(--acc); font-size: 64px; line-height: 1; }
.em .e-ct.c8 span { font-size: 16px; }
.em .e-ct.c9 { display: flex; flex-direction: column; gap: 12px; align-items: center; text-align: center; }
.em .e-ct.c9 .hero { width: 100%; height: auto; border-radius: var(--rad); }
.em .e-ct.c9 .hero.e-ph { height: 260px; }
.em .e-ct.c9 p { margin: 0; font-size: 17px; line-height: 1.4; }

/* футер */
.em .e-ft { padding: 36px 20px 30px; display: flex; flex-direction: column; align-items: center; gap: 28px; text-align: center; color: var(--txt); font-family: var(--font); }
.em .e-ft .logo-a { display: block; margin-bottom: -18px; }
.em .e-ft .logo { max-height: 55px; max-width: 230px; display: block; }
.em .e-ft .pay { display: block; max-width: 399px; height: auto; }
.em .e-ft .apps { display: flex; flex-direction: column; align-items: center; gap: 16px; }
.em .e-ft .apps > b { font-size: 18px; }
.em .e-ft .row { display: flex; align-items: center; gap: 12px; }
.em .e-ft .amp { font-size: 24px; }
.em .e-ft .app { display: inline-flex; align-items: center; gap: 10px; width: 182px; height: 52px; padding-left: 16px; border: 1px solid var(--acc); border-radius: var(--btn-rad, 8px); text-align: left; font-size: 14px; line-height: 15px; }
.em .e-ft .legal { width: 437px; max-width: 100%; font-size: 14px; line-height: 1.35; }
.em .e-ft .legal p { margin: 0 0 16px; }
.em .e-ft .legal p:last-child { margin: 0; }
.em .e-ft a { color: var(--acc); text-decoration: none; }
.em .e-ft.vip { gap: 6px; padding: 24px 20px 30px; }
.em .e-ft.vip .sig { margin: 0; font-size: 20px; line-height: 1.6; max-width: 400px; }
.em .e-ft.vip .mgr { font-size: 24px; font-weight: 700; line-height: 1.6; color: var(--txt); text-decoration: underline; }
.em .e-ft.vip .safe { display: block; width: 258px; height: auto; margin-top: 14px; }

/* картинка с текстом в обводке: отступ от рамки */
.em .em-blk.has-bd .e-ct.mirror { padding: 14px; border-radius: var(--rad); }
/* контент: бонусы карточками (две рядом) */
.em .e-ct.c10 { display: flex; flex-wrap: wrap; justify-content: center; gap: 24px; }
.em .e-ct.c10 .bc { width: 254px; box-sizing: border-box; padding: 22px 14px; border-radius: var(--rad); display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; }
.em .e-ct.c10 .t { font-size: 20px; text-transform: uppercase; }
.em .e-ct.c10 .big { font-size: 64px; line-height: 1; }
.em .e-ct.c10 .s { font-size: 20px; }
.em .e-ct.c10 p { margin: 6px 0 0; font-size: 15px; line-height: 1.3; }
/* контент: карточка бонуса без картинки */
.em .e-ct.c8.noimg { padding-top: 0; }
.em .e-ct.c8.noimg .card { padding: 20px 12px; }
.em .e-ct.cols { flex-wrap: wrap; row-gap: 22px; }

/* факты игр ([text] Facts): строки разных типов, вариант — оформление */
.em .e-fx { color: var(--txt); font-family: var(--font); text-align: center; }
.em .e-fx .tt { font-size: 24px; font-weight: 700; line-height: 1.25; text-transform: uppercase; margin-bottom: 18px; }
.em .e-fx .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.em .e-fx .row.r-text, .em .e-fx .row.r-fact { display: block; }
.em .e-fx .row.r-h2h { flex-direction: column; gap: 10px; }
.em .e-fx p { margin: 0; font-size: 17px; line-height: 1.4; }
.em .e-fx .n { min-width: 90px; display: flex; flex-direction: column; align-items: center; }
.em .e-fx .n b { font-size: 32px; line-height: 1.1; }
.em .e-fx .n small { font-size: 20px; font-weight: 700; }
.em .e-fx .lb { flex: 1; font-size: 18px; line-height: 1.3; }
.em .e-fx .lb small { display: block; font-size: 16px; }
.em .e-fx .fm { display: flex; gap: 10px; min-width: 110px; justify-content: center; }
.em .e-fx .fm > span { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.em .e-fx .fm b { font-size: 30px; line-height: 1; }
.em .e-fx .ic { width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-sizing: border-box; font: 700 12px/1 Arial, sans-serif; font-style: normal; color: #fff; }
.em .e-fx .ic.w { background: #1aa260; }
.em .e-fx .ic.l { background: #e5262d; }
.em .e-fx .ic.d { border: 3px solid #9a9a9a; }
.em .e-fx .h2t { font-size: 18px; }
.em .e-fx .h2 { display: flex; width: 100%; }
.em .e-fx .h2 span { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; }
.em .e-fx .h2 b { font-size: 30px; line-height: 1.1; }
.em .e-fx .h2 small { font-size: 16px; line-height: 1.2; max-width: 150px; }
.em .e-fx.f0 { padding: 0 30px; }
.em .e-fx.f0 .row { padding: 12px 0; }
.em .e-fx.f1 .row { padding: 4px 30px; }
.em .e-fx .e-sp { height: 28px; margin: 6px 0; }
.em .e-fx .e-sp > i { max-width: 100%; }
.em .e-fx.f1 .e-sp { margin: 12px 0; }
.em .e-fx.f3 .e-sp { margin: 10px 0; }
.em .e-fx.f2 .row { padding: 22px 16px; border-radius: var(--rad) var(--rad) 0 0; background: linear-gradient(180deg, color-mix(in srgb, var(--acc) 10%, transparent), transparent 70%); }
.em .e-fx.f2 .row + .row { margin-top: 8px; }
.em .e-fx.f2 .n b, .em .e-fx.f5 .n b { font-size: 18px; }
.em .e-fx.f2 .lb, .em .e-fx.f5 .lb { font-size: 15px; }
.em .e-fx.f3 .frame { padding: 20px 24px; border-radius: var(--rad); }
.em .e-fx.f3 p, .em .e-fx.f7 p { font-size: 15px; }
.em .e-fx.f3 p b, .em .e-fx.f7 p b { color: var(--acc); }
.em .e-fx.f4 .row { padding: 16px 22px; border-radius: var(--rad); }
.em .e-fx.f4 .row + .row { margin-top: 14px; }
.em .e-fx.f4 p { font-size: 15px; }
.em .e-fx.f5 .row { padding: 12px 16px; border-radius: var(--rad); }
.em .e-fx.f5 .row + .row { margin-top: 12px; }
.em .e-fx.f5 p { font-size: 15px; }
.em .e-fx.f6 .frame { border-radius: var(--rad); overflow: hidden; text-align: left; }
.em .e-fx.f6 .tt { margin: 0; padding: 16px 16px 12px; text-align: center; }
.em .e-fx.f6 .row { padding: 14px 16px; border-top: 2px solid var(--bd-c, var(--acc)); }
.em .e-fx.f6 .row.r-h2h { text-align: center; }
.em .e-fx.f6 p { font-size: 15px; }
.em .e-fx.f7 .row { padding: 14px 18px; border-radius: var(--rad); text-align: left; }
.em .e-fx.f7 .row + .row { margin-top: 14px; }

/* экспресс ([text] Multibet): рамка с переходом акцент → синий */
.em .e-mb { padding: 24px 26px; border-radius: var(--rad); background: var(--card); color: var(--txt); font: 20px/1.3 var(--font); text-align: left; }
.em .em-blk.has-bd .e-mb.e-frame { border-color: transparent; background: linear-gradient(var(--card), var(--card)) padding-box, linear-gradient(180deg, var(--bd-c), color-mix(in srgb, var(--bd-c) 15%, #0b2f86)) border-box; }
.em .e-mb .sp + .sp { margin-top: 26px; }
.em .e-mb .sp b { display: block; color: var(--acc); font-size: 24px; margin-bottom: 2px; }
.em .e-mb .sp span { display: block; }
.em .e-mb.m1 { display: flex; gap: 12px; padding: 20px; font-size: 18px; line-height: 1.6; }
.em .e-mb.m1 .pic { width: 204px; height: 204px; object-fit: cover; border-radius: 8px; flex: none; display: block; }
.em .e-mb.m1 .ls { flex: 1; min-width: 0; }
.em .e-mb.m1 .sp b { margin-bottom: 8px; }

/* иннер ([block] Inner): картинка с датой и команды */
.em .e-in { color: var(--txt); font-family: var(--font); }
.em .e-in .ban-w { position: relative; }
.em .e-in .ban { display: block; width: 100%; height: auto; }
.em .e-in .ban.e-ph { height: 170px; display: flex; align-items: center; justify-content: center; }
.em .e-in .ban.e-ph small { font-size: 13px; opacity: .6; }
.em .e-in .crest { width: 90px; height: 90px; object-fit: contain; flex: none; display: block; }
.em .e-in .nm { flex: 1; text-align: center; font-weight: 700; font-size: 30px; line-height: 1.15; text-transform: uppercase; text-shadow: 0 0 12px color-mix(in srgb, var(--acc) 55%, transparent); }
.em .e-in .vs { color: var(--acc); }
.em .e-in .tm { display: flex; align-items: center; gap: 12px; padding: 14px 10px 0; }
.em .e-in.i0 .nm { font-size: 24px; }
.em .e-in.i1 .nm { font-size: 34px; }
.em .e-in.i2 .in-ov { position: absolute; left: 36px; right: 36px; bottom: -36px; display: flex; justify-content: space-between; }
.em .e-in.i2 .crest { width: 110px; height: 110px; }
.em .e-in.i2 .nms { display: flex; justify-content: space-between; padding: 44px 6px 0; }
.em .e-in.i2 .nms span { width: 180px; text-align: center; font-weight: 700; font-size: 20px; text-transform: uppercase; }
.em .e-in.i3 { overflow: hidden; }
.em .e-in.i3 .in-ov { position: absolute; left: 0; right: 0; bottom: 0; display: flex; align-items: center; gap: 8px; padding: 30px 16px 10px; background: linear-gradient(180deg, transparent, rgba(0, 0, 0, .55)); }
.em .e-in.i3 .crest { width: 100px; height: 100px; }
.em .e-in.i3 .nm { font-size: 22px; }
`;
