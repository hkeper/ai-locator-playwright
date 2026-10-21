# План обучения: AI-локатор на Playwright

Эталон: `D:\Learn\playwright\playwright-ts-template` (не подглядываем, пока урок не пройден).
Этот репозиторий пишется руками, урок за уроком.

**Для новой сессии Claude:** найди первый незакрытый урок ниже и продолжай с него. Прочитай «Заметки».

## Формат урока
Зачем → теория → код по частям (набираю руками) → самостоятельное задание → чекпоинт → ревью diff → вопросы → конспект `lessons/lesson-XX.md` → коммит + тег `lesson-XX`.

Конспекты всех уроков: [lessons/](lessons/README.md). Единственный формат — Markdown.
Позже из них соберём сайт-курс готовым генератором (VitePress или Astro Starlight); сгенерированный HTML в git не храним.

## Стиль преподавания
- Строго и прямо: ошибку называю ошибкой, без смягчений и без «в целом верно», если ответ неверный.
- Каждую ошибку разбираю развёрнуто: что именно неверно, почему, как правильно, ссылка на документацию.
- Аргументы проверяемые: по возможности даю минимальный пример или команду, которые показывают ошибку на практике.
- Частично верный ответ разбираю по частям: что верно, что нет.
- Неточную терминологию тоже поправляю.
- Не соглашаюсь ради согласия: если решение студента хуже альтернативы, говорю об этом и объясняю почему. Окончательное решение — за студентом.
- Ошибки и их разбор попадают в конспект урока, в раздел «Ошибки и разбор».

## Модуль A. Фундамент (без AI)
- [x] **Урок 0.** Подготовка: Node/git, GitHub, npm/package.json/lock-файл
- [x] **Урок 1.** Скелет: package.json построчно, зависимости, .gitignore, первый тест
- [x] **Урок 2.** tsconfig.json и playwright.config.ts, dotenv
- [x] **Урок 3.** TypeScript для проекта: типы, классы, свой Error (`src/ai/types.ts`)
- [x] **Урок 4.** Классический Page Object: BasePage, LoginPage, login.spec.ts

## Модуль B. Архитектура AI-локатора
- [ ] **Урок 5.** Кастомная фикстура `ai` и заглушка `AiLocatorHelper`
- [ ] **Урок 6.** Кэш локаторов на диске (`locatorCache.ts`)
- [ ] **Урок 7.** Движок без AI: cache → fallback, race condition с `count()`
- [ ] **Урок 8.** Снимок DOM (`domSnapshot.ts`), `page.evaluate`
- [ ] **Урок 9.** Подключаем Claude: tool use, retry, self-healing

## Модуль C. Доводим до проекта
- [ ] **Урок 10.** Inventory/Cart/Checkout + сквозной сценарий (самостоятельно)
- [ ] **Урок 11.** ESLint + Prettier
- [ ] **Урок 12.** CI на GitHub Actions
- [ ] **Урок 13 (бонус).** Ревью эталона: гонка записи в кэш, неиспользуемые `strategy` и `paths`

## Заметки
- 2026-09-23: Node v22.17.0, npm 11.19.1, git 2.50. Remote `origin` = `https://github.com/hkeper/ai-locator-playwright`.
- 2026-09-23, урок 0 пройден: package.json vs lock-файл, semver-диапазоны, `npm install` vs `npm ci`, `node_modules/.bin`. Эксперименты делались в песочнице вне репозитория.
- 2026-09-26, урок 1 пройден: разбор package.json, `@playwright/test` (транзитивно `playwright`, `playwright-core`), `.gitignore`, первый тест на saucedemo.com без конфига. Web-first assertions: сразу + backoff 20/50/100/100/500 мс, затем каждые 500 мс до `expect.timeout` 5 с. Воркеры: файлы параллельно, тесты в файле последовательно. Обсудили `id`/CSS vs `getByRole` vs `data-test` (i18n-аргумент ученика), в уроке 2 настроить `testIdAttribute: 'data-test'`.
- 2026-09-28, урок 2 пройден: TypeScript 7.0 (нативный, на Go; платформенные бинарники в optionalDependencies), @types/node@22, dotenv 18. Playwright только транспилирует TS, типы проверяет `npm run typecheck` (tsc, noEmit). С TS 6+ `types` по умолчанию [] — нужно явно `"types": ["node"]` (без этого process не виден; dotenv подтягивает node-типы транзитивно через reference, это маскирует проблему). Конфиг: baseURL из .env с `??`, testIdAttribute=data-test, retries/forbidOnly только на CI, trace on-first-retry. dotenv.config({ quiet: true }) до defineConfig, не перезаписывает уже заданные env. Практики .env/.env.example разобраны; проверку обязательных переменных сделать в уроке 3. В уроке 3 добавить src/ в include tsconfig.
- 2026-10-12, урок 3 пройден: src/ в include, src/ai/types.ts (AriaRole через Parameters<Page['getByRole']>[0], размеченное объединение LocatorSpec testId/role/css/text, CachedLocator, AiLocatorError с cause, describeLocator с проверкой полноты через never), src/config/env.ts requireEnv (пустая строка = нет значения), baseURL без запасного значения. Юнит-тесты без браузера в tests/unit. Слабые места ученика: терминология (свойство/переменная, литерал/конструктор), excess property check vs отсутствующее свойство, widening, запускать typecheck вместе с test. Открыто: на CI задать BASE_URL (урок 12).
- 2026-10-21, урок 4 пройден: src/pages/BasePage.ts (abstract, protected page, abstract readonly path, open()) и LoginPage.ts (локаторы в конструкторе, login без expect). Поля явно, без parameter properties (erasableSyntaxOnly). Тесты: describe + beforeEach, 5 login-тестов, итого 11 passed. Слабые места ученика: литеральный тип readonly-поля ('/', не string), синхронные page.url()/getByTestId, порядок инициализации полей при наследовании. Ученик попросил расписывать вопросы по пунктам (что должно быть в ответе). Node теперь v24.21.0.
