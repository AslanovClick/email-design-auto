import clsx from 'clsx';
import { AlertTriangle, ChevronRight, CircleCheck, CircleX } from 'lucide-react';
import type { Check } from '@/email/checks';
import { useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';

const ICON = { ok: CircleCheck, warn: AlertTriangle, error: CircleX };

export function CheckList({ checks, interactive }: { checks: Check[]; interactive?: boolean }) {
  // сначала то, что требует внимания
  const order = { error: 0, warn: 1, ok: 2 };
  const sorted = [...checks].sort((a, b) => order[a.level] - order[b.level]);
  return (
    <div className="checks">
      {sorted.map((x) => {
        const Icon = ICON[x.level];
        const target = interactive && x.level !== 'ok' ? x.blocks?.[0] : undefined;
        return (
          <button key={x.id} type="button" className={clsx('check', x.level, target && 'click')} disabled={!target}
            title={x.hint}
            onClick={() => {
              if (!target) return;
              useEditor.getState().select(target);
              useUi.getState().set({ rightTab: 'block' });
            }}>
            <Icon size={15} className="st" />{x.title}{target && <ChevronRight size={14} className="go" />}
          </button>
        );
      })}
    </div>
  );
}
