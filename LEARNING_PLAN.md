# План обучения: AI-локатор на Playwright

Эталон: `D:\Learn\playwright\playwright-ts-template` (не подглядываем, пока урок не пройден).
Этот репозиторий пишется руками, урок за уроком.

**Для новой сессии Claude:** найди первый незакрытый урок ниже и продолжай с него. Прочитай «Заметки».

## Формат урока
Зачем → теория → код по частям (набираю руками) → самостоятельное задание → чекпоинт → ревью diff → вопросы → коммит + тег `lesson-XX`.

## Модуль A. Фундамент (без AI)
- [x] **Урок 0.** Подготовка: Node/git, GitHub, npm/package.json/lock-файл
- [x] **Урок 1.** Скелет: package.json построчно, зависимости, .gitignore, первый тест
- [ ] **Урок 2.** tsconfig.json и playwright.config.ts, dotenv
- [ ] **Урок 3.** TypeScript для проекта: типы, классы, свой Error (`src/ai/types.ts`)
- [ ] **Урок 4.** Классический Page Object: BasePage, LoginPage, login.spec.ts

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
