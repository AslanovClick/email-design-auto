import {
  DndContext, DragOverlay, PointerSensor, closestCenter, useSensor, useSensors,
  type DragEndEvent, type DragMoveEvent, type DragStartEvent,
} from '@dnd-kit/core';
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

  const onStart = (e: DragStartEvent) => {
    const data = e.active.data.current as DragData;
    setActive(data);
    if (data.kind !== 'layer') setUi({ dragging: true, dropAt: null });
  };
  const onMove = (e: DragMoveEvent) => {
    const data = e.active.data.current as DragData;
    if (data.kind === 'layer') return;
    const start = e.activatorEvent as PointerEvent;
    setUi({ dropAt: dropBridge.indexAt(start.clientX + e.delta.x, start.clientY + e.delta.y) });
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
  const onCancel = () => { setActive(null); setUi({ dragging: false, dropAt: null, insertAt: null }); };

  if (!doc || doc.id !== id) return <div className="editor" />;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter}
      onDragStart={onStart} onDragMove={onMove} onDragEnd={onEnd} onDragCancel={onCancel}>
      <div className="editor">
        <TopBar saved={saved} />
        <div className="cols">
          <LibraryPanel />
          <Canvas />
          <Inspector />
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {active && active.kind !== 'layer' && (
          <div className="drag-chip">
            {active.kind === 'lib' && <TypeIcon type={active.type} size={13} />}{active.label}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
