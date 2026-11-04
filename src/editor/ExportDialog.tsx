import * as Dialog from '@radix-ui/react-dialog';
import clsx from 'clsx';
import { Download, FileJson, RotateCw, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { GMAIL_LIMIT_KB, runChecks, type Check } from '@/email/checks';
import { copyHtml, downloadPayload, exportHtml, exportZip } from '@/email/exporter';
import { webhookUrl } from '@/email/n8n';
import type { EmailDoc } from '@/model/types';
import { buildKey, useMailBuild } from '@/store/mailBuild';
import { notify } from '@/store/ui';
import { CheckList } from './CheckList';

type Format = 'zip' | 'html' | 'copy';

const FORMATS: [Format, string, string][] = [
  ['zip', 'ZIP', 'HTML + папка images/ для загрузки в сервис рассылки'],
  ['html', 'HTML', 'файл, картинки по ссылкам на demo.promo'],
  ['copy', 'Код', 'скопировать в буфер обмена'],
];

const STEP = { images: 'Готовлю картинки…', send: 'Отправляю в n8n…' };

export function ExportDialog({ doc }: { doc: EmailDoc }) {
  const [format, setFormat] = useState<Format>('zip');
  const [open, setOpen] = useState(false);
  // актуальные «окно открыто» и письмо — для проверки после долгой сборки
  const live = useRef({ open, doc });
  live.current = { open, doc };
  const { key, built, result, busy, error, build, prepare } = useMailBuild();
  const c = runChecks(doc);
  // всё, что собрано, — для этой версии письма; после правок — снова оценка
  const fresh = key === buildKey(doc);
  const r = fresh ? result : null;
  const size = r ? r.kb : c.size;
  const level = size >= GMAIL_LIMIT_KB ? 'error' : size >= 90 ? 'warn' : '';
  const failed = fresh && !busy ? error : null;
  const warnings: Check[] = fresh && built ? built.warnings.map((w, i) => ({ id: `plan-${i}`, level: 'warn', title: w })) : [];
  const hook = webhookUrl();

  const run = async () => {
    const at = buildKey(doc);
    let res;
    try {
      res = await build(doc);
    } catch {
      return;   // текст ошибки — в окне, кнопка «Повторить»
    }
    // окно закрыли или письмо поменяли, пока шла сборка, — не скачиваем (результат остался в кэше)
    if (!live.current.open || buildKey(live.current.doc) !== at) return;
    try {
      if (format === 'zip') { const n = await exportZip(doc, res); notify(`ZIP собран: HTML и картинок — ${n}`); }
      if (format === 'html') { exportHtml(doc, res); notify('HTML скачан'); }
      if (format === 'copy') {
        try { await copyHtml(res); } catch {
          // буфер обмена не дают, если окно потеряло фокус за время сборки — второй клик уже мгновенный
          notify('HTML собран — нажмите «Скопировать» ещё раз');
          return;
        }
        notify('HTML скопирован в буфер обмена');
      }
      // предупреждения планировщика (не загружена картинка и т.п.) — окно остаётся открытым с их списком
      if (!res.warnings.length) setOpen(false);
    } catch (e) {
      notify(`Не получилось: ${(e as Error).message}`);
    }
  };

  const json = async () => {
    try { downloadPayload(doc, (await prepare(doc)).payload); } catch (e) { notify(`Не получилось: ${(e as Error).message}`); }
  };

  const label = busy ? STEP[busy] : failed ? 'Повторить' : `${format === 'copy' ? 'Скопировать' : 'Скачать'}${c.errors ? ' с ошибками' : ''}`;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild><button type="button" className="btn primary"><Download size={15} />Экспорт</button></Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-back" />
        <Dialog.Content className="dialog" aria-describedby={undefined}>
          <div className="dialog-head">
            <Dialog.Title className="h-xl" style={{ margin: 0 }}>Экспорт</Dialog.Title>
            <Dialog.Close asChild><button type="button" className="icon-btn" aria-label="Закрыть"><X size={16} /></button></Dialog.Close>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12.5 }}>
              <span className="muted">Вес HTML{r ? ' — по HTML от n8n' : ''}</span><span className="mono">{size.toFixed(0)} / {GMAIL_LIMIT_KB} КБ</span>
            </div>
            <div className={clsx('meter', level)}><div style={{ width: `${Math.min(100, (size / GMAIL_LIMIT_KB) * 100)}%` }} /></div>
            <div className="hint" style={{ marginBottom: 0 }}>Gmail обрезает письма тяжелее 102 КБ. Картинки в вес не входят — они уйдут ссылками.</div>
          </div>
          <CheckList checks={c.list} />
          {warnings.length > 0 && <CheckList checks={warnings} />}
          <div className="format-cards" role="radiogroup" aria-label="Формат">
            {FORMATS.map(([f, title, sub]) => (
              <button key={f} type="button" role="radio" aria-checked={format === f} className={clsx(format === f && 'on')} onClick={() => setFormat(f)}>
                <b>{title}</b><span>{sub}</span>
              </button>
            ))}
          </div>
          <div className="hint" style={{ margin: 0 }}>
            HTML собирает автоматизация n8n по правилам вёрстки писем: картинки заливаются на demo.promo, тексты остаются текстом.
          </div>
          {failed && <div className="export-error" role="alert">{failed}</div>}
          {!hook && <div className="export-error">Вебхук n8n не настроен — см. n8n/README.md</div>}
          <div className="dialog-foot">
            <button type="button" className="btn ghost" style={{ marginRight: 'auto' }} onClick={json} disabled={!!busy}
              title="Ровно то, что уходит в n8n — для локального прогона генератора">
              <FileJson size={15} />Скачать JSON
            </button>
            <Dialog.Close asChild><button type="button" className="btn ghost">Отмена</button></Dialog.Close>
            <button type="button" className="btn primary" onClick={run} disabled={!hook || !!busy}>
              {failed && !busy ? <RotateCw size={15} /> : <Download size={15} />}{label}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
