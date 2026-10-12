# Урок 2. tsconfig.json, playwright.config.ts и dotenv

> Дата: 2026-09-28. Тег: `lesson-02`. Конспект восстановлен по заметкам.

## Зачем

Проекту нужны проверка типов, общий конфиг тестов и настройки из окружения.
Тогда адрес приложения и поведение на CI меняются без правки кода.

## Теория

### Playwright не проверяет типы

Playwright только транспилирует TypeScript, то есть вырезает типы и запускает JavaScript.
Ошибка типов не уронит тест. Типы проверяет отдельная команда:

```bash
npm run typecheck   # запускает tsc; в конфиге noEmit, поэтому файлы не создаются
```

Документация: [TypeScript в Playwright](https://playwright.dev/docs/test-typescript).

### TypeScript 7

TypeScript 7.0 нативный, написан на Go.
Бинарники под разные платформы приходят через `optionalDependencies`, npm ставит только подходящий.

### Поле types и @types/node

Начиная с TypeScript 6, `types` по умолчанию пустой список.
Без `"types": ["node"]` компилятор не знает про `process` и другие API Node.
Ловушка: dotenv подтягивает типы Node транзитивно через reference, и это маскирует проблему.
Документация: [types в TSConfig](https://www.typescriptlang.org/tsconfig/#types).

### tsconfig.json урока

```json
{
    "compilerOptions": {
        "target": "es2022",
        "module": "commonjs",
        "strict": true,
        "noEmit": true,
        "skipLibCheck": true,
        "types": ["node"]
    },
    "include": ["tests/**/*.ts", "playwright.config.ts"]
}
```

### playwright.config.ts

- **baseURL.** Берётся из `.env`, запасное значение задаётся через `??`. Тогда в тесте пишут `page.goto('/')`.
- **testIdAttribute: 'data-test'.** `getByTestId('username')` ищет `[data-test="username"]`.
- **retries и forbidOnly.** Включены только на CI, где задана переменная `CI`.
- **trace: 'on-first-retry'.** Трейс пишется только при повторе упавшего теста.

Документация: [Test configuration](https://playwright.dev/docs/test-configuration).

### dotenv

`dotenv.config({ quiet: true })` читает `.env` в `process.env` и вызывается до `defineConfig`.
Уже заданные переменные окружения dotenv не перезаписывает.
Файл `.env` в git не коммитится, а `.env.example` коммитится как образец со всеми ключами.
Документация: [dotenv](https://github.com/motdotla/dotenv).

```
# .env.example
BASE_URL=https://www.saucedemo.com
```

## Вопросы для самопроверки

1. Назови команду, которая найдёт ошибку типов, и одним предложением объясни, почему `npm test` её не найдёт.
2. Напиши результат `process.env.BASE_URL ?? 'x'`, если переменная задана пустой строкой.
3. Перечисли, какие файлы из пары `.env` и `.env.example` коммитятся.
4. Напиши значение `retries` локально и на CI.

## Итог

Коммит: `Lesson 2: tsconfig, playwright config, dotenv`.
Перенесено в урок 3: проверка обязательных переменных окружения и добавление `src/` в `include` tsconfig.
