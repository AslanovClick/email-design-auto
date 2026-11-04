import {
  DndContext, DragOverlay, PointerSensor, closestCenter, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent, type Modifier,
} from '@dnd-kit/core';
import clsx from 'clsx';
import { Move } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { loadDraft, saveDraft } from '@/store/drafts';
import { useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
import { TypeIcon } from './blockIcons';
import { Canvas } from './canvas/Canvas';
import { dropBridge, type DragData } from './dnd';
import { handleHotkey } from './hotkeys';
import { Inspector } from './inspector/Inspector';
import { LibraryPanel } from './library/LibraryPanel';
import { TopBar } from './TopBar';
import '@/styles/editor.css';

export function EditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const doc = useEditor((s) => s.doc);
  const [saved, setSaved] = useState(true);

  // загрузка черновика
  useEffect(() => {
    let alive = true;
    loadDraft(id!).then((d) => {
      if (!alive) return;
      if (!d) { navigate('/', { replace: true }); return; }
      useEditor.getState().load(d);
      useEditor.temporal.getState().clear();
      useUi.getState().set({ rightTab: 'layout', insertAt: null });
    });
    return () => { alive = false; };
  }, [id, navigate]);

  // автосохранение
  const timer = useRef(0);
  useEffect(() => {
    if (!doc || doc.id !== id) return;
    setSaved(false);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => saveDraft(doc).then(() => setSaved(true)), 500);
  }, [doc, id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => handleHotkey(e);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // перетаскивание: из библиотеки, внутри письма (за ручку в тулбаре) и в панели слоёв
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [active, setActive] = useState<DragData | null>(null);
  const setUi = useUi((s) => s.set);

  // Позицию курсора берём из самих событий мыши, а не из delta dnd-kit: delta включает прокрутку холста,
  // и после прокрутки (колесом или автопрокруткой у края) «курсор» уезжал — блок вставал не туда, а холст убегал вверх.
  const track = useRef<((e: PointerEvent) => void) | null>(null);
  const stopTracking = () => {
    if (track.current) window.removeEventListener('pointermove', track.current, true);
    track.current = null;
    dropBridge.pointer = null;
    dropBridge.origin = null;
  };
  useEffect(() => stopTracking, []);

  // страница редактора не прокручивается целиком (у панелей и холста свой скролл); если её всё же сдвинули
  // программно (фокус, перетаскивание), возвращаем на место — иначе интерфейс «уезжает» вверх
  useEffect(() => {
    const fix = () => { const el = document.scrollingElement; if (el && (el.scrollTop || el.scrollLeft)) el.scrollTo(0, 0); };
    window.addEventListener('scroll', fix);
    return () => window.removeEventListener('scroll', fix);
  }, []);

  const onStart = (e: DragStartEvent) => {
    const data = e.active.data.current as DragData;
    setActive(data);
    if (data.kind === 'layer') return;
    const a = e.activatorEvent as PointerEvent;
    // rect.initial к этому моменту ещё не измерен — берём сам перетаскиваемый элемент (у него есть атрибуты dnd-kit)
    const r0 = ((a.target as Element | null)?.closest?.('[aria-roledescription="draggable"]') ?? null)?.getBoundingClientRect() ?? null;
    setUi({ dragging: true, dropAt: null, drag: { id: data.kind === 'move' ? data.id : null, label: data.label } });
    stopTracking();
    dropBridge.pointer = { x: a.clientX, y: a.clientY };
    dropBridge.origin = r0 ? { x: r0.left, y: r0.top } : { x: a.clientX, y: a.clientY };
    track.current = (ev: PointerEvent) => {
      dropBridge.pointer = { x: ev.clientX, y: ev.clientY };
      const dropAt = dropBridge.indexAt(ev.clientX, ev.clientY);
      if (dropAt !== useUi.getState().dropAt) setUi({ dropAt });
    };
    window.addEventListener('pointermove', track.current, true);
  };
  const onEnd = (e: DragEndEvent) => {
    const data = e.active.data.current as DragData;
    const ed = useEditor.getState();
    const at = useUi.getState().dropAt;
    if (data.kind === 'lib' && at != null) {
      if (ed.insert(data.type, data.v, at)) setUi({ rightTab: 'block' });
    }
    if (data.kind === 'move' && at != null) ed.move(data.id, at);
    if (data.kind === 'layer' && e.over && e.over.id !== e.active.id && ed.doc) {
      const from = ed.doc.blocks.findIndex((b) => b.id === e.active.id);
      const to = ed.doc.blocks.findIndex((b) => b.id === e.over!.id);
      ed.move(data.id, to > from ? to + 1 : to);
    }
    onCancel();
  };
  const onCancel = () => {
    stopTracking();
    setActive(null);
    setUi({ dragging: false, dropAt: null, insertAt: null, drag: null });
  };

  if (!doc || doc.id !== id) return <div className="editor" />;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter}
      // холст докручивается сам (см. Canvas); страницу целиком не прокручиваем никогда
      autoScroll={{ canScroll: (el) => !(el as HTMLElement).classList?.contains('stage') && el !== document.scrollingElement && el !== document.body }}
      onDragStart={onStart} onDragEnd={onEnd} onDragCancel={onCancel}>
      <div className="editor">
        <TopBar saved={saved} />
        <div className="cols">
          <LibraryPanel />
          <Canvas />
          <Inspector />
        </div>
      </div>
      <DragOverlay dropAnimation={null} modifiers={[besideCursor]} className="drag-ov">
        {active && active.kind !== 'layer' && <DragChip data={active} />}
      </DragOverlay>
    </DndContext>
  );
}

/** Плашка — справа снизу от курсора: не закрывает линию вставки и не ловит колесо мыши (pointer-events: none). */
const besideCursor: Modifier = ({ transform }) => {
  const { pointer: p, origin: o } = dropBridge;
  if (!p || !o) return transform;
  return { ...transform, x: p.x - o.x + 16, y: p.y - o.y + 14 };
};

/** Плашка у курсора: что тащим и что будет, если отпустить. */
function DragChip({ data }: { data: DragData }) {
  const over = useUi((s) => s.dropAt != null);
  const noop = useUi((s) => {
    if (data.kind !== 'move' || s.dropAt == null) return false;
    const i = useEditor.getState().doc?.blocks.findIndex((b) => b.id === data.id) ?? -1;
    return s.dropAt === i || s.dropAt === i + 1;
  });
  return (
    <div className={clsx('drag-chip', over && !noop && 'ok')}>
      {data.kind === 'lib' ? <TypeIcon type={data.type} size={13} /> : <span className="type-ico"><Move size={13} /></span>}
      <span>{data.label}</span>
      <small>{!over ? 'наведите на письмо' : noop ? 'на прежнем месте' : data.kind === 'lib' ? 'отпустите — вставится' : 'отпустите — переместится'}</small>
    </div>
  );
}
