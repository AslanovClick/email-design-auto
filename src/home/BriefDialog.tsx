// «Собрать по ТЗ»: ТЗ (текст или файл) → «Составить план» (ИИ через n8n, без него — разбор правилами) →
// текст плана во вкладке «План», его можно править → справа план, как его понял конструктор → «Собрать письмо».
// Источник правой панели и письма — только текст плана: правки пользователя главнее правил.

import * as Dialog from '@radix-ui/react-dialog';
import clsx from 'clsx';
import { FileText, FileUp, Sparkles, WandSparkles, X } from 'lucide-react';
import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { briefWebhookUrl, requestBrief } from '@/brief/ai';
import { derivedNotes, docFromPlan, planFromBrief, type Origin, type PlanDoc, type Planned } from '@/brief/build';
import { BRIEF_MAX, cleanBrief, readBriefFile } from '@/brief/clean';
import { parseBrief, type Brief, type BriefKind } from '@/brief/parse';
import { parsePlan, planToText } from '@/brief/planText';
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
    case 'hero': return d.teamsOn ? [`${d.team1} – ${d.team2}`, d.league, d.date].filter(Boolean).join(' · ') : d.image ? 'картинка из ТЗ' : 'картинку рисует дизайнер';
    case 'inner': return `${d.team1} – ${d.team2}`;
    case 'text': return cut([b.v <= 2 && d.titleOn !== false ? d.title : '', d.kicker && b.v === 4 ? d.kicker : '', d.offer && b.v === 4 ? d.offer : '', b.v === 3 ? d.note : '', b.v !== 4 ? d.text : ''].filter(Boolean).join(' · '));
    case 'cta': return `«${d.text}»`;
    case 'facts': return `${d.title ? `${d.title} · ` : ''}строк: ${n('rows')}`;
    case 'bullets': return b.v === 3 || b.v === 11 ? `шагов: ${n('steps')}` : b.v === 10 ? `карточек: ${n('cards')}` : cut(`${d.title} · ${d.sub}`);
    case 'timer': return cut([d.title, d.date].filter(Boolean).join(' · '));
    case 'odds': return String(d.odds ?? '');
    case 'recodds': return cut(`${d.pick} · ${d.coef}`);
    case 'footer': return b.v === 1 ? `VIP · ${d.manager}` : 'стандартный';
    default: return '';
  }
}

type Tab = 'tz' | 'plan';
/** Подпись под «Составить план»: кто составил план и что выброшено из ответа ИИ. */
interface Made { model?: string; fallback?: string; issues: string[] }

export function BriefDialog({ fallbackClient }: { fallbackClient: string }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('tz');
  const [source, setSource] = useState('');
  const [planText, setPlanText] = useState('');
  /** Текст плана, как его составили, — чтобы понять, правил ли его пользователь. */
  const [pristine, setPristine] = useState('');
  /** План, который составили (гербы и лого, которые узнал ИИ, переносятся по названию). */
  const [known, setKnown] = useState<PlanDoc | undefined>();
  const [made, setMade] = useState<Made | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [notice, setNotice] = useState('');
  /** Клиент, подставленный вместо не найденного в ТЗ, — предупреждаем, пока его не сменили. */
  const [guess, setGuess] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => (planText.trim() ? parsePlan(planText, fallbackClient, known) : null), [planText, fallbackClient, known]);
  const plan = parsed?.plan;
  const blocks = plan?.blocks ?? [];
  const errors = parsed?.errors ?? [];
  const notes = useMemo(() => (plan ? [...plan.notes, ...derivedNotes(plan.blocks.map((p) => p.block))] : []), [plan]);
  const edited = !!planText && planText !== pristine;

  // закрытие окна (Esc, клик мимо, «Отмена») отменяет запрос, но ТЗ и план остаются: в них работа пользователя
  // и платный ответ модели. Всё сбрасывается только после «Собрать письмо».
  const stop = () => {
    abort.current?.abort();
    abort.current = null;
    setBusy(false); setConfirm(false);
  };
  const reset = () => {
    stop();
    setTab('tz'); setSource(''); setPlanText(''); setPristine(''); setKnown(undefined);
    setMade(null); setNotice(''); setGuess(null);
  };

  const compose = async () => {
    if (edited && !confirm) { setConfirm(true); return; }
    setConfirm(false);
    const clean = cleanBrief(source);
    const text = clean.slice(0, BRIEF_MAX);
    setNotice(clean.length > BRIEF_MAX ? `ТЗ обрезано до ${BRIEF_MAX.toLocaleString('ru')} знаков` : '');
    let brief: Brief;
    let info: Made;
    if (!briefWebhookUrl()) {
      brief = parseBrief(text);
      info = { fallback: 'вебхук не настроен', issues: [] };
    } else {
      const ctl = new AbortController();
      abort.current = ctl;
      setBusy(true);
      try {
        const r = await requestBrief(text, undefined, ctl.signal);
        brief = r.brief;
        info = { model: r.model || 'модель не названа', issues: r.issues };
      } catch (e) {
        if (ctl.signal.aborted) return;   // окно закрыли — план уже не нужен
        brief = parseBrief(text);
        info = { fallback: (e as Error).message, issues: [] };
      } finally {
        if (abort.current === ctl) { abort.current = null; setBusy(false); }
      }
    }
    const p = planFromBrief(brief, brief.client ?? fallbackClient);
    const t = planToText(p);
    setKnown(p); setPlanText(t); setPristine(t); setMade(info); setTab('plan');
    setGuess(brief.client ? null : p.client);
  };

  const upload = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      setSource(await readBriefFile(f.name, await f.arrayBuffer()));
      setConfirm(false);
      setNotice(`Загружен файл ${f.name}`);
    } catch (err) {
      setNotice(`Не получилось прочитать ${f.name}: ${(err as Error).message}`);
    }
  };

  // выбор клиента справа меняет строку «Клиент:» в тексте плана
  const setClient = (id: string) => {
    const name = CLIENTS.find((c) => c.id === id)?.name ?? id;
    setGuess(null);
    setPlanText((t) => (/^Клиент:.*$/m.test(t) ? t.replace(/^Клиент:.*$/m, `Клиент: ${name}`) : `Клиент: ${name}\n${t}`));
  };

  const create = async () => {
    if (!plan || !blocks.length) return;
    const doc = docFromPlan(plan);
    doc.brief = { source, plan: planText, notes: doc.brief?.notes ?? [] };
    await saveDraft(doc);
    setOpen(false);
    reset();
    navigate(`/email/${doc.id}`);
    notify('Письмо собрано по ТЗ — заметки для дизайнера во вкладке «Проверки»');
  };

  const status = made && (made.model
    ? <span className="ok">План составил ИИ ({made.model})</span>
    : <span className="warn">План без ИИ: {made.fallback}</span>);

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { setOpen(o); if (!o) stop(); }}>
      <Dialog.Trigger asChild>
        <button type="button" className="home-tpl brief-card">
          <span className="home-tpl-pic"><span className="blank-pic"><FileText size={22} /><span>По ТЗ</span></span></span>
          <span className="home-tpl-t">
            <b>Собрать по ТЗ</b>
            <span className="tpl-meta"><span className="tag">Текст или файл</span></span>
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
              <div className="brief-tabs" role="tablist" aria-label="ТЗ и план">
                {([['tz', 'ТЗ'], ['plan', 'План']] as [Tab, string][]).map(([id, name]) => (
                  <button key={id} type="button" role="tab" aria-selected={tab === id} className={clsx(tab === id && 'on')} onClick={() => setTab(id)}>
                    {name}{id === 'plan' && edited ? <i className="dot" title="План правили" /> : null}
                  </button>
                ))}
              </div>
              <div className="brief-area">
                {tab === 'tz' ? (
                  <textarea key="tz" className="inp" value={source} spellCheck={false} autoFocus aria-label="Текст ТЗ"
                    placeholder={'Вставьте текст ТЗ или загрузите файл (.docx, .md, .txt).\n\n«Составить план» — ИИ разберёт ТЗ на блоки письма: тему, прехедер, тексты, кнопки, шаги, таймер, матчи, факты, бонусы, подпись VIP. План можно поправить перед сборкой.'}
                    onChange={(e) => { setSource(e.target.value); setConfirm(false); }} />
                ) : (
                  <textarea key="plan" className="inp mono" value={planText} spellCheck={false} aria-label="Текст плана"
                    placeholder={'Здесь будет план письма — составьте его на вкладке «ТЗ».\n\n[Блок · Вариант] главное\nПоле: значение\n- пункт списка'}
                    onChange={(e) => setPlanText(e.target.value)} />
                )}
              </div>
              <div className="brief-actions">
                {tab === 'tz' ? (
                  <>
                    <input ref={fileInput} type="file" accept=".docx,.md,.txt" hidden onChange={upload} />
                    <button type="button" className="btn ghost" onClick={() => fileInput.current?.click()} disabled={busy}><FileUp size={15} />Загрузить файл</button>
                    <button type="button" className={clsx('btn', confirm ? 'danger' : 'primary')} onClick={compose} disabled={busy || !source.trim()}>
                      <WandSparkles size={15} />{busy ? 'Составляю план…' : confirm ? 'Заменить план' : 'Составить план'}
                    </button>
                  </>
                ) : (
                  <span className="hint" style={{ margin: 0 }}>Правьте текст: справа видно, как его понял конструктор.</span>
                )}
              </div>
              <div className="brief-status" role="status">
                {confirm && <span className="warn">Заменить план? Правки пропадут — нажмите ещё раз.</span>}
                {notice && <span>{notice}</span>}
                {status}
                {made?.issues.length ? <span className="warn">Из ответа ИИ убрано: {made.issues.join('; ')}</span> : null}
              </div>
            </div>

            <div className="brief-out">
              {!plan ? (
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
                        <Select label="Клиент" value={plan.client} onChange={setClient}
                          options={CLIENTS.map((c) => ({ value: c.id, label: c.name }))} />
                        {guess && plan.client === guess && <small className="warn">не найден в ТЗ — проверьте клиента</small>}
                      </div>
                    </div>
                    <div className="brief-row"><span>Тип</span><b>{KIND[plan.kind]}</b></div>
                    <div className="brief-row"><span>Название</span>{plan.name ? <b>{plan.name}</b> : <i>нет</i>}</div>
                    <div className="brief-row"><span>Тема</span>{plan.subject ? <b>{plan.subject}</b> : <i>нет в ТЗ</i>}</div>
                    <div className="brief-row"><span>Прехедер</span>{plan.preheader ? <b>{plan.preheader}</b> : <i>нет в ТЗ</i>}</div>
                  </div>

                  {errors.length > 0 && (
                    <>
                      <div className="brief-sub warn">Не понял строки — в письмо не войдут</div>
                      <ul className="brief-errors">
                        {errors.map((e) => <li key={`${e.line}:${e.message}`}><b>стр. {e.line}: {cut(e.text, 60)}</b> — {e.message}</li>)}
                      </ul>
                    </>
                  )}

                  <div className="brief-sub">Блоки · {blocks.length}</div>
                  <div className="brief-blocks">
                    {blocks.map((p: Planned, i) => {
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

                  {notes.length > 0 && (
                    <>
                      <div className="brief-sub">Для дизайнера</div>
                      <ul className="brief-notes">{notes.map((n) => <li key={n}>{n}</li>)}</ul>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="dialog-foot">
            <span className="hint" style={{ margin: '0 auto 0 0' }}>Стиль подберётся случайно — в редакторе его можно перебросить «Случайным стилем».</span>
            <Dialog.Close asChild><button type="button" className="btn ghost">Отмена</button></Dialog.Close>
            <button type="button" className="btn primary" disabled={!blocks.length || busy} onClick={create}><Sparkles size={15} />Собрать письмо</button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
