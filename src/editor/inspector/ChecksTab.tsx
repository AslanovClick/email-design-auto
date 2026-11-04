import { useState } from 'react';
import { runChecks } from '@/email/checks';
import type { EmailDoc } from '@/model/types';
import { useEditor } from '@/store/editor';
import { Field, Section } from '@/ui/controls';
import { CheckList } from '../CheckList';

const HOTKEYS: { title: string; keys: [string, string[]][] }[] = [
  { title: 'История', keys: [['Отменить', ['Ctrl', 'Z']], ['Повторить', ['Ctrl', 'Shift', 'Z']]] },
  { title: 'Выбранный блок', keys: [['Дублировать', ['Ctrl', 'D']], ['Удалить', ['Del']], ['Выше', ['Alt', '↑']], ['Ниже', ['Alt', '↓']]] },
  { title: 'Выделение', keys: [['Снять выделение', ['Esc']]] },
];

export function ChecksTab({ doc }: { doc: EmailDoc }) {
  const { setMeta } = useEditor.getState();
  const c = runChecks(doc);
  return (
    <>
      <Section id="checks-meta" title="Тема и прехедер">
        <Field label="Тема"><input className="inp" value={doc.subject} placeholder="Тема письма" onChange={(e) => setMeta({ subject: e.target.value })} /></Field>
        <Field label="Прехедер"><input className="inp" value={doc.preheader} placeholder="Короткий текст после темы" onChange={(e) => setMeta({ preheader: e.target.value })} /></Field>
      </Section>
      {doc.brief && <BriefSection brief={doc.brief} />}
      <Section id="checks-list" title="Перед экспортом" meta={c.errors ? `ошибок: ${c.errors}` : c.warns ? `замечаний: ${c.warns}` : 'всё в порядке'}>
        <CheckList checks={c.list} interactive />
        <div className="hint" style={{ margin: 0 }}>Клик по замечанию — переход к блоку.</div>
      </Section>
      <Section id="checks-keys" title="Горячие клавиши">
        <div className="keys">
          {HOTKEYS.map((g) => (
            <div key={g.title} className="keys-group">
              <div className="keys-title">{g.title}</div>
              {g.keys.map(([label, keys]) => (
                <div key={label} className="keys-row">
                  <span>{label}</span>
                  <span className="keys-k">{keys.map((k) => <span key={k} className="kbd">{k}</span>)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

/** Письмо собрано по ТЗ: что дизайнеру сделать руками и сам текст ТЗ. */
function BriefSection({ brief }: { brief: NonNullable<EmailDoc['brief']> }) {
  const [src, setSrc] = useState(false);
  return (
    <Section id="checks-brief" title="Из ТЗ" meta={brief.notes.length ? `заметок: ${brief.notes.length}` : undefined}>
      {brief.notes.length > 0 && <ul className="brief-notes" style={{ marginBottom: 12 }}>{brief.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
      {brief.source && (
        <>
          <button type="button" className="link-btn" onClick={() => setSrc(!src)}>{src ? 'Скрыть ТЗ' : 'Показать исходное ТЗ'}</button>
          {src && <pre className="brief-src-pre">{brief.source}</pre>}
        </>
      )}
    </Section>
  );
}
