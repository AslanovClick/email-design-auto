// Поле названия команды или лиги: можно вписать любое название, а при наборе — выбрать из библиотеки Figma.
// Список с логотипами фильтруется по тексту; если ничего не подошло, поле работает как обычный инпут.

import * as Popover from '@radix-ui/react-popover';
import clsx from 'clsx';
import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { ImagePreset } from '@/model/presets';

interface Props {
  presets: ImagePreset[];
  value: string;
  /** Текущий логотип — по нему отмечаем выбранный пункт. */
  image: string;
  placeholder: string;
  square?: boolean;
  onText: (v: string) => void;
  onPick: (preset: ImagePreset) => void;
}

/** «Al-Wasl», «al wasl» и «AlWasl» — одно и то же. */
const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

export function PresetCombo({ presets, value, image, placeholder, square, onText, onPick }: Props) {
  const [open, setOpen] = useState(false);
  // null — список открыт кликом и показывает всё; строка — пользователь печатает и фильтрует
  const [query, setQuery] = useState<string | null>(null);
  const [hi, setHi] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const list = useMemo(() => {
    const q = query == null ? '' : norm(query);
    if (!q) return presets;
    // сначала те, что начинаются с запроса
    const hit = presets.filter((p) => norm(p.name).includes(q));
    return [...hit.filter((p) => norm(p.name).startsWith(q)), ...hit.filter((p) => !norm(p.name).startsWith(q))];
  }, [query, presets]);

  const current = presets.findIndex((p) => p.file === image || p.name === value);
  const show = open && list.length > 0;

  // при открытии подсвечиваем выбранный пункт, при наборе — первый подходящий
  useEffect(() => {
    if (!open) return;
    const i = query == null ? Math.max(0, list.findIndex((p) => p === presets[current])) : 0;
    setHi(i);
  }, [open, query]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // прокручиваем только сам список: scrollIntoView сдвинул бы и страницу
    const box = listRef.current;
    const el = box?.children[hi] as HTMLElement | undefined;
    if (!box || !el) return;
    if (el.offsetTop < box.scrollTop) box.scrollTop = el.offsetTop - 4;
    else if (el.offsetTop + el.offsetHeight > box.scrollTop + box.clientHeight) box.scrollTop = el.offsetTop + el.offsetHeight - box.clientHeight + 4;
  }, [hi, show]);

  const close = () => { setOpen(false); setQuery(null); };
  const choose = (p: ImagePreset) => { onPick(p); close(); };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      const d = e.key === 'ArrowDown' ? 1 : -1;
      setHi((h) => (list.length ? (h + d + list.length) % list.length : 0));
    } else if (e.key === 'Enter') {
      if (show && list[hi]) { e.preventDefault(); choose(list[hi]); }
    } else if (e.key === 'Escape') {
      if (open) { e.preventDefault(); e.stopPropagation(); close(); }
    } else if (e.key === 'Tab') {
      close();
    }
  };

  return (
    <Popover.Root open={show} onOpenChange={(o) => { if (!o) close(); }}>
      <Popover.Anchor asChild>
        <div className={clsx('combo', show && 'open')}>
          <input ref={input} className="inp" value={value} placeholder={placeholder} spellCheck={false}
            role="combobox" aria-expanded={show} aria-autocomplete="list"
            onChange={(e) => { onText(e.target.value); setQuery(e.target.value); setOpen(true); }}
            onMouseDown={() => setOpen(true)}
            onKeyDown={onKey} />
          <button type="button" className="combo-chev" tabIndex={-1} aria-label="Показать список"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { if (open) close(); else { setQuery(null); setOpen(true); input.current?.focus(); } }}>
            <ChevronDown size={14} />
          </button>
        </div>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content className="combo-pop" side="bottom" align="start" sideOffset={6} collisionPadding={12}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => { if (input.current?.parentElement?.contains(e.target as Node)) e.preventDefault(); }}>
          <div className="combo-list" ref={listRef} role="listbox">
            {list.map((p, i) => (
              <div key={p.id} role="option" aria-selected={i === hi}
                className={clsx('combo-item', i === hi && 'hi', presets[current] === p && 'cur')}
                onMouseDown={(e) => e.preventDefault()}
                onMouseMove={() => setHi(i)}
                onClick={() => choose(p)}>
                <span className={clsx('combo-logo', square && 'sq')}><img src={p.file} alt="" loading="lazy" /></span>
                <span className="combo-name">{p.name}</span>
                {presets[current] === p && <Check size={14} className="combo-check" />}
              </div>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
