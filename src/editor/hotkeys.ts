import { isRequired } from '@/model/catalog';
import { useEditor } from '@/store/editor';
import { notify, useUi } from '@/store/ui';
import { NO_DEL, NO_DUP } from './messages';

function isTyping(el: Element | null) {
  return !!el && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || (el as HTMLElement).isContentEditable);
}

/** fromFrame — событие пришло из iframe превью (там нет полей ввода). */
export function handleHotkey(e: KeyboardEvent, fromFrame = false) {
  const typing = !fromFrame && isTyping(document.activeElement);
  const ed = useEditor.getState();
  const mod = e.ctrlKey || e.metaKey;
  const key = e.key.toLowerCase();

  // в полях ввода оставляем родные Ctrl+Z / Delete
  if (mod && (key === 'z' || key === 'я') && !typing) {
    e.preventDefault();
    if (e.shiftKey) useEditor.temporal.getState().redo(); else useEditor.temporal.getState().undo();
    return;
  }
  if (mod && (key === 'y' || key === 'н') && !typing) { e.preventDefault(); useEditor.temporal.getState().redo(); return; }
  if (typing || !ed.doc) return;

  const sel = ed.selected;
  if (mod && (key === 'd' || key === 'в') && sel) {
    e.preventDefault();
    if (!ed.duplicate(sel)) notify(NO_DUP);
    return;
  }
  if ((e.key === 'Delete' || e.key === 'Backspace') && sel) {
    e.preventDefault();
    const b = ed.doc.blocks.find((x) => x.id === sel);
    if (b && isRequired(b.type)) notify(NO_DEL);
    else ed.remove(sel);
    return;
  }
  if (e.key === 'Escape') { ed.select(null); useUi.getState().set({ insertAt: null }); return; }
  if (e.altKey && e.key === 'ArrowUp' && sel) { e.preventDefault(); ed.shift(sel, -1); }
  if (e.altKey && e.key === 'ArrowDown' && sel) { e.preventDefault(); ed.shift(sel, 1); }
}
