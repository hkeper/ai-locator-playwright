# Урок 3. TypeScript для проекта: типы, классы, свой Error

> Дата: 2026-10-11 – 2026-10-12. Тег: `lesson-03`.

## Зачем

Дальше AI-локатор будет передавать описания локаторов между модулями: кэш на диске, движок, ответ Claude.
Если описание локатора — просто строка или `any`, опечатка в поле всплывёт только в упавшем тесте.
Типы переносят эту проверку на момент `npm run typecheck`, до запуска браузера.

Свой класс ошибки нужен, чтобы отличать «AI-локатор не нашёл элемент» от любой другой ошибки и нести с ней контекст: какое описание искали и что было первопричиной.

Плюс два хвоста из урока 2: папка `src/` в `include` и проверка обязательных переменных окружения.

## Теория

### 1. Аннотации типов и вывод типов

Тип пишется после двоеточия: `const timeout: number = 5000`.
Часто писать его не нужно: TypeScript сам выводит тип из значения. Это называется type inference.
Аннотации обязательно ставят на границах: параметры функций, публичные поля, экспортируемые структуры данных.

- [Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)
- [Type Inference](https://www.typescriptlang.org/docs/handbook/type-inference.html)

### 2. Литеральные типы и объединения (union)

Тип может быть не «любая строка», а конкретная строка: `'css'`.
Через `|` из них собирают объединение: `type Strategy = 'testId' | 'role' | 'css'`.
Переменной такого типа нельзя присвоить `'xpath'`: это ошибка компиляции.

Почему не `enum`: объединение строк исчезает при транспиляции целиком, а `enum` превращается в реальный JS-объект.
Нативное удаление типов в Node и флаг `erasableSyntaxOnly` не поддерживают `enum`.
Для нашего случая объединение проще и ничего не стоит в рантайме.

- [Literal Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#literal-types)
- [Union Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#union-types)
- [Enums: objects vs enums](https://www.typescriptlang.org/docs/handbook/enums.html#objects-vs-enums)
- [Node: type stripping](https://nodejs.org/api/typescript.html#type-stripping)

### 3. interface и type

Оба описывают форму объекта.
`interface` можно расширять через `extends` и дописывать повторным объявлением (declaration merging).
`type` умеет то, чего не умеет `interface`: объединения, литералы, вычисляемые типы.
Правило проекта: `interface` для формы объекта, `type` для объединений и производных типов.

- [Differences Between Type Aliases and Interfaces](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#differences-between-type-aliases-and-interfaces)

### 4. Размеченное объединение (discriminated union) и сужение типа (narrowing)

Разным стратегиям локатора нужны разные поля: `testId` нужен тест-айди, `role` нужна роль и имя, `css` нужен селектор.
Плохой вариант — один объект со всеми полями, помеченными `?`. Тогда `{ strategy: 'css' }` без селектора компилируется.

Хороший вариант — объединение объектов с общим полем-дискриминантом `strategy`:

```ts
type LocatorSpec =
  | { strategy: 'testId'; testId: string }
  | { strategy: 'css'; selector: string };
```

Внутри `switch (spec.strategy)` в ветке `case 'css'` компилятор знает, что у `spec` есть `selector`. Это сужение типа.

**Проверка полноты (exhaustiveness).** В ветке `default` все варианты уже разобраны, и тип `spec` сужается до `never`.
Если присвоить его переменной типа `never`, то при добавлении новой стратегии без новой ветки `tsc` выдаст ошибку именно в этой строке.

- [Discriminated unions](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions)
- [Exhaustiveness checking](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#exhaustiveness-checking)

### 5. Производные типы: `Parameters` и `import type`

Список ARIA-ролей уже описан в Playwright, переписывать его руками не нужно.
Метод `page.getByRole(role, options)` принимает роль первым параметром, поэтому:

```ts
import type { Page } from '@playwright/test';
type AriaRole = Parameters<Page['getByRole']>[0];
```

- `Page['getByRole']` — тип метода (indexed access type).
- `Parameters<F>` — кортеж типов параметров функции, `[0]` — его первый элемент.
- `import type` импортирует только тип. После транспиляции строка исчезает полностью, и модуль не загружается в рантайме.

Ссылки:
- [Indexed Access Types](https://www.typescriptlang.org/docs/handbook/2/indexed-access-types.html)
- [Parameters<Type>](https://www.typescriptlang.org/docs/handbook/utility-types.html#parameterstype)
- [import type](https://www.typescriptlang.org/docs/handbook/2/modules.html#typescript-specific-es-module-syntax)
- [page.getByRole](https://playwright.dev/docs/api/class-page#page-get-by-role)

### 6. Классы

Класс — шаблон объектов с полями и методами.
- `constructor` вызывается при `new`.
- `readonly` запрещает присваивание полю после конструктора. Это проверка компилятора, в рантайме её нет.
- `extends` наследует класс. В конструкторе наследника `super(...)` обязан идти до любого обращения к `this`.
- При `strict` включён `strictPropertyInitialization`: объявленное поле без значения должно быть присвоено в конструкторе.

Ссылки:
- [TypeScript: Classes](https://www.typescriptlang.org/docs/handbook/2/classes.html)
- [MDN: Classes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes)

### 7. Свой класс ошибки

```ts
class AiLocatorError extends Error {
  readonly description: string;
  constructor(description: string, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'AiLocatorError';
    this.description = description;
  }
}
```

- **`this.name`.** Без него `String(err)` и первая строка стека начинаются с `Error:`, и в отчёте Playwright ошибку не отличить от остальных.
- **`instanceof`.** `err instanceof AiLocatorError` и `err instanceof Error` оба дают `true`. Проверять тип через `instanceof` надёжнее, чем сравнивать `err.name` строкой: опечатку в строке компилятор не поймает.
- **`cause`.** С ES2022 у `Error` есть второй аргумент `{ cause }`. Туда кладут исходную ошибку, например таймаут Playwright, и она не теряется. Тип `ErrorOptions` берётся из `lib.es2022`, его подключает наш `target: es2022`.
- **Старая ловушка.** При `target: es5` наследование от `Error` ломало `instanceof`, и требовался `Object.setPrototypeOf(this, new.target.prototype)`. С `es2022` классы нативные, и обходной код не нужен.

Ссылки:
- [MDN: Error, custom error types](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#custom_error_types)
- [MDN: Error.cause](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/cause)
- [TypeScript wiki: extending built-ins like Error](https://github.com/microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work)

### 8. Обязательные переменные окружения

`process.env.X` имеет тип `string | undefined`.
Запасное значение через `??` скрывает ошибку настройки: тесты молча пойдут не на тот стенд.
Функция `requireEnv` падает сразу с понятным текстом, а её возвращаемый тип `string` уже без `undefined`.
Пустую строку тоже считаем отсутствием значения: вспомни вопрос 2 урока 2 про `'' ?? 'x'`.

- [Node: process.env](https://nodejs.org/api/process.html#processenv)

### 9. Тест без браузера

Playwright Test запускает браузер, только когда тест запрашивает фикстуру `page`, `context` или `browser`.
Тест без фикстур работает как обычный юнит-тест и выполняется за миллисекунды.

- [Playwright: Fixtures](https://playwright.dev/docs/test-fixtures)

## Код урока

### Шаг 1. src/ в tsconfig.json

```json
"include": ["src/**/*.ts", "tests/**/*.ts", "playwright.config.ts"]
```

### Шаг 2. src/ai/types.ts

```ts
import type { Page } from '@playwright/test';

/** ARIA-роль в том виде, в каком её принимает page.getByRole. */
export type AriaRole = Parameters<Page['getByRole']>[0];

/** Как найти элемент. Поле strategy — дискриминант. */
export type LocatorSpec =
  | { strategy: 'testId'; testId: string }
  | { strategy: 'role'; role: AriaRole; name?: string }
  | { strategy: 'css'; selector: string };

/** Запись кэша: какое описание к какому локатору привело. */
export interface CachedLocator {
  description: string;
  spec: LocatorSpec;
  savedAt: string; // ISO 8601, new Date().toISOString()
}

/** AI-локатор не смог найти элемент по описанию. */
export class AiLocatorError extends Error {
  readonly description: string;

  constructor(description: string, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'AiLocatorError';
    this.description = description;
  }
}
```

### Шаг 3. src/config/env.ts и playwright.config.ts

```ts
// src/config/env.ts
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`Missing required env variable ${name}. Copy .env.example to .env and fill it in.`);
  }
  return value;
}
```

В `playwright.config.ts`:

```ts
import { requireEnv } from './src/config/env';
// ...
baseURL: requireEnv('BASE_URL'),
```

`dotenv.config()` должен выполниться раньше `requireEnv`. Так и есть: `requireEnv` вызывается внутри объекта для `defineConfig`, а он идёт после `dotenv.config()`.
Следствие для урока 12: на CI нет `.env`, поэтому `BASE_URL` придётся задать в workflow.

### Шаг 4. tests/unit/ai-types.spec.ts

```ts
import { test, expect } from '@playwright/test';
import { AiLocatorError } from '../../src/ai/types';

test('AiLocatorError keeps description, name and cause', () => {
  const root = new Error('Timeout 5000ms exceeded');
  const err = new AiLocatorError('login button', 'Element not found', { cause: root });

  expect(err).toBeInstanceOf(AiLocatorError);
  expect(err).toBeInstanceOf(Error);
  expect(err.name).toBe('AiLocatorError');
  expect(err.description).toBe('login button');
  expect(err.cause).toBe(root);
});
```

## Песочница для проверки ответов

Создай временный `tests/unit/scratch.spec.ts`, меняй его и запускай.
В git его не добавляй, после урока удали.

```ts
import { test } from '@playwright/test';
import { AiLocatorError, type LocatorSpec } from '../../src/ai/types';

test('scratch', () => {
  const err = new AiLocatorError('a', 'b');
  console.log(String(err));
  console.log(err instanceof Error);

  const spec: LocatorSpec = { strategy: 'css', selector: '#id' };
  console.log(spec);
});
```

```bash
npx playwright test tests/unit/scratch.spec.ts --reporter=line
npm run typecheck
```

## Самостоятельное задание

1. В `src/ai/types.ts` напиши функцию `describeLocator(spec: LocatorSpec): string`.
   Она возвращает строку вида `getByTestId('username')`, `getByRole('button', { name: 'Login' })` или `locator('#id')`.
   Используй `switch` по `spec.strategy` и проверку полноты через `never` в `default`.
2. Добавь в `LocatorSpec` четвёртый вариант `{ strategy: 'text'; text: string }`, не трогая `describeLocator`.
   Запусти `npm run typecheck` и сохрани текст ошибки. Затем добавь ветку и убедись, что ошибка ушла.
3. Добавь в `tests/unit/ai-types.spec.ts` по одному тесту на каждую ветку `describeLocator`.

## Чекпоинт

```bash
npm run typecheck   # 0 ошибок
npm test            # все тесты зелёные, включая unit
```

Ручная проверка `requireEnv`: временно закомментируй `BASE_URL` в `.env`, запусти `npm test`, затем верни строку.

## Вопросы

1. Напиши код ошибки и сообщение, которые выведет `npm run typecheck` для строки `const s: LocatorSpec = { strategy: 'testId', selector: '#a' };`, и одним предложением объясни, почему ошибка именно такая.
2. Напиши `true` или `false` для каждого из трёх выражений, где `err = new AiLocatorError('a', 'b')`: `err instanceof AiLocatorError`, `err instanceof Error`, `String(err).startsWith('Error:')`.
3. Напиши, что останется в JavaScript после транспиляции строки `import type { Page } from '@playwright/test';`, и одним предложением объясни почему.
4. Перечисли по шагам, что произойдёт при `npm test`, если в `.env` записано `BASE_URL=` с пустым значением. Укажи, на каком этапе упадёт запуск, запустится ли хоть один тест и какая строка `requireEnv` за это отвечает.
5. Назови одну причину, почему в этом проекте выбрано объединение строк, а не `enum`.
6. Напиши выведенный тип переменной `x` в строке `const x = { role: 'button' };` и одним предложением объясни, почему он не `{ role: 'button' }`.

## Вопросы студента по ходу урока

### Что делает `any` и что такое `foo`

Пример из [Handbook: any](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#any):

```ts
let obj: any = { x: 0 };
obj.foo();
obj();
obj.bar = 100;
obj = "hello";
const n: number = obj;
```

`foo` — несуществующее свойство, имя выбрано наугад. У объекта `{ x: 0 }` есть только `x`.
Пример показывает, что с `any` компилятор пропускает обращение к чему угодно.

`any` выключает проверку типов для значения. `tsc --strict` на этом коде даёт 0 ошибок. Ошибки появляются только при выполнении:

| Строка | tsc с `any` | Выполнение в Node | tsc без `any` |
|---|---|---|---|
| `obj.foo();` | ок | `TypeError: obj.foo is not a function` | TS2339: Property 'foo' does not exist |
| `obj();` | ок | `TypeError: obj is not a function` | TS2349: This expression is not callable |
| `obj.bar = 100;` | ок | ок, объект становится `{ x: 0, bar: 100 }` | TS2339: Property 'bar' does not exist |
| `obj = "hello";` | ок | ок | TS2322: string is not assignable to `{ x: number }` |
| `const n: number = obj;` | ок | ок, но `n` на деле строка `"hello"` | TS2322: not assignable to 'number' |

Последняя строка опаснее всех: `any` «заражает» типизированный код. Тип `n` объявлен как `number`, а внутри строка, и `n.toFixed` равно `undefined`.

Вывод для проекта: `any` не пишем. Для данных неизвестной формы, например JSON из кэша или ответа Claude, есть `unknown`: его нельзя использовать, пока тип не сужен проверкой.
Документация: [unknown](https://www.typescriptlang.org/docs/handbook/2/functions.html#unknown), [noImplicitAny](https://www.typescriptlang.org/tsconfig/#noImplicitAny).

## Ответы студента

### Шаг 2: почему `{ strategy: 'css', testId: 'x' }` не компилируется

Вывод `tsc`:

```
src/ai/types.ts:30:45 - error TS2353: Object literal may only specify known properties, and 'testId' does not exist in type '{ strategy: "css"; selector: string; }'.
```

Ответ студента: «Ошибка, потому что объект bad имеет union тип LocatorSpec, и в конструктор передаётся одно из возможных значений strategy: 'css', но с неверной переменной testId, у типа css может быть только одна переменная selector.»

### Шаги 3 и 4: проверка

- `npm run typecheck`: 0 ошибок.
- `npm test`: `Running 3 tests using 3 workers`, `3 passed (5.4s)`. Это 2 теста логина и 1 юнит-тест.
- `npm test` без `BASE_URL` в `.env`: запуск падает при загрузке конфига, ни один тест не стартует.

```
Error: Missing required env variable BASE_URL. Copy .env.example to .env and fill it in.
    at requireEnv (src\config\env.ts:4:11)
    at Object.<anonymous> (playwright.config.ts:14:26)
    ...
    at loadConfigFromFile (node_modules\playwright\lib\common\index.js:1490:10)
```

Как читать стек: верхняя строка показывает, где брошена ошибка, это `throw` в `env.ts`. Следующая строка показывает, кто вызвал функцию, это `baseURL` в конфиге. Строки `loadConfigFromFile` и `runTests` ниже доказывают, что Playwright ещё грузил конфиг и до тестов не дошёл.

### Самостоятельное задание

Функция `describeLocator` в `src/ai/types.ts` написана верно: `switch` по дискриминанту, ветка `role` с проверкой `if (spec.name)`, `never` в `default`.

Вывод `tsc` после добавления `text` без новой ветки:

```
src/ai/types.ts:40:19 - error TS2322: Type '{ strategy: "text"; text: string; }' is not assignable to type 'never'.
```

Объяснение студента: «Ошибка появилась, потому что тип strategy: 'text' не может быть присвоен константе с типом never.»

`npm test`: `8 passed`. При этом `npm run typecheck` в конце давал 2 ошибки в тестах, их показала IDE.

После исправления: `npm run typecheck` даёт 0 ошибок, `npm test` даёт `8 passed`. Аннотация `LocatorSpec` поставлена только в двух тестах `role`, рядом с ней остался лишний `as const`. В трёх других тестах осталась старая форма. Рекомендация: привести все тесты к виду `const spec: LocatorSpec = {...}` без `as const`. Исправлено до коммита.

### Ответы на вопросы урока

1. Вывод: `error TS2353: Object literal may only specify known properties, and 'selector' does not exist in type '{ strategy: "testId"; testId: string; }'`. «Ошибка из-за неправильного свойства selector, для strategy: 'testId' должен использоваться только testId: string.» Частично верно.
2. `true`, `true`, `false`. Верно.
3. «Ничего не останется: строка удаляется полностью, потому что import type импортирует только тип, а типы существуют лишь на этапе проверки TypeScript и в JavaScript их нет.» Верно.
4. «До запуска тестов проверяются переменные запуска инстанса браузера, выскочит ошибка на этом этапе, что переменная не задана.» Неверно.
5. «Union из строковых литералов — чистый тип, который исчезает при транспиляции и совместим с обычными строками. enum — отдельная runtime-конструкция.» Верно.
6. «object, потому что тип, сохранённый в переменной, это объект, а не его содержимое.» Неверно.

## Ошибки и разбор

### Вопрос 1: та же неточность, что в шаге 2

Вывод верный. Объяснение снова называет ошибку «неправильным свойством». TS2353 означает **лишнее** свойство: вариант уже выбран по `strategy: 'testId'`, и `selector` в нём не объявлен. «Только testId» тоже неточно: у варианта два обязательных свойства, `strategy` и `testId`. Отсутствующий `testId` — это отдельная ошибка, `tsc` сначала сообщает о лишнем свойстве.

### Вопрос 4: ошибка при загрузке конфига, браузер ни при чём

**Неверно: «проверяются переменные запуска инстанса браузера».** Браузер не участвует. Ошибку бросает наша функция при загрузке `playwright.config.ts`, до создания воркеров и до запуска браузера.

**Не хватает ответа на часть вопроса.** Нужно было назвать шаги, сказать про тесты и указать строку `requireEnv`.

**Правильный ответ:**
1. `playwright test` загружает `playwright.config.ts`.
2. `dotenv.config()` читает `.env`. Строка `BASE_URL=` даёт пустую строку, а не `undefined`: `dotenv.parse('BASE_URL=\n')` возвращает `{"BASE_URL":""}`.
3. При вычислении объекта для `defineConfig` вызывается `requireEnv('BASE_URL')`.
4. Срабатывает условие `value === ''` в строке 3 `env.ts`, строка 4 бросает `Error: Missing required env variable BASE_URL`.
5. Загрузка конфига падает. Воркеры не создаются, браузер не запускается, ни один тест не выполняется.

Проверка без правки `.env`: dotenv не перезаписывает уже заданную переменную, поэтому пустое значение можно передать из окружения.

```bash
BASE_URL= npx playwright test --list
# Error: Missing required env variable BASE_URL. ...
#     at requireEnv (src\config\env.ts:4:11)
```

### Вопрос 6: выведенный тип — `{ role: string }`, а не `object`

**Неверно: `object`.** TypeScript выводит форму объекта со всеми свойствами: `{ role: string }`. Это видно при наведении на `x` в IDE. `object` — отдельный тип «любое не-примитивное значение», о свойствах он ничего не знает.

**Неверно: «тип — это объект, а не его содержимое».** Тип объекта как раз описывает его содержимое: имена свойств и их типы. Поэтому `x.role` доступно, а у `object` нет.

**Правильная причина.** Свойство объекта можно перезаписать, `x.role = 'link'` разрешено даже у `const x`. Поэтому литерал `'button'` расширяется до `string` (widening). `const` защищает только саму переменную от переприсваивания, а не свойства объекта.

Проверка:

```ts
const x = { role: 'button' };
const lit: 'button' = x.role; // TS2322: Type 'string' is not assignable to type '"button"'
const o: object = x;
o.role;                       // TS2339: Property 'role' does not exist on type 'object'
```

Документация: [Literal Inference](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#literal-inference), [object type](https://www.typescriptlang.org/docs/handbook/2/functions.html#object).

### Шаг 2: объяснение ошибки TS2353

**Верно.** `LocatorSpec` — объединение, `strategy: 'css'` выбирает вариант, в этом варианте нет `testId`. Компилятор сужает объединение по дискриминанту, поэтому в сообщении стоит один вариант, а не весь `LocatorSpec`.

**Неверно: «в конструктор передаётся».** Конструктора здесь нет, он бывает у класса и вызывается через `new`. Здесь переменная инициализируется объектным литералом. Разница важна: проверка лишних свойств работает только для литералов.

**Неверно: «переменная testId».** `testId` — свойство (поле) объекта. Переменные объявляются через `let`, `const` или как параметры функции.

**Неточно: «может быть только одна переменная selector».** У варианта два обязательных свойства, `strategy` и `selector`. TS2353 сообщает о лишнем свойстве (excess property checking), а отсутствие обязательного свойства — другая ошибка, TS2322.

Проверка:

```ts
// Литерал без selector: TS2322, Property 'selector' is missing
const missing: LocatorSpec = { strategy: 'css' };

// Лишний testId через переменную: ошибки НЕТ (structural typing)
const raw = { strategy: 'css' as const, selector: '#a', testId: 'x' };
const ok: LocatorSpec = raw;
```

**Правильная формулировка.** Компилятор сужает `LocatorSpec` по `strategy: 'css'` до `{ strategy: 'css'; selector: string }`. Объектный литерал проходит проверку лишних свойств, а `testId` в этом варианте не объявлен, поэтому TS2353.

Документация: [Excess Property Checks](https://www.typescriptlang.org/docs/handbook/2/objects.html#excess-property-checks), [Type Compatibility](https://www.typescriptlang.org/docs/handbook/type-compatibility.html).

### Задание: объяснение ошибки с never

**Неточно: «тип strategy: 'text'».** В `never` присваивается не тип поля `strategy`, а весь вариант объединения `{ strategy: "text"; text: string }`. Это видно в тексте ошибки.

**Не хватает причины.** Важно, почему в `default` осталось что-то кроме `never`. Каждый `case` убирает свой вариант из типа `spec`. После трёх старых веток остаётся неразобранный вариант `text`, и тип `spec` в `default` равен ему, а не `never`.

**Правильная формулировка.** Ветки `switch` сузили `spec` до единственного неразобранного варианта `{ strategy: 'text'; text: string }`. Этот тип нельзя присвоить `never`, поэтому `tsc` указывает на строку проверки полноты.

### Задание: чекпоинт пройден не полностью

**Ошибка: проверен только `npm test`.** Чекпоинт состоит из двух команд. `npm test` прошёл, а `npm run typecheck` давал 2 ошибки TS2345 в `tests/unit/ai-types.spec.ts`. Playwright только вырезает типы, поэтому зелёные тесты не доказывают, что типы верны. Это вопрос 1 урока 2.

### Ошибка в IDE: расширение типа (widening)

```ts
const spec = { strategy: 'role' as const, role: 'button', name: 'Login' };
describeLocator(spec); // TS2345: role: string is not assignable to AriaRole
```

**Причина.** Свойства объекта изменяемы, поэтому TypeScript выводит для них общий тип: `role: 'button'` становится `role: string`. Это называется расширением типа (widening). `as const` стоит только на `strategy`, поэтому литералом осталось только `strategy`. Тип `string` шире объединения из 80 с лишним ролей, и присвоить его нельзя.

Документация: [Literal Inference](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#literal-inference).

Варианты исправления, все проверены через `tsc`:

```ts
const a: LocatorSpec = { strategy: 'role', role: 'button', name: 'Login' }; // аннотация
const b = { strategy: 'role', role: 'button' } as const;                    // as const на весь объект
const c = { strategy: 'role', role: 'button' } satisfies LocatorSpec;       // satisfies
describeLocator({ strategy: 'role', role: 'button' });                      // литерал прямо в вызове
```

**Рекомендация: аннотация `const spec: LocatorSpec`.** Она убирает все `as const`, включает проверку лишних свойств и даёт подсказки полей. Опечатка ловится сразу: `role: 'buton'` даёт TS2820 «Did you mean '"button"'?». `as const` на весь объект ловит опечатку только в месте вызова и делает объект readonly. `satisfies` полезен, когда нужен узкий тип значения, а здесь он не нужен.

Документация: [satisfies](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html#the-satisfies-operator), [const assertions](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-4.html#const-assertions).

## Итог

Коммит: `Lesson 3: TypeScript types, AiLocatorError, requireEnv`.

- **Код.** Добавлены `src/ai/types.ts` с `LocatorSpec`, `CachedLocator`, `AiLocatorError`, `describeLocator`, файл `src/config/env.ts` с `requireEnv` и юнит-тесты `tests/unit/ai-types.spec.ts`.
- **Конфиг.** В `tsconfig.json` добавлен `src/`. В `playwright.config.ts` `baseURL` берётся через `requireEnv`, запасное значение убрано.
- **Чекпоинт.** `npm run typecheck` даёт 0 ошибок, `npm test` даёт 8 passed.
- **Ошибки урока.** Путаница «лишнее свойство» и «неправильное свойство», «переменная» вместо «свойство», проверен только `npm test` без `typecheck`, widening и тип `object`, этап падения при пустой переменной.

Замечания ревью исправлены: все тесты `describeLocator` используют аннотацию `LocatorSpec` без `as const`, хвостовые пробелы в `src/ai/types.ts` убраны.
Следствие для урока 12: на CI нужно задать `BASE_URL` в workflow.
