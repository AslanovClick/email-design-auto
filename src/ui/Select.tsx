// Выпадающий список в стиле конструктора (вместо системного <select>).

import * as RSelect from '@radix-ui/react-select';
import clsx from 'clsx';
import { Check, ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

export interface SelectOption { value: string; label: string; icon?: ReactNode; hint?: string }

export function Select({ value, options, onChange, label, className, trigger }: {
  value: string; options: SelectOption[]; onChange: (v: string) => void; label: string;
  className?: string; trigger?: ReactNode;
}) {
  const cur = options.find((o) => o.value === value);
  return (
    <RSelect.Root value={value} onValueChange={onChange}>
      <RSelect.Trigger className={clsx('select', className)} aria-label={label}>
        {trigger ?? <>{cur?.icon}<span className="select-val">{cur?.label}</span></>}
        <RSelect.Icon className="select-chev"><ChevronDown size={14} /></RSelect.Icon>
      </RSelect.Trigger>
      <RSelect.Portal>
        <RSelect.Content className="select-pop" position="popper" sideOffset={6} align="start">
          <RSelect.Viewport className="select-list">
            {options.map((o) => (
              <RSelect.Item key={o.value} value={o.value} className="select-item">
                {o.icon}
                <RSelect.ItemText>{o.label}</RSelect.ItemText>
                {o.hint && <span className="select-hint">{o.hint}</span>}
                <RSelect.ItemIndicator className="select-check"><Check size={14} /></RSelect.ItemIndicator>
              </RSelect.Item>
            ))}
          </RSelect.Viewport>
        </RSelect.Content>
      </RSelect.Portal>
    </RSelect.Root>
  );
}
