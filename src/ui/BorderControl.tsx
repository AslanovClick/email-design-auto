import clsx from 'clsx';
import { Scan } from 'lucide-react';
import { Slider } from './controls';
import { Tip } from './Tip';

type Sides = [number, number, number, number];
type Width = number | Sides;

// Порядок в CSS: верх, право, низ, лево. В сетке — как в Figma: лево/верх, право/низ.
const GRID: { i: number; name: string }[] = [
  { i: 3, name: 'Слева' },
  { i: 0, name: 'Сверху' },
  { i: 1, name: 'Справа' },
  { i: 2, name: 'Снизу' },
];

/** Квадрат, у которого подсвечена одна сторона. */
function SideIcon({ side }: { side: number }) {
  const lines = [
    'M3 2.5h10', 'M13.5 3v10', 'M3 13.5h10', 'M2.5 3v10',
  ];
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" stroke="currentColor" strokeOpacity=".35" strokeDasharray="2 2" />
      <path d={lines[side]} stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Толщина обводки: одна на все стороны или отдельно для каждой. */
export function BorderControl({ value, onChange }: { value: Width; onChange: (v: Width) => void }) {
  const per = Array.isArray(value);
  const base = per ? Math.max(...value) : value;
  return (
    <>
      <div className="rad-ctl">
        <Slider label="Толщина" value={base} min={0} max={8} unit="px" onChange={(v) => onChange(per ? value.map((x) => (x ? v : 0)) as Sides : v)} />
        <Tip label={per ? 'Одинаково со всех сторон' : 'Выбрать стороны'}>
          <button type="button" className={clsx('corner-btn', per && 'on')} aria-pressed={per}
            onClick={() => onChange(per ? base : [base, base, base, base])}>
            <Scan size={16} />
          </button>
        </Tip>
      </div>
      {per && (
        <div className="corners">
          {GRID.map(({ i, name }) => (
            <label key={i} className="corner" title={name}>
              <SideIcon side={i} />
              <input type="number" min={0} max={8} value={value[i]} aria-label={`Обводка ${name.toLowerCase()}`}
                onChange={(e) => {
                  const next = [...value] as Sides;
                  next[i] = Math.max(0, Math.min(8, +e.target.value || 0));
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
