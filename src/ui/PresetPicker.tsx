// Выбор картинки из пресетов Figma (лиги, гербы) с поиском + загрузка своей.

import * as Popover from '@radix-ui/react-popover';
import clsx from 'clsx';
import { Pencil, Plus, Search, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ImagePreset } from '@/model/presets';
import { pickImage } from './files';

interface Props {
  presets: ImagePreset[];
  image: string;
  name: string;
  square?: boolean;
  title: string;
  /** Выбран пресет или загружена своя картинка (тогда preset = null). */
  onPick: (url: string, preset: ImagePreset | null) => void;
}

export function PresetPicker({ presets, image, name, square, title, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? presets.filter((p) => p.name.toLowerCase().includes(s)) : presets;
  }, [q, presets]);

  return (
    <Popover.Root open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ(''); }}>
      <Popover.Trigger asChild>
        <button type="button" className={clsx('crest-up', square && 'sq', image && 'has')} aria-label={title}
          title={image ? `${title}: заменить` : `${title}: выбрать`}>
          <span className="crest-pic">{image ? <img src={image} alt={name} /> : <Plus size={15} />}</span>
          {image && <span className="crest-edit" aria-hidden><Pencil size={9} strokeWidth={2.5} /></span>}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="preset-pop" side="left" align="start" sideOffset={10} collisionPadding={12}>
          <div className="preset-head">
            <b>{title}</b>
            <div className="search">
              <Search size={14} />
              <input className="inp" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Найти" />
            </div>
          </div>
          <div className="preset-grid">
            <button type="button" className="preset own" onClick={async () => {
              const r = await pickImage();
              if (r) { onPick(r.url, null); setOpen(false); }
            }}>
              <span className="pic"><Upload size={18} /></span><span className="nm">Своя картинка</span>
            </button>
            {list.map((p) => (
              <button key={p.id} type="button" className={clsx('preset', image === p.file && 'on')} title={p.name}
                onClick={() => { onPick(p.file, p); setOpen(false); }}>
                <span className="pic"><img src={p.file} alt="" loading="lazy" /></span><span className="nm">{p.name}</span>
              </button>
            ))}
          </div>
          {!list.length && <div className="hint" style={{ padding: '0 12px' }}>Ничего не нашлось — загрузите свою картинку.</div>}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
