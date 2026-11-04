import { useDraggable } from '@dnd-kit/core';
import clsx from 'clsx';
import { AlertTriangle, ArrowDown, ArrowUp, Copy, GripVertical, Plus, Trash2 } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { clientName } from '@/email/blocks';
import { runChecks } from '@/email/checks';
import { CLIENTS, catalogOf, isRequired, isSingle } from '@/model/catalog';
import { dragPos, dragZone, posOf, posValue, zonesOf, zonesValue, ZONE_KINDS, type DragKind, type ZoneKind, type ZoneRect } from '@/model/heroZones';
import { HERO_HEADERS } from '@/model/presets';
import type { Block, EmailDoc } from '@/model/types';
import { canShift, useEditor } from '@/store/editor';
import { notify, useUi } from '@/store/ui';
import { Tip } from '@/ui/Tip';
import { dropBridge, type DragData } from '../dnd';
import { handleHotkey } from '../hotkeys';
import { NO_DEL, NO_DUP } from '../messages';
import { LayersPanel } from '../layers/LayersPanel';
import { PreviewFrame, type BlockRect, type DragRect } from './PreviewFrame';


/** Сколько места по горизонтали занято помимо письма: панель слоёв слева и тулбар справа. */
const reserve = (layersOpen: boolean) => (layersOpen ? 276 : 0) + 160;

export function blockLabel(b: Block) {
  const cat = catalogOf(b.type);
  if (b.type === 'hero') return `${cat.name} · ${HERO_HEADERS[Number(b.data.hv)]}`;
  return `${cat.name} · ${cat.variants[b.v]}`;
}

export function Canvas() {
  const doc = useEditor((s) => s.doc)!;
  const selected = useEditor((s) => s.selected);
  const select = useEditor((s) => s.select);
  const { layersOpen, dragging, dropAt } = useUi();
  const setUi = useUi((s) => s.set);

  const stageRef = useRef<HTMLElement>(null);
  const frameWrap = useRef<HTMLDivElement>(null);
  const [rects, setRects] = useState<BlockRect[]>([]);
  const [drags, setDrags] = useState<DragRect[]>([]);
  const [hover, setHover] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  // письмо всегда 600px — уменьшаем, если колонка уже
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const fit = () => setZoom(Math.min(1, stage.clientWidth / (600 + reserve(layersOpen))));
    const ro = new ResizeObserver(fit);
    ro.observe(stage);
    fit();
    return () => ro.disconnect();
  }, [layersOpen]);

  // мост для перетаскивания: экранные координаты → позиция вставки
  const geo = useRef({ rects, doc });
  geo.current = { rects, doc };
  useEffect(() => {
    dropBridge.indexAt = (x, y) => {
      const stage = stageRef.current?.getBoundingClientRect();
      const frame = frameWrap.current?.getBoundingClientRect();
      const wrap = frameWrap.current;
      if (!stage || !frame || !wrap || x < stage.left || x > stage.right || y < stage.top || y > stage.bottom) return null;
      const k = frame.height / (wrap.offsetHeight || 1);
      const rel = (y - frame.top) / k;
      const { rects: rs, doc: d } = geo.current;
      let i = rs.findIndex((r) => rel < r.top + r.height / 2);
      if (i < 0) i = rs.length;
      const min = d.blocks[0]?.type === 'hero' ? 1 : 0;
      const max = d.blocks[d.blocks.length - 1]?.type === 'footer' ? d.blocks.length - 1 : d.blocks.length;
      return Math.max(min, Math.min(max, i));
    };
    return () => { dropBridge.indexAt = () => null; };
  }, []);

  const checks = useMemo(() => runChecks(doc), [doc]);
  const byId = useMemo(() => new Map(doc.blocks.map((b) => [b.id, b])), [doc.blocks]);
  const rectOf = (id: string | null) => rects.find((r) => r.id === id);

  const onPick = (id: string | null) => {
    select(id);
    if (id) setUi({ rightTab: 'block', insertAt: null });
  };

  const dropY = dropAt == null ? null : dropAt < rects.length ? rects[dropAt].top : (rects.at(-1)?.top ?? 0) + (rects.at(-1)?.height ?? 0);

  return (
    <div className={clsx('stage-wrap', layersOpen && 'lf-open')}>
      <LayersPanel flagged={checks.flagged} />
      <main className="stage" ref={stageRef}
        onClick={(e) => { if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('stage-inner')) select(null); }}>
        <div className="stage-inner" style={{ zoom }}>
          <InboxHeader doc={doc} />
          <div className="frame-wrap" ref={frameWrap} onMouseLeave={() => setHover(null)}>
            <PreviewFrame doc={doc} onLayout={(r, _h, d) => { setRects(r); setDrags(d); }} onHover={setHover} onPick={onPick}
              onKey={(e) => handleHotkey(e, true)} />
            <div className={clsx('ov', dragging && 'catch')}>
              {[...checks.flagged].map((id) => {
                const r = rectOf(id);
                return r && <span key={id} className="ov-flag" style={{ top: r.top + 10 }} title="Есть замечания"><AlertTriangle size={12} /></span>;
              })}
              {hover && hover !== selected && !dragging && rectOf(hover) && (
                <div className="ov-box" style={{ top: rectOf(hover)!.top, height: rectOf(hover)!.height }} />
              )}
              {!dragging && hover && byId.get(hover) && <AddButton block={byId.get(hover)!} rect={rectOf(hover)!} doc={doc} />}
              {selected && byId.get(selected) && rectOf(selected) && (
                <Selection block={byId.get(selected)!} rect={rectOf(selected)!} doc={doc} />
              )}
              {!dragging && selected && byId.get(selected) && rectOf(selected) && (
                <HeroZones block={byId.get(selected)!} rect={rectOf(selected)!} zoom={zoom} />
              )}
              {!dragging && selected && byId.get(selected) && rectOf(selected) && (
                <HeroDrag block={byId.get(selected)!} rect={rectOf(selected)!} zoom={zoom} drags={drags.filter((d) => d.id === selected)} />
              )}
              {dropY != null && dragging && <div className="ov-drop" style={{ top: dropY }} />}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function InboxHeader({ doc }: { doc: EmailDoc }) {
  const setMeta = useEditor((s) => s.setMeta);
  const client = CLIENTS.find((c) => c.id === doc.client) ?? CLIENTS[0];
  return (
    <div className="inbox">
      <span className="ava">{clientName(doc).slice(0, 2)}</span>
      <div className="from">{client.name}<span>news@{client.domain}</span></div>
      <input value={doc.subject} placeholder="Тема письма — клик, чтобы написать" aria-label="Тема письма"
        onChange={(e) => setMeta({ subject: e.target.value })} />
      <input className="pre" value={doc.preheader} placeholder="Прехедер — текст рядом с темой во входящих" aria-label="Прехедер"
        onChange={(e) => setMeta({ preheader: e.target.value })} />
    </div>
  );
}

/** «+» на границе блока: hero нельзя сдвинуть, поэтому у него вставка — под ним. */
function AddButton({ block, rect, doc }: { block: Block; rect: BlockRect; doc: EmailDoc }) {
  const set = useUi((s) => s.set);
  const i = doc.blocks.findIndex((b) => b.id === block.id);
  const after = block.type === 'hero';
  if (block.type === 'footer' && i === 0) return null;
  const at = after ? i + 1 : i;
  return (
    <Tip label="Вставить блок сюда">
      <button type="button" className="ov-add" style={{ top: after ? rect.top + rect.height : rect.top }}
        onClick={() => { set({ insertAt: at, libTab: 'blocks' }); notify('Выберите блок в библиотеке слева — он встанет сюда'); }}>
        <Plus size={13} strokeWidth={2.5} />Блок
      </button>
    </Tip>
  );
}

const ZONE_LABEL: Record<ZoneKind, string> = { logo: 'Лого → ссылка', league: 'Лига → заглушка' };

/** Рамки зон клика у hero «без хедера»: тянуть — сдвиг, уголок — размер. Пока тянем — черновик, в письмо — по отпусканию. */
function HeroZones({ block, rect, zoom }: { block: Block; rect: BlockRect; zoom: number }) {
  const [live, setLive] = useState<{ k: ZoneKind; r: ZoneRect } | null>(null);
  const drag = useRef<{ k: ZoneKind; mode: 'move' | 'resize'; from: ZoneRect; sx: number; sy: number } | null>(null);
  if (block.type !== 'hero' || Number(block.data.hv) !== 7 || !block.data.imageOn) return null;
  const zones = zonesOf(block.data);
  // у холста CSS zoom: экранные пиксели → пиксели письма
  const at = (e: React.PointerEvent) => {
    const d = drag.current!;
    return dragZone(d.from, (e.clientX - d.sx) / zoom, (e.clientY - d.sy) / zoom, d.mode, { w: 600, h: rect.height });
  };
  const down = (k: ZoneKind, mode: 'move' | 'resize') => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { k, mode, from: zones[k]!, sx: e.clientX, sy: e.clientY };
  };
  const move = (e: React.PointerEvent) => { if (drag.current) setLive({ k: drag.current.k, r: at(e) }); };
  const up = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const r = at(e), k = drag.current.k;
    drag.current = null;
    setLive(null);
    useEditor.getState().setData(block.id, { zones: zonesValue({ ...zones, [k]: r }) });
  };
  return (
    <>
      {ZONE_KINDS.filter((k) => zones[k]).map((k) => {
        const [x, y, w, h] = live?.k === k ? live.r : zones[k]!;
        return (
          <div key={k} className="ov-zone" style={{ left: x, top: rect.top + y, width: w, height: h }}
            onPointerDown={down(k, 'move')} onPointerMove={move} onPointerUp={up}>
            <span>{ZONE_LABEL[k]}</span>
            <i onPointerDown={down(k, 'resize')} />
          </div>
        );
      })}
    </>
  );
}

const DRAG_LABEL: Record<DragKind, string> = { logo: 'Лого', date: 'Дата', league: 'Лига' };

/** Лого, дата и лига хедера выделенного hero — тянутся мышью; в письме лого и лига — ссылки на новом месте. */
function HeroDrag({ block, rect, zoom, drags }: { block: Block; rect: BlockRect; zoom: number; drags: DragRect[] }) {
  const [live, setLive] = useState<{ k: DragKind; p: [number, number] } | null>(null);
  const drag = useRef<{ k: DragKind; cur: [number, number]; el: DragRect; sx: number; sy: number } | null>(null);
  if (block.type !== 'hero' || !drags.length) return null;
  const pos = posOf(block.data);
  const at = (e: React.PointerEvent) => {
    const d = drag.current!;
    // рамка элемента — в координатах hero; у холста CSS zoom: экранные пиксели → пиксели письма
    return dragPos(d.cur, { ...d.el, y: d.el.y - rect.top }, (e.clientX - d.sx) / zoom, (e.clientY - d.sy) / zoom, { w: 600, h: rect.height });
  };
  const down = (el: DragRect) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { k: el.k, cur: pos[el.k] ?? [0, 0], el, sx: e.clientX, sy: e.clientY };
  };
  const move = (e: React.PointerEvent) => { if (drag.current) setLive({ k: drag.current.k, p: at(e) }); };
  const up = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const p = at(e), k = drag.current.k;
    drag.current = null;
    setLive(null);
    useEditor.getState().setData(block.id, { pos: posValue({ ...pos, [k]: p }) });
  };
  return (
    <>
      {drags.map((el) => {
        const cur = pos[el.k] ?? [0, 0];
        const [dx, dy] = live?.k === el.k ? [live.p[0] - cur[0], live.p[1] - cur[1]] : [0, 0];
        return (
          <div key={el.k} className="ov-zone drag" style={{ left: el.x + dx, top: el.y + dy, width: el.w, height: el.h }}
            onPointerDown={down(el)} onPointerMove={move} onPointerUp={up} title="Перетащите — лого и лига в письме станут ссылками на новом месте">
            <span>{DRAG_LABEL[el.k]}</span>
          </div>
        );
      })}
    </>
  );
}

function Selection({ block, rect, doc }: { block: Block; rect: BlockRect; doc: EmailDoc }) {
  const { shift, duplicate, remove } = useEditor.getState();
  const single = isSingle(block.type);
  const required = isRequired(block.type);
  const drag = useDraggable({
    id: `move:${block.id}`,
    disabled: single,
    data: { kind: 'move', id: block.id, label: catalogOf(block.type).name } satisfies DragData,
  });
  const styled = Object.keys(block.style).length > 0;
  return (
    <div className="ov-box sel" style={{ top: rect.top, height: rect.height }}>
      <span className="ov-tag">{blockLabel(block)}{styled ? ' · свой стиль' : ''}</span>
      <div className="ov-tools">
        <Tip label="Выше (Alt+↑)" side="right">
          <button type="button" disabled={!canShift(doc, block.id, -1)} onClick={() => shift(block.id, -1)}><ArrowUp size={15} /></button>
        </Tip>
        <Tip label="Ниже (Alt+↓)" side="right">
          <button type="button" disabled={!canShift(doc, block.id, 1)} onClick={() => shift(block.id, 1)}><ArrowDown size={15} /></button>
        </Tip>
        {!single && (
          <Tip label="Перетащить" side="right">
            <button type="button" className="handle" ref={drag.setNodeRef} {...drag.listeners} {...drag.attributes}><GripVertical size={15} /></button>
          </Tip>
        )}
        <hr />
        <Tip label={single ? NO_DUP : 'Дублировать (Ctrl+D)'} side="right" onClickShow={single}>
          <button type="button" className={clsx(single && 'is-disabled')} aria-disabled={single}
            onClick={() => { if (!single) duplicate(block.id); }}><Copy size={15} /></button>
        </Tip>
        <Tip label={required ? NO_DEL : 'Удалить (Del)'} side="right" onClickShow={required}>
          <button type="button" className={clsx('danger', required && 'is-disabled')} aria-disabled={required}
            onClick={() => { if (!required) remove(block.id); }}><Trash2 size={15} /></button>
        </Tip>
      </div>
    </div>
  );
}
