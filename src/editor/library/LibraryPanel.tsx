// Левая колонка: шаблоны и библиотека блоков (варианты из Figma).

import { useDraggable } from '@dnd-kit/core';
import clsx from 'clsx';
import { ChevronRight, Plus, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { renderBlock } from '@/email/render';
import { CATALOG, GROUPS, TEMPLATES } from '@/model/catalog';
import { blocksFromTemplate, createBlock } from '@/model/factory';
import type { BlockType, CatalogItem, EmailDoc } from '@/model/types';
import { useEditor } from '@/store/editor';
import { notify, useUi } from '@/store/ui';
import { Segmented } from '@/ui/controls';
import { blocksCount } from '@/ui/format';
import { Thumb } from '@/ui/Thumb';
import { TypeIcon } from '../blockIcons';
import type { DragData } from '../dnd';

const opened = new Set<BlockType>(['odds']);

export function LibraryPanel() {
  const doc = useEditor((s) => s.doc)!;
  const { libTab, insertAt, set } = useUi();
  const [q, setQ] = useState('');
  const [, force] = useState(0);

  return (
    <aside className="panel" aria-label="Библиотека">
      <div className="panel-head">
        <Segmented value={libTab} onChange={(libTab) => set({ libTab })} label="Раздел библиотеки"
          options={[['blocks', 'Блоки'], ['templates', 'Шаблоны']]} />
        {libTab === 'blocks' && (
          <div className="search">
            <Search size={15} />
            <input className="inp" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Найти блок или вариант" aria-label="Поиск блока" />
            {q && <button type="button" className="icon-btn sm clear" aria-label="Очистить" onClick={() => setQ('')}><X size={14} /></button>}
          </div>
        )}
        {libTab === 'blocks' && insertAt != null && (
          <div className="insert-hint">
            <Plus size={14} />Новый блок встанет на позицию {insertAt + 1}<span className="spacer" />
            <button type="button" className="icon-btn sm" aria-label="Отменить вставку" onClick={() => set({ insertAt: null })}><X size={14} /></button>
          </div>
        )}
      </div>
      <div className="scroll">
        {libTab === 'templates' ? <Templates doc={doc} /> : <Blocks doc={doc} q={q} onToggle={() => force((n) => n + 1)} />}
      </div>
    </aside>
  );
}

function Templates({ doc }: { doc: EmailDoc }) {
  const replaceBlocks = useEditor((s) => s.replaceBlocks);
  const thumbs = useMemo(() => TEMPLATES.map((t) => ({
    t, html: blocksFromTemplate(t.id).map((b) => renderBlock(b, doc)).join(''),
  })), [doc.theme, doc.bg, doc.client]);

  return (
    <div className="tpl-list">
      {thumbs.map(({ t, html }) => (
        <button key={t.id} type="button" className="tpl-row" onClick={() => {
          if (doc.blocks.length > 2 && !window.confirm('Заменить блоки письма шаблоном? Отменить можно через Ctrl+Z.')) return;
          replaceBlocks(blocksFromTemplate(t.id));
          notify(`Шаблон «${t.name}» загружен`);
        }}>
          {t.id === 'blank' ? <span className="blank"><Plus size={18} /></span> : <Thumb html={html} doc={doc} withBg />}
          <span>
            <b>{t.name}</b>
            <span className="tpl-meta"><span className="tag">{t.tag}</span>{blocksCount(t.blocks.length)}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

function Blocks({ doc, q, onToggle }: { doc: EmailDoc; q: string; onToggle: () => void }) {
  const query = q.trim().toLowerCase();
  const match = (c: CatalogItem) => !query || c.name.toLowerCase().includes(query) || c.variants.some((v) => v.toLowerCase().includes(query));
  const groups = GROUPS.map((g) => ({ g, types: CATALOG.filter((c) => c.group === g && !c.hidden && match(c)) })).filter((x) => x.types.length);
  if (!groups.length) return <div className="lib-empty">Ничего не нашлось</div>;
  return (
    <>
      {groups.map(({ g, types }) => (
        <div className="lib-group" key={g}>
          <div className="lib-group-title">{g}</div>
          {types.map((c) => {
            const open = opened.has(c.type) || !!query;
            const existing = c.single ? doc.blocks.find((b) => b.type === c.type) : undefined;
            return (
              <div key={c.type} className={clsx('lib-type', open && 'open')}>
                <button type="button" aria-expanded={open} onClick={() => {
                  if (opened.has(c.type)) opened.delete(c.type); else opened.add(c.type);
                  onToggle();
                }}>
                  <TypeIcon type={c.type} />{c.name}
                  <span className={clsx('cnt', existing && 'in')}>{existing ? 'в письме' : c.variants.length}</span>
                  <ChevronRight size={14} className="chev" />
                </button>
                {open && (
                  <div className="lib-vars">
                    {c.variants.map((v, i) => (
                      <VariantCard key={v} item={c} v={i} label={v} doc={doc} existingId={existing?.id} current={existing?.v === i} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}

function VariantCard({ item, v, label, doc, existingId, current }: {
  item: CatalogItem; v: number; label: string; doc: EmailDoc; existingId?: string; current?: boolean;
}) {
  const html = useMemo(() => renderBlock(createBlock(item.type, v), doc), [item.type, v, doc.theme, doc.client]);
  const drag = useDraggable({
    id: `lib:${item.type}:${v}`,
    disabled: !!existingId,
    data: { kind: 'lib', type: item.type, v, label: `${item.name} · ${label}` } satisfies DragData,
  });

  const add = () => {
    const ed = useEditor.getState();
    const ui = useUi.getState();
    // hero и футер в письме одни — клик по варианту меняет вариант у существующего
    if (existingId) {
      ed.setVariant(existingId, v);
      ed.select(existingId);
      ui.set({ rightTab: 'block' });
      return;
    }
    const id = ui.insertAt != null ? ed.insert(item.type, v, ui.insertAt) : ed.insertSmart(item.type, v);
    ui.set({ insertAt: null, ...(id ? { rightTab: 'block' as const } : {}) });
  };

  return (
    <div ref={drag.setNodeRef} {...drag.listeners} {...drag.attributes} role="button" tabIndex={0}
      className={clsx('var-card', drag.isDragging && 'dragging', current && 'cur')}
      title={existingId ? 'Применить этот вариант' : 'Клик — добавить, или перетащите в письмо'}
      onClick={add} onKeyDown={(e) => { if (e.key === 'Enter') add(); }}>
      <Thumb html={html} doc={doc} />
      <span>{label}</span>
    </div>
  );
}
