# SPEC: Follows

Модули NestJS: `follows` · Swagger: `/api/docs`

## Функциональность

Подписка/отписка, запросы на подписку к приватным аккаунтам, принятие/отклонение, удаление подписчика, списки.

Источник: в исходнике были только массивы `followers[]`/`following[]` и интерфейс `FollowRequest` — **все endpoint-ы добавлены**.

## API

| Метод | Путь | Описание |
|---|---|---|
| POST | `/api/follows/:userId` | Публичный → `{status:'FOLLOWING'}`; приватный → `{status:'REQUESTED'}` |
| DELETE | `/api/follows/:userId` | Отписаться или отменить запрос → `{status:'NONE'}` |
| DELETE | `/api/followers/:userId` | Удалить своего подписчика |
| GET | `/api/follow-requests` | Входящие запросы (PENDING) |
| POST | `/api/follow-requests/:id/accept` | Принять → создаётся `Follow`, уведомление FOLLOW_ACCEPTED |
| POST | `/api/follow-requests/:id/decline` | Отклонить |
| GET | `/api/profiles/:username/followers` | Подписчики (для приватного — только подписчикам) |
| GET | `/api/profiles/:username/following` | Подписки |

## DTO

Тела запросов нет; `:userId`, `:id` — UUID. Пагинация: `?cursor=<id>&limit=1..50` → `{ items, nextCursor }`.

## Связи с другими модулями

- Нельзя подписаться на себя и при блокировке (в любую сторону).
- При переключении аккаунта в публичный режим ожидающие запросы принимаются (модуль `privacy`).
- `notifications` — FOLLOW, FOLLOW_REQUEST, FOLLOW_ACCEPTED.
- Таблицы `Follow`, `FollowRequest`.
