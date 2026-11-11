# «Собрать по ТЗ» с ИИ — план работ

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ТЗ любого вида (текст, `.md`, `.docx`) через n8n и OpenRouter превращается в `Brief`, из него правилами — в редактируемый текст плана, из плана — в письмо в редакторе.

**Architecture:** очистка ТЗ → вебхук n8n `brief-plan` (промпт и JSON-схема из репозитория, модель Haiku с запасной DeepSeek) → `validateBrief` → `planFromBrief` (нынешние правила `buildEmail`) → `planToText` ⇄ `parsePlan` (текст плана в левом окне, правая панель на лету) → `docFromPlan` → черновик. Без ИИ — `parseBrief` вместо вебхука, дальше то же.

**Tech Stack:** React 19, TypeScript 7, Vitest 5 (unit / browser), JSZip, n8n (webhook 2.1, code 2, if 2.3, httpRequest 4.4, respondToWebhook 1.1), OpenRouter Chat Completions, Node 24 (скрипты `.ts` с загрузчиком алиасов).

**Spec:** `docs/superpowers/specs/2026-11-11-brief-ai-plan-design.md`

## Global Constraints

- Файлы вне репозитория не менять. Ветка `feature/brief-ai`, коммит в конце каждой задачи, сообщения и комментарии по-русски.
- Ключ OpenRouter — только в креденшле n8n и в `.env.local` (для скриптов). Никаких `VITE_*` с ключом; в коде страницы ключа нет.
- Модели: по умолчанию `anthropic/claude-haiku-5.5`, запасная `deepseek/deepseek-v3.2` (поле `models` запроса OpenRouter); `temperature: 0`, `max_tokens: 4000`.
- Запрос к вебхуку — только `{ text, source: 'clickable-mail' }`; ТЗ после очистки ≤ 20 000 знаков; таймаут ответа 60 с; ответ всегда HTTP 200: `{ ok: true, brief, model, usage }` / `{ ok: false, error }`.
- Модель ничего не придумывает: тексты дословно из ТЗ, обращение → `{{name}}`, рыба и «по макету» — только правилами кода.
- Названия команд и лиг — как в ТЗ; id из библиотеки — отдельными полями.
- Примеры в промпте — придуманные; `examples/` — проверочный набор.

## Review Focus

- ТЗ не на русском (английский, испанский) — тексты в плане как в ТЗ, без перевода. Тест — задача 6 (придуманное английское ТЗ).
- Ответ модели с лишними полями, неизвестным клиентом, мусорными секциями — `validateBrief` чистит, план строится, пользователю — список замечаний. Тест — задача 2.
- Опечатка в заголовке блока или поле в тексте плана — строка подсвечена номером, остальное собирается. Тест — задача 4.
- Повторное «Составить план» после правок плана — правки не пропадают молча (подтверждение). Тест — задача 9.
- ТЗ с встроенными картинками (Playbaze, 900 КБ) — после очистки в лимите, n8n на слишком длинный текст отвечает понятной ошибкой. Тест — задачи 1 и 7.

---

### Task 1: Ветка, загрузчик для скриптов, очистка ТЗ

**Files:**
- Create: `n8n/tools/alias.mjs`, `n8n/tools/alias-hooks.mjs`, `src/brief/clean.ts`, `src/brief/clean.test.ts`
- Modify: `.env.example` (`VITE_N8N_BRIEF_WEBHOOK_URL=`, `OPENROUTER_API_KEY=`, `OPENROUTER_MODEL=`)

**Interfaces:**
- Produces:
  - `node --import ./n8n/tools/alias.mjs <script.ts>` — скрипты импортируют модули `src/` как в приложении: хук `resolve` превращает `@/x` в `src/x`, а относительным и `@/` импортам без расширения дописывает `.ts` / `.tsx` / `/index.ts` (проверено: так импортируются `parseBrief` и `buildEmail`).
  - `cleanBrief(text: string): string` — разметка Markdown долой (`**`, `__`, `\` перед знаками, `#` в начале строки), `data:image/…;base64,…` и ссылки-картинки `![…][…]` / `![…](…)` → `[картинка]`, определения `[imageN]: <…>` удаляются; `[текст](url)` → `текст (url)`; строки списков `* ` → `- `; `\r\n` → `\n`; три и больше пустых строк → одна пустая.
  - `readBriefFile(name: string, data: ArrayBuffer): Promise<string>` — `.docx` (абзацы `word/document.xml`, пункт списка `<w:numPr>` → `- `, `<w:br/>` → `\n`, `<w:tab/>` → таб, сущности XML), `.md`/`.txt` (UTF-8), затем `cleanBrief`; иное расширение → `Error('Поддерживаются файлы .docx, .md и .txt')`.
  - `BRIEF_MAX = 20_000`.

- [ ] **Step 1: Ветка** `git checkout -b feature/brief-ai`.
- [ ] **Step 2: Тесты** (`clean.test.ts`, файлы из `examples/` через `node:fs`):

```ts
test('Markdown: без ** и \\!, списки и абзацы на месте', async () => {
  const t = await readBriefFile('a.md', file('Planbet No Deposit Freebet Sport.md'));
  expect(t).not.toMatch(/\*\*|\\!/);
  expect(t).toContain('Title: Пятничный фрибет для вас');
  expect(t).toContain('- Войдите в свой аккаунт Planbet');
});
test('встроенные картинки вырезаны', async () => {
  const t = await readBriefFile('p.md', file('Playbaze  Cashback 09.11.2026.md'));
  expect(t).not.toContain('base64');
  expect(t).toContain('[картинка]');
  expect(t.length).toBeLessThan(BRIEF_MAX);
  expect(t).toContain('https://img.example.com/banner.png');
});
test('docx: абзацы и строки деталей', async () => {
  const t = await readBriefFile('x.docx', file('22bit France - Turkey UEFA Nations League.docx'));
  expect(t).toContain('Детали матча:');
  expect(t).toContain('1 Место в группе Лиги наций 26/27 4');
});
test('docx: пункты списка — «- »', async () => {
  const t = await readBriefFile('c.docx', file('20Bet top win Casino October 2026.docx'));
  expect(t).toContain('- Провайдер: Pragmatic Play');
});
test('чужой формат — понятная ошибка', async () =>
  await expect(readBriefFile('a.pdf', new ArrayBuffer(1))).rejects.toThrow('.docx, .md и .txt'));
test('вставленный Markdown чистится так же', () => expect(cleanBrief('**Title:** A\\!')).toBe('Title: A!'));
```

- [ ] **Step 3: Падают → реализовать → зелёные** (`npm run test:unit`), `npm run typecheck`.
- [ ] **Step 4: Коммит** `ТЗ: очистка и чтение файлов, загрузчик модулей для скриптов`.

---

### Task 2: Расширение `Brief` и проверка ответа модели

**Files:**
- Modify: `src/brief/parse.ts` (типы)
- Create: `src/brief/schema.ts`, `src/brief/schema.test.ts`

**Interfaces:**
- Produces (типы в `parse.ts`, все новые поля необязательные — разбор правилами их не заполняет):
  - `Match` + `odds?: string` (`'2.10 / 3.40 / 3.25'`), `pick?: string`, `coef?: string`, `team1Id?: string`, `team2Id?: string`
  - `Brief` + `leagueId?: string`, `heroImage?: string`
  - секции: `button` + `link?: string`; `timer` + `until?: string` (`'22.11.2026 23:59'` — как в ТЗ)
- Produces (`schema.ts`):
  - `BRIEF_JSON_SCHEMA: object` — JSON Schema ответа (для `response_format: { type: 'json_schema', json_schema: { name: 'brief', strict: false, schema } }`), поля и виды секций — как у `Brief`.
  - `validateBrief(raw: unknown): { brief: Brief; issues: string[] }` — не бросает: не объект → пустой `Brief` + issue; строки обрезаются, `name`-плейсхолдеры → `{{name}}` (`withName`); `client` не из `CLIENT_PRESETS` → `null` + issue; `kind` не из четырёх → `'promo'`; секция неизвестного вида или без обязательных полей — выбрасывается + issue; `team*Id`/`leagueId` не из библиотеки — выбрасываются; `link`/`heroImage` не `http(s)://` — выбрасываются; строки фактов — только виды `FACT_ROWS` (`stat/form/h2h/text/fact`) с их полями.

- [ ] **Step 1: Тесты**

```ts
test('нормальный ответ проходит как есть', () => {
  const { brief, issues } = validateBrief(PLANBET);   // фикстура в тесте: ответ Haiku из чернового прогона
  expect(issues).toEqual([]);
  expect(brief.sections.map((s) => s.k)).toEqual(['top', 'button', 'text', 'button', 'steps', 'timer', 'note']);
});
test('чужой клиент и мусор', () => {
  const { brief, issues } = validateBrief({ client: 'playbaze', kind: 'news', subject: ' Тема ', sections: [{ k: 'banner' }, { k: 'button' }, { k: 'button', text: 'Go', link: 'javascript:x' }] });
  expect([brief.client, brief.kind, brief.subject]).toEqual([null, 'promo', 'Тема']);
  expect(brief.sections).toEqual([{ k: 'button', text: 'Go' }]);
  expect(issues.join('\n')).toMatch(/клиент.*playbaze/i);
});
test('id из библиотеки — только существующие', () => {
  const { brief } = validateBrief({ matches: [{ team1: 'Реал', team1Id: 'real-madrid', team2: 'X', team2Id: 'nope' }], leagueId: 'uefa-nations' });
  expect([brief.matches[0].team1Id, brief.matches[0].team2Id, brief.leagueId]).toEqual(['real-madrid', undefined, 'uefa-nations']);
});
test('не объект — пустой Brief и замечание', () => {
  const r = validateBrief('oops');
  expect(r.brief.sections).toEqual([]);
  expect(r.issues.length).toBe(1);
});
test('схема перечисляет все виды секций', () =>
  expect(JSON.stringify(BRIEF_JSON_SCHEMA)).toMatch(/"top".*"text".*"button".*"steps".*"timer".*"note".*"cards".*"slots".*"facts"/s));
```

- [ ] **Step 2–4:** падают → реализовать → зелёные, typecheck.
- [ ] **Step 5: Коммит** `ТЗ: расширенный Brief и проверка ответа модели`.

---

### Task 3: Сборка: план из `Brief` и письмо из плана

**Files:**
- Modify: `src/brief/build.ts`, `src/model/types.ts` (`brief?: { source: string; plan?: string; notes: string[] }`)
- Create: `src/brief/build.test.ts`

**Interfaces:**
- Produces:
  - `interface PlanDoc { client: string; kind: BriefKind; name: string; subject: string; preheader: string; blocks: Planned[]; notes: string[] }` — `notes` — только заметки из ТЗ (`brief.notes`).
  - `planFromBrief(brief: Brief, clientId: string): PlanDoc` — нынешние правила `buildEmail` (порядок, варианты, рыба, библиотека) **без** создания письма и **без** выводимых заметок; плюс новые поля: `odds` матча → `odds` блока коэффициентов (origin `tz`), `pick`/`coef` → `recodds` (`tz`), `link` кнопки → `cta.link`, `until` → `timer.date`, `heroImage` → `hero.image` (+ `imageOn: true`), `team*Id`/`leagueId` → гербы и лого по id (нет id — `findTeam`/`findLeague`). Текст шапки (`top`) → `hero.picText` (новое поле данных hero, не рисуется).
  - `derivedNotes(blocks: Block[]): string[]` — заметки, которые следуют из блоков: картинка hero за дизайнером (нет `image`); `Текст для картинки hero: «…»` (`picText`); таймер — проставить значения (нет `date`); гербов/лого лиги нет в библиотеке; рыба в тексте; примерные коэффициенты/«Рекомендуем» (значения по умолчанию); картинки слотов и Inner — за дизайнером. Формулировки — как сейчас в `buildEmail`.
  - `originOf(b: Block): Origin` — `fish` (текст = рыба), `design` (данные = умолчания блока: коэффициенты, «Рекомендуем», «Bet Now», стандартный футер), иначе `tz`.
  - `docFromPlan(plan: PlanDoc): EmailDoc` — `createEmail(plan.client, 'blank')`, имя/тема/прехедер, блоки (hero — первым, футер — последним), `randomizeStyle`, `brief.notes = plan.notes`.
  - `buildEmail(brief, clientId)` — остаётся обёрткой `{ doc: docFromPlan(p), plan: p.blocks }` до задачи 9.

- [ ] **Step 1: Тесты**

```ts
const planbet = parseBrief(cleanBrief(read('Planbet No Deposit Freebet Sport.md')));
test('правила сборки не изменились', () =>
  expect(planFromBrief(planbet, 'planbet').blocks.map((p) => p.block.type)).toEqual(buildEmailBefore));   // снимок типов до рефакторинга
test('настоящие коэффициенты и «Рекомендуем» из ТЗ', () => {
  const p = planFromBrief({ ...base, matches: [{ date: '15.11', team1: 'Spain', team2: 'England', players: '', odds: '1.9 / 3.4 / 4.2', pick: 'П1', coef: '1.9' }] }, 'vave');
  const odds = p.blocks.find((x) => x.block.type === 'odds')!;
  expect([odds.block.data.odds, odds.origin]).toEqual(['1.9 / 3.4 / 4.2', 'tz']);
  expect(p.blocks.find((x) => x.block.type === 'recodds')!.block.data).toMatchObject({ pick: 'П1', coef: '1.9' });
});
test('ссылка кнопки, окончание таймера, картинка баннера', () => {
  const p = planFromBrief({ ...base, heroImage: 'https://img/x.png', sections: [{ k: 'button', text: 'Go', link: 'https://x' }, { k: 'timer', title: 'До конца:', until: '22.11.2026 23:59' }] }, 'planbet');
  expect(p.blocks[0].block.data).toMatchObject({ image: 'https://img/x.png', imageOn: true });
  expect(p.blocks.find((x) => x.block.type === 'cta')!.block.data.link).toBe('https://x');
  expect(p.blocks.find((x) => x.block.type === 'timer')!.block.data.date).toBe('22.11.2026 23:59');
});
test('гербы по id, название — как в ТЗ', () => {
  const p = planFromBrief({ ...base, matches: [{ date: '', team1: 'Реал', team1Id: 'real-madrid', team2: 'Барса', team2Id: 'fc-barcelona', players: '' }] }, '20bet');
  expect(p.blocks[0].block.data).toMatchObject({ team1: 'Реал', team1Logo: expect.stringContaining('real-madrid') });
});
test('выводимые заметки следуют за блоками', () => {
  const p = planFromBrief(planbet, 'planbet');
  expect(derivedNotes(p.blocks.map((x) => x.block))).toContain('Таймер: проставьте значения и дату окончания акции');
  const noTimer = p.blocks.filter((x) => x.block.type !== 'timer').map((x) => x.block);
  expect(derivedNotes(noTimer).join()).not.toMatch(/Таймер/);
});
test('происхождение блока узнаётся по данным', () => {
  const p = planFromBrief(planbet, 'planbet');
  for (const x of p.blocks) expect(originOf(x.block)).toBe(x.origin);
});
test('письмо из плана: клиент, тема, порядок, заметки ТЗ', () => {
  const doc = docFromPlan(planFromBrief(planbet, 'planbet'));
  expect([doc.client, doc.subject, doc.blocks[0].type, doc.blocks.at(-1)!.type]).toEqual(['planbet', 'Пятничный фрибет для вас', 'hero', 'footer']);
});
```

`buildEmailBefore` — снимок `buildEmail(planbet,…).plan.map(type)` на `main` до правок (вписать константой в тест на шаге 1).

- [ ] **Step 2–4:** падают → рефакторинг и новые поля → зелёные (весь `npm run test`), typecheck.
- [ ] **Step 5: Коммит** `ТЗ: план из Brief и письмо из плана, настоящие данные из ТЗ`.

---

### Task 4: Текст плана

**Files:**
- Create: `src/brief/planText.ts`, `src/brief/planText.test.ts`

**Interfaces:**
- Consumes: `PlanDoc`, `originOf` (3); `CATALOG`, `FIELDS`, `HERO_PRESETS`, `HERO_HEADERS`, `CLIENTS` (есть).
- Produces: `planToText(plan: PlanDoc): string`; `parsePlan(text: string, fallbackClient: string): { plan: PlanDoc; errors: PlanError[] }`; `interface PlanError { line: number; text: string; message: string }`.

Синтаксис (решение для §6.2 спеки):
- Шапка до первого блока: `Клиент:` (название клиента из `CLIENTS`), `Тип:` (`Спорт|Казино|VIP|Промо`), `Название:`, `Тема:`, `Прехедер:`. Неизвестный клиент — ошибка строки, клиент — `fallbackClient`.
- Блок: `[<имя блока>( · <вариант>)?]( <главное поле>)?`. Имена — `catalogOf(type).name`, варианты — `variants` каталога; у hero вариант — название компоновки `HERO_PRESETS` (задаёт `v`, `imageOn`, `teamsOn`). Сравнение без учёта регистра и пробелов. Нет варианта — 0.
- Главное поле на строке заголовка: кнопка — `text`, текст «Малый заголовок» — `title`, «Важное примечание» — `note`, таймер — `title`, разделитель — нет.
- Поля: `<подпись поля>: значение`, подписи — `label` из `FIELDS[type]` плюс короткие синонимы: hero и inner `Команды: A – B` (→ `team1`/`team2`), `Хедер:` (название из `HERO_HEADERS` → `hv`), `Текст для картинки:` (→ `picText`), `Заголовок:` (→ `title`), `Окончание:` (таймер → `date`), футер VIP `Менеджер:` / `Почта:` / `Часы:`.
- Поле вида `paragraphs`/`textarea` текста (`text`) — абзацы после полей, через пустую строку; строки внутри абзаца — переводы строк.
- Поле вида `items` — строки `- …`; подполя — через ` | ` в порядке полей типа строки; у фактов (`FACT_ROWS`) строка начинается видом: `- Цифры: l | параметр | r`, `- Форма: l | параметр (подпись) | r`, `- Три значения: заголовок | значения | подписи`, `- Абзац: текст`, `- Факт: выделение | текст`.
- Картинки: только `http(s)`-ссылки (data URL в план не пишется — их грузят в редакторе); гербы и лого не пишутся — выводятся из названий при сборке.
- `planToText` пишет поле, только если значение отличается от умолчания блока (`createBlock`), главное поле — всегда; `parsePlan` недостающие поля берёт по умолчанию — поэтому `planToText(parsePlan(planToText(p)).plan) === planToText(p)`.
- После последнего блока — `Для дизайнера:` и строки `- …` → `plan.notes`.
- Непонятая строка (неизвестный блок/вариант/поле, поле вне блока) → `PlanError` с номером строки (с 1), строка пропускается, разбор продолжается.

- [ ] **Step 1: Тесты**

```ts
test('обратимость на плане из каждого ТЗ примеров (разбор правилами)', () => {
  for (const f of EXAMPLES) {                      // все файлы examples/, через readBriefFile + parseBrief + planFromBrief
    const text = planToText(planOf(f));
    const { plan, errors } = parsePlan(text, '20bet');
    expect(errors, f).toEqual([]);
    expect(planToText(plan), f).toBe(text);
  }
});
test('обратимость на всех видах блоков и вариантах', () => {   // по блоку на каждый (type, v) из CATALOG, кроме hidden
  const text = planToText({ ...head, blocks: ALL_KINDS.map((block) => ({ block, origin: 'tz' })) });
  expect(planToText(parsePlan(text, '20bet').plan)).toBe(text);
});
test('пример из спеки читается', () => {
  const { plan, errors } = parsePlan(SPEC_EXAMPLE, '20bet');    // текст §6.2 спеки
  expect(errors).toEqual([]);
  expect(plan.blocks.map((b) => b.block.type)).toEqual(['hero', 'cta', 'text', 'cta', 'text', 'bullets', 'timer', 'text', 'footer']);
  expect(plan.notes).toEqual(['Дедлайн активации: 22 ноября, 23:59 UTC', 'Ссылка «здесь» в сноске — нужен URL от клиента']);
});
test('опечатки — ошибки строк, остальное собирается', () => {
  const { plan, errors } = parsePlan('Тема: X\n[Кнопкa] Go\n[Кнопка] Ok\nЦвет: красный\n[Футер]', '20bet');
  expect(errors.map((e) => e.line)).toEqual([2, 4]);
  expect(plan.blocks.map((b) => b.block.type)).toEqual(['cta', 'footer']);
});
test('удалённый и переставленный блоки — как в тексте', () => { /* переставить две кнопки и удалить таймер → порядок и состав совпадают */ });
test('неизвестный клиент — ошибка и запасной клиент', () => {
  const { plan, errors } = parsePlan('Клиент: Playbaze\n[Футер]', 'vave');
  expect([plan.client, errors[0].line]).toEqual(['vave', 1]);
});
```

- [ ] **Step 2–4:** падают → реализовать → зелёные, typecheck.
- [ ] **Step 5: Коммит** `ТЗ: текст плана — запись и разбор`.

---

### Task 5: Промпт, сравнение моделей, записанные ответы

**Files:**
- Create: `src/brief/prompt.ts`, `src/brief/prompt.test.ts`, `n8n/tools/eval-brief.ts`, `src/brief/fixtures/synthetic/vip.txt`, `src/brief/fixtures/synthetic/cards.txt`, `src/brief/fixtures/synthetic/english.txt`, `src/brief/fixtures/answers/<имя>.json` (записанные ответы)

**Interfaces:**
- Consumes: `BRIEF_JSON_SCHEMA` (2), `readBriefFile`, `cleanBrief` (1), `validateBrief` (2), `planFromBrief` (3), `planToText` (4).
- Produces:
  - `systemPrompt(): string` — роль, правила (§7 спеки + Global Constraints), описание полей `Brief` и видов секций/строк фактов, справочники: клиенты (`id — название`), лиги и команды библиотеки (`id — название`), типы писем; два придуманных примера «ТЗ → JSON» (промо с шагами и матч с деталями — не из `examples/`).
  - `openRouterRequest(text: string): object` — тело запроса: `{ models: [MODEL, FALLBACK], messages: [{ role: 'system', content: systemPrompt() }, { role: 'user', content: text }], temperature: 0, max_tokens: 4000, response_format: { type: 'json_schema', json_schema: { name: 'brief', strict: false, schema: BRIEF_JSON_SCHEMA } } }`; `MODEL = 'anthropic/claude-haiku-5.5'`, `FALLBACK = 'deepseek/deepseek-v3.2'`.
  - `node --import ./n8n/tools/alias.mjs n8n/tools/eval-brief.ts [--models a,b,c] [--record]` — ключ из `.env.local`; все ТЗ из `examples/` и `src/brief/fixtures/synthetic/`; для каждой пары «ТЗ × модель»: сырой ответ, `validateBrief` (issues), текст плана, время, токены, цена → `n8n/out/brief-eval/…`, сводка `summary.md`; `--record` — ответы **первой** модели списка → `src/brief/fixtures/answers/<имя ТЗ>.json` (`{ model, content }`).

- [ ] **Step 1: Тесты** (`prompt.test.ts`): в промпте есть все id клиентов, лиг и команд; нет текстов из `examples/` (например, `'Пятничный фрибет для вас'`, `'<игрок из ТЗ>'`); `openRouterRequest('x')` — модели, температура, `max_tokens`, схема.
- [ ] **Step 2–4:** падают → реализовать → зелёные.
- [ ] **Step 5: Придуманные ТЗ** — VIP (подпись менеджера Remi, почта, часы; текст; кнопка), бонусы карточками (3 карточки: заголовок, крупная цифра, подзаголовок, текст), английское ТЗ (Title/Pre-header/Text/button на английском).
- [ ] **Step 6: Прогон** `--models anthropic/claude-haiku-5.5,deepseek/deepseek-v3.2,google/gemma-4-31b-it:free` → прочитать `summary.md` и планы; промпт править, пока на Haiku все проверки §10 спеки проходят (ориентир — задача 6). Затем `--models anthropic/claude-haiku-5.5 --record`.
- [ ] **Step 7: Коммит** `ТЗ: промпт модели, сравнение моделей, записанные ответы`.

---

### Task 6: Приёмка на всех ТЗ (записанные ответы)

**Files:**
- Create: `src/brief/accept.test.ts`

**Interfaces:**
- Consumes: фикстуры (5), всё из 1–4.

- [ ] **Step 1: Тесты** — для каждого ТЗ: `validateBrief(JSON.parse(answer))` → issues пусты → `planFromBrief` → `planToText` → `parsePlan` без ошибок → `docFromPlan`; плюс по ТЗ (спека §10):

```ts
check('Planbet No Deposit', (p, doc) => {
  expect(count(p, 'cta')).toBe(2); expect(steps(p)).toHaveLength(3);
  expect(has(p, 'timer')).toBe(true); expect(textVariant(p, 3)).toBe(true);
  expect(hero(p).data.picText).toMatch(/Пятница с фрибетом/);
  expect(doc.subject).toBe('Пятничный фрибет для вас');
});
check('20Bet top win Sport', (p) => { expect(count(p, 'cta')).toBe(2); expect(allText(p)).toContain('<команда из ТЗ>'); });
check('20Bet top win Casino', (p) => expect(allText(p)).toMatch(/<слот из ТЗ>[\s\S]*Pragmatic Play/));
check('Vave', (p) => { expect(teams(p)).toEqual([['Spain', 'England'], ['Belgium', 'Italy']]); expect(hero(p).data.league).toMatch(/Nations League/); });
check('22bit', (p) => { expect(factRows(p).some((r) => r.t === 'h2h')).toBe(true); expect(factRows(p).length).toBeGreaterThanOrEqual(5); });
check('Granawin', (p) => expect(allText(p)).toContain('<абзац из ТЗ>'));
check('Planbet Barcelona', (p, _doc, plan) => { expect(factRows(p).filter((r) => r.t === 'fact')).toHaveLength(5); expect(plan.notes.join()).toMatch(/16\.11/); });
check('Playbaze', (p, _doc, plan) => { expect(plan.client).toBe(FALLBACK_CLIENT); expect(hero(p).data.image).toMatch(/activ-1\.png/); expect(has(p, 'timer')).toBe(true); });
check('vip (придуманное)', (p) => expect(footer(p)).toMatchObject({ v: 1, data: expect.objectContaining({ manager: 'Remi' }) }));
check('cards (придуманное)', (p) => expect(cards(p)).toHaveLength(3));
check('english (придуманное)', (p) => expect(allText(p)).not.toMatch(/[а-яё]/i));
```

- [ ] **Step 2:** запустить. Падение из-за модели — вернуться в задачу 5 (промпт, перезапись ответа); из-за кода — чинить код с тестом в задачах 2–4.
- [ ] **Step 3: Коммит** `ТЗ: приёмка на всех примерах`.

---

### Task 7: Воркфлоу `n8n/brief-plan.json`

**Files:**
- Create: `n8n/brief-plan.json`, `n8n/tools/sync-brief-plan.ts`, `n8n/brief-plan.test.ts`

**Interfaces:**
- Consumes: `openRouterRequest` (5); `nodeCode`, `runCode`, `Workflow` (`n8n/tools/html-gen.ts`).
- Produces: вебхук `POST { text, source }` → `{ ok: true, brief: unknown, model: string, usage: object }` / `{ ok: false, error: string }`; приложение проверяет `brief` само (`validateBrief`).

Узлы (имена точные): `Webhook` (новый uuid, `responseMode: 'responseNode'`, `allowedOrigins: '*'`) → `Подготовка` (Code: `text` — строка, после `trim` 1…20 000 знаков, иначе `{ kind: 'error', error }`; иначе `{ kind: 'ok', request }`, где `request` — тело OpenRouter; промпт и тело собирает константа `REQUEST_TEMPLATE`, вписанная скриптом) → `Ошибка в запросе?` (If `kind == 'error'`) → `OpenRouter` (HTTP Request: POST `https://openrouter.ai/api/v1/chat/completions`, `authentication: genericCredentialType`, `genericAuthType: httpHeaderAuth`, креденшл `OpenRouter` (`Authorization: Bearer <ключ>`), тело `={{ $json.request }}`, таймаут 60 000, `onError: continueRegularOutput`) → `Разбор ответа` (Code: ошибка HTTP/OpenRouter (`error.message`) → `{ ok:false }`; `choices[0].message.content` → убрать ```-ограду → `JSON.parse`; не объект — ошибка «модель вернула не JSON»; иначе `{ ok: true, brief, model, usage }`) → `Отправить ответ`; ошибки → `Ошибка` → `Отправить ошибку` (respondToWebhook 1.1, `firstIncomingItem`, ACAO `*`). Настройки — как у `clickable-mail.json`.

`sync-brief-plan.ts [--check]` (через загрузчик): `REQUEST_TEMPLATE = openRouterRequest('__TEXT__')` → JSON-строка в код узла `Подготовка` (между маркерами `// <<REQUEST` / `// REQUEST>>`), запись `n8n/brief-plan.json`; `--check` — код 1 при расхождении.

- [ ] **Step 1: Тесты** (`brief-plan.test.ts`, по образцу `workflow.test.ts`): Webhook — POST/ответ узлом/CORS/uuid, не совпадает с путём `clickable-mail.json`; обход связей — все концы `respondToWebhook`; `Подготовка`: пустой, не строка, 20 001 знак → `kind: 'error'` с понятным текстом; нормальный → `request` равен `openRouterRequest(text)`; `OpenRouter` — URL, креденшл по имени, `onError`; `Разбор ответа`: ```json-ограда, мусор вместо JSON, `{ error: { message: 'Rate limit' } }` → `{ ok:false, error: /Rate limit/ }`, нормальный → `ok: true` с `model`.
- [ ] **Step 2–4:** падают → собрать JSON (одноразовый сборщик в scratchpad, затем `sync-brief-plan.ts`) → зелёные; `sync-brief-plan.ts --check` → 0.
- [ ] **Step 5: Коммит** `n8n: воркфлоу плана по ТЗ через OpenRouter`.

---

### Task 8: Клиент вебхука в приложении

**Files:**
- Create: `src/brief/ai.ts`, `src/brief/ai.test.ts`

**Interfaces:**
- Consumes: `validateBrief` (2).
- Produces: `BRIEF_WEBHOOK = ''`; `briefWebhookUrl(): string` (`VITE_N8N_BRIEF_WEBHOOK_URL` || `BRIEF_WEBHOOK`); `requestBrief(text: string, url?: string, signal?: AbortSignal): Promise<{ brief: Brief; issues: string[]; model: string }>`. Ошибки (по образцу `src/email/n8n.ts`): нет адреса — «Вебхук ИИ не настроен»; сеть — «Нет связи с n8n: …»; таймаут 60 с — «ИИ не ответил за минуту»; не 2xx — «n8n ответил N»; не JSON — «n8n вернул не JSON»; `ok:false` — текст `error`; нет `brief` — «ИИ не вернул план».

- [ ] **Step 1: Тесты** (`vi.stubGlobal('fetch')`): успех → `brief` после `validateBrief`, `issues`, `model`; тело запроса `{ text, source: 'clickable-mail' }`; каждая ошибка — свой текст.
- [ ] **Step 2–4:** падают → реализовать → зелёные.
- [ ] **Step 5: Коммит** `ТЗ: запрос плана к n8n из приложения`.

---

### Task 9: Окно «Собрать по ТЗ»

**Files:**
- Modify: `src/home/BriefDialog.tsx`, `src/styles/home.css` (вкладки, ошибки строк)
- Modify: `src/brief/build.ts` (убрать обёртку `buildEmail`, если больше не используется)
- Create: `src/home/BriefDialog.browser.test.tsx`

**Interfaces:**
- Consumes: `readBriefFile`, `cleanBrief`, `BRIEF_MAX` (1); `requestBrief`, `briefWebhookUrl` (8); `validateBrief` (2); `parseBrief` (есть); `planFromBrief`, `derivedNotes`, `docFromPlan`, `originOf` (3); `planToText`, `parsePlan` (4).

Поведение (спека §5, §6.4):
- Левое окно: вкладки «ТЗ» и «План». «ТЗ»: textarea + «Загрузить файл» (`accept=".docx,.md,.txt"`) + «Составить план». «План»: textarea с текстом плана.
- «Составить план»: `cleanBrief` → (вебхук задан) `requestBrief` → иначе/ошибка `parseBrief` и подпись «План без ИИ: <причина>»; → `planFromBrief(brief, brief.client ?? fallbackClient)` → `planToText` → вкладка «План». Подпись под кнопкой: «План составил ИИ (<модель>)» и замечания `issues`, если есть. Во время запроса — «Составляю план…», кнопка неактивна; закрытие окна отменяет запрос (`AbortController`). Если план уже правили — первая кнопка спрашивает «Заменить план? Правки пропадут» (вторым нажатием).
- ТЗ длиннее `BRIEF_MAX` — предупреждение «ТЗ обрезано до 20 000 знаков».
- Правая панель — как сейчас, источник — `parsePlan(текст плана)`: клиент (выбор меняет строку `Клиент:` в тексте), тип, название, тема, прехедер; «Блоки · N» с пометками `originOf`; «Для дизайнера» = `plan.notes` + `derivedNotes`; новые — «Не понял строки»: `стр. N: текст — причина`.
- «Собрать письмо» (есть хотя бы один блок): `docFromPlan` → `doc.brief = { source, plan: текст плана, notes }` → `saveDraft` → редактор (как сейчас).

- [ ] **Step 1: Тесты** (MemoryRouter, `fetch` подменён записанным ответом модели, `saveDraft` настоящий): вставить ТЗ → «Составить план» → во вкладке «План» есть `[Кнопка] Забрать фрибет`, справа «Блоки · N»; удалить строку кнопки → справа на один блок меньше; дописать `[Кнопкa] X` → «Не понял строки» со строкой; «Составить план» ещё раз → «Заменить план?», текст не изменился до второго нажатия; без вебхука → «План без ИИ»; «Собрать письмо» → черновик сохранён, переход на `/email/<id>`.
- [ ] **Step 2–4:** падают → реализовать → зелёные (`npm run test`), `npm run build`.
- [ ] **Step 5: Проверить в браузере** (dev-сервер, Playwright): загрузить `examples/Planbet No Deposit Freebet Sport.md` файлом, составить план (вебхук не задан → правила; задан — ИИ), поправить план, собрать письмо, редактор открыт.
- [ ] **Step 6: Коммит** `ТЗ: окно — ТЗ, план текстом, ИИ через n8n`.

---

### Task 10: Документация и подключение

**Files:**
- Modify: `n8n/README.md` (второй воркфлоу: импорт `brief-plan.json`, креденшл Header Auth `OpenRouter` с `Authorization: Bearer …`, совет — лимит трат на ключе, Production URL → `BRIEF_WEBHOOK` в `src/brief/ai.ts` или `VITE_N8N_BRIEF_WEBHOOK_URL`, `sync-brief-plan.ts`, `eval-brief.ts`), `README.md` (раздел «Собрать по ТЗ»)

- [ ] **Step 1:** README и `n8n/README.md`.
- [ ] **Step 2:** `npm run test`, `npm run build`, `node --import ./n8n/tools/alias.mjs n8n/tools/sync-brief-plan.ts --check` → 0.
- [ ] **Step 3: Коммит** `Документация: план по ТЗ через ИИ`. Отчёт пользователю: что импортировать, какой креденшл создать, какой адрес прислать; сквозная проверка — после адреса вебхука.
