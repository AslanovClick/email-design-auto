import clsx from 'clsx';
import { Scan } from 'lucide-react';
import type { Radius } from '@/model/types';
import { Slider } from './controls';
import { Tip } from './Tip';

// Порядок в CSS: ↖ ↗ ↘ ↙. В сетке 2×2 показываем так, как углы расположены на блоке.
const GRID: { i: number; name: string; rot: number }[] = [
  { i: 0, name: 'Левый верхний', rot: 0 },
  { i: 1, name: 'Правый верхний', rot: 90 },
  { i: 3, name: 'Левый нижний', rot: 270 },
  { i: 2, name: 'Правый нижний', rot: 180 },
];

/** Иконка угла — скруглённая «Г», повёрнутая к своему углу. */
function CornerIcon({ rot }: { rot: number }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transform: `rotate(${rot}deg)` }} aria-hidden>
      <path d="M2 13V7a5 5 0 0 1 5-5h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// ползунок — до 40 px (удобный диапазон), вручную можно вписать сколько угодно: пилюли, капсулы и т.п.
const RADIUS_LIMIT = 9999;

/** Скругление: один ползунок на все углы или отдельное значение для каждого угла. */
export function RadiusControl({ label, value, onChange }: {
  label?: string; value: Radius; onChange: (v: Radius) => void;
}) {
  const per = Array.isArray(value);
  const base = per ? Math.max(...value) : value;
  return (
    <>
      {label && <div className="subhead">{label}</div>}
      <Slider label="Радиус" value={base} min={0} max={40} limit={RADIUS_LIMIT} unit="px" onChange={(v) => onChange(per ? [v, v, v, v] : v)}
        after={(
          <Tip label={per ? 'Одно значение на все углы' : 'Задать каждый угол отдельно'}>
            <button type="button" className={clsx('corner-btn', per && 'on')} aria-pressed={per}
              aria-label={per ? 'Одно значение на все углы' : 'Задать каждый угол отдельно'}
              onClick={() => onChange(per ? value[0] : [base, base, base, base])}>
              <Scan size={16} />
            </button>
          </Tip>
        )} />
      {per && (
        <div className="corners">
          {GRID.map(({ i, name, rot }) => (
            <label key={i} className="corner" title={name}>
              <CornerIcon rot={rot} />
              <input type="number" min={0} max={RADIUS_LIMIT} value={value[i]} aria-label={`${name} угол`}
                onChange={(e) => {
                  const next = [...value] as [number, number, number, number];
                  next[i] = Math.max(0, Math.min(RADIUS_LIMIT, +e.target.value || 0));
                  onChange(next);
                }} />
              <em>px</em>
            </label>
          ))}
        </div>
      )}
    </>
  );
}
