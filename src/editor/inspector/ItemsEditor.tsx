// Редактор повторяющихся пунктов: у каждого свои поля, пункты можно добавлять, убирать,
// переставлять и (если типов несколько) менять им тип.

import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { itemsValue, parseItems, typeOf, type Item, type ItemsSpec } from '@/model/items';
import type { Block } from '@/model/types';
import { useEditor } from '@/store/editor';
import { ImageDrop } from '@/ui/ImageInputs';
import { Select } from '@/ui/Select';

export function ItemsEditor({ block, field, label, spec }: { block: Block; field: string; label: string; spec: ItemsSpec }) {
  const setData = useEditor((s) => s.setData);
  const items = parseItems(block.data[field], spec);
  const save = (next: Item[]) => setData(block.id, { [field]: itemsValue(next) });
  const put = (i: number, patch: Item) => save(items.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const move = (i: number, d: number) => {
    const next = [...items];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    save(next);
  };
  const many = spec.types.length > 1;
  const typeOptions = spec.types.map((t) => ({ value: t.id, label: t.label }));
  // новый пункт — того же типа, что последний
  const lastType = items.length ? typeOf(spec, items[items.length - 1]) : spec.types[0];

  return (
    <div className="field items-ed">
      <span>{label}</span>
      {items.map((it, i) => {
        const type = typeOf(spec, it);
        const img = type.fields.find((f) => f.kind === 'image');
        return (
          <div key={i} className="item-card">
            <div className="item-head">
              <span className="item-n">{i + 1}</span>
              {many
                ? <Select label="Тип строки" className="item-type" value={type.id} options={typeOptions}
                    onChange={(t) => {
                      // при смене типа оставляем то, что имеет смысл в любом типе: подпись и текст
                      const nt = spec.types.find((x) => x.id === t)!;
                      save(items.map((x, j) => (j === i ? { ...nt.sample, ...(x.label ? { label: x.label } : {}), ...(x.text ? { text: x.text } : {}), t } : x)));
                    }} />
                : <b className="item-type">{type.label}</b>}
              <button type="button" className="icon-btn sm" aria-label="Выше" title="Выше" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={13} /></button>
              <button type="button" className="icon-btn sm" aria-label="Ниже" title="Ниже" disabled={i === items.length - 1} onClick={() => move(i, 1)}><ArrowDown size={13} /></button>
              <button type="button" className="icon-btn sm" aria-label="Убрать" title="Убрать" disabled={items.length <= 1}
                onClick={() => save(items.filter((_, j) => j !== i))}><X size={13} /></button>
            </div>
            <div className={img ? 'item-body with-img' : 'item-body'}>
              {img && (
                <ImageDrop value={it[img.key] ?? ''} compact
                  onImage={(url) => put(i, { [img.key]: url })} onClear={() => put(i, { [img.key]: '' })} />
              )}
              <div className="item-fields">
                {type.fields.filter((f) => f.kind !== 'image').map((f) => (
                  <label key={f.key} className="item-f">
                    <small>{f.label}</small>
                    {f.kind === 'textarea'
                      ? <textarea className="inp" rows={2} value={it[f.key] ?? ''} placeholder={f.placeholder} onChange={(e) => put(i, { [f.key]: e.target.value })} />
                      : (
                        <span className="inp-wrap">
                          <input className="inp" value={it[f.key] ?? ''} placeholder={f.placeholder} onChange={(e) => put(i, { [f.key]: e.target.value })} />
                          {f.clear && it[f.key] && (
                            <button type="button" className="inp-clear" aria-label="Очистить" title="Очистить" onClick={() => put(i, { [f.key]: '' })}><X size={12} /></button>
                          )}
                        </span>
                      )}
                  </label>
                ))}
              </div>
            </div>
          </div>
        );
      })}
      {(!spec.max || items.length < spec.max) && (
        <button type="button" className="btn sm ghost add-para"
          onClick={() => save([...items, { ...lastType.sample, ...(many ? { t: lastType.id } : {}) }])}>
          <Plus size={14} />{spec.add}
        </button>
      )}
      {spec.hint && <div className="hint" style={{ margin: 0 }}>{spec.hint}</div>}
    </div>
  );
}
