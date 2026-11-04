// Сборка письма для n8n: план → снимки картинок → имена файлов с отпечатком → payload.

import { clientPreset } from '@/model/presets';
import type { EmailDoc } from '@/model/types';
import { FileNamer, folderFor, hostedUrl } from './names';
import { buildPayload, sizeWarning, toBase64 } from './payload';
import { planBody } from './planner';
import { mountEmail, shoot, shootBackground, type Shot } from './raster';
import type { ImageNode, Payload, Plan, PlanAsset, StackItem } from './types';

export interface Built {
  payload: Payload;
  /** Файлы картинок: имя → содержимое (для ZIP — те же, что ушли в n8n). */
  files: Map<string, Blob>;
  /** Имя файла → ссылка на хостинге. */
  urls: Record<string, string>;
  warnings: string[];
}

const ext = (s: Shot) => (s.type === 'image/jpeg' ? 'jpg' : 'png');

export async function buildMail(doc: EmailDoc): Promise<Built> {
  const f = await mountEmail(doc);
  try {
    const draft = planBody(f, doc);
    const client = clientPreset(doc.client).name;
    const folder = folderFor(doc, client);
    const namer = new FileNamer();
    const files = new Map<string, Blob>();
    const assets: PlanAsset[] = [];
    const add = (base: string, s: Shot) => {
      const file = namer.name(base, s.hash, ext(s));
      if (!files.has(file)) {
        files.set(file, s.blob);
        assets.push({ id: file, file, w: Math.round(s.rect.w), h: Math.round(s.rect.h), mode: 'app' });
      }
      return file;
    };

    const back = await shootBackground(f, doc);
    const bg = back ? add('bg', back) : null;
    const byKey = new Map<string, string>();
    for (const s of draft.shots) byKey.set(s.key, add(s.base, await shoot(s.el, f, { mode: s.mode, scale: s.scale, rect: s.rect })));
    const body = JSON.parse(JSON.stringify(draft.body), (k, v) => ((k === 'file' || k === 'bg') && byKey.has(v) ? byKey.get(v) : v)) as StackItem;

    const plan: Plan = {
      v: 5, width: 600, height: Math.round(f.emRect.height), color: doc.theme.bg, bg, folder, title: 'Mail', assets, body,
      warnings: draft.warnings,
    };
    const nodes: ImageNode[] = [];
    let bytes = 0;
    for (const a of assets) {
      const blob = files.get(a.file)!;
      bytes += blob.size;
      nodes.push({ id: a.id, name: a.file, file: a.file, folder, width: a.w, height: a.h, bgImageData: await toBase64(blob) });
    }
    const warnings = draft.warnings.map((w) => w.message);
    const heavy = sizeWarning(bytes);
    if (heavy) warnings.push(heavy);
    return {
      payload: buildPayload(doc, client, plan, nodes),
      files,
      urls: Object.fromEntries(assets.map((a) => [a.file, hostedUrl(folder, a.file)])),
      warnings,
    };
  } finally {
    f.remove();
  }
}
