// Настройки hero: компоновка из Figma (V1…V11), хедер и дата, картинка, команды.

import clsx from 'clsx';
import { ImagePlus } from 'lucide-react';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { clientName, headerRow, heroTeams, renderDate } from '@/email/blocks';
import { renderBlock } from '@/email/render';
import { FIELDS, catalogOf } from '@/model/catalog';
import { DEFAULT_ZONES, posOf, posValue, zonesOf, zonesValue, type ZoneKind } from '@/model/heroZones';
import { DATE_STYLES, HERO_HEADERS, HERO_PRESETS, SAMPLE_HERO, clientSite } from '@/model/presets';
import type { Block, EmailDoc } from '@/model/types';
import { useEditor } from '@/store/editor';
import { Section, Toggle } from '@/ui/controls';
import { Thumb } from '@/ui/Thumb';
import { FieldInput } from './FieldInput';

// в каких хедерах есть дата и лига
const WITH_DATE = [0, 1, 5, 6];
const WITH_LEAGUE = [0, 3, 5, 6];

function Strip({ children, active }: { children: ReactNode; active: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const strip = ref.current;
    const on = strip?.children[active] as HTMLElement | undefined;
    if (strip && on) strip.scrollLeft = on.offsetLeft - strip.clientWidth / 2 + on.clientWidth / 2;
  }, [active]);
  return <div className="var-strip" ref={ref}>{children}</div>;
}

/** «Без хедера»: лого и лига нарисованы на картинке — где они, говорят зоны клика (рамки на превью). */
function ZoneFields({ doc, block }: { doc: EmailDoc; block: Block }) {
  const { setData } = useEditor.getState();
  const z = zonesOf(block.data);
  const toggle = (k: ZoneKind, on: boolean) => {
    const next = { ...z };
    if (on) next[k] = z[k] ?? DEFAULT_ZONES[k];
    else delete next[k];
    setData(block.id, { zones: zonesValue(next) });
  };
  const logoLink = FIELDS.hero.find((f) => f.key === 'logoLink')!;
  return (
    <>
      <div className="subhead">Зоны клика на картинке</div>
      <Toggle label="Логотип клиента — ссылка" checked={!!z.logo} onChange={(on) => toggle('logo', on)} />
      {z.logo && <FieldInput block={block} f={{ ...logoLink, kind: 'text', placeholder: clientSite(doc.client) }} />}
      <Toggle label="Логотип лиги — ссылка-заглушка" checked={!!z.league} onChange={(on) => toggle('league', on)} />
      <div className="hint" style={{ margin: 0 }}>
        Логотипы нарисованы на картинке, поэтому в письме на их месте — прозрачные ссылки. Рамки зон видны на превью
        у выделенного hero: перетащите рамку на логотип, за уголок — размер.
      </div>
    </>
  );
}

export function HeroSections({ doc, block }: { doc: EmailDoc; block: Block }) {
  const { setData, setVariant } = useEditor.getState();
  const d = block.data;
  const F = Object.fromEntries(FIELDS.hero.map((f) => [f.key, f]));
  const hv = Number(d.hv);
  const ds = Number(d.dateStyle);
  const vsLabel = 'Между командами';
  const layouts = catalogOf('hero').variants;

  // компоновку определяют картинка и расположение команд; хедер и дата на неё не влияют
  const preset = HERO_PRESETS.findIndex((p) => p.imageOn === !!d.imageOn && p.teamsOn === !!d.teamsOn
    && (!p.teamsOn || p.v === block.v));
  // миниатюры компоновок — на примере картинки, если своей ещё нет
  const presetThumbs = useMemo(() => HERO_PRESETS.map((p) => renderBlock({
    ...block, v: p.v,
    data: { ...d, hv: p.hv, teamsOn: p.teamsOn, imageOn: p.imageOn, image: d.image || SAMPLE_HERO.url },
  }, doc)), [block, doc]);

  return (
    <>
      <Section id="hero-preset" title="Компоновка" meta={preset >= 0 ? HERO_PRESETS[preset].name : 'своя'}>
        <div className="preset-cards">
          {HERO_PRESETS.map((p, i) => (
            <button key={p.name} type="button" className={clsx('preset-card', i === preset && 'on')} title={p.hint} onClick={() => {
              setVariant(block.id, p.v);
              setData(block.id, { hv: p.hv, teamsOn: p.teamsOn, imageOn: p.imageOn });
            }}>
              <Thumb html={presetThumbs[i]} doc={doc} h={p.imageOn ? 720 : 360} />
              <span>{p.name}</span>
            </button>
          ))}
        </div>
        <div className="hint" style={{ margin: 0 }}>Компоновка — это картинка и место команд. Хедер подбирается к ней, дата остаётся вашей; всё можно поменять ниже.</div>
      </Section>

      <Section id="hero-head" title={<><span className="part-n">1</span>Хедер и дата</>} meta={HERO_HEADERS[hv]}>
        <Strip active={hv}>
          {HERO_HEADERS.map((h, i) => (
            <button key={h} type="button" className={clsx(i === hv && 'on')} onClick={() => setData(block.id, { hv: i })}>
              <Thumb html={`<div style="padding:14px 20px">${headerRow(i, d, doc) || '<div style="height:72px"></div>'}</div>`} doc={doc} h={i === 5 ? 250 : i === 6 ? 200 : 110} />
              <span>{h}</span>
            </button>
          ))}
        </Strip>
        {WITH_DATE.includes(hv) && (
          <>
            <div className="subhead">Стиль даты</div>
            <Strip active={ds}>
              {DATE_STYLES.map((name, i) => (
                <button key={name} type="button" className={clsx('date-opt', i === ds && 'on')} onClick={() => setData(block.id, { dateStyle: i })}>
                  <Thumb html={`<div style="height:110px;display:flex;align-items:center;justify-content:center">${renderDate({ ...d, dateStyle: i })}</div>`} doc={doc} h={110} />
                  <span>{name}</span>
                </button>
              ))}
            </Strip>
            <div className="field-row">
              <FieldInput block={block} f={F.date} />
              {ds === 1 && <FieldInput block={block} f={F.year} />}
              {ds === 3 && <FieldInput block={block} f={F.time} />}
            </div>
          </>
        )}
        {hv !== 7 && <FieldInput block={block} f={{ ...F.logoLink, kind: 'text', placeholder: clientSite(doc.client) }} />}
        {hv === 7 && !!d.imageOn && <ZoneFields doc={doc} block={block} />}
        {WITH_LEAGUE.includes(hv) && <FieldInput block={block} f={F.league} />}
        <div className="hint" style={{ margin: 0 }}>Логотип «{clientName(doc)}» подставляется сам: светлая версия на тёмном фоне, тёмная — на светлом.</div>
        {hv !== 7 && (
          <>
            <div className="hint" style={{ margin: '8px 0 0' }}>Лого, дату и лигу можно перетащить мышью на превью выделенного hero. В письме лого и лига — ссылки на своём месте.</div>
            {Object.keys(posOf(d)).length > 0 && (
              <button type="button" className="btn sm block" style={{ marginTop: 8 }} onClick={() => setData(block.id, { pos: posValue({}) })}>
                Вернуть лого, дату и лигу на места
              </button>
            )}
          </>
        )}
      </Section>

      <Section id="hero-img" title={<><span className="part-n">2</span>Картинка</>} meta={!d.imageOn ? 'скрыта' : d.image ? 'загружена' : 'не загружена'}>
        <Toggle label="Показывать картинку" checked={!!d.imageOn} onChange={(imageOn) => setData(block.id, { imageOn })} />
        {d.imageOn ? (
          <>
            <FieldInput block={block} f={F.image} />
            {!d.image && (
              <button type="button" className="btn sm block" style={{ marginTop: -6, marginBottom: 14 }}
                onClick={() => setData(block.id, { image: SAMPLE_HERO.url, imageName: 'Пример из Figma' })}>
                <ImagePlus size={14} />Подставить пример из Figma
              </button>
            )}
            <FieldInput block={block} f={F.alt} />
            <div className="hint" style={{ margin: 0 }}>Высота hero подстраивается под картинку — загружайте готовую, шириной 600 px.</div>
          </>
        ) : <div className="hint" style={{ margin: 0 }}>Без картинки hero — это хедер{d.teamsOn ? ' и команды' : ''} поверх фона письма.</div>}
      </Section>

      <Section id="hero-teams" title={<><span className="part-n">3</span>Команды</>} meta={d.teamsOn ? layouts[block.v] : 'выключены'}>
        <Toggle label="Показывать команды" checked={!!d.teamsOn} onChange={(teamsOn) => setData(block.id, { teamsOn })} />
        {d.teamsOn ? (
          <>
            <Strip active={block.v}>
              {layouts.map((v, i) => (
                <button key={v} type="button" className={clsx(i === block.v && 'on')} onClick={() => setVariant(block.id, i)}>
                  <Thumb html={`<div style="padding-top:${i === 2 ? 10 : 110}px">${heroTeams({ ...block, v: i })}</div>`} doc={doc} h={i === 2 ? 110 : 260} />
                  <span>{v}</span>
                </button>
              ))}
            </Strip>
            <FieldInput block={block} f={F.team1} />
            <FieldInput block={block} f={F.team2} />
            {block.v === 2 && <FieldInput block={block} f={F.vs} label={vsLabel} />}
            <div className="hint" style={{ margin: 0 }}>Гербы — из библиотеки Figma (клик по кружку) или свои. Название можно вписать любое.</div>
          </>
        ) : <div className="hint" style={{ margin: 0 }}>Для казино и промо-писем команды обычно не нужны.</div>}
      </Section>
    </>
  );
}
