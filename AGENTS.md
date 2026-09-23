# AI Locator Playwright

## Project Context

- This is a hands-on, lesson-by-lesson project for building an AI-powered locator layer on Playwright.
- The learning roadmap and current lesson state are in [LEARNING_PLAN.md](LEARNING_PLAN.md).
- Start from the first unchecked lesson in `LEARNING_PLAN.md`; read its notes before continuing.
- Do not consult `D:\Learn\playwright\playwright-ts-template` until the corresponding lesson is complete.

## Learning Workflow

- Preserve the lesson format: purpose, theory, incremental handwritten code, independent exercise, checkpoint, diff review, questions, then commit and tag.
- Prefer explaining the relevant concept before implementing it, and keep code changes small enough to type and review by hand.
- Do not skip ahead to later architecture or dependencies unless the current lesson explicitly requires them.
- Before committing, run the lesson checkpoint and review the diff for accidental or unrelated changes.
- Use the tag format `lesson-XX` when a lesson is complete.

## Technical Direction

- The planned stack is Node.js, npm, TypeScript, and Playwright Test.
- Future lessons introduce dotenv, Page Objects, a custom `ai` fixture, locator caching, DOM snapshots, and Claude tool use with retry/self-healing behavior.
- Later project work adds ESLint, Prettier, and GitHub Actions.
- Follow the repository's actual package scripts, configuration, and directory structure once they are created; do not assume commands or dependencies that are not present.

## Working Conventions

- Keep implementations explicit and educational rather than hiding lesson concepts behind abstractions or generators.
- Preserve existing Russian-language learning notes and user-authored code style unless the current lesson asks for a change.
- Treat the learning plan as the source of truth for lesson order and completion state.
