import { useDraggable } from '@dnd-kit/core';
import clsx from 'clsx';
import { AlertTriangle, ArrowDown, ArrowDownUp, ArrowUp, Copy, GripVertical, Plus, Trash2 } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { clientName } from '@/email/blocks';
import { runChecks } from '@/email/checks';
import { CLIENTS, catalogOf, isRequired, isSingle } from '@/model/catalog';
import { HERO_HEADERS } from '@/model/presets';
import type { Block, EmailDoc } from '@/model/types';
import { canShift, useEditor } from '@/store/editor';
import { notify, useUi } from '@/store/ui';
import { Tip } from '@/ui/Tip';
import { dropBridge, type DragData } from '../dnd';
import { handleHotkey } from '../hotkeys';
import { NO_DEL, NO_DUP } from '../messages';
import { LayersPanel } from '../layers/LayersPanel';
import { PreviewFrame, type BlockRect } from './PreviewFrame';


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
  const { layersOpen, dragging, dropAt, drag } = useUi();
  const setUi = useUi((s) => s.set);

  const stageRef = useRef<HTMLElement>(null);
  const frameWrap = useRef<HTMLDivElement>(null);
  const [rects, setRects] = useState<BlockRect[]>([]);
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
      // над панелью слоёв — не над письмом
      const layers = stageRef.current?.parentElement?.querySelector('.layers-float')?.getBoundingClientRect();
      if (layers && x >= layers.left && x <= layers.right && y >= layers.top && y <= layers.bottom) return null;
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

  // перетаскивание у верхнего/нижнего края холста прокручивает письмо — так блок можно донести куда угодно,
  // а место вставки пересчитывается, даже если курсор стоит на месте
  useEffect(() => {
    if (!dragging) return;
    const stage = stageRef.current;
    if (!stage) return;
    const EDGE = 80;
    const MAX = 18;
    let raf = 0;
    const refresh = () => {
      const p = dropBridge.pointer;
      const at = p ? dropBridge.indexAt(p.x, p.y) : null;
      if (at !== useUi.getState().dropAt) useUi.getState().set({ dropAt: at });
    };
    const tick = () => {
      const p = dropBridge.pointer;
      const r = stage.getBoundingClientRect();
      if (p && p.x >= r.left && p.x <= r.right) {
        const up = p.y - r.top;
        const down = r.bottom - p.y;
        let dy = 0;
        if (up < EDGE) dy = -MAX * (1 - Math.max(0, up) / EDGE);
        else if (down < EDGE) dy = MAX * (1 - Math.max(0, down) / EDGE);
        if (dy) stage.scrollTop += dy;
      }
      // каждый кадр: письмо могли прокрутить колесом или автопрокруткой, а курсор стоит на месте
      refresh();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // колесо мыши во время перетаскивания тоже двигает письмо под курсором
    stage.addEventListener('scroll', refresh, { passive: true });
    return () => { cancelAnimationFrame(raf); stage.removeEventListener('scroll', refresh); };
  }, [dragging]);

  const checks = useMemo(() => runChecks(doc), [doc]);
  const byId = useMemo(() => new Map(doc.blocks.map((b) => [b.id, b])), [doc.blocks]);
  const rectOf = (id: string | null) => rects.find((r) => r.id === id);

  const onPick = (id: string | null) => {
    select(id);
    if (id) setUi({ rightTab: 'block', insertAt: null });
  };

  const dropY = dropAt == null ? null : dropAt < rects.length ? rects[dropAt].top : (rects.at(-1)?.top ?? 0) + (rects.at(-1)?.height ?? 0);
  // перенос блока на его же место ничего не меняет — линию не показываем
  const dragFrom = drag?.id ? doc.blocks.findIndex((b) => b.id === drag.id) : -1;
  const noop = dragFrom >= 0 && (dropAt === dragFrom || dropAt === dragFrom + 1);
  const dragRect = drag?.id ? rectOf(drag.id) : undefined;

  return (
    <div className={clsx('stage-wrap', layersOpen && 'lf-open')}>
      <LayersPanel flagged={checks.flagged} />
      <main className="stage" ref={stageRef}
        onClick={(e) => { if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('stage-inner')) select(null); }}>
        <div className="stage-inner" style={{ zoom }}>
          <InboxHeader doc={doc} />
          <div className="frame-wrap" ref={frameWrap} onMouseLeave={() => setHover(null)}>
            <PreviewFrame doc={doc} onLayout={setRects} onHover={setHover} onPick={onPick}
              onKey={(e) => handleHotkey(e, true)} />
            {/* --z: масштаб письма — индикатор перетаскивания не мельчает вместе с ним */}
            <div className={clsx('ov', dragging && 'catch')} style={{ '--z': zoom } as CSSProperties}>
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
              {dragging && dragRect && (
                <div className="ov-ghost" style={{ top: dragRect.top, height: dragRect.height }}>
                  {noop && <span>Блок останется на месте</span>}
                </div>
              )}
              {dragging && dropY != null && !noop && (
                <div className={clsx('ov-drop', dropAt === 0 && 'first', dropAt === rects.length && 'last')} style={{ top: dropY }}>
                  <span className="ov-drop-tag">
                    {drag?.id ? <ArrowDownUp size={12} strokeWidth={2.5} /> : <Plus size={12} strokeWidth={2.5} />}
                    {drag?.id ? 'Переместить сюда' : 'Вставить сюда'}
                  </span>
                </div>
              )}
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
