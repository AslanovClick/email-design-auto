// «Собрать по ТЗ»: вставить текст → разбор (клиент, тип, блоки) → письмо со случайным стилем.

import * as Dialog from '@radix-ui/react-dialog';
import clsx from 'clsx';
import { FileText, Sparkles, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildEmail, type Origin, type Planned } from '@/brief/build';
import { parseBrief, type BriefKind } from '@/brief/parse';
import { TypeIcon } from '@/editor/blockIcons';
import { CLIENTS, catalogOf } from '@/model/catalog';
import { parseItems } from '@/model/items';
import type { Block } from '@/model/types';
import { saveDraft } from '@/store/drafts';
import { notify } from '@/store/ui';
import { Select } from '@/ui/Select';

const KIND: Record<BriefKind, string> = { sport: 'Спорт', casino: 'Казино', vip: 'VIP', promo: 'Промо' };
const ORIGIN: Record<Origin, string> = { tz: 'из ТЗ', fish: 'рыба', design: 'по макету' };

const cut = (s: unknown, n = 70) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

/** Короткое описание блока для списка. */
function snippet(b: Block): string {
  const d = b.data;
  const n = (k: string) => parseItems(d[k]).length;
  switch (b.type) {
    case 'hero': return d.teamsOn ? [`${d.team1} – ${d.team2}`, d.league, d.date].filter(Boolean).join(' · ') : 'картинку рисует дизайнер';
    case 'inner': return `${d.team1} – ${d.team2}`;
    case 'text': return cut([b.v <= 2 && d.titleOn !== false ? d.title : '', d.kicker && b.v === 4 ? d.kicker : '', d.offer && b.v === 4 ? d.offer : '', b.v === 3 ? d.note : '', b.v !== 4 ? d.text : ''].filter(Boolean).join(' · '));
    case 'cta': return `«${d.text}»`;
    case 'facts': return `${d.title} · строк: ${n('rows')}`;
    case 'bullets': return b.v === 3 ? `шагов: ${n('steps')}` : b.v === 10 ? `карточек: ${n('cards')}` : cut(`${d.title} · ${d.sub}`);
    case 'timer': return cut(d.title);
    case 'odds': return 'коэффициенты — примерные';
    case 'recodds': return 'ставка — примерная';
    case 'footer': return b.v === 1 ? `VIP · ${d.manager}` : 'стандартный';
    default: return '';
  }
}

export function BriefDialog({ fallbackClient }: { fallbackClient: string }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [own, setOwn] = useState<string | null>(null); // клиент, выбранный вручную

  const brief = useMemo(() => (text.trim() ? parseBrief(text) : null), [text]);
  const client = own ?? brief?.client ?? fallbackClient;
  // превью — без случайного стиля в списке не видно разницы; письмо пересобирается при создании
  const result = useMemo(() => (brief ? buildEmail(brief, client) : null), [brief, client]);

  const create = async () => {
    if (!brief) return;
    const { doc } = buildEmail(brief, client);
    doc.brief = { source: text, notes: doc.brief?.notes ?? [] };
    await saveDraft(doc);
    setOpen(false);
    navigate(`/email/${doc.id}`);
    notify('Письмо собрано по ТЗ — заметки для дизайнера во вкладке «Проверки»');
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setText(''); setOwn(null); } }}>
      <Dialog.Trigger asChild>
        <button type="button" className="home-tpl brief-card">
          <span className="home-tpl-pic"><span className="blank-pic"><FileText size={22} /><span>По ТЗ</span></span></span>
          <span className="home-tpl-t">
            <b>Собрать по ТЗ</b>
            <span className="tpl-meta"><span className="tag">Вставьте текст</span></span>
          </span>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-back" />
        <Dialog.Content className="dialog brief-dlg" aria-describedby={undefined}>
          <div className="dialog-head">
            <Dialog.Title className="h-xl" style={{ margin: 0 }}>Собрать письмо по ТЗ</Dialog.Title>
            <Dialog.Close asChild><button type="button" className="icon-btn" aria-label="Закрыть"><X size={16} /></button></Dialog.Close>
          </div>

          <div className="brief-cols">
            <div className="brief-src">
              <div className="brief-area">
                <textarea className="inp" value={text} spellCheck={false} autoFocus
                  placeholder={'Вставьте текст ТЗ.\n\nПонимаем: бренд, Title / Pre-header, Mailer top, Text, button (…), Как активировать бонус:, таймер, Обратите внимание!, Турнир / Дата / Команды / Игроки, Факты и Детали матча, бонусы карточками, список слотов, подпись VIP-менеджера.'}
                  onChange={(e) => setText(e.target.value)} />
              </div>
            </div>

            <div className="brief-out">
              {!brief || !result ? (
                <div className="brief-empty">
                  <Sparkles size={20} />
                  <b>Здесь появится план письма</b>
                  <span>Клиент и тип определятся по тексту, блоки встанут по макету. Картинки и гербы, которых нет в библиотеке, оставим дизайнеру.</span>
                </div>
              ) : (
                <>
                  <div className="brief-meta">
                    <div className="brief-row">
                      <span>Клиент</span>
                      <div className="brief-client">
                        <Select label="Клиент" value={client} onChange={setOwn}
                          options={CLIENTS.map((c) => ({ value: c.id, label: c.name }))} />
                        <small className={clsx(!brief.client && !own && 'warn')}>
                          {own ? 'выбран вручную' : brief.client ? 'найден в ТЗ' : 'не найден в ТЗ'}
                        </small>
                      </div>
                    </div>
                    <div className="brief-row"><span>Тип</span><b>{KIND[brief.kind]}</b></div>
                    <div className="brief-row"><span>Название</span><b>{result.doc.name}</b></div>
                    <div className="brief-row"><span>Тема</span>{brief.subject ? <b>{brief.subject}</b> : <i>нет в ТЗ</i>}</div>
                    <div className="brief-row"><span>Прехедер</span>{brief.preheader ? <b>{brief.preheader}</b> : <i>нет в ТЗ</i>}</div>
                  </div>

                  <div className="brief-sub">Блоки · {result.plan.length}</div>
                  <div className="brief-blocks">
                    {result.plan.map((p: Planned, i) => {
                      const cat = catalogOf(p.block.type);
                      const showVar = !['cta', 'separator', 'hero', 'odds', 'recodds'].includes(p.block.type);
                      return (
                        <div key={i} className="brief-blk">
                          <TypeIcon type={p.block.type} size={13} />
                          <span className="nm"><b>{cat.name}{showVar ? ` · ${cat.variants[p.block.v]}` : ''}</b><small>{snippet(p.block)}</small></span>
                          <span className={clsx('org', p.origin)}>{ORIGIN[p.origin]}</span>
                        </div>
                      );
                    })}
                  </div>

                  {result.doc.brief?.notes.length ? (
                    <>
                      <div className="brief-sub">Для дизайнера</div>
                      <ul className="brief-notes">{result.doc.brief.notes.map((n) => <li key={n}>{n}</li>)}</ul>
                    </>
                  ) : null}
                </>
              )}
            </div>
          </div>

          <div className="dialog-foot">
            <span className="hint" style={{ margin: '0 auto 0 0' }}>Стиль подберётся случайно — в редакторе его можно перебросить «Случайным стилем».</span>
            <Dialog.Close asChild><button type="button" className="btn ghost">Отмена</button></Dialog.Close>
            <button type="button" className="btn primary" disabled={!brief} onClick={create}><Sparkles size={15} />Собрать письмо</button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
