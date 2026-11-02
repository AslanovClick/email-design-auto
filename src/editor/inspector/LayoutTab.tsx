// Вкладка «Макет»: общий стиль письма — его наследуют все блоки.

import clsx from 'clsx';
import { Pipette, Plus, Sparkles } from 'lucide-react';
import { PATTERN_CSS, paletteFromImage } from '@/email/theme';
import { DEFAULT_FONT, FONTS, PATTERN_NAMES, PATTERNS, THEME_KEYS, THEME_PRESETS } from '@/model/catalog';
import type { BgFit, BgMode, EmailDoc } from '@/model/types';
import { useEditor } from '@/store/editor';
import { notify, useUi } from '@/store/ui';
import { ColorRow } from '@/ui/ColorField';
import { Field, Section, Segmented, Slider } from '@/ui/controls';
import { ImageDrop } from '@/ui/ImageInputs';
import { RadiusControl } from '@/ui/RadiusControl';
import { Select } from '@/ui/Select';
import { Tip } from '@/ui/Tip';
import { pickImage } from '@/ui/files';
import { pickScreenColor } from '@/ui/eyedropper';


const COLOR_HINTS: Record<string, string> = {
  bg: 'подложка письма',
  card: 'карточки, плашки, кэфы',
  accent: 'кнопки, выделения',
  text: 'заголовки и текст',
};

export function LayoutTab({ doc }: { doc: EmailDoc }) {
  const { setTheme, setBg } = useEditor.getState();
  const { activeColor, set } = useUi();
  const t = doc.theme;
  const g = doc.bg;
  const hero = doc.blocks.find((b) => b.type === 'hero');
  const presetName = t.preset === 'auto' ? 'по hero' : t.preset >= 0 ? THEME_PRESETS[t.preset].name : 'свои';
  const activeLabel = THEME_KEYS.find(([k]) => k === activeColor)?.[1] ?? '';

  const autoPalette = async () => {
    const url = hero?.data.imageOn ? String(hero.data.image || '') : '';
    if (!url) { notify('Сначала загрузите картинку в hero — палитра возьмётся из неё'); return; }
    const pal = await paletteFromImage(url);
    if (pal) { setTheme({ ...pal, preset: 'auto' }); notify('Палитра собрана по картинке hero'); }
  };
  const eyedrop = async () => {
    const c = await pickScreenColor();
    if (c) setTheme({ [activeColor]: c, preset: -1 });
  };

  return (
    <>
      <Section id="colors" title="Цвета" meta={presetName}>
        <div className="presets">
          {THEME_PRESETS.map((p, i) => (
            <Tip key={p.name} label={p.name}>
              <button type="button" aria-label={p.name} className={clsx(t.preset === i && 'on')} onClick={() => {
                const { name: _n, ...pal } = p;
                setTheme({ ...pal, preset: i });
              }}>
                <i style={{ background: p.bg }} /><i style={{ background: p.accent }} />
              </button>
            </Tip>
          ))}
        </div>
        {THEME_KEYS.map(([k, label]) => (
          <ColorRow key={k} label={<>{label}<small>{COLOR_HINTS[k]}</small></>} value={t[k]}
            active={activeColor === k} onActivate={() => set({ activeColor: k })}
            onChange={(v) => setTheme({ [k]: v, preset: -1 })} />
        ))}
        <div className="pal-tools" style={{ marginTop: 10 }}>
          <Tip label="Собрать палитру из картинки hero">
            <button type="button" className={clsx('btn sm', t.preset === 'auto' && 'on')} onClick={autoPalette}><Sparkles size={14} />По hero</button>
          </Tip>
          <Tip label={`Взять с экрана цвет для «${activeLabel}»`}>
            <button type="button" className="btn sm" onClick={eyedrop}><Pipette size={14} />Пипетка</button>
          </Tip>
        </div>
        <div className="hint">Цвета применяются ко всем блокам. В отдельном блоке их можно переопределить в «Стиле блока».</div>
      </Section>

      <Section id="font" title="Шрифт и скругления" meta={t.font}>
        <Field label="Шрифт письма">
          <Select label="Шрифт письма" value={t.font} onChange={(font) => setTheme({ font: font as typeof t.font })}
            options={FONTS.map((f) => ({ value: f, label: f, hint: f === DEFAULT_FONT ? 'по умолчанию' : f === 'Roboto' ? 'веб-шрифт' : undefined }))} />
        </Field>
        <RadiusControl label="Скругление плашек и картинок" value={t.radius} onChange={(radius) => setTheme({ radius })} />
        <div className="hint">На кнопки не распространяется — у каждой кнопки своё скругление.</div>
      </Section>

      <Section id="bg" title="Фон письма" meta={{ color: 'цвет', pattern: 'паттерн', image: 'картинка' }[g.mode]}>
        <Segmented<BgMode> value={g.mode} onChange={(mode) => setBg({ mode })} label="Тип фона"
          options={[['color', 'Цвет'], ['pattern', 'Паттерн'], ['image', 'Картинка']]} />
        {g.mode === 'pattern' && (
          <>
            <div className="pat-grid">
              {PATTERNS.map((p) => (
                <button key={p} type="button" aria-label={`Паттерн «${PATTERN_NAMES[p]}»`} title={PATTERN_NAMES[p]} className={clsx(!g.tile && g.pattern === p && 'on')}
                  style={{ background: `${PATTERN_CSS[p](16, 'rgba(255,255,255,.45)')},#202024` }}
                  onClick={() => setBg({ pattern: p, tile: '', tileName: '' })} />
              ))}
              <Tip label="Свой тайл из картинки">
                <button type="button" className={clsx(g.tile && 'on')} aria-label="Загрузить тайл"
                  style={g.tile ? { backgroundImage: `url('${g.tile}')` } : undefined}
                  onClick={async () => { const r = await pickImage(); if (r) setBg({ tile: r.url, tileName: r.name }); }}>
                  {!g.tile && <Plus size={16} />}
                </button>
              </Tip>
            </div>
            {g.tile && (
              <div className="hint">Тайл «{g.tileName}» повторяется по всему письму. <button type="button" className="link-btn" onClick={() => setBg({ tile: '', tileName: '' })}>Убрать</button></div>
            )}
            <Slider label="Масштаб" value={g.scale} min={8} max={80} onChange={(scale) => setBg({ scale })} />
            <Slider label="Видимость" value={g.opacity} min={0} max={100} unit="%" onChange={(opacity) => setBg({ opacity })} />
          </>
        )}
        {g.mode === 'image' && (
          <div style={{ marginTop: 12 }}>
            <ImageDrop value={g.image} name={g.imageName} title="Загрузить картинку-паттерн"
              hint="Целиком, 600 px по ширине — как слой [background] в Figma"
              onImage={(image, imageName) => setBg({ image, imageName })} onClear={() => setBg({ image: '', imageName: '' })} />
            <div style={{ margin: '12px 0' }}>
              <Segmented<BgFit> value={g.fit} onChange={(fit) => setBg({ fit })} label="Как размещать"
                options={[['repeat-y', 'Повторять'], ['top', 'Сверху'], ['cover', 'Растянуть']]} />
            </div>
            <Slider label="Видимость" value={g.opacity} min={0} max={100} unit="%" onChange={(opacity) => setBg({ opacity })} />
          </div>
        )}
        <div className="hint" style={{ marginTop: 12 }}>Под паттерном и картинкой всегда лежит цвет «Фон» из палитры — его увидят там, где фоновые картинки не грузятся (Outlook).</div>
      </Section>
    </>
  );
}
