# ADR-008: Realtime: Socket.io и WebRTC-сигналинг

**Статус:** принято · **Дата:** 2026-10-23

## Проблема

Исходный `socket-server.js` доверял `userId` от клиента, отправлял «печатает» в несуществующие комнаты и адресовал WebRTC по `socket.id`.

## Рассмотренные варианты

1. Отдельный Socket.io-сервер (как в исходнике).
2. **Gateway внутри NestJS-приложения.**
3. Server-Sent Events.

## Принятое решение

`RealtimeGateway` (`apps/api/src/realtime`) на том же порту, что и API.

- Аутентификация в handshake: `auth.token` (access JWT) или заголовок `Authorization`; проверка подписи и сессии. Без токена — отключение.
- Каждый сокет входит в комнату `user:<id>`; несколько вкладок учитываются счётчиком в `RealtimeService`.
- Сообщения отправляются через REST (`POST /conversations/:id/messages`), а сервер рассылает `message:new` участникам. Так одна логика проверок для REST и realtime.
- События клиента: `typing:start`, `typing:stop`, `conversation:read`, `call:offer`, `call:answer`, `call:ice-candidate`, `call:reject`, `call:end`.
- События сервера: `message:new`, `message:deleted`, `message:reaction`, `typing`, `conversation:read`, `presence:online`, `presence:offline`, `notification:new`, `call:*`.
- Перед рассылкой проверяется участие в диалоге; звонить можно только при общем диалоге и отсутствии блокировки. Онлайн-статус скрывается, если `showOnlineStatus = false`.
- Имена событий — в `packages/shared/src/realtime.ts`. STUN/TURN — ответственность клиента.

## Причины выбора

Один процесс проще запускать; используется тот же `SessionsService` для проверки токенов.

## Последствия

- Для нескольких экземпляров API потребуется `@socket.io/redis-adapter` (ROADMAP).
- Frontend сейчас не подключает сокеты (страниц чатов нет), gateway покрыт e2e-тестом `test/realtime.e2e-spec.ts`.
