# SPEC: Messages

Модули NestJS: `messages, realtime` · Swagger: `/api/docs`

## Функциональность

Личные и групповые диалоги, текст, медиа, голосовые сообщения, отправка поста, удаление, реакции, прочтение, «печатает», онлайн-статус, WebRTC-сигналинг. Realtime — [ADR-008](../ADR/008-realtime.md).

Источник: диалоги, сообщения, отметка прочтения, socket-события и звонки — перенесены с исправлением безопасности. Удаление, реакции, голосовые, отправка поста — **добавлены**.

## API

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/conversations` | Мои диалоги: последнее сообщение, `unreadCount` |
| GET | `/api/conversations/unread-count` | `{ count }` — сколько диалогов содержат непрочитанные сообщения (бейдж «Сообщения»; добавлено по ADR-011) |
| POST | `/api/conversations` | Создать; для одного участника переиспользуется существующий диалог; проверяются блокировки и `allowDirectMessages` |
| GET | `/api/conversations/:id` | Диалог (только участник) |
| GET | `/api/conversations/:id/messages` | Сообщения. Пагинация: `?cursor=<id>&limit=1..50` → `{ items, nextCursor }`. |
| POST | `/api/conversations/:id/messages` | Отправить → socket `message:new` участникам, уведомление MESSAGE |
| POST | `/api/conversations/:id/read` | Отметить прочитанным (`lastReadAt`) → `conversation:read` (если `showReadReceipts`) |
| DELETE | `/api/messages/:id` | Мягкое удаление — только отправитель → `message:deleted` |
| PUT | `/api/messages/:id/reaction` | Поставить/заменить реакцию → `message:reaction` |
| DELETE | `/api/messages/:id/reaction` | Убрать реакцию |

Socket.io (`auth: { token }`): `typing:start|stop {conversationId}`, `conversation:read`, `call:offer {toUserId, callType: VOICE|VIDEO, sdp}`, `call:answer {toUserId, sdp}`, `call:ice-candidate {toUserId, candidate}`, `call:reject {toUserId, reason?: REJECTED|BUSY}`, `call:end {toUserId}`. На каждое событие звонка сервер отвечает ack `{ok, error?}` (`User is offline`, `User is not available`, `User does not accept calls from you`). Получатель видит `fromUserId` из токена; в `call:offer` сервер добавляет `from` — `UserSummary` звонящего (имя и аватар для окна входящего звонка), в `call:reject` — `reason` (по умолчанию `REJECTED`). Типы событий — `packages/shared/src/realtime.ts`.

Звонки во frontend (`apps/web/src/components/calls`): WebRTC 1:1, публичный STUN Google, без TURN (работает на localhost и в одной сети). Состояние микрофона и камеры собеседника передаётся по `RTCDataChannel` `control` — сервер его не видит. Занятый пользователь автоматически отвечает `call:reject {reason: BUSY}`; без ответа 45 с — `call:end`.

## Приватность (ADR-012)

В личном диалоге каждая отправка проверяет блокировку и `allowDirectMessages` получателя (`EVERYONE` / `FOLLOWING` / …). Если получатель запретил — `403`.

## DTO

- `CreateConversationDto { participantIds: uuid[], title? }`
- `SendMessageDto { type?: TEXT|IMAGE|VIDEO|AUDIO|POST_SHARE, content? (≤2000), mediaId?, sharedPostId? }` — голосовое = `AUDIO` + медиа `purpose=MESSAGE`.
- `ReactionDto { emoji }`

## Связи с другими модулями

`realtime` (рассылка), `notifications`, `media`, `posts` (видимость пересылаемого поста), `privacy`. Таблицы `Conversation`, `ConversationParticipant`, `Message`, `MessageReaction`.
