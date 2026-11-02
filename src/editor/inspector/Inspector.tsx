import clsx from 'clsx';
import { runChecks } from '@/email/checks';
import { useEditor, useSelectedBlock } from '@/store/editor';
import { useUi, type RightTab } from '@/store/ui';
import { Segmented } from '@/ui/controls';
import { BlockTab } from './BlockTab';
import { ChecksTab } from './ChecksTab';
import { Suggestions } from './FieldInput';
import { LayoutTab } from './LayoutTab';

export function Inspector() {
  const doc = useEditor((s) => s.doc)!;
  const block = useSelectedBlock();
  const { rightTab, set } = useUi();
  const c = runChecks(doc);
  const count = c.errors || c.warns;
  return (
    <aside className="panel right" aria-label="Настройки">
      <div className="panel-head">
        <Segmented<RightTab> value={rightTab} onChange={(rightTab) => set({ rightTab })} label="Раздел настроек"
          options={[
            ['layout', 'Макет'],
            ['block', 'Блок'],
            ['checks', <>Проверки{count > 0 && <span className={clsx('cnt', !c.errors && 'warn')}>{count}</span>}</>],
          ]} />
      </div>
      <div className="scroll">
        {rightTab === 'layout' && <LayoutTab doc={doc} />}
        {rightTab === 'block' && <BlockTab key={block?.id} doc={doc} block={block} />}
        {rightTab === 'checks' && <ChecksTab doc={doc} />}
      </div>
      <Suggestions />
    </aside>
  );
}
