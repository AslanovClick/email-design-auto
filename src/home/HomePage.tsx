// Стартовый экран: выбрать клиента и шаблон, или открыть черновик.

import clsx from 'clsx';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { renderBlock } from '@/email/render';
import { CLIENTS, TEMPLATES } from '@/model/catalog';
import { createEmail } from '@/model/factory';
import { deleteDraft, listDrafts, saveDraft, type DraftMeta } from '@/store/drafts';
import { blocksCount, timeAgo } from '@/ui/format';
import { Thumb } from '@/ui/Thumb';
import { Tip } from '@/ui/Tip';
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
              <button key={t.id} type="button" className={clsx('home-tpl', t.id === 'blank' && 'blank')} onClick={() => start(t.id)}>
                <span className="home-tpl-pic">
                  {t.id === 'blank' ? <span className="blank-pic"><Plus size={22} /><span>С нуля</span></span> : <Thumb html={html} doc={doc} withBg />}
                </span>
                <span className="home-tpl-t">
                  <b>{t.name}</b>
                  <span className="tpl-meta"><span className="tag">{t.tag}</span>{blocksCount(t.blocks.length)}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        {drafts && drafts.length > 0 && (
          <section className="step">
            <div className="step-title">Черновики <span className="count">{drafts.length}</span></div>
            <div className="drafts">
              {drafts.map((d) => (
                <div key={d.id} className="draft" role="link" tabIndex={0}
                  onClick={() => navigate(`/email/${d.id}`)} onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/email/${d.id}`); }}>
                  <span className="draft-ico"><FileText size={16} /></span>
                  <div className="draft-t"><b>{d.name}</b>
                    <span>{CLIENTS.find((c) => c.id === d.client)?.name} · {blocksCount(d.blocks)} · {timeAgo(d.updatedAt)}</span>
                  </div>
                  <Tip label="Удалить черновик">
                    <button type="button" className="icon-btn sm del" aria-label="Удалить черновик" onClick={async (e) => {
                      e.stopPropagation();
                      if (!window.confirm(`Удалить «${d.name}»?`)) return;
                      await deleteDraft(d.id);
                      setDrafts(await listDrafts());
                    }}><Trash2 size={14} /></button>
                  </Tip>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
