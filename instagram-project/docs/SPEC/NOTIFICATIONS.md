# SPEC: Notifications

Модули NestJS: `notifications` · Swagger: `/api/docs`

## Функциональность

Уведомления о лайках, комментариях, упоминаниях, подписках, запросах на подписку, их принятии и сообщениях.

Источник: `GET /api/notifications` — перенесён. Публичный `POST /api/notifications` **удалён** (позволял спамить). Прочтение, realtime-доставка — **добавлены**.

## API

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/notifications` | Список. Пагинация: `?cursor=<id>&limit=1..50` → `{ items, nextCursor }`. |
| GET | `/api/notifications/unread-count` | `{ count }` |
| PATCH | `/api/notifications/:id/read` | Прочитано |
| POST | `/api/notifications/read-all` | Все прочитаны |

Уведомления типа `MESSAGE` создаются (для настроек и истории), но **не** попадают в список и счётчик: у сообщений свой бейдж `GET /api/conversations/unread-count` (ADR-012).

## DTO

Внутренний API: `NotificationsService.notify({ recipientId, actorId, type, … })` и `retract(...)` (например, при снятии лайка).

## Связи с другими модулями

- Не создаются: себе, при блокировке, если тип выключен в `NotificationSettings`.
- Доставка в реальном времени: событие `notification:new`.
- Вызывается из `likes`, `comments`, `posts` (упоминания), `follows`, `messages`.
