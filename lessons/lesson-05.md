# Урок 5. Кастомная фикстура `ai` и заглушка `AiLocatorHelper`

> Дата: 2026-10-23. Тег: `lesson-05`.

## Зачем

В модуле B мы строим AI-локатор: тест говорит «найди поле имени пользователя», а движок сам решает, каким локатором это сделать (кэш, запасной вариант, Claude).
Тесту нужен доступ к этому движку. Создавать его вручную в каждом тесте (`new AiLocatorHelper(page)`) — тот же повтор, от которого мы уходили в уроке 4.

В Playwright для этого есть **фикстуры**. Сегодня делаем две вещи:
1. **Контракт** движка: класс `AiLocatorHelper` с методом `locate(description, options)`. Внутри пока заглушка: AI нет, работает только запасной локатор, который передал тест.
2. **Фикстуру `ai`**: тест пишет `async ({ ai }) => ...` и получает готовый `AiLocatorHelper`, привязанный к своей странице.

Зачем заглушка, если AI появится только в уроке 9? Чтобы тесты, фикстура и Page Object уже сейчас работали с итоговым API.
В уроках 6–9 будет меняться только тело `locate`, а код, который его вызывает, останется прежним.

## Теория

### 1. Что такое фикстура

Фикстура (fixture) — это значение, которое Playwright готовит для теста перед его запуском и убирает после. Тест просит фикстуру по имени в первом аргументе:

```ts
test('title', async ({ page }) => { ... });
//                     ^^^^ фикстура page
```

`page` — не «параметр функции, который кто-то передал». Это встроенная фикстура: перед тестом Playwright создаёт новый контекст браузера и вкладку, отдаёт её тесту, а после теста закрывает.

Встроенные фикстуры, которые нам понадобятся:

| Фикстура | Что это | Область |
|---|---|---|
| `page` | Отдельная вкладка для теста | тест |
| `context` | Отдельный контекст браузера (свои cookies, storage) | тест |
| `browser` | Один браузер на воркер, общий для тестов воркера | воркер |
| `browserName` | `'chromium'`, `'firefox'` или `'webkit'` | воркер |
| `request` | `APIRequestContext` для HTTP-запросов без браузера | тест |

- [Playwright: Fixtures](https://playwright.dev/docs/test-fixtures)
- [Playwright: Built-in fixtures (API)](https://playwright.dev/docs/api/class-fixtures)

### 2. Чем фикстура лучше `let` + `beforeEach`

В уроке 4 мы написали:

```ts
let loginPage: LoginPage;

test.beforeEach(async ({ page }) => {
  loginPage = new LoginPage(page);
  await loginPage.open();
});
```

Недостатки этого способа:
- **Общая изменяемая переменная.** `loginPage` объявлена на уровне файла и перезаписывается перед каждым тестом. Тип `LoginPage` — неправда: до первого `beforeEach` там `undefined`, TypeScript этого не видит.
- **Работает для всех тестов группы.** Даже если тесту `LoginPage` не нужен, страница всё равно откроется.
- **Подготовка и уборка в разных местах.** Уборка пошла бы в отдельный `afterEach`, и связь между ними держится только в голове.
- **Не переиспользуется.** Чтобы `loginPage` появился в другом файле, `beforeEach` придётся скопировать.

Фикстура решает все четыре пункта: значение передаётся в тест аргументом (без общей переменной), создаётся только если тест его попросил, подготовка и уборка живут в одной функции, а сама фикстура объявлена один раз и импортируется в любой файл.

- [Playwright: Fixtures — With fixtures (сравнение с before/after hooks)](https://playwright.dev/docs/test-fixtures#with-fixtures)

### 3. `test.extend`: как объявить свою фикстуру

```ts
import { test as base } from '@playwright/test';

type MyFixtures = {
  greeting: string;
};

export const test = base.extend<MyFixtures>({
  greeting: async ({ page }, use) => {
    // 1. Подготовка (setup): выполняется до теста
    const value = `hello from ${page.url()}`;

    // 2. Передача значения тесту. Пока тест идёт, await use(...) не завершается.
    await use(value);

    // 3. Уборка (teardown): выполняется после теста, даже если тест упал
  },
});
```

Разберём по частям:
- `base.extend<MyFixtures>({...})` возвращает **новый** объект `test`, в котором есть все старые фикстуры плюс `greeting`. Исходный `test` из `@playwright/test` не меняется.
- Параметр типа `<MyFixtures>` говорит TypeScript, какие фикстуры добавились и какого они типа. Без него `async ({ greeting })` в тесте не скомпилируется.
- Значение фикстуры — функция с двумя (иногда тремя) аргументами:
  - **первый** — объект с другими фикстурами, от которых эта зависит (`{ page }`);
  - **второй** — функция `use`. Её вызов означает «вот значение, запускай тест». Код после `await use(...)` — уборка.
  - третий (необязательный) — `testInfo` (или `workerInfo` для воркерных фикстур), информация о текущем тесте.
- `use` нужно вызвать **ровно один раз**. Если забыть, тест упадёт с `Error: use() was not called in fixture "..."` (проверено, см. песочницу).

Чтобы тесты могли импортировать всё из одного места, файл фикстур реэкспортирует и `expect`:

```ts
import { test as base, expect } from '@playwright/test';
// ...
export { expect };
```

- [test.extend](https://playwright.dev/docs/api/class-test#test-extend)
- [Playwright: Creating a fixture](https://playwright.dev/docs/test-fixtures#creating-a-fixture)

### 4. Ленивость и порядок выполнения

Фикстура создаётся **только если её запросил тест** (напрямую или через другую фикстуру). Это главное отличие от `beforeEach`.

Если фикстура `b` зависит от `a`, Playwright сначала готовит `a`, потом `b`. Уборка идёт в **обратном** порядке: сначала `b`, потом `a`.

Проверено на Playwright 1.63 (фикстуры с `console.log` до и после `use`):

```text
test 'uses b':        a setup → b setup → test body AB → b teardown → a teardown
test 'uses nothing':  test body 2          (ни a, ни b не создавались)
```

- [Playwright: Execution order](https://playwright.dev/docs/test-fixtures#execution-order)

### 5. Первый аргумент — только деструктуризация

Как Playwright узнаёт, что `ai` нужен `page`? Он **читает исходный текст функции** (`fn.toString()`) и разбирает шаблон деструктуризации в первом параметре. Поэтому первый аргумент обязан быть записан как `{ ... }`.

Если написать иначе, Playwright упадёт ещё до запуска тестов (проверено):

```ts
ai: async (fixtures, use) => { ... }
// First argument must use the object destructuring pattern: fixtures
```

То же правило действует для функции теста: `test('x', async (fixtures) => ...)` даёт ту же ошибку.

Если фикстуре ничего не нужно, пишут пустую деструктуризацию: `async ({}, use) => { ... }`. В уроке 11 ESLint будет ругаться на это правилом `no-empty-pattern`; для файлов фикстур его отключают точечно.

- [MDN: Destructuring assignment](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring)

### 6. Область видимости: тест или воркер

У фикстуры есть **scope**:
- `'test'` (по умолчанию) — новая для каждого теста. Так устроены `page`, `context`.
- `'worker'` — одна на воркер, общая для всех тестов этого воркера. Так устроен `browser`.

Воркерная фикстура объявляется кортежем `[функция, { scope: 'worker' }]` и типизируется **вторым** параметром типа: `base.extend<TestFixtures, WorkerFixtures>`.

Воркерная фикстура **не может зависеть от тестовой**: она живёт дольше. Проверено:

```text
worker fixture "ai" cannot depend on a test fixture "page" defined in <builtin>.
```

`tsc` ловит это раньше: `TS2339: Property 'page' does not exist on type '{ ai: AiLocatorHelper; } & PlaywrightWorkerArgs & PlaywrightWorkerOptions'`.

Наш `ai` привязан к `page`, значит он тестовый. В уроке 6 кэш локаторов на диске будет кандидатом в воркерные фикстуры: он не зависит от страницы, а читать файл перед каждым тестом незачем.

- [Playwright: Worker-scoped fixtures](https://playwright.dev/docs/test-fixtures#worker-scoped-fixtures)

### 7. Откуда импортировать `test`

После того как появился свой `test`, в тестах, которым нужны наши фикстуры, импорт меняется:

```ts
import { test, expect } from '../src/fixtures';   // а не из '@playwright/test'
```

Если по привычке импортировать из `@playwright/test` и попросить `ai`, будет две ошибки (проверено):
- `tsc`: `TS2339: Property 'ai' does not exist on type 'PlaywrightTestArgs & PlaywrightTestOptions & ...'`;
- рантайм: `Test has unknown parameter "ai".`

Фикстуры из нескольких файлов можно объединить через `mergeTests`. Нам пока хватит одного файла.

- [Playwright: Combine custom fixtures from multiple modules](https://playwright.dev/docs/test-fixtures#combine-custom-fixtures-from-multiple-modules)

### 8. Заглушка и контракт

**Заглушка** здесь — временная реализация с итоговой сигнатурой. Важна именно сигнатура: она и есть **контракт**, на который опираются тесты.

```ts
async locate(description: string, options: LocateOptions = {}): Promise<Locator>
```

Почему так:
- **`description: string`** — описание на человеческом языке. Пригодится и для кэша (ключ), и для промпта Claude.
- **`options.fallback?: LocatorSpec`** — запасной локатор, если AI не справился. Используем тип `LocatorSpec` из урока 3.
- **`= {}`** — значение параметра по умолчанию. Можно вызвать `locate('...')` без второго аргумента, и внутри не нужно проверять `options !== undefined`.
- **`async` и `Promise<Locator>`.** В уроке 4 мы выяснили, что `page.getByTestId()` синхронный: он только описывает, как искать. `locate` не может быть синхронным: в будущем ему нужно прочитать кэш с диска и сходить в API Claude. Если сделать его синхронным сейчас, в уроке 9 придётся менять каждый вызов. Поэтому контракт асинхронный с самого начала, даже если сейчас внутри нет ни одного `await`.
- **Ошибка, а не `null`.** Если найти нечего, `locate` бросает `AiLocatorError` из урока 3. Возврат `null` заставил бы каждый тест проверять результат; забытая проверка дала бы невнятное `Cannot read properties of null` в другом месте.

Пропущенный `await` перед `locate` ловит компилятор (проверено):

```ts
await ai.locate('username', { fallback }).fill('bob');
// TS2339: Property 'fill' does not exist on type 'Promise<Locator>'.
```

Правильно — сначала дождаться локатора:

```ts
const username = await ai.locate('username', { fallback });
await username.fill('bob');
```

Почему без переменной не работает (вопрос студента): вызов функции и доступ к свойству связываются сильнее, чем `await`.
`await ai.locate(...).fill('bob')` читается как `await (ai.locate(...).fill('bob'))`: `.fill` ищется у промиса, а не у локатора.
В одну строку можно, если поднять приоритет скобками: `await (await ai.locate(...)).fill('bob')`. Это рабочий код, но переменная читается проще и пригодится для `expect`.
С `page.getByTestId('x').fill(...)` такой проблемы нет: `getByTestId` синхронный и сразу возвращает `Locator`.

- [MDN: Operator precedence](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_precedence) — `await` имеет приоритет 14, доступ к свойству и вызов — 17
- [MDN: await](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await)

Термин: строго говоря, заглушка (stub) в терминологии тестовых двойников — объект, который подменяет зависимость в тесте и возвращает заготовленные ответы. У нас не двойник, а **временная реализация** продакшен-класса. Слово «заглушка» используем в бытовом смысле, но различие стоит знать.

- [MDN: async function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function)
- [MDN: Default parameters](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Default_parameters)
- [Martin Fowler: TestDouble](https://martinfowler.com/bliki/TestDouble.html)

### 9. Проверка того, что промис отклонён: `.rejects`

`locate` возвращает промис. Чтобы проверить, что он отклоняется с ошибкой, `expect` получает сам промис и модификатор `.rejects`:

```ts
await expect(ai.locate('anything')).rejects.toThrow(AiLocatorError);           // класс ошибки
await expect(ai.locate('anything')).rejects.toThrow('no fallback was given');   // часть сообщения
await expect(ai.locate('anything')).rejects.toMatchObject({ description: 'anything' }); // свойства объекта ошибки
```

`await` перед `expect` обязателен: без него проверка не дождётся промиса, и тест может закончиться раньше.

- [Playwright: Assertions — generic matchers](https://playwright.dev/docs/test-assertions)
- [expect(...).rejects](https://playwright.dev/docs/api/class-genericassertions#generic-assertions-rejects)

## Код урока

Данные saucedemo для теста: поле имени `data-test="username"`, пароль `data-test="password"`, кнопка входа — `<input type="submit" value="Login">`.
У `input type=submit` ARIA-роль `button`, доступное имя берётся из `value`, поэтому `getByRole('button', { name: 'Login' })` её находит.

### Шаг 1. src/ai/AiLocatorHelper.ts

```ts
import type { Locator, Page } from '@playwright/test';
import { AiLocatorError } from './types';
import type { LocatorSpec } from './types';

export interface LocateOptions {
  fallback?: LocatorSpec;
}

export class AiLocatorHelper {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async locate(description: string, options: LocateOptions = {}): Promise<Locator> {
    if (options.fallback !== undefined) {
      return this.toLocator(options.fallback);
    }
    throw new AiLocatorError(description, `AI is not connected yet and no fallback was given for "${description}"`);
  }

  private toLocator(spec: LocatorSpec): Locator {
    switch (spec.strategy) {
      case 'testId':
        return this.page.getByTestId(spec.testId);
      case 'role':
        return this.page.getByRole(spec.role, { name: spec.name });
      case 'css':
        return this.page.locator(spec.selector);
      case 'text':
        return this.page.getByText(spec.text);
      default: {
        const unreachable: never = spec;
        return unreachable;
      }
    }
  }
}
```

Обрати внимание:
- `toLocator` — та же проверка полноты через `never`, что в `describeLocator` из урока 3. Добавим в `LocatorSpec` новую стратегию — `tsc` покажет оба места.
- `toLocator` приватный: снаружи нужен только `locate`. В уроке 7 он понадобится движку кэша, тогда и решим, выносить ли его.
- `{ name: spec.name }`, когда `name` нет, передаёт `{ name: undefined }`. Playwright трактует это как «имя не задано» (проверено: `getByRole('button', { name: undefined })` находит кнопку).

Проверка:
1. `npm run typecheck` — 0 ошибок.
2. Временно удали ветку `case 'css'` (две строки), запусти `npm run typecheck`, сохрани текст ошибки, верни строки.

### Шаг 2. src/fixtures/index.ts

```ts
import { test as base, expect } from '@playwright/test';
import { AiLocatorHelper } from '../ai/AiLocatorHelper';

type Fixtures = {
  ai: AiLocatorHelper;
};

export const test = base.extend<Fixtures>({
  ai: async ({ page }, use) => {
    const ai = new AiLocatorHelper(page);
    await use(ai);
  },
});

export { expect };
```

Уборки после `use` пока нет: `AiLocatorHelper` ничего не открывает. В уроке 6 после `use` появится запись кэша.

Проверка: `npm run typecheck` — 0 ошибок.

### Шаг 3. tests/ai.spec.ts

```ts
import { test, expect } from '../src/fixtures';

test.describe('ai locator stub', () => {
  test('logs in using fallback locators', async ({ page, ai }) => {
    await page.goto('/');

    const username = await ai.locate('username field', {
      fallback: { strategy: 'testId', testId: 'username' },
    });
    const password = await ai.locate('password field', {
      fallback: { strategy: 'testId', testId: 'password' },
    });
    const loginButton = await ai.locate('login button', {
      fallback: { strategy: 'role', role: 'button', name: 'Login' },
    });

    await username.fill('standard_user');
    await password.fill('secret_sauce');
    await loginButton.click();

    await expect(page).toHaveURL('/inventory.html');
  });
});
```

Проверка: `npm run typecheck`, затем `npm test` — 12 passed (6 unit + 5 login + 1 ai).

## Песочница для проверки ответов

> **Запускать только после шагов 1–3.** Песочница импортирует `test` из `../src/fixtures`. Пока файла `src/fixtures/index.ts` нет, падает весь файл: `Error: Cannot find module '../src/fixtures'`.
> Если хочешь посмотреть порядок фикстур раньше, закомментируй импорт из `../src/fixtures` и тест `only ai`: блоку `demo` нужны только `@playwright/test`.

Создай временный `tests/scratch.spec.ts`. В git его не добавляй, после урока удали.

```ts
import { test as base } from '@playwright/test';
import { test } from '../src/fixtures';

// 1. Порядок и ленивость фикстур
const demo = base.extend<{ a: string; b: string }>({
  a: async ({}, use) => {
    console.log('a setup');
    await use('A');
    console.log('a teardown');
  },
  b: async ({ a }, use) => {
    console.log('b setup');
    await use(a + 'B');
    console.log('b teardown');
  },
});

demo('uses b', async ({ b }) => {
  console.log('test body', b);
});

demo('uses nothing', async () => {
  console.log('test body 2');
});

// 2. Тест просит только ai. Открывается ли браузер? Смотри строку [chromium] и время.
test('only ai', async ({ ai }) => {
  console.log('ai created:', ai !== undefined);
});

// 3. Раскомментируй по одному, посмотри ошибки, верни как было:
// demo('no destructuring', async (fixtures) => { console.log(fixtures); });
// test('missing await', async ({ ai }) => {
//   await ai.locate('u', { fallback: { strategy: 'testId', testId: 'username' } }).fill('bob');
// });
```

```bash
npx playwright test tests/scratch.spec.ts --reporter=line --workers=1
npm run typecheck
```

## Самостоятельное задание

1. **Фикстура `loginPage`.** Добавь в `src/fixtures/index.ts` фикстуру `loginPage: LoginPage`, которая создаёт `LoginPage` и открывает страницу.
   Перепиши `tests/login.spec.ts`: импорт из `../src/fixtures`, без `let loginPage` и без `beforeEach`, тесты получают `loginPage` из аргументов.
   Количество и смысл тестов не меняются.
2. **Тест на ошибку.** В `tests/ai.spec.ts` внутри того же `describe` добавь тест: `locate` без `fallback` отклоняется с `AiLocatorError`, и у ошибки свойство `description` равно переданному описанию.
   Подсказка: теория, п. 9.

## Чекпоинт

```bash
npm run typecheck   # 0 ошибок
npm test            # 13 passed: 6 unit + 5 login + 2 ai
```

Перед чекпоинтом: песочница удалена, эксперименты из шагов откачены.

## Вопросы

Для каждого вопроса указано, что должно быть в ответе.

1. **Порядок фикстур.** Запусти песочницу (п. 1).
   В ответе: (а) точный порядок строк, которые вывел тест `uses b`; (б) что вывел `uses nothing` и почему там нет `a setup`; (в) одно предложение, почему уборка идёт в обратном порядке.
2. **Деструктуризация.** В ответе: (а) точный текст ошибки из песочницы (п. 3, первая строка); (б) каким образом Playwright узнаёт, от каких фикстур зависит функция; (в) почему из-за этого нельзя написать `async (_, use)` или `async (fixtures, use)`.
3. **Тест без страницы.** Тест `only ai` не трогает `page`. В ответе: (а) открывается ли браузер для этого теста и чем ты это подтвердил; (б) почему; (в) что пришлось бы изменить, чтобы тест на ошибку из задания 2 не запускал браузер (код писать не нужно, достаточно идеи).
4. **async-контракт.** В ответе: (а) код ошибки и текст из песочницы (п. 3, вторая строка); (б) почему `locate` объявлен `async`, хотя внутри сейчас нет ни одного `await`; (в) чем по смыслу отличается вызов `page.getByTestId('username')` от `ai.locate('username field', ...)`: что каждый из них возвращает и когда происходит поиск элемента в DOM.
5. **Scope.** В ответе: (а) можно ли сделать `ai` воркерной фикстурой и что именно помешает (сообщение об ошибке); (б) пример фикстуры из нашего проекта (будущей), которую разумно сделать воркерной, и почему.
6. **Ошибка вместо `null`.** Предлагают такую сигнатуру: `locate(description: string): Promise<Locator | null>`, где `null` — «не нашли». В ответе: (а) согласен ли ты; (б) что придётся писать в каждом тесте при таком контракте; (в) какое сообщение увидит человек, если в тесте забыли проверку на `null` и вызвали `.fill()`.
7. **Открывать ли страницу в фикстуре.** В твоей фикстуре `loginPage` есть (или нет) вызов `open()`. В ответе: (а) какое решение ты выбрал; (б) один аргумент за и один против; (в) пример теста, которому твой выбор мешает.

## Ответы студента

### Шаг 1: ошибка без `case 'css'`

`src/ai/AiLocatorHelper.ts:32:15 - error TS2322: Type '{ strategy: "css"; selector: string; }' is not assignable to type 'never'.`

### Ответы на вопросы урока (первая попытка)

1. а — a setup, b setup, test body AB, b teardown, a teardown. б — test body 2, не вызывается ни a, ни b. в — b вызывает a, поэтому сначала завершается тот, кто вызывает, а потом кого.
2. а — `First argument must use the object destructuring pattern: fixtures`. б — они передаются в `async ({ ai })`. в — Playwright читает исходный текст функции (`fn.toString()`) и разбирает деструктуризацию первого параметра, поэтому он обязан быть `{ ... }`.
3. а — `ai` сама обращается к `page`, поэтому браузер открывается. б — page всегда создаёт отдельную вкладку. в — можно было бы обратиться только к фикстуре `request`.
4. а — `First argument must use the object destructuring pattern: fixtures`. б — в будущем будет читать кэш, чтобы не переписывать вызовы. в — не уверен; `locate` возвращает `Promise<Locator>`, `getByTestId` — `Locator`.
5. а — `ai` привязан к `page`, значит только тестовая. б — что-то общее для всех тестов, например инициализация AI-агента.
6. а — не согласен. б — проверку на `null`. в — `AiLocatorError`.
7. а — да. б — вместо `beforeEach` фикстура вызывается только там, где нужна. в — не понял вопроса.

## Ошибки и разбор

### Вопрос 1: верно по выводу, неточная терминология, нет причины
- Тест фикстуры не «вызывает», а **запрашивает**; создаёт их Playwright. В (б) не названа ленивость: ничего не запрошено — ничего не создано.
- `b` не «вызывает» `a`, а **зависит** от неё и может пользоваться значением `a` до конца своей уборки. Если убрать `a` раньше, уборка `b` работала бы с уничтоженным ресурсом. Поэтому уборка идёт в обратном порядке, как стек.

### Вопрос 2: ответы (б) и (в) перепутаны
- (б) спрашивал, как Playwright **узнаёт** зависимости: читает исходный текст функции и вынимает имена из `{ ... }`. `async ({ ai })` — это то, как тест **получает** значения.
- (в): в тексте `(fixtures, use)` нет имён фикстур. Playwright не выполняет функцию заранее и не знает, что потом прочитают `fixtures.page`. Создать все фикстуры «на всякий случай» нельзя — сломается ленивость. Поэтому ошибка сразу.

### Вопрос 3: нет доказательства, неполная цепочка, неверная идея в (в)
- Подтверждение должно быть проверяемым: время теста, `--headed`, `--trace on`.
- Цепочка: `ai` → `page` → `context` → `browser` (воркерная) → запуск браузера.
- `request` не поможет: `AiLocatorHelper` требует `Page`, а `request` — HTTP-клиент. Правильно: не запрашивать фикстуру `ai`, а в `tests/unit/` создать `new AiLocatorHelper({} as Page)` — ветка без `fallback` к `page` не обращается, и браузер не нужен.

### Вопрос 4: (а) не та ошибка, (в) нет главного
- (а) — скопирована ошибка из вопроса 2. Правильно: `TS2339: Property 'fill' does not exist on type 'Promise<Locator>'.`
- (в): ни `getByTestId`, ни `locate` не ищут элемент в DOM. Первый синхронно возвращает ленивый `Locator`, второй асинхронно выбирает, каким локатором искать, и возвращает такой же ленивый `Locator`. Поиск в DOM — при `fill`/`click`/`expect`. «Асинхронный» не значит «ищет элемент».

### Вопрос 5: нет сообщения об ошибке, неточный термин
- Ожидалось: `worker fixture "ai" cannot depend on a test fixture "page" defined in <builtin>.`
- Клиент API Claude как воркерная фикстура — разумно, но это клиент SDK, не «агент». Второй кандидат — кэш локаторов (урок 6).

### Вопрос 6: (в) неверно
При контракте с `null` `AiLocatorError` не бросается. Проверено:
- `tsc`: `TS18047: 'username' is possibly 'null'.`
- рантайм: `TypeError: Cannot read properties of null (reading 'fill')` — без описания элемента.
В (б) ожидался код: `if (username === null) throw new Error(...)` перед каждым действием.

### Вопрос 7: (б) не по вопросу, (в) без ответа
- Вопрос был про `open()` **внутри** фикстуры, а не про фикстуру против `beforeEach`. За: все login-тесты начинаются с `open()`. Против: навигация спрятана и не видна в тексте теста.
- Пример теста, которому мешает `open()` в фикстуре: неавторизованный пользователь открывает `/inventory.html` и попадает на логин с ошибкой — фикстура делает лишний `goto('/')` до начала теста.

### Ревью кода: шаблонная строка в одинарных кавычках (баг)

```ts
throw new AiLocatorError(description, 'AI is not connected yet and no fallback was given for "${description}"');
```

Подстановка `${...}` работает только в шаблонных строках — в обратных кавычках (backticks). В одинарных кавычках это обычный текст, и сообщение ошибки буквально содержит `${description}`:

```text
AiLocatorError: AI is not connected yet and no fallback was given for "${description}"
```

Компилятор это не ловит: строка корректна, просто не та. Поймал бы тест из задания 2 с проверкой текста сообщения (`rejects.toThrow('... for "anything"')`), которого нет.
Правильно: `` `AI is not connected yet and no fallback was given for "${description}"` ``.

- [MDN: Template literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals)

### Ревью кода: задание 2 не сделано, чекпоинт не пройден

В `tests/ai.spec.ts` один тест, ожидалось два. Итого 12 тестов вместо 13. Как раз этот тест нашёл бы баг выше.

### Ревью кода: мелочи
- Опечатка `unreacheble` → `unreachable`.
- `import  type` — двойной пробел; `{ name: spec.name, }` — лишняя запятая; отступы в фикстуре `loginPage` и в `if` внутри `locate` не совпадают с остальным файлом; нет перевода строки в конце файлов. Всё это исправит Prettier в уроке 11, но привыкать к аккуратности стоит сейчас.
- В `login.spec.ts` фигурные скобки без пробелов (`{page, loginPage}`), в `ai.spec.ts` — с пробелами. Один стиль на проект.
- Коммит назван `Add changes from lesson 5`, а принятый в репозитории формат — `Lesson 5: ...`. И коммит без конспекта, хотя по порядку урока конспект коммитится вместе с кодом.

### Порядок частей урока в чате
Часть с кодом пришла в чат позже песочницы, поэтому песочница запускалась без `src/fixtures` (`Cannot find module '../src/fixtures'`). Ошибка преподавателя. В конспект добавлена пометка «запускать после шагов 1–3».

## Итог

Коммиты кода в main: `Add changes from lesson 5` (код урока) и `9caf31c Lesson 5: Custom fixture ai and stub for AiLocatorHelper` (исправления по ревью: шаблонная строка, тест из задания 2). Конспект — PR #1.

- **Чекпоинт.** `npm run typecheck` — 0 ошибок, `npm test` — 13 passed (6 unit + 5 login + 2 ai).

- **Код.** `src/ai/AiLocatorHelper.ts` (контракт `locate(description, { fallback })`, приватный `toLocator` с проверкой полноты через `never`), `src/fixtures/index.ts` (фикстуры `ai` и `loginPage`, реэкспорт `expect`), `tests/ai.spec.ts` (вход через `ai.locate` с запасными локаторами).
- **Рефакторинг.** `tests/login.spec.ts` переведён с `let` + `beforeEach` на фикстуру `loginPage`.
- **Ошибки урока.** «Вызывает» вместо «запрашивает/зависит», перепутанные ответы про деструктуризацию, `request` вместо подделки `Page` в unit-тесте, ошибка не из того эксперимента, `AiLocatorError` там, где её быть не может (контракт с `null`), шаблонная строка в одинарных кавычках, пропущенное задание 2.
- **Замечание к формату.** С урока 6 вопросов меньше (3–4), и каждый расписан подробно: что запустить и что именно объяснить.

Следствие для урока 6: кэш локаторов на диске, кандидат в воркерные фикстуры; `ai` получит его как зависимость.
