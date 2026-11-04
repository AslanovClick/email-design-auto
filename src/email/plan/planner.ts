// Планировщик: письмо из скрытого iframe → plan v5 (как planEmail в code.js плагина).
// Что это — решают модель блока и подсказки data-plan в рендерах; геометрия и стили — из реальной раскладки.
// Правила — ПРАВИЛА_вёрстки_v5: что CSS умеет — вёрсткой, что не умеет — подложкой-картинкой с живым текстом
// поверх, и только если текст не отделить — картинкой целиком.

import { catalogOf } from '@/model/catalog';
import type { Block, EmailDoc } from '@/model/types';
import { normLink, slug } from './names';
import { relRect, type Frame, type RasterMode } from './raster';
import { normColor, styleDiff, textStyle } from './style';
import type { Align, Border, BoxItem, ImgItem, Plan, PlanItem, PlanRadius, Rect, Run, StackItem, TextItem } from './types';

/** Картинка, которую снимет сборка: key стоит в поле file/bg элемента, пока не заменён именем файла. */
export interface ShotRequest { key: string; el: Element; mode: RasterMode; base: string; rect?: Rect; scale?: 1 | 2 }

export interface Draft { body: StackItem; shots: ShotRequest[]; warnings: Plan['warnings'] }

type Paint = { kind: 'none' } | { kind: 'image' } | { kind: 'css'; fill?: string; border?: Border; r?: PlanRadius };

const px = (v: string) => parseFloat(v) || 0;
const SPACES = /[ \t\n\r\f]+/g;   // без  : неразрывный пробел остаётся
const ALIGN: Record<string, Align> = { left: 'left', start: 'left', right: 'right', end: 'right', center: 'center', '-webkit-center': 'center', justify: 'justify' };

class Planner {
  shots: ShotRequest[] = [];
  warnings: Plan['warnings'] = [];
  private blockId = '';
  private blockName = '';
  private n = 0;
  private block: Block | undefined;
  private readonly page: string;
  private readonly blocks: Map<string, Block>;

  constructor(private f: Frame, doc: EmailDoc) {
    this.page = doc.theme.bg;
    this.blocks = new Map(doc.blocks.map((b) => [b.id, b]));
  }

  // --- общее

  cs(el: Element, pseudo?: string) { return this.f.win.getComputedStyle(el, pseudo); }
  rect(el: Element) { return relRect(el, this.f); }
  id() { return `${this.blockId}:${++this.n}`; }

  shot(el: Element, mode: RasterMode, base: string, rect?: Rect): string {
    const key = `#shot${this.shots.length + 1}`;
    this.shots.push({ key, el, mode, base, ...(rect ? { rect } : {}) });
    return key;
  }

  warn(message: string) {
    if (!this.warnings.some((w) => w.id === this.blockId && w.message === message)) this.warnings.push({ id: this.blockId, message });
  }

  visible(el: Element) {
    const cs = this.cs(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
    if (cs.display === 'contents') return true;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  /** Видимые дети; display: contents раскрывается в своих детей. */
  kids(el: Element): Element[] {
    return [...el.children].flatMap((k) => {
      if (k.tagName === 'BR' || k.matches('.e-bgl') || !this.visible(k)) return [];
      return this.cs(k).display === 'contents' ? this.kids(k) : [k];
    });
  }

  contentBox(el: Element): Rect {
    const r = this.rect(el), cs = this.cs(el);
    const l = px(cs.borderLeftWidth) + px(cs.paddingLeft), t = px(cs.borderTopWidth) + px(cs.paddingTop);
    return { x: r.x + l, y: r.y + t, w: r.w - l - px(cs.borderRightWidth) - px(cs.paddingRight), h: r.h - t - px(cs.borderBottomWidth) - px(cs.paddingBottom) };
  }

  link(el: Element): string | undefined {
    const a = el.closest('a');
    return a && this.f.em.contains(a) ? normLink(a.getAttribute('href')) : undefined;
  }

  // --- корень

  plan(): Draft {
    const items: PlanItem[] = [];
    for (const blk of this.f.em.querySelectorAll<HTMLElement>(':scope > .em-blk')) {
      if (!this.visible(blk)) continue;
      this.blockId = blk.dataset.blockId ?? 'blk';
      this.block = this.blocks.get(this.blockId);
      this.blockName = this.block ? catalogOf(this.block.type).name : '';
      this.n = 0;
      const it = this.walk(blk);
      // столбик блока без своей отрисовки — его строки сразу строками письма (как rootKids у плагина)
      if (it?.k === 'stack') items.push(...it.items);
      else if (it) items.push(it);
    }
    return { body: { k: 'stack', id: 'body', x: 0, y: 0, w: 600, h: this.f.emRect.height, items }, shots: this.shots, warnings: this.warnings };
  }

  // --- обход

  walk(el: Element): PlanItem | null {
    if (!this.visible(el) || el.matches('.e-bgl')) return null;
    const hinted = this.hint(el);
    if (hinted !== undefined) return hinted;
    const isSvg = el.namespaceURI === 'http://www.w3.org/2000/svg';
    if (el.tagName === 'IMG' || isSvg || el.matches('.e-ph')) {
      if (el.matches('.e-ph')) this.warn(`В блоке «${this.blockName}» не загружена картинка — в письме будет заглушка`);
      const alt = el.getAttribute('alt') ?? '';
      return this.img(el, (el as HTMLElement).dataset?.planName || slug(alt) || 'img', alt);
    }
    if (this.overlayHost(el)) return this.whole(el);
    if (this.isTextBox(el)) return this.text(el);
    if (this.mixed(el)) return this.whole(el);
    const inner = this.layout(el);
    if (inner === false) return this.whole(el);
    return this.boxed(el, inner);
  }

  /** Точка расширения: блоки с подсказками data-plan в рендерах. undefined — подсказки нет. */
  hint(_el: Element): PlanItem | null | undefined {
    return undefined;
  }

  img(el: Element, base: string, alt: string, ln = this.link(el)): ImgItem {
    const it: ImgItem = { k: 'img', id: this.id(), ...this.rect(el), file: this.shot(el, 'whole', base), alt };
    if (ln) it.ln = ln;
    return it;
  }

  /** Элемент, который CSS почты не повторит (наложение) — картинкой целиком. */
  whole(el: Element): ImgItem {
    this.warn(`В блоке «${this.blockName}» часть собрана картинкой: элементы накладываются`);
    return this.img(el, 'block', '');
  }

  /** Своя отрисовка вокруг содержимого: CSS-бокс, подложка-картинка или ничего. */
  boxed(el: Element, inner: PlanItem | null): PlanItem | null {
    const p = this.paint(el);
    if (p.kind === 'none') return inner;
    if (p.kind === 'image' && !inner) return this.img(el, 'block', '');
    const box: BoxItem = { k: 'box', id: this.id(), ...this.rect(el) };
    if (p.kind === 'css') {
      if (p.fill) box.fill = p.fill;
      if (p.border) box.border = p.border;
      if (p.r) box.r = p.r;
    } else box.bg = this.shot(el, 'own', 'block');
    if (inner) box.content = inner;
    return box;
  }

  /** Есть потомок, спозиционированный поверх этого элемента. */
  overlayHost(el: Element) {
    for (const d of el.querySelectorAll('*')) {
      const pos = this.cs(d).position;
      if ((pos === 'absolute' || pos === 'fixed') && (d as HTMLElement).offsetParent === el && this.visible(d)) return true;
    }
    return false;
  }

  directText(el: Element) {
    return [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.replace(SPACES, ''));
  }

  /** Внутри только строчный текст (и <br>) — собираем как текст. */
  isTextBox(el: Element) {
    if (el.querySelector('img, svg, .e-ph')) return false;
    if (this.directText(el)) return true;
    const kids = [...el.children].filter((k) => k.tagName === 'BR' || this.visible(k));
    return kids.length > 0 && kids.every((k) => k.tagName === 'BR' || this.cs(k).display === 'inline');
  }

  /** Текст вперемешку с блочными детьми или картинками — таблицами не разложить. */
  mixed(el: Element) {
    return this.directText(el);
  }

  // --- текст

  runs(el: Element, st: TextItem['st']): Run[] {
    const out: (Run | '\n')[] = [];
    const visit = (n: Node) => {
      if (n.nodeType === 3) {
        const t = n.textContent!.replace(SPACES, ' ');
        if (!t) return;
        const p = n.parentElement!;
        const run: Run = { t, d: styleDiff(st, textStyle(this.cs(p), this.page)) };
        const ln = this.link(p);
        if (ln) run.ln = ln;
        out.push(run);
      } else if (n.nodeType === 1) {
        const e = n as Element;
        if (e.tagName === 'BR') out.push('\n');
        else if (this.visible(e)) e.childNodes.forEach(visit);
      }
    };
    el.childNodes.forEach(visit);
    // склейка: <br> — в соседний прогон, одинаковые стиль и ссылка — один прогон, пробелы не двоятся
    const runs: Run[] = [];
    let br = '';
    for (const r of out) {
      if (r === '\n') {
        const last = runs[runs.length - 1];
        if (last) last.t = last.t.replace(/ $/, '') + '\n';
        else br += '\n';
        continue;
      }
      const last = runs[runs.length - 1];
      let t = br + r.t;
      br = '';
      if (last && /[ \n]$/.test(last.t)) t = t.replace(/^ /, '');
      if (!t) continue;
      if (last && last.ln === r.ln && JSON.stringify(last.d) === JSON.stringify(r.d)) last.t += t;
      else runs.push({ ...r, t });
    }
    if (runs.length) {
      runs[0].t = runs[0].t.replace(/^[ \n]+/, '');
      const end = runs[runs.length - 1];
      end.t = end.t.replace(/[ \n]+$/, '');
    }
    return runs.filter((r) => r.t);
  }

  /** Число строк текста на экране. */
  visualLines(el: Element) {
    const range = el.ownerDocument.createRange();
    range.selectNodeContents(el);
    const rs = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0).sort((a, b) => a.top - b.top);
    let n = 0, bottom = -Infinity;
    for (const r of rs) {
      if (r.top >= bottom - 2) { n++; bottom = r.bottom; } else bottom = Math.max(bottom, r.bottom);
    }
    return { n: Math.max(1, n), box: range.getBoundingClientRect() };
  }

  text(el: Element): PlanItem | null {
    const cs = this.cs(el);
    const st = textStyle(cs, this.page);
    const runs = this.runs(el, st);
    if (!runs.length) return this.boxed(el, null);
    const cb = this.contentBox(el);
    const { n, box } = this.visualLines(el);
    const emTop = this.f.emRect.top, emLeft = this.f.emRect.left;
    // высота — строками текста; элемент, растянутый выше своих строк (флекс), — по центру текста
    const want = n * Number(st.lh) * st.fs;
    let y = cb.y, h = cb.h;
    if (h > want + 2) { h = want; y = box.top - emTop + box.height / 2 - want / 2; }
    // одна строка — рамка по тексту (как авто-ширина в Figma), несколько — ширина блока, текст переносится
    const wrap = n > 1;
    const x = wrap ? cb.x : box.left - emLeft, w = wrap ? cb.w : box.width;
    const t: TextItem = {
      k: 'text', id: this.id(), x, y, w, h, st, runs,
      ta: ALIGN[cs.textAlign] ?? 'left', wrap, lines: runs.map((r) => r.t).join('').split('\n').length,
    };
    return this.boxed(el, t);
  }

  // --- раскладка детей

  /** Дети → строки по перекрытию по вертикали. false — дети наезжают друг на друга (только картинкой). */
  lines(els: Element[]) {
    const items = els.map((el) => ({ el, r: el.getBoundingClientRect() })).sort((a, b) => a.r.top - b.r.top || a.r.left - b.r.left);
    const lines: { items: typeof items; top: number; bottom: number }[] = [];
    for (const it of items) {
      const line = lines.find((l) => it.r.top < l.bottom - 1 && it.r.bottom > l.top + 1);
      if (line) { line.items.push(it); line.top = Math.min(line.top, it.r.top); line.bottom = Math.max(line.bottom, it.r.bottom); }
      else lines.push({ items: [it], top: it.r.top, bottom: it.r.bottom });
    }
    const overlap = lines.some((l) => l.items.some((a, i) => l.items.some((b, j) => j > i
      && Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left) > 2)));
    if (overlap) return false;
    lines.sort((a, b) => a.top - b.top);
    for (const l of lines) l.items.sort((a, b) => a.r.left - b.r.left);
    return lines.map((l) => l.items.map((i) => i.el));
  }

  layout(el: Element): PlanItem | null | false {
    const lines = this.lines(this.kids(el));
    if (lines === false) return false;
    const cs = this.cs(el);
    const rows: PlanItem[] = [];
    for (const line of lines) {
      const cells = line.map((k) => this.walk(k)).filter((x): x is PlanItem => !!x);
      if (cells.length === 1) rows.push(cells[0]);
      else if (cells.length) rows.push(this.row(cells, cs.alignItems));
    }
    if (rows.length <= 1) return rows[0] ?? null;
    const cb = this.contentBox(el);
    const top = Math.min(...rows.map((r) => r.y)), bottom = Math.max(...rows.map((r) => r.y + r.h));
    const stack: StackItem = { k: 'stack', id: this.id(), x: cb.x, y: top, w: cb.w, h: bottom - top, items: rows };
    if (cs.display.includes('flex') && cs.flexDirection.startsWith('column')) {
      if (/^(flex-)?start$/.test(cs.alignItems)) stack.ca = 'MIN';
      else if (/^(flex-)?end$/.test(cs.alignItems)) stack.ca = 'MAX';
    }
    return stack;
  }

  row(cells: PlanItem[], alignItems: string): PlanItem {
    const x = Math.min(...cells.map((c) => c.x)), y = Math.min(...cells.map((c) => c.y));
    const w = Math.max(...cells.map((c) => c.x + c.w)) - x, h = Math.max(...cells.map((c) => c.y + c.h)) - y;
    const va = alignItems === 'center' ? 'middle' : /end$/.test(alignItems) ? 'bottom' : 'top';
    return { k: 'row', id: this.id(), x, y, w, h, cells, va };
  }

  // --- своя отрисовка

  paint(el: Element): Paint {
    const cs = this.cs(el);
    const wkMask = cs.getPropertyValue('-webkit-mask-image');
    const pseudo = ['::before', '::after'].some((p) => {
      const ps = this.cs(el, p);
      return ps.content !== 'none' && ps.content !== 'normal' && ps.display !== 'none';
    });
    if (cs.backgroundImage !== 'none' || cs.maskImage !== 'none' || (wkMask && wkMask !== 'none') || cs.clipPath !== 'none'
      || cs.transform !== 'none' || cs.filter !== 'none' || cs.boxShadow !== 'none' || px(cs.opacity) < 1 || pseudo) return { kind: 'image' };
    const r = this.rect(el);
    // рамка: только сплошная и одного цвета со всех сторон, где она есть
    const sides = (['Top', 'Right', 'Bottom', 'Left'] as const).map((s) => ({ w: px(cs[`border${s}Width`]), style: cs[`border${s}Style`], c: cs[`border${s}Color`] }));
    const drawn = sides.filter((s) => s.w > 0 && s.style !== 'none' && s.style !== 'hidden');
    let border: Border | undefined;
    if (drawn.length) {
      if (drawn.some((s) => s.style !== 'solid' || s.c !== drawn[0].c)) return { kind: 'image' };
      const c = normColor(drawn[0].c, this.page);
      if (c) border = { w: sides.map((s) => (drawn.includes(s) ? Math.round(s.w) : 0)) as Border['w'], c };
    }
    const fill = normColor(cs.backgroundColor, this.page) ?? undefined;
    if (!fill && !border) return { kind: 'none' };
    // скругление: эллипс (разные радиусы по осям) CSS почты не повторит
    const corners: number[] = [];
    for (const v of [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius]) {
      const [a, b = a] = v.split(' ');
      const toPx = (s: string, side: number) => (s.endsWith('%') ? (parseFloat(s) / 100) * side : px(s));
      const rx = toPx(a, r.w), ry = toPx(b, r.h);
      if (Math.abs(rx - ry) > 1 && Math.min(rx, ry) < Math.min(r.w, r.h) / 2) return { kind: 'image' };
      corners.push(Math.round(Math.min(rx, ry, r.w / 2, r.h / 2)));
    }
    const rr: PlanRadius | undefined = corners.every((c) => c === corners[0]) ? corners[0] || undefined : corners as [number, number, number, number];
    return { kind: 'css', fill, border, r: rr };
  }
}

export function planBody(f: Frame, doc: EmailDoc): Draft {
  return new Planner(f, doc).plan();
}
