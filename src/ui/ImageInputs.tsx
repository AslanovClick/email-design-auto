// Загрузка картинок: большая зона (hero, фон) и круглая/квадратная кнопка (герб, лого лиги).

import clsx from 'clsx';
import { ImagePlus } from 'lucide-react';
import { useState, type DragEvent } from 'react';
import { pickImage, readAsDataUrl } from './files';

type OnImage = (url: string, name: string) => void;

function useFileDrop(onImage: OnImage) {
  const [over, setOver] = useState(false);
  return {
    over,
    handlers: {
      onDragOver: (e: DragEvent) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setOver(true); } },
      onDragLeave: () => setOver(false),
      onDrop: async (e: DragEvent) => {
        const f = e.dataTransfer.files?.[0];
        setOver(false);
        if (!f || !f.type.startsWith('image/')) return;
        e.preventDefault();
        onImage(await readAsDataUrl(f), f.name);
      },
    },
  };
}

export function ImageDrop({ value, name, onImage, onClear, title = 'Загрузить картинку', hint = 'PNG / JPG, или перетащите файл сюда', compact }: {
  value: string; name?: string; onImage: OnImage; onClear: () => void; title?: string; hint?: string;
  /** Маленький квадрат без подписей — для слотов картинок. */
  compact?: boolean;
}) {
  const { over, handlers } = useFileDrop(onImage);
  const pick = async () => { const r = await pickImage(); if (r) onImage(r.url, r.name); };
  if (compact) {
    return (
      <div role="button" tabIndex={0} className={clsx('drop mini', over && 'over')} onClick={pick} title={value ? 'Заменить' : 'Загрузить'}
        style={value ? { backgroundImage: `url('${value}')` } : undefined}
        onKeyDown={(e) => { if (e.key === 'Enter') pick(); }} {...handlers}>
        {!value && <ImagePlus size={16} />}
        {value && <button type="button" className="mini-x" aria-label="Убрать" onClick={(e) => { e.stopPropagation(); onClear(); }}>×</button>}
      </div>
    );
  }
  return (
    <div role="button" tabIndex={0} className={clsx('drop', value && 'has', over && 'over')} onClick={pick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } }} {...handlers}>
      {value ? (
        <>
          <div className="drop-img" style={{ backgroundImage: `url('${value}')` }} />
          <span>{name || 'картинка'} · заменить</span>
          <button type="button" className="link-btn" onClick={(e) => { e.stopPropagation(); onClear(); }}>убрать</button>
        </>
      ) : (
        <><ImagePlus size={20} /><b>{title}</b><span>{hint}</span></>
      )}
    </div>
  );
}
