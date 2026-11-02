import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { useUi } from '@/store/ui';

export function Toast() {
  const toast = useUi((s) => s.toast);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!toast) return;
    setShow(true);
    const t = window.setTimeout(() => setShow(false), 2400);
    return () => window.clearTimeout(t);
  }, [toast]);
  return <div className={clsx('toast', show && 'show')} role="status" aria-live="polite">{toast?.text}</div>;
}
