import * as Tooltip from '@radix-ui/react-tooltip';
import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';

interface Props {
  label: ReactNode;
  children: ReactElement;
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Показать подсказку и по клику (например, у задизейбленной кнопки). */
  onClickShow?: boolean;
}

export function Tip({ label, children, side = 'top', onClickShow }: Props) {
  const [open, setOpen] = useState(false);
  const timer = useRef<number>(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const flash = () => {
    setOpen(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(false), 2000);
  };

  return (
    <Tooltip.Root open={open} onOpenChange={setOpen} delayDuration={350}>
      <Tooltip.Trigger asChild onClick={onClickShow ? flash : undefined}>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className="tip" side={side} sideOffset={6}>
          {label}
          <Tooltip.Arrow className="tip-arrow" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
