// Слои — всегда на виду, поверх холста слева от письма. Строку можно тянуть целиком.

import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';
import { ChevronDown, ChevronUp, Pin, Trash2 } from 'lucide-react';
import { catalogOf, isRequired, isSingle } from '@/model/catalog';
import { HERO_HEADERS } from '@/model/presets';
import type { Block } from '@/model/types';
import { useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
import { Tip } from '@/ui/Tip';
import { TypeIcon } from '../blockIcons';
import type { DragData } from '../dnd';

export function LayersPanel({ flagged }: { flagged: Set<string> }) {
  const blocks = useEditor((s) => s.doc!.blocks);
  const { layersOpen, set } = useUi();
  return (
    <aside className={clsx('layers-float', !layersOpen && 'min')} aria-label="Слои">
      <div className="lf-head">
        Слои <span className="count">{blocks.length}</span>
        <span className="spacer" />
        <Tip label={layersOpen ? 'Свернуть' : 'Развернуть'}>
          <button type="button" className="icon-btn sm" onClick={() => set({ layersOpen: !layersOpen })} aria-expanded={layersOpen}>
            {layersOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </Tip>
      </div>
      {layersOpen && (
        <div className="lf-body">
          <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            {blocks.map((b) => <Layer key={b.id} block={b} flagged={flagged.has(b.id)} />)}
          </SortableContext>
        </div>
      )}
    </aside>
  );
}

function layerSub(b: Block) {
  const cat = catalogOf(b.type);
  if (b.type !== 'hero') return cat.variants[b.v];
  const parts = [HERO_HEADERS[Number(b.data.hv)]];
  parts.push(b.data.teamsOn ? cat.variants[b.v] : 'без команд');
  if (!b.data.imageOn) parts.push('без картинки');
  return parts.join(' · ');
}

function Layer({ block, flagged }: { block: Block; flagged: boolean }) {
  const selected = useEditor((s) => s.selected === block.id);
  const { select, remove } = useEditor.getState();
  const setUi = useUi((s) => s.set);
  const single = isSingle(block.type);
  const required = isRequired(block.type);
  const cat = catalogOf(block.type);
  const styled = Object.keys(block.style).length > 0;
  const sort = useSortable({
    id: block.id,
    disabled: single,
    data: { kind: 'layer', id: block.id, label: cat.name } satisfies DragData,
  });

  return (
    <div ref={sort.setNodeRef} {...sort.attributes} {...sort.listeners}
      className={clsx('layer', selected && 'sel', single && 'fixed', sort.isDragging && 'dragging')}
      style={{ transform: CSS.Translate.toString(sort.transform), transition: sort.transition }}
      title={single ? 'Закреплён — всегда на своём месте' : 'Перетащите, чтобы поменять порядок'}
      onClick={() => { select(block.id); setUi({ rightTab: 'block' }); }}>
      <span style={{ position: 'relative' }}>
        <TypeIcon type={block.type} size={14} />
        {single && <span className="pin"><Pin size={8} strokeWidth={2.5} /></span>}
      </span>
      <span className="nm"><b>{cat.name}</b><span>{layerSub(block)}</span></span>
      <i className={clsx('state', flagged ? 'warn' : styled && 'styled')}
        title={flagged ? 'Есть замечания — см. «Проверки»' : styled ? 'У блока свой стиль' : undefined} />
      {required ? <span /> : (
        <Tip label="Удалить">
          <button type="button" className="icon-btn sm del" aria-label="Удалить блок"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); remove(block.id); }}>
            <Trash2 size={13} />
          </button>
        </Tip>
      )}
    </div>
  );
}
