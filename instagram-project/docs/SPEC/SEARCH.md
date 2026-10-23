# SPEC: Search

Модули NestJS: `search` · Swagger: `/api/docs`

## Функциональность

Поиск пользователей, публикаций и хэштегов, посты по хэштегу.

Источник: `GET /api/search?q=` — перенесён; regex-инъекция исправлена (Prisma `contains` / `startsWith`, `mode: insensitive`, длина ≤ 50).

## API

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/search?q=&type=all\|users\|hashtags\|posts` | Ведущие `@` и `#` в запросе отбрасываются (`normalizeSearchQuery`); `type` выбирает, что искать |
| GET | `/api/search/hashtags/:name/posts` | Посты с хэштегом. Пагинация: `?cursor=<id>&limit=1..50` → `{ items, nextCursor }`. |

## DTO

`SearchQueryDto { q (1..50), type? }`

## Связи с другими модулями

Результаты фильтруются `VisibilityService` (приватные аккаунты, блокировки, архив).
