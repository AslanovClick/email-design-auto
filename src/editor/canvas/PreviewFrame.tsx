// Превью письма в iframe: стили письма изолированы от интерфейса, а разметка та же, что уйдёт в экспорт.
// Поверх iframe интерфейс рисует оверлей (выделение, тулбар), поэтому наружу отдаём геометрию блоков.

import { useEffect, useRef } from 'react';
import { EMAIL_CSS } from '@/email/emailCss';
import { renderEmailBody } from '@/email/render';
import type { EmailDoc } from '@/model/types';

export interface BlockRect { id: string; top: number; height: number }

interface Props {
  doc: EmailDoc;
  onLayout: (rects: BlockRect[], height: number) => void;
  onHover: (id: string | null) => void;
  onPick: (id: string | null) => void;
  onKey: (e: KeyboardEvent) => void;
}

const SHELL = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
<style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}.em-blk{cursor:pointer}${EMAIL_CSS}</style>
</head><body><div id="root"></div></body></html>`;

export function PreviewFrame({ doc, onLayout, onHover, onPick, onKey }: Props) {
  const ref = useRef<HTMLIFrameElement>(null);
  // документ iframe, на который уже навешаны обработчики (после перезагрузки iframe — новый)
  const ready = useRef<Document | null>(null);
  const cb = useRef({ onLayout, onHover, onPick, onKey });
  cb.current = { onLayout, onHover, onPick, onKey };
  const docRef = useRef(doc);
  docRef.current = doc;

  const root = () => ref.current?.contentDocument?.getElementById('root') ?? null;

  const measure = () => {
    const r = root();
    const f = ref.current;
    if (!r || !f) return;
    const rects = [...r.querySelectorAll<HTMLElement>('[data-block-id]')].map((el) => ({
      id: el.dataset.blockId!, top: el.offsetTop, height: el.offsetHeight,
    }));
    const h = r.scrollHeight;
    f.style.height = `${h}px`;
    cb.current.onLayout(rects, h);
  };

  const paint = () => {
    const r = root();
    if (!r) return;
    r.innerHTML = renderEmailBody(docRef.current);
    measure();
  };

  const init = () => {
    const d = ref.current?.contentDocument;
    const w = ref.current?.contentWindow as (Window & typeof globalThis) | null;
    if (!d || !w || ready.current === d) return;
    ready.current = d;
    const blockAt = (t: EventTarget | null) => (t as Element | null)?.closest?.('[data-block-id]') as HTMLElement | null;
    d.addEventListener('mousemove', (e) => cb.current.onHover(blockAt(e.target)?.dataset.blockId ?? null));
    d.addEventListener('click', (e) => {
      // ссылки в письме (кнопки, почта в футере) в превью не открываем — иначе iframe уйдёт со страницы
      if ((e.target as Element | null)?.closest?.('a')) e.preventDefault();
      cb.current.onPick(blockAt(e.target)?.dataset.blockId ?? null);
    });
    d.addEventListener('keydown', (e) => cb.current.onKey(e));
    // картинки догружаются и меняют высоту блоков — пересчитываем геометрию
    new w.ResizeObserver(() => measure()).observe(d.getElementById('root')!);
    paint();
  };

  useEffect(() => { if (ready.current) paint(); }, [doc]);

  return <iframe ref={ref} title="Превью письма" srcDoc={SHELL} onLoad={init} />;
}
