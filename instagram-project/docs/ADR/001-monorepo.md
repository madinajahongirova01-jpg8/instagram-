# ADR-001: Monorepo на npm workspaces

**Статус:** принято · **Дата:** 2026-10-23

## Проблема

Два разработчика одновременно пишут backend и frontend. Типы ответов API, правила паролей и username должны совпадать в обоих приложениях. При двух отдельных репозиториях они расходятся.

## Рассмотренные варианты

1. Два отдельных репозитория.
2. Monorepo на Turborepo / Nx.
3. Monorepo на pnpm или Yarn workspaces.
4. Monorepo на **npm workspaces**.

## Принятое решение

npm workspaces: `apps/api`, `apps/web`, `packages/shared`. Один `package-lock.json` в корне. `packages/shared` компилируется `tsc` в CommonJS (`dist/`) и подключается как `@insta/shared`; сборка выполняется автоматически в `postinstall` корня.

## Причины выбора

- npm уже установлен вместе с Node.js — новичкам не нужно учить новый инструмент.
- Turborepo/Nx дают кэш сборок, но для двух приложений это лишняя сложность (и запрещено требованиями).
- Общие константы (`PASSWORD_REGEX`, `USERNAME_REGEX`, лимиты) и типы (`CurrentUser`, `ProfileDto`, `AuthResponse`) лежат в одном месте.

## Последствия

- Плюс: изменение типа в `packages/shared` сразу видно и в API, и во frontend (`npm run typecheck`).
- Минус: после изменения `packages/shared` нужно выполнить `npm run build:shared`.
- Минус: npm может «поднять» пакеты в разные `node_modules` (так случилось с `ts-node`), поэтому конфиги Jest написаны на `.js`.
