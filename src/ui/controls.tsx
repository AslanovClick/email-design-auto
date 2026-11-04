// Базовые контролы инспектора.

import clsx from 'clsx';
import { ChevronRight } from 'lucide-react';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

export function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

export function Segmented<T extends string | number>({ value, options, onChange, label }: {
  value: T; options: [T, ReactNode][]; onChange: (v: T) => void; label?: string;
}) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={String(v)} type="button" role="radio" aria-checked={v === value}
          className={clsx(v === value && 'on')} onClick={() => onChange(v)}>{text}</button>
      ))}
    </div>
  );
}

export function Toggle({ label, checked, onChange }: { label: ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">{label}
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /><i />
    </label>
  );
}

/** Число с единицей измерения: можно вписать значение или менять стрелками (Shift — шаг 10). */
export function NumInput({ value, min, max, unit = '', onChange, label }: {
  value: number; min: number; max: number; unit?: string; onChange: (v: number) => void; label?: string;
}) {
  const [text, setText] = useState(String(value));
  const [focus, setFocus] = useState(false);
  useEffect(() => { if (!focus) setText(String(value)); }, [value, focus]);
  const clamp = (n: number) => Math.max(min, Math.min(max, Math.round(n)));
  const commit = (raw: string) => {
    const n = parseFloat(raw.replace(',', '.'));
    if (Number.isFinite(n)) onChange(clamp(n));
    setText(String(Number.isFinite(n) ? clamp(n) : value));
  };
  return (
    <label className={clsx('num', focus && 'focus')}>
      <input value={text} inputMode="numeric" aria-label={label} spellCheck={false}
        onFocus={(e) => { setFocus(true); e.target.select(); }}
        onBlur={(e) => { setFocus(false); commit(e.target.value); }}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d.,-]/g, '');
          setText(raw);
          // в пределах диапазона — применяем сразу, чтобы письмо менялось при наборе
          const n = parseFloat(raw.replace(',', '.'));
          if (Number.isFinite(n) && n >= min && n <= max) onChange(Math.round(n));
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { commit(text); (e.target as HTMLInputElement).blur(); }
          if (e.key === 'Escape') { setText(String(value)); (e.target as HTMLInputElement).blur(); }
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const next = clamp(value + (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1));
            onChange(next);
            setText(String(next));
          }
        }} />
      {unit && <em>{unit}</em>}
    </label>
  );
}

/** Ползунок + поле для точного значения. after — кнопка справа (например, «по сторонам»).
 *  limit — потолок для ручного ввода, если он выше, чем у ползунка (ползунок тогда просто упирается в край). */
export function Slider({ label, value, min, max, limit = max, unit = '', onChange, after }: {
  label?: ReactNode; value: number; min: number; max: number; limit?: number; unit?: string; onChange: (v: number) => void; after?: ReactNode;
}) {
  const aria = typeof label === 'string' ? label : undefined;
  const pct = max > min ? ((Math.min(max, Math.max(min, value)) - min) / (max - min)) * 100 : 0;
  return (
    <div className={clsx('range', label == null && 'no-label', after != null && 'has-after')}>
      {label != null && <span className="range-label">{label}</span>}
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(+e.target.value)}
        aria-label={aria} style={{ '--pct': `${pct}%` } as CSSProperties} />
      <NumInput value={value} min={min} max={limit} unit={unit} onChange={onChange} label={aria} />
      {after}
    </div>
  );
}

// открытые секции запоминаем на время сессии, чтобы при переключении блоков они не схлопывались
const openSections = new Set(['hero-preset', 'colors', 'font', 'bg', 'hero-head', 'hero-img', 'hero-teams', 'variant', 'content', 'checks-meta', 'checks-brief', 'checks-list']);

export function Section({ id, title, meta, children }: { id: string; title: ReactNode; meta?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(openSections.has(id));
  const toggle = () => {
    setOpen(!open);
    if (open) openSections.delete(id); else openSections.add(id);
  };
  return (
    <section className={clsx('sec', open && 'open')}>
      <button type="button" className="sec-head" onClick={toggle} aria-expanded={open}>
        <ChevronRight size={14} className="chev" />{title}{meta != null && <span className="meta">{meta}</span>}
      </button>
      {open && <div className="sec-in">{children}</div>}
    </section>
  );
}
