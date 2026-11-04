import * as Popover from '@radix-ui/react-popover';
import clsx from 'clsx';
import { Pipette, RotateCcw } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { HexColorPicker } from 'react-colorful';
import { isHex } from '@/email/theme';
import { pickScreenColor } from './eyedropper';
import { Tip } from './Tip';

interface Props {
  label: ReactNode;
  value: string;
  onChange: (v: string) => void;
  /** Значение унаследовано от макета: показываем приглушённо, с подписью. */
  inherited?: boolean;
  inheritedLabel?: string;
  onReset?: () => void;
  resetLabel?: string;
  /** Строка выбрана как цель пипетки. */
  active?: boolean;
  onActivate?: () => void;
}

/** Строка цвета: образец (открывает палитру), название и hex для ручного ввода. */
export function ColorRow({ label, value, onChange, inherited, inheritedLabel = 'как в макете', onReset, resetLabel = 'Вернуть как в макете', active, onActivate }: Props) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);

  return (
    <div className={clsx('color-row', inherited && 'inherit', active && 'active')} onClick={onActivate}>
      <Popover.Root>
        <Popover.Trigger asChild>
          <button type="button" className={clsx('chip', inherited && inheritedLabel === 'нет' && 'none')}
            style={{ background: value }} aria-label={`Цвет: ${typeof label === 'string' ? label : ''}`} />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content className="picker-pop" sideOffset={8} align="start" side="left">
            <HexColorPicker color={value} onChange={onChange} />
            <button type="button" className="btn sm block" title="Взять цвет с экрана" onClick={async () => { const c = await pickScreenColor(); if (c) onChange(c); }}>
              <Pipette size={14} />Пипетка
            </button>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      <span className="name">{label}{inherited && <small>{inheritedLabel}</small>}</span>
      {onReset && !inherited && (
        <Tip label={resetLabel}>
          <button type="button" className="icon-btn sm x" onClick={(e) => { e.stopPropagation(); onReset(); }}><RotateCcw size={13} /></button>
        </Tip>
      )}
      <input className="hex" value={text} maxLength={7} spellCheck={false} aria-label="HEX"
        onChange={(e) => { setText(e.target.value); if (isHex(e.target.value)) onChange(e.target.value); }}
        onBlur={() => setText(value)} />
    </div>
  );
}
