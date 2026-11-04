// Стартовый экран: выбрать клиента и шаблон, или открыть черновик.

import clsx from 'clsx';
import { Check, FileText, Plus, Trash2 } from 'lucide-react';
import { Fragment, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { renderBlock } from '@/email/render';
import { CLIENTS, TEMPLATES } from '@/model/catalog';
import { createEmail } from '@/model/factory';
import { deleteDraft, deleteDrafts, listDrafts, saveDraft, type DraftMeta } from '@/store/drafts';
import { blocksCount, timeAgo } from '@/ui/format';
import { Thumb } from '@/ui/Thumb';
import { Tip } from '@/ui/Tip';
import { BriefDialog } from './BriefDialog';
import '@/styles/home.css';

export function HomePage() {
  const navigate = useNavigate();
  const [client, setClient] = useState(CLIENTS[0].id);
  const [drafts, setDrafts] = useState<DraftMeta[] | null>(null);
  useEffect(() => { listDrafts().then(setDrafts); }, []);

  const thumbs = useMemo(() => TEMPLATES.map((t) => {
    const doc = createEmail(client, t.id);
    return { t, doc, html: doc.blocks.map((b) => renderBlock(b, doc)).join('') };
  }), [client]);

  const start = async (templateId: string) => {
    const doc = createEmail(client, templateId);
    await saveDraft(doc);
    navigate(`/email/${doc.id}`);
  };

  return (
    <div className="home">
      <header className="home-top">
        <span className="brand"><span className="brand-mark">A</span>CLICKABLE</span>
        <span className="label">Mail constructor</span>
      </header>
      <main className="home-in">
        <h1>Новое <em>письмо</em></h1>
        <p className="lead">Выберите клиента и шаблон — логотип и футер подставятся сами.</p>

        <section className="step">
          <div className="step-title"><span className="step-n">1</span>Клиент</div>
          <div className="client-chips" role="radiogroup" aria-label="Клиент">
            {CLIENTS.map((c) => (
              <button key={c.id} type="button" role="radio" aria-checked={c.id === client}
                className={clsx(c.id === client && 'on')} onClick={() => setClient(c.id)}>{c.name}</button>
            ))}
          </div>
        </section>

        <section className="step">
          <div className="step-title"><span className="step-n">2</span>Шаблон</div>
          <div className="home-tpls">
            {thumbs.map(({ t, doc, html }) => (
              <Fragment key={t.id}>
                <button type="button" className={clsx('home-tpl', t.id === 'blank' && 'blank')} onClick={() => start(t.id)}>
                  <span className="home-tpl-pic">
                    {t.id === 'blank' ? <span className="blank-pic"><Plus size={22} /><span>С нуля</span></span> : <Thumb html={html} doc={doc} withBg />}
                  </span>
                  <span className="home-tpl-t">
                    <b>{t.name}</b>
                    <span className="tpl-meta"><span className="tag">{t.tag}</span>{blocksCount(t.blocks.length)}</span>
                  </span>
                </button>
                {/* сразу после «С нуля» — сборка по ТЗ: клиент найдётся в тексте, иначе — выбранный выше */}
                {t.id === 'blank' && <BriefDialog fallbackClient={client} />}
              </Fragment>
            ))}
          </div>
        </section>

        {drafts && drafts.length > 0 && <Drafts drafts={drafts} onChange={async () => setDrafts(await listDrafts())} />}
      </main>
    </div>
  );
}

/** Черновики: клик открывает письмо; галочка (или «Выбрать») включает выбор, чтобы удалить несколько сразу.
 *  В режиме выбора клик по карточке отмечает её, Shift+клик — диапазон, Esc — выйти. */
function Drafts({ drafts, onChange }: { drafts: DraftMeta[]; onChange: () => Promise<void> }) {
  const navigate = useNavigate();
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const last = useRef<number | null>(null);
  const selecting = picked != null;
  const n = picked?.size ?? 0;
  const all = n === drafts.length;

  // черновик могли удалить — выбор чистим от пропавших
  useEffect(() => {
    if (!picked) return;
    const ids = new Set(drafts.map((d) => d.id));
    if ([...picked].some((id) => !ids.has(id))) setPicked(new Set([...picked].filter((id) => ids.has(id))));
  }, [drafts]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selecting) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPicked(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selecting]);

  const toggle = (i: number, e?: MouseEvent) => {
    const next = new Set(picked ?? []);
    const id = drafts[i].id;
    if (e?.shiftKey && last.current != null) {
      const [a, b] = [Math.min(last.current, i), Math.max(last.current, i)];
      const on = !next.has(id);
      drafts.slice(a, b + 1).forEach((d) => (on ? next.add(d.id) : next.delete(d.id)));
    } else if (next.has(id)) next.delete(id);
    else next.add(id);
    last.current = i;
    setPicked(next);
  };

  const removePicked = async () => {
    if (!picked || !n) return;
    if (!window.confirm(n === 1 ? 'Удалить выбранный черновик?' : `Удалить выбранные черновики: ${n}?`)) return;
    await deleteDrafts([...picked]);
    setPicked(null);
    await onChange();
  };

  return (
    <section className="step">
      <div className="step-title drafts-head">
        Черновики <span className="count">{drafts.length}</span>
        <span className="spacer" />
        {selecting ? (
          <div className="drafts-bar">
            <span className="picked">Выбрано: {n}</span>
            <button type="button" className="btn sm ghost" onClick={() => setPicked(all ? new Set() : new Set(drafts.map((d) => d.id)))}>
              {all ? 'Снять все' : 'Выбрать все'}
            </button>
            <button type="button" className="btn sm danger" disabled={!n} onClick={removePicked}><Trash2 size={14} />Удалить</button>
            <button type="button" className="btn sm" onClick={() => setPicked(null)}>Отмена</button>
          </div>
        ) : (
          <button type="button" className="btn sm ghost" onClick={() => setPicked(new Set())}>Выбрать</button>
        )}
      </div>
      <div className={clsx('drafts', selecting && 'selecting')}>
        {drafts.map((d, i) => {
          const on = !!picked?.has(d.id);
          const open = () => navigate(`/email/${d.id}`);
          return (
            <div key={d.id} className={clsx('draft', on && 'picked')} role={selecting ? 'checkbox' : 'link'} aria-checked={selecting ? on : undefined} tabIndex={0}
              onClick={(e) => (selecting ? toggle(i, e) : open())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { if (selecting) toggle(i); else open(); }
                if (e.key === ' ' && selecting) { e.preventDefault(); toggle(i); }
              }}>
              <span className="draft-ico">
                <FileText size={16} className="doc" />
                <button type="button" className="draft-check" aria-label={on ? 'Снять выбор' : 'Выбрать черновик'} tabIndex={-1}
                  onClick={(e) => { e.stopPropagation(); toggle(i, e); }}>
                  {on && <Check size={13} strokeWidth={3} />}
                </button>
              </span>
              <div className="draft-t"><b>{d.name}</b>
                <span>{CLIENTS.find((c) => c.id === d.client)?.name} · {blocksCount(d.blocks)} · {timeAgo(d.updatedAt)}</span>
              </div>
              {!selecting && (
                <Tip label="Удалить черновик">
                  <button type="button" className="icon-btn sm del" aria-label="Удалить черновик" onClick={async (e) => {
                    e.stopPropagation();
                    if (!window.confirm(`Удалить «${d.name}»?`)) return;
                    await deleteDraft(d.id);
                    await onChange();
                  }}><Trash2 size={14} /></button>
                </Tip>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
