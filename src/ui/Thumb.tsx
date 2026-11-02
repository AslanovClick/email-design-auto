import { memo, useLayoutEffect, useRef } from 'react';
import { bgLayerCss, emailVars } from '@/email/theme';
import type { EmailDoc } from '@/model/types';

/**
 * Уменьшенная копия куска письма во всю ширину контейнера (письмо — 600px).
 * CSS письма (.em) подключён в интерфейсе глобально.
 */
export const Thumb = memo(function Thumb({ html, doc, h, withBg }: {
  html: string; doc: EmailDoc; h?: number; withBg?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => el.style.setProperty('--sc', String(el.clientWidth / 600));
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    fit();
    return () => ro.disconnect();
  }, []);
  const layer = withBg ? bgLayerCss(doc) : '';
  return (
    <div className="thumb" ref={ref} aria-hidden style={h ? { ['--h' as string]: h } : undefined}>
      <div className="thumb-in em" style={styleFromString(emailVars(doc))}
        dangerouslySetInnerHTML={{ __html: (layer ? `<div class="e-bgl" style="${layer}"></div>` : '') + html }} />
    </div>
  );
});

function styleFromString(s: string) {
  const out: Record<string, string> = {};
  s.split(';').forEach((pair) => {
    const i = pair.indexOf(':');
    if (i > 0) out[pair.slice(0, i).trim()] = pair.slice(i + 1).trim();
  });
  return out;
}
