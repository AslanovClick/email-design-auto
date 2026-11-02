// Базовые контролы инспектора.

import clsx from 'clsx';
import { ChevronRight } from 'lucide-react';
import { useState, type ReactNode } from 'react';

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

export function Slider({ label, value, min, max, unit = '', onChange }: {
  label?: ReactNode; value: number; min: number; max: number; unit?: string; onChange: (v: number) => void;
}) {
  return (
    <label className="range">
      {label != null && <span>{label}</span>}
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(+e.target.value)}
        aria-label={typeof label === 'string' ? label : undefined} />
      <output>{value}{unit}</output>
    </label>
  );
}

// открытые секции запоминаем на время сессии, чтобы при переключении блоков они не схлопывались
const openSections = new Set(['hero-preset', 'colors', 'font', 'bg', 'hero-head', 'hero-img', 'hero-teams', 'variant', 'content', 'checks-meta', 'checks-list']);

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
