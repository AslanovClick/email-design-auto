// Вкладка «Блок»: вариант из Figma, контент и свой стиль поверх макета.

import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Copy, MousePointerClick, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { clientName } from '@/email/blocks';
import { renderBlock } from '@/email/render';
import { effectiveBorder, hasBorder } from '@/email/theme';
import { BTN_RADIUS, BTN_RADIUS_BY_VARIANT, FIELDS, catalogOf, fieldsFor, isRequired, isSingle, variantBorder } from '@/model/catalog';
import { FACT_ROWS, FACTS_PRESETS, factsPresetOf, factsSep, hasFactsSep } from '@/model/facts';
import { itemsValue, parseItems } from '@/model/items';
import { clientPreset, clientSite } from '@/model/presets';
import type { Block, EmailDoc } from '@/model/types';
import { useEditor } from '@/store/editor';
import { ColorRow } from '@/ui/ColorField';
import { Field, Section, Segmented, Toggle } from '@/ui/controls';
import { Select } from '@/ui/Select';
import { BorderControl } from '@/ui/BorderControl';
import { RadiusControl } from '@/ui/RadiusControl';
import { Thumb } from '@/ui/Thumb';
import { Tip } from '@/ui/Tip';
import { TypeIcon } from '../blockIcons';
import { NO_DEL, NO_DUP } from '../messages';
import { FieldInput } from './FieldInput';
import { HeroSections } from './HeroSections';

export function BlockTab({ doc, block }: { doc: EmailDoc; block: Block | null }) {
  if (!block) {
    return (
      <div className="empty-insp">
        <span className="type-ico"><MousePointerClick size={20} /></span>
        <b>Блок не выбран</b>
        <span>Кликните по блоку в письме или по слою слева, чтобы настроить его</span>
      </div>
    );
  }
  const cat = catalogOf(block.type);
  const single = isSingle(block.type);
  const required = isRequired(block.type);
  const { duplicate, remove, resetStyle } = useEditor.getState();
  const styled = Object.keys(block.style).length > 0;

  return (
    <>
      <div className="insp-title">
        <TypeIcon type={block.type} size={16} />
        <span><b>{cat.name}</b><small>{cat.group}{single ? ' · закреплён' : ''}</small></span>
      </div>

      {block.type === 'hero' ? <HeroSections doc={doc} block={block} /> : block.type === 'footer' ? <FooterSections doc={doc} block={block} /> : (
        <>
          {block.type === 'facts' && <FactsPresets doc={doc} block={block} />}
          <VariantSection doc={doc} block={block} />
          <Section id="content" title="Контент">
            {block.type === 'inner' && (
              <Toggle label="Команды" checked={block.data.teamsOn !== false}
                onChange={(teamsOn) => useEditor.getState().setData(block.id, { teamsOn })} />
            )}
            {block.type === 'text' && block.v <= 2 && (
              <Toggle label="Заголовок" checked={block.data.titleOn !== false}
                onChange={(titleOn) => useEditor.getState().setData(block.id, { titleOn })} />
            )}
            {fieldsFor(block.type, block.v)
              .filter((f) => !(block.type === 'text' && f.key === 'title' && block.data.titleOn === false))
              .filter((f) => !(block.type === 'inner' && block.data.teamsOn === false && ['team1', 'team2', 'vs'].includes(f.key)))
              .map((f) => <FieldInput key={f.key} block={block} f={f} />)}
            {!fieldsFor(block.type, block.v).length && <div className="hint" style={{ margin: 0 }}>У этого блока нет текстового контента.</div>}
            {(block.type === 'cta' || innerButton(block) != null) && (
              <Toggle label="Капс в кнопке" checked={!!block.data.caps}
                onChange={(caps) => useEditor.getState().setData(block.id, { caps })} />
            )}
            {block.type === 'facts' && hasFactsSep(block.v) && (
              <Field label="Разделитель между строками">
                <Select label="Разделитель" value={String(factsSep(block.v, block.data.sep))}
                  onChange={(v) => useEditor.getState().setData(block.id, { sep: Number(v) })}
                  options={catalogOf('separator').variants.map((name, i) => ({ value: String(i), label: name }))} />
              </Field>
            )}
            {innerButton(block) != null && (
              <Field label="Стиль кнопки">
                <Select label="Стиль кнопки" value={String(block.data.btn ?? innerButton(block))}
                  onChange={(v) => useEditor.getState().setData(block.id, { btn: Number(v) })}
                  options={catalogOf('cta').variants.map((name, i) => ({ value: String(i), label: name }))} />
              </Field>
            )}
          </Section>
        </>
      )}

      <Section id="style" title="Стиль блока" meta={styled ? 'свой' : 'как в макете'}>
        <StyleSection doc={doc} block={block} />
        {styled && <button type="button" className="btn block sm" style={{ marginTop: 4 }} onClick={() => resetStyle(block.id)}>Сбросить к стилю макета</button>}
      </Section>

      <div className="insp-actions">
        <Tip label={single ? NO_DUP : 'Ctrl+D'} onClickShow={single}>
          <button type="button" className={clsx('btn sm', single && 'is-disabled')} aria-disabled={single}
            onClick={() => { if (!single) duplicate(block.id); }}><Copy size={14} />Дублировать</button>
        </Tip>
        <Tip label={required ? NO_DEL : 'Delete'} onClickShow={required}>
          <button type="button" className={clsx('btn sm', required && 'is-disabled')} aria-disabled={required}
            onClick={() => { if (!required) remove(block.id); }}><Trash2 size={14} />Удалить</button>
        </Tip>
      </div>
    </>
  );
}

/** Пресеты фактов: оформление и набор строк по примерам из Figma; дальше строки правятся как угодно. */
function FactsPresets({ doc, block }: { doc: EmailDoc; block: Block }) {
  const { setVariant, setData } = useEditor.getState();
  const active = factsPresetOf(block.v, parseItems(block.data.rows, FACT_ROWS));
  const thumbs = useMemo(() => FACTS_PRESETS.map((p) => renderBlock({
    ...block, v: p.v, data: { ...block.data, title: p.title, rows: itemsValue(p.rows) },
  }, doc)), [block, doc]);
  return (
    <Section id="facts-preset" title="Пресет" meta={active >= 0 ? FACTS_PRESETS[active].name : 'свой'}>
      <div className="preset-cards">
        {FACTS_PRESETS.map((p, i) => (
          <button key={p.name} type="button" className={clsx('preset-card', i === active && 'on')} title={p.hint} onClick={() => {
            setVariant(block.id, p.v);
            setData(block.id, { title: p.title, rows: itemsValue(p.rows) });
          }}>
            <Thumb html={thumbs[i]} doc={doc} h={520} />
            <span>{p.name}</span>
          </button>
        ))}
      </div>
      <div className="hint" style={{ margin: 0 }}>Пресет задаёт оформление и набор строк с примером текста. Отменить — Ctrl+Z.</div>
    </Section>
  );
}

/** Лента миниатюр вариантов, выбранный — по центру. */
function Strip({ children, active }: { children: ReactNode; active: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const strip = ref.current;
    const on = strip?.children[active] as HTMLElement | undefined;
    if (strip && on) strip.scrollLeft = on.offsetLeft - strip.clientWidth / 2 + on.clientWidth / 2;
  }, [active]);
  return <div className="var-strip" ref={ref}>{children}</div>;
}

function VariantSection({ doc, block }: { doc: EmailDoc; block: Block }) {
  const setVariant = useEditor((s) => s.setVariant);
  const cat = catalogOf(block.type);
  const n = cat.variants.length;
  return (
    <Section id="variant" title="Вариант" meta={`${block.v + 1} из ${n}`}>
      {n > 1 && (
        <div className="var-nav">
          <button type="button" className="icon-btn" aria-label="Предыдущий вариант" disabled={block.v === 0} onClick={() => setVariant(block.id, block.v - 1)}><ChevronLeft size={16} /></button>
          <span className="name">{cat.variants[block.v]}</span>
          <button type="button" className="icon-btn" aria-label="Следующий вариант" disabled={block.v === n - 1} onClick={() => setVariant(block.id, block.v + 1)}><ChevronRight size={16} /></button>
        </div>
      )}
      <Strip active={block.v}>
        {cat.variants.map((v, i) => (
          <button key={v} type="button" className={clsx(i === block.v && 'on')} onClick={() => setVariant(block.id, i)}>
            <Thumb html={renderBlock({ ...block, v: i }, doc)} doc={doc} />
            <span>{v}</span>
          </button>
        ))}
      </Strip>
    </Section>
  );
}

function FooterSections({ doc, block }: { doc: EmailDoc; block: Block }) {
  const { setVariant, setData } = useEditor.getState();
  const f = clientPreset(doc.client).footer;
  const F = Object.fromEntries(FIELDS.footer.map((x) => [x.key, x]));
  const vip = block.v === 1;
  const flag = (k: 'payments' | 'apps' | 'oddsNote') => (block.data[k] ?? f[k]) as boolean;
  return (
    <>
      <VariantSection doc={doc} block={block} />
      <Section id="content" title="Контент" meta={clientName(doc)}>
        <FieldInput block={block} f={{ ...F.logoLink, kind: 'text', placeholder: clientSite(doc.client) }} />
        {vip ? (
          <>
            <FieldInput block={block} f={{ ...F.manager, placeholder: f.vip.manager }} />
            <FieldInput block={block} f={{ ...F.managerEmail, placeholder: f.vip.email }} />
            <FieldInput block={block} f={{ ...F.hours, placeholder: f.vip.hours }} />
          </>
        ) : (
          <>
            <Toggle label="Платёжные системы" checked={flag('payments')} onChange={(v) => setData(block.id, { payments: v })} />
            <Toggle label="Кнопки приложений" checked={flag('apps')} onChange={(v) => setData(block.id, { apps: v })} />
            <Toggle label="Строка про коэффициенты" checked={flag('oddsNote')} onChange={(v) => setData(block.id, { oddsNote: v })} />
            <FieldInput block={block} f={{ ...F.supportEmail, placeholder: f.supportEmail }} />
            <FieldInput block={block} f={F.unsub} />
          </>
        )}
        <div className="hint" style={{ margin: 0 }}>
          Логотип, тексты и фирменный цвет ссылок — от клиента «{clientName(doc)}». Пустые поля берут значения клиента.
          {!vip && <> <button type="button" className="link-btn" onClick={() => setVariant(block.id, 1)}>VIP-версия</button></>}
        </div>
      </Section>
    </>
  );
}

/** У блока есть встроенная кнопка — вернуть её стиль по умолчанию, иначе null. */
function innerButton(b: Block): number | null {
  if (b.type === 'league') return b.v === 1 ? 3 : 13;
  if (b.type === 'bullets' && [6, 7, 9].includes(b.v)) return 13;
  return null;
}

function StyleSection({ doc, block }: { doc: EmailDoc; block: Block }) {
  const { setStyle, unsetStyle } = useEditor.getState();
  const st = block.style;
  const t = doc.theme;
  const isBtn = block.type === 'cta';
  const btnDefault = BTN_RADIUS_BY_VARIANT[block.v] ?? BTN_RADIUS;
  // обводка варианта (из Figma) показывается как действующая — её можно поменять или убрать
  const fromVariant = variantBorder(block.type, block.v);
  const width = effectiveBorder(block);
  const bordered = hasBorder(block);
  const ownBorder = st.borderW != null || st.border != null;
  const row = (k: 'card' | 'accent' | 'text', label: string, inherit: string) => (
    <ColorRow key={k} label={label} value={st[k] ?? inherit} inherited={!st[k]}
      onChange={(v) => setStyle(block.id, { [k]: v })} onReset={() => unsetStyle(block.id, [k])} />
  );
  // у кнопок, разделителей, hero и футера плашки нет
  const cardable = !['cta', 'separator', 'hero', 'footer'].includes(block.type);
  const cardMode = st.cardMode ?? 'variant';
  return (
    <>
      {cardable && (
        <Field label="Плашка">
          <Segmented<'variant' | 'on' | 'off'> value={cardMode} label="Плашка"
            options={[['variant', 'Как в варианте'], ['on', 'Есть'], ['off', 'Нет']]}
            onChange={(m) => (m === 'variant' ? unsetStyle(block.id, ['cardMode']) : setStyle(block.id, { cardMode: m }))} />
        </Field>
      )}
      {cardMode !== 'off' && row('card', 'Плашки', t.card)}
      {row('accent', isBtn ? 'Кнопка' : 'Акцент', t.accent)}
      {/* текст на кнопках по умолчанию всегда белый; заливка под него подстраивается */}
      {row('text', isBtn ? 'Текст кнопки' : 'Текст', isBtn ? '#ffffff' : t.text)}
      {/* у иннера картинка со своим дизайном: обводка и скругление с ней конфликтуют */}
      {block.type !== 'inner' && <>
      <div className="subhead">Обводка</div>
      <ColorRow label="Цвет обводки" value={st.border ?? st.accent ?? t.accent} inherited={!ownBorder}
        inheritedLabel={bordered ? (fromVariant ? 'как у варианта · акцент' : 'акцент') : 'нет'}
        onChange={(border) => setStyle(block.id, { border, ...(bordered ? {} : { borderW: 2 }) })}
        onReset={() => unsetStyle(block.id, ['border', 'borderW'])} resetLabel={fromVariant ? 'Вернуть как у варианта' : 'Убрать обводку'} />
      <BorderControl value={width} onChange={(borderW) => setStyle(block.id, { borderW })} />
      {fromVariant && st.borderW == null && <div className="hint" style={{ marginTop: -4 }}>Обводка задана вариантом — её можно поменять или выставить 0, чтобы убрать.</div>}
      <div className="subhead">Скругление</div>
      <RadiusControl label={isBtn ? 'Скругление кнопки' : 'Скругление'} value={st.radius ?? (isBtn ? btnDefault : t.radius)}
        onChange={(radius) => setStyle(block.id, { radius })} />
      <div className="hint" style={{ margin: 0 }}>
        {st.radius != null
          ? <>Своё скругление. <button type="button" className="link-btn" onClick={() => unsetStyle(block.id, ['radius'])}>{isBtn ? 'Вернуть как у варианта' : 'Вернуть как в макете'}</button></>
          : isBtn ? 'Кнопки не наследуют скругление макета — у каждого варианта своё.' : 'Как в макете.'}
      </div>
      </>}
    </>
  );
}
