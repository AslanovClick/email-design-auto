import clsx from 'clsx';
import { AlertTriangle, CircleCheck, CircleX, CloudCheck, Dices, LoaderCircle, Redo2, Undo2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from 'zustand';
import { runChecks } from '@/email/checks';
import { CLIENT_PRESETS, clientLogo } from '@/model/presets';
import { useEditor } from '@/store/editor';
import { notify, useUi } from '@/store/ui';
import { Select } from '@/ui/Select';
import { Tip } from '@/ui/Tip';
import { randomizeStyle } from './randomize';
import { ExportDialog } from './ExportDialog';

export function TopBar({ saved }: { saved: boolean }) {
  const doc = useEditor((s) => s.doc)!;
  const setMeta = useEditor((s) => s.setMeta);
  const canUndo = useStore(useEditor.temporal, (s) => s.pastStates.length > 0);
  const canRedo = useStore(useEditor.temporal, (s) => s.futureStates.length > 0);
  const { undo, redo } = useEditor.temporal.getState();
  const set = useUi((s) => s.set);
  const c = runChecks(doc);
  const level = c.errors ? 'error' : c.warns ? 'warn' : '';
  const StatusIcon = c.errors ? CircleX : c.warns ? AlertTriangle : CircleCheck;
  const status = c.errors ? `${c.errors} ${c.errors === 1 ? 'ошибка' : c.errors < 5 ? 'ошибки' : 'ошибок'}`
    : c.warns ? `${c.warns} ${c.warns === 1 ? 'замечание' : c.warns < 5 ? 'замечания' : 'замечаний'}` : 'Готово';

  return (
    <header className="top">
      <Tip label="Все письма" side="bottom">
        <Link to="/" className="brand" aria-label="Все письма"><span className="brand-mark">A</span></Link>
      </Tip>
      <span className="crumb">/</span>
      <input className="proj" value={doc.name} aria-label="Название письма" onChange={(e) => setMeta({ name: e.target.value })} />
      <Tip label={saved ? 'Черновик сохранён в браузере' : 'Сохраняю…'} side="bottom">
        <span className="saved">{saved ? <CloudCheck size={15} /> : <LoaderCircle size={15} className="spin" />}</span>
      </Tip>
      <div className="spacer" />
      <Tip label="Случайный стиль: цвета, скругления, обводки, кнопки и фон. Блоки и их варианты не меняются" side="bottom">
        <button type="button" className="btn ghost" onClick={() => { useEditor.getState().restyle(randomizeStyle(doc)); notify('Новый стиль — Ctrl+Z, чтобы вернуть'); }}>
          <Dices size={16} />Случайный стиль
        </button>
      </Tip>
      <Select label="Клиент" className="client-select" value={doc.client} onChange={(client) => setMeta({ client })}
        options={CLIENT_PRESETS.map((c) => ({
          value: c.id, label: c.name,
          icon: <span className="client-logo"><img src={clientLogo(c.id, false)} alt="" /></span>,
        }))} />
      <span className="divider" />
      <Tip label="Отменить · Ctrl+Z" side="bottom">
        <button type="button" className="icon-btn" disabled={!canUndo} onClick={() => undo()} aria-label="Отменить"><Undo2 size={16} /></button>
      </Tip>
      <Tip label="Повторить · Ctrl+Shift+Z" side="bottom">
        <button type="button" className="icon-btn" disabled={!canRedo} onClick={() => redo()} aria-label="Повторить"><Redo2 size={16} /></button>
      </Tip>
      <span className="divider" />
      <Tip label="Проверки перед экспортом" side="bottom">
        <button type="button" className={clsx('status', level)} onClick={() => set({ rightTab: 'checks' })}><StatusIcon size={15} />{status}</button>
      </Tip>
      <ExportDialog doc={doc} />
    </header>
  );
}
