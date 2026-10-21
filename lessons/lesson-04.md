# Урок 4. Классический Page Object: BasePage, LoginPage, login.spec.ts

> Дата: 2026-10-21. Тег: `lesson-04`.

## Зачем

Сейчас локаторы страницы логина написаны прямо в тестах. Когда тестов станет десять, `getByTestId('username')` повторится десять раз.
Если разработчики переименуют атрибут, придётся править каждый тест.

Page Object собирает локаторы и действия одной страницы в один класс. Тест говорит «залогинься», а не «заполни поле с data-test=username».

Для проекта это важно вдвойне. В модуле B AI-локатор встанет именно внутрь Page Object: тесты не изменятся, поменяется только то, как Page Object находит элементы.
Сначала нужен классический Page Object, чтобы потом было видно, что именно заменяет AI.

## Теория

### 1. Паттерн Page Object

Page Object — класс, который описывает одну страницу (или крупный компонент) приложения:
- **локаторы** элементов страницы — поля класса;
- **действия** пользователя — методы класса (`login`, `open`);
- **проверки** остаются в тесте (подробнее в п. 6).

Что это даёт:
- **Одно место для изменений.** Поменялся атрибут — правится одна строка в Page Object.
- **Читаемость.** Тест описывает сценарий на языке предметной области: `loginPage.login(user, password)`.
- **Повторное использование.** Один метод `login` нужен почти в каждом тесте магазина.

Чего Page Object не делает: не решает, правильно ли повело себя приложение. Это решает тест.

- [Playwright: Page object models](https://playwright.dev/docs/pom)
- [Martin Fowler: PageObject](https://martinfowler.com/bliki/PageObject.html)

### 2. Locator ленивый

`page.getByTestId('username')` не ищет элемент в DOM. Он возвращает объект `Locator` — описание того, как искать.
Поиск происходит каждый раз заново, в момент действия или проверки: `fill`, `click`, `expect(...).toBeVisible()`.

Следствия:
- Локаторы можно создавать в конструкторе Page Object, **до** `page.goto`. Конструктор не упадёт, даже если страница ещё пустая.
- Локатор не «протухает». После перерисовки React-компонента следующий `click` найдёт новый DOM-элемент.
- Локатор на несуществующий элемент тоже создаётся без ошибки. Ошибка будет при первом действии, после таймаута.

Противоположность — `ElementHandle` (`page.$(...)`): он держит ссылку на конкретный DOM-узел и ломается после перерисовки. Playwright не рекомендует его использовать.

- [Playwright: Locators](https://playwright.dev/docs/locators)
- [Playwright: Auto-waiting](https://playwright.dev/docs/actionability)
- [ElementHandle (discouraged)](https://playwright.dev/docs/api/class-elementhandle)

### 3. Модификаторы доступа и абстрактный класс

**Модификаторы доступа** ограничивают, откуда виден член класса:
- `public` (по умолчанию) — откуда угодно;
- `protected` — внутри класса и его наследников;
- `private` — только внутри самого класса.

Это проверки компилятора. В JavaScript после транспиляции их нет. Настоящая приватность в рантайме — синтаксис `#field`.

**Абстрактный класс** (`abstract class`) нельзя создать через `new`, только унаследовать.
Абстрактный член (`abstract readonly path: string`) объявлен без значения. Каждый наследник обязан его определить, иначе `tsc` выдаст ошибку.

У нас `BasePage` — абстрактный: «просто страницы» не бывает, бывает страница логина, каталога и т.д.
`BasePage` хранит `page` и умеет `open()`. Адрес страницы `path` знает только наследник.

- [TS: Member Visibility](https://www.typescriptlang.org/docs/handbook/2/classes.html#member-visibility)
- [TS: abstract Classes and Members](https://www.typescriptlang.org/docs/handbook/2/classes.html#abstract-classes-and-members)
- [MDN: Private elements](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_properties)

### 4. Порядок инициализации при наследовании

При `new LoginPage(page)` происходит следующее:
1. Вызывается конструктор `LoginPage`, он вызывает `super(page)`.
2. Выполняется конструктор `BasePage`. В этот момент поля, объявленные в `LoginPage`, **ещё не заданы**.
3. После возврата из `super()` инициализируются поля `LoginPage` (`path = '/'`).
4. Выполняется остаток конструктора `LoginPage`.

Поэтому базовый класс не может пользоваться в конструкторе тем, что задаёт наследник.
TypeScript ловит это для абстрактных полей: `TS2715: Abstract property 'path' in class 'BasePage' cannot be accessed in the constructor`.
В рантайме там было бы `undefined`.
Читать `this.path` в методе `open()` безопасно: метод вызывается после того, как объект полностью создан.

- [MDN: Public class fields](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Public_class_fields) — раздел о том, когда поля добавляются в наследнике
- [TS: Initialization Order](https://www.typescriptlang.org/docs/handbook/2/classes.html#initialization-order)

### 5. Параметр-свойства: почему не используем

TypeScript позволяет объявить поле прямо в параметре конструктора:

```ts
constructor(protected readonly page: Page) {} // поле page создаётся автоматически
```

Это короче, но это не просто аннотация типа: компилятор генерирует код `this.page = page`.
Такой синтаксис нельзя «стереть», поэтому его не поддерживают нативное удаление типов в Node и флаг `erasableSyntaxOnly` (та же причина, по которой в уроке 3 отказались от `enum`).
Пишем явно: объявление поля и присваивание в конструкторе. Так же сделано в примере документации Playwright.

- [TS: Parameter Properties](https://www.typescriptlang.org/docs/handbook/2/classes.html#parameter-properties)
- [tsconfig: erasableSyntaxOnly](https://www.typescriptlang.org/tsconfig/#erasableSyntaxOnly)

### 6. Где ставить expect

Правило проекта: **Page Object описывает страницу, тест проверяет результат.**
Page Object отдаёт локаторы (`loginPage.errorMessage`), тест решает, какой текст там должен быть.

Аргументы:
- Один и тот же `login()` используется и в позитивном, и в негативном тесте. Если внутри `login()` стоит `expect(page).toHaveURL('/inventory.html')`, негативный тест с заблокированным пользователем упадёт внутри Page Object.
- Проверка, спрятанная в методе, не видна при чтении теста. Непонятно, что именно тест проверяет.

Пример документации Playwright следует этому правилу: методы Page Object выполняют действия, `expect` — в тесте.

### 7. async-методы и пропущенный await

Все действия Playwright асинхронные и возвращают `Promise`. Поэтому методы Page Object тоже `async` и возвращают `Promise<void>`.
Внутри метода каждое действие идёт с `await`, иначе `fill` и `click` запустятся одновременно.

Пропущенный `await` в тесте — коварная ошибка (floating promise):
- Если следом стоит web-first проверка с повторами (`await expect(page).toHaveURL(...)`), она ждёт до 5 секунд. За это время незаэвейченный `login()` успевает завершиться, и **тест проходит**. Ошибка остаётся незамеченной.
- Если следом стоит проверка без повторов (`expect(page.url())...`) или тест на этом заканчивается, тест падает. Playwright пишет `locator.fill: Test ended.`

Компилятор пропущенный `await` не ловит. Это сделает правило ESLint `no-floating-promises` в уроке 11.

- [MDN: async function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function)
- [typescript-eslint: no-floating-promises](https://typescript-eslint.io/rules/no-floating-promises/)

### 8. Относительный путь и baseURL

`page.goto('/')` с относительным адресом собирает полный URL из `baseURL` конфига так же, как конструктор `new URL(path, baseURL)`.
`expect(page).toHaveURL('/inventory.html')` со строкой тоже собирает адрес через `baseURL` (проверено в исходниках Playwright 1.63).

Ловушка: путь, начинающийся с `/`, отбрасывает путь из `baseURL`:

```js
new URL('/login', 'https://example.com/app/').href  // 'https://example.com/login'
new URL('login',  'https://example.com/app/').href  // 'https://example.com/app/login'
```

Для saucedemo (`baseURL` без пути) разницы нет, но это надо знать.

- [page.goto](https://playwright.dev/docs/api/class-page#page-goto)
- [TestOptions.baseURL](https://playwright.dev/docs/api/class-testoptions#test-options-base-url)
- [MDN: URL() constructor](https://developer.mozilla.org/en-US/docs/Web/API/URL/URL)

### 9. test.describe и test.beforeEach

`test.describe('название', () => { ... })` группирует тесты. `test.beforeEach` выполняется перед каждым тестом группы и получает те же фикстуры (`{ page }`).
Так из каждого теста уходит повторяющееся «создать Page Object и открыть страницу».

В уроке 5 тот же приём сделаем через свою фикстуру — это более правильный для Playwright способ.

- [test.describe](https://playwright.dev/docs/api/class-test#test-describe)
- [test.beforeEach](https://playwright.dev/docs/api/class-test#test-before-each)

## Код урока

Данные saucedemo (проверено 2026-10-21):

| Элемент | data-test | Тег |
|---|---|---|
| Имя пользователя | `username` | `input type=text` |
| Пароль | `password` | `input type=password` |
| Кнопка входа | `login-button` | `input type=submit` |
| Сообщение об ошибке | `error` | `h3` (появляется после неудачного входа) |

Пользователи: `standard_user`, `locked_out_user`, пароль у всех `secret_sauce`.
После входа открывается `/inventory.html`.

### Шаг 1. src/pages/BasePage.ts

```ts
import type { Page } from '@playwright/test';

export abstract class BasePage {
  protected readonly page: Page;
  protected abstract readonly path: string;

  constructor(page: Page) {
    this.page = page;
  }

  async open(): Promise<void> {
    await this.page.goto(this.path);
  }
}
```

Проверка: `npm run typecheck` — 0 ошибок.

### Шаг 2. src/pages/LoginPage.ts

```ts
import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  protected readonly path = '/';

  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.usernameInput = page.getByTestId('username');
    this.passwordInput = page.getByTestId('password');
    this.loginButton = page.getByTestId('login-button');
    this.errorMessage = page.getByTestId('error');
  }

  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }
}
```

Проверка: временно удали строку `protected readonly path = '/';`, запусти `npm run typecheck`, сохрани текст ошибки, верни строку.

### Шаг 3. tests/login.spec.ts

Замени содержимое файла целиком:

```ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../src/pages/LoginPage';

test('login page opens', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.open();

  await expect(page).toHaveTitle('Swag Labs');
  await expect(loginPage.usernameInput).toBeVisible();
  await expect(loginPage.loginButton).toBeVisible();
});

test('standard user logs in', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.login('standard_user', 'secret_sauce');

  await expect(page).toHaveURL('/inventory.html');
});

test('locked out user sees an error', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.login('locked_out_user', 'secret_sauce');

  await expect(loginPage.errorMessage).toHaveText('Epic sadface: Sorry, this user has been locked out.');
});
```

Проверка: `npm run typecheck`, затем `npm test`.

## Песочница для проверки ответов

Создай временный `tests/scratch.spec.ts`. В git его не добавляй, после урока удали.

```ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../src/pages/LoginPage';

test('scratch', async ({ page }) => {
  // 1. Ленивый локатор: создаётся без ошибки, хотя страница пустая (about:blank)
  const ghost = page.getByTestId('does-not-exist');
  console.log('locator created:', ghost);

  const loginPage = new LoginPage(page);
  await loginPage.open();
  console.log('url after open:', page.url());

  // 2. Пропущенный await: убери await перед login и посмотри, пройдёт ли тест
  await loginPage.login('standard_user', 'secret_sauce');
  await expect(page).toHaveURL('/inventory.html');

  // 3. Разрешение относительных адресов
  console.log(new URL('/login', 'https://example.com/app/').href);
  console.log(new URL('login', 'https://example.com/app/').href);
});
```

```bash
npx playwright test tests/scratch.spec.ts --reporter=line
npm run typecheck
```

Для вопроса про тип `path` наведи курсор на `path` в `LoginPage.ts`: VS Code покажет выведенный тип.

## Самостоятельное задание

1. Добавь в `tests/login.spec.ts` два негативных теста, не меняя `LoginPage`:
   - неверный пароль → текст ошибки `Epic sadface: Username and password do not match any user in this service`;
   - пустое имя пользователя (оба поля пустые) → текст `Epic sadface: Username is required`.
2. Оберни все тесты файла в `test.describe('login', ...)` и перенеси создание `LoginPage` и `open()` в `test.beforeEach`.
   Подсказка: `loginPage` объявляется через `let` снаружи `beforeEach`.

## Чекпоинт

```bash
npm run typecheck   # 0 ошибок
npm test            # 11 passed: 6 unit + 5 login
```

## Вопросы

1. Напиши, в какой момент Playwright ищет элемент для `this.usernameInput = page.getByTestId('username')`: в конструкторе `LoginPage`, при `open()` или при `fill()`. Одним предложением объясни, почему конструктор не падает, хотя страница ещё не открыта.
2. В тесте `standard user logs in` убери `await` перед `loginPage.login(...)`. Напиши, прошёл тест или упал, и объясни почему. Затем напиши, что изменится, если заменить проверку на `expect(page.url()).toContain('inventory')`.
3. Напиши тип поля `path` в `LoginPage` точно так, как его показывает VS Code, и одним предложением объясни, почему он такой.
4. Напиши код ошибки `tsc`, которая появится, если в конструкторе `BasePage` добавить строку `console.log(this.path);`. Затем напиши, что вывел бы `console.log` в рантайме, и почему.
5. Напиши два полных URL, которые откроет `page.goto(path)`: (а) `baseURL = 'https://www.saucedemo.com'`, `path = '/'`; (б) `baseURL = 'https://example.com/app/'`, `path = '/login'`.
6. Ниже метод, который предлагают добавить в `LoginPage`. Напиши, согласен ли ты с ним, и назови один конкретный тест из этого урока, который он сломает.

   ```ts
   async login(username: string, password: string): Promise<void> {
     await this.usernameInput.fill(username);
     await this.passwordInput.fill(password);
     await this.loginButton.click();
     await expect(this.page).toHaveURL('/inventory.html');
   }
   ```

## Ответы студента

### Шаг 2: ошибка без `path`

`Non-abstract class 'LoginPage' does not implement inherited abstract member path from class 'BasePage'. ts(2515)`

### Ответы на вопросы урока

1. Локаторы ленивые и вызываются только во время непосредственно обращения в методе действия как fill.
2. Каждая команда в Playwright асинхронная, если забыть поставить await, то команда `await expect(page).toHaveURL('/inventory.html')` всё равно будет ждать 5 секунд, периодически проверяя ссылку, и за это время логин проходит, и это маскирует проблему, а вот команда `expect(page.url()).toContain('inventory')` не опрашивает повторно, а сразу смотрит, не находит и падает.
3. Тип string, он наследуется из абстрактного класса BasePage.
4. Текст ошибки «Abstract property 'path' in class 'BasePage' cannot be accessed in the constructor. ts(2715)», при запуске получаем undefined, потому что path задаётся только в наследниках.
5. а — `https://www.saucedemo.com/`, б — `https://example.com/login`.
6. Никаких проверок в POM, только в тестах, потому что негативные тесты будут валиться раньше, чем их проверки начнутся.

## Ошибки и разбор

### Шаг 2

**Верно.** TS2515: неабстрактный наследник обязан реализовать абстрактный член.

### Вопрос 1: верно по сути, неточная терминология, нет причины

**Верно:** элемент ищется при `fill()`.

**Неточно: «локаторы вызываются».** Локатор — объект, а не функция, его не вызывают. Правильно: «поиск элемента выполняется при действии».

**Не хватает причины.** Конструктор не падает, потому что `getByTestId` синхронно возвращает объект-описание `Locator` и не обращается к DOM.

### Вопрос 2: верно, одна неточность

**Неточно: «каждая команда в Playwright асинхронная».** `page.getByTestId()` и `page.url()` синхронные.
Именно поэтому `expect(page.url())` не может повторять проверку: в `expect` попадает готовая строка `'https://www.saucedemo.com/'`, а не то, что можно опросить заново.
Асинхронны действия (`fill`, `click`, `goto`) и web-first проверки.

Документация: [page.url()](https://playwright.dev/docs/api/class-page#page-url) — возвращает `string`, не `Promise`.

### Вопрос 3: неверно, тип `'/'`, а не `string`

VS Code показывает `(property) LoginPage.path: "/"`.

**Почему «наследуется из BasePage» неверно.** TypeScript не берёт тип поля наследника из базового класса, а выводит его из инициализатора `= '/'`.
Поле `readonly`, значение изменить нельзя, поэтому расширения (widening) до `string` нет. Та же тема, что в уроке 3.
Базовый класс только **проверяет совместимость**: `'/'` должен быть присваиваем к `string`.

Проверка через `tsc --strict`:

```ts
abstract class Base { protected abstract readonly path: string; }
class A extends Base { protected readonly path = '/'; check() { const p: '/' = this.path; } } // OK: тип '/'
class B extends Base { protected path = '/';          check() { const p: '/' = this.path; } } // TS2322: 'string' -> '"/"'
class C extends Base { protected readonly path = 42; }                                       // TS2416: number не присваиваем к string
```

Документация: [Literal Inference](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#literal-inference), [Literal Widening (PR #10676)](https://github.com/microsoft/TypeScript/pull/10676).

### Вопрос 4: код ошибки верный, причина неполная (и вопрос сформулирован плохо)

**Претензия к вопросу, а не к ответу.** «Объясни почему» не говорило, какие части нужны в ответе, и угадать ожидаемую глубину было нельзя.
Правильная формулировка вопроса:

> 4. В `BasePage` в конструктор добавили `console.log(this.path);`.
>    а) Напиши код ошибки, который покажет `tsc`.
>    б) Представь, что ошибку проигнорировали и код запустили. Напиши, что выведет `console.log`.
>    в) Расставь по порядку три события при `new LoginPage(page)`: «выполняется конструктор `BasePage`», «полю `path` присваивается `'/'`», «вызывается `super(page)`».
>    г) Одним предложением: почему значение, которое задаёт `LoginPage`, ещё не видно в п. б)?
>    Подсказка: теория, п. 4.

Ответ на в): вызывается `super(page)` → выполняется конструктор `BasePage` → полю `path` присваивается `'/'`.

**Неточно: «path задаётся только в наследниках».** `LoginPage` задаёт `path`, вопрос в том, почему значение не видно.
Причина — порядок выполнения: поля наследника инициализируются **после** возврата из `super()`. Пока работает конструктор `BasePage`, строка `path = '/'` ещё не выполнена.

Документация: [TS: Initialization Order](https://www.typescriptlang.org/docs/handbook/2/classes.html#initialization-order).

### Вопрос 6: позиция верная, нет конкретного теста

Вопрос требовал назвать тест. Правильно: `locked out user sees an error`. Сломаются и оба негативных теста из задания: каждый упадёт внутри `login()` через 5 секунд на `toHaveURL`, до проверки текста ошибки дело не дойдёт.

### Ревью кода: эксперимент не откачен, чекпоинт не пройден

В `standard user logs in` остался код из вопроса 2: `login` без `await` и `expect(page.url())` без повторов. `npm test` дал 1 failed / 10 passed. Перед ответом «чекпоинт пройден» нужно запускать обе команды на итоговом коде.

### Ревью кода: `beforeEach` снаружи `describe`

Хук и `let loginPage` стояли на верхнем уровне файла, а `describe` ничего не группировал.
Хук на уровне файла выполняется перед **каждым** тестом файла, внутри `describe` — только перед тестами группы.
Если в файл добавится второй `describe`, которому логин-страница не нужна, хук верхнего уровня выполнится и для него.

Документация: [test.beforeEach](https://playwright.dev/docs/api/class-test#test-before-each).

`let` на уровне модуля при `fullyParallel` безопасен: каждый воркер — отдельный процесс со своей копией модуля, тесты внутри воркера идут по очереди. В уроке 5 переменная исчезнет, когда Page Object станет фикстурой.

### Ревью кода: мелочи

Неиспользуемый `{page}` в тестах, хвостовые пробелы, нет перевода строки в конце файлов, отступ 4 пробела в `src/pages` против 2 в остальных файлах. Автоматически это будет исправлять Prettier в уроке 11.

## Итог

Коммит: `Lesson 4: classic Page Object (BasePage, LoginPage)`.

- **Код.** Добавлены `src/pages/BasePage.ts` (абстрактный класс: `page`, абстрактный `path`, `open()`) и `src/pages/LoginPage.ts` (локаторы `username`, `password`, `login-button`, `error`, метод `login`).
- **Тесты.** `tests/login.spec.ts` переписан на `LoginPage`: группа `login` с `beforeEach`, 5 тестов (открытие страницы, успешный вход, заблокированный пользователь, неверный пароль, пустые поля).
- **Чекпоинт.** `npm run typecheck` — 0 ошибок, `npm test` — 11 passed (6 unit + 5 login).
- **Ошибки урока.** «Локатор вызывается», «все команды асинхронные» (`page.url()` синхронный), тип `path` — `'/'`, а не `string`, порядок инициализации при наследовании, не откачанный эксперимент перед чекпоинтом, `beforeEach` снаружи `describe`.
- **Замечание к формату.** С этого урока вопросы расписываются по пунктам: что именно должно быть в ответе.

Следствие для урока 5: `let loginPage` + `beforeEach` заменяется фикстурой.
