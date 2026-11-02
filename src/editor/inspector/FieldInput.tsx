import { Plus, X } from 'lucide-react';
import { LEAGUE_PRESETS, TEAM_PRESETS } from '@/model/presets';
import type { Block, FieldDef } from '@/model/types';
import { useEditor } from '@/store/editor';
import { Field } from '@/ui/controls';
import { ImageDrop } from '@/ui/ImageInputs';
import { PresetPicker } from '@/ui/PresetPicker';
import { ItemsEditor } from './ItemsEditor';

export function Suggestions() {
  return (
    <>
      <datalist id="dl-teams">{TEAM_PRESETS.map((t) => <option key={t.id} value={t.name} />)}</datalist>
      <datalist id="dl-leagues">{LEAGUE_PRESETS.map((t) => <option key={t.id} value={t.name} />)}</datalist>
    </>
  );
}

export function FieldInput({ block, f, label }: { block: Block; f: FieldDef; label?: string }) {
  const setData = useEditor((s) => s.setData);
  const val = String(block.data[f.key] ?? '');
  const put = (v: string) => setData(block.id, { [f.key]: v });

  switch (f.kind) {
    case 'items':
      return <ItemsEditor block={block} field={f.key} label={label ?? f.label} spec={f.items!} />;
    case 'paragraphs': {
      // абзацы хранятся одной строкой через пустую строку; по умолчанию один
      // для редактирования пустые абзацы не выкидываем, иначе поле исчезнет, пока его очищают
      const items = val ? val.split(/\n\s*\n/) : [''];
      const save = (next: string[]) => put(next.join('\n\n'));
      return (
        <div className="field">
          <span>{label ?? f.label}</span>
          {items.map((p, i) => (
            <div key={i} className="para">
              <textarea className="inp" rows={3} value={p} placeholder={`Абзац ${i + 1}`}
                onChange={(e) => save(items.map((x, j) => (j === i ? e.target.value : x)))} />
              {items.length > 1 && (
                <button type="button" className="icon-btn sm" aria-label="Убрать абзац" title="Убрать абзац"
                  onClick={() => save(items.filter((_, j) => j !== i))}><X size={14} /></button>
              )}
            </div>
          ))}
          <button type="button" className="btn sm ghost add-para" onClick={() => save([...items, f.addLabel ? '' : 'Новый абзац'])}><Plus size={14} />{f.addLabel ?? 'Добавить абзац'}</button>
        </div>
      );
    }
    case 'images':
      // до 4 картинок пунктов; пустой слот — пример из Figma
      return (
        <Field label={label ?? f.label}>
          <div className="slots">
            {[1, 2, 3, 4].map((n) => {
              const k = `pic${n}`;
              const url = String(block.data[k] ?? '');
              return (
                <div key={k} className="slot">
                  <ImageDrop value={url} compact onImage={(u) => setData(block.id, { [k]: u })} onClear={() => setData(block.id, { [k]: '' })} />
                  <span>{n}</span>
                </div>
              );
            })}
          </div>
        </Field>
      );
    case 'textarea':
    case 'list':
      return <Field label={label ?? f.label}><textarea className="inp" rows={f.kind === 'list' ? 4 : 3} value={val} onChange={(e) => put(e.target.value)} /></Field>;
    case 'team':
    case 'league': {
      // пресеты из Figma + своё название и картинка: всё в списке не предусмотреть
      const isLeague = f.kind === 'league';
      const logoKey = `${f.key}Logo`;
      const logo = String(block.data[logoKey] ?? '');
      return (
        <Field label={label ?? f.label}>
          <div className="team-in">
            <PresetPicker presets={isLeague ? LEAGUE_PRESETS : TEAM_PRESETS} image={logo} name={val} square={isLeague}
              title={isLeague ? 'Логотип лиги' : 'Герб команды'}
              onPick={(url, preset) => setData(block.id, {
                [logoKey]: url,
                ...(isLeague ? { [`${f.key}LogoLight`]: preset?.fileOnLight ?? '' } : {}),
                ...(preset ? { [f.key]: preset.name } : {}),
              })} />
            <input className="inp" list={isLeague ? 'dl-leagues' : 'dl-teams'} value={val}
              placeholder={isLeague ? 'Название лиги' : 'Название команды'} onChange={(e) => put(e.target.value)} />
          </div>
          {logo && (
            <button type="button" className="link-btn" style={{ justifySelf: 'start' }}
              onClick={() => setData(block.id, { [logoKey]: '', ...(isLeague ? { [`${f.key}LogoLight`]: '' } : {}) })}>
              {isLeague ? 'Убрать логотип — показывать название' : 'Убрать герб'}
            </button>
          )}
        </Field>
      );
    }
    case 'image':
      return (
        <Field label={label ?? f.label}>
          <ImageDrop value={val} name={String(block.data[`${f.key}Name`] ?? '')}
            onImage={(url, name) => setData(block.id, { [f.key]: url, [`${f.key}Name`]: name })}
            onClear={() => setData(block.id, { [f.key]: '', [`${f.key}Name`]: '' })} />
        </Field>
      );
    default:
      return (
        <Field label={label ?? f.label}>
          <input className={`inp ${f.kind === 'link' && !val ? 'empty' : ''}`} value={val}
            placeholder={f.kind === 'link' ? 'https://…' : f.placeholder} onChange={(e) => put(e.target.value)} />
        </Field>
      );
  }
}
