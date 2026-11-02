import * as Dialog from '@radix-ui/react-dialog';
import clsx from 'clsx';
import { Download, X } from 'lucide-react';
import { useState } from 'react';
import { GMAIL_LIMIT_KB, runChecks } from '@/email/checks';
import { copyHtml, exportHtml, exportMailZip, exportZip } from '@/email/exporter';
import type { EmailDoc } from '@/model/types';
import { notify } from '@/store/ui';
import { CheckList } from './CheckList';

type Format = 'zip' | 'html' | 'copy' | 'mail';

const FORMATS: [Format, string, string][] = [
  ['zip', 'ZIP', 'HTML + папка с картинками для хостинга'],
  ['html', 'HTML', 'один файл, картинки внутри'],
  ['copy', 'Код', 'скопировать в буфер обмена'],
  ['mail', 'Для рассылки', 'ZIP: таблицы для Gmail и Outlook, кнопки картинками'],
];

const HINTS: Record<Format, string> = {
  zip: 'Вёрстка как в превью — для просмотра и правок. Для отправки берите «Для рассылки».',
  html: 'Вёрстка как в превью — для просмотра и правок. Для отправки берите «Для рассылки».',
  copy: 'Вёрстка как в превью — для просмотра и правок. Для отправки берите «Для рассылки».',
  mail: 'Письмо пересобирается таблицами со стилями в тегах. Кнопки, разделители и графику, которую почта не умеет, — картинками в папке images/ для хостинга. Тексты остаются текстом.',
};

export function ExportDialog({ doc }: { doc: EmailDoc }) {
  const [format, setFormat] = useState<Format>('zip');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const c = runChecks(doc);
  const level = c.size >= GMAIL_LIMIT_KB ? 'error' : c.size >= 90 ? 'warn' : '';

  const run = async () => {
    try {
      if (format === 'zip') { const n = await exportZip(doc); notify(`ZIP собран: HTML и картинок — ${n}`); }
      if (format === 'html') { await exportHtml(doc); notify('HTML скачан'); }
      if (format === 'copy') { await copyHtml(doc); notify('HTML скопирован в буфер обмена'); }
      if (format === 'mail') {
        setBusy(true);
        const r = await exportMailZip(doc);
        notify(`Готово: HTML ${r.kb.toFixed(0)} КБ, картинок — ${r.images}`);
      }
      setOpen(false);
    } catch (e) {
      notify(`Не получилось: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

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
              <span className="muted">Вес HTML</span><span className="mono">{c.size.toFixed(0)} / {GMAIL_LIMIT_KB} КБ</span>
            </div>
            <div className={clsx('meter', level)}><div style={{ width: `${Math.min(100, (c.size / GMAIL_LIMIT_KB) * 100)}%` }} /></div>
            <div className="hint" style={{ marginBottom: 0 }}>Gmail обрезает письма тяжелее 102 КБ. Картинки в вес не входят — они уйдут ссылками.</div>
          </div>
          <CheckList checks={c.list} />
          <div className="format-cards" role="radiogroup" aria-label="Формат">
            {FORMATS.map(([f, title, sub]) => (
              <button key={f} type="button" role="radio" aria-checked={format === f} className={clsx(format === f && 'on')} onClick={() => setFormat(f)}>
                <b>{title}</b><span>{sub}</span>
              </button>
            ))}
          </div>
          <div className="hint" style={{ margin: 0 }}>{HINTS[format]}</div>
          <div className="dialog-foot">
            <Dialog.Close asChild><button type="button" className="btn ghost">Отмена</button></Dialog.Close>
            <button type="button" className="btn primary" onClick={run} disabled={busy}>
              <Download size={15} />{busy ? 'Собираю…' : format === 'copy' ? 'Скопировать' : 'Скачать'}{!busy && c.errors ? ' с ошибками' : ''}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
