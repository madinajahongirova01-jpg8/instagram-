# ADR-005: PostgreSQL + Prisma 7

**Статус:** принято · **Дата:** 2026-10-23

## Проблема

Исходник — MongoDB без схем: массивы `followers[]`, `likes[]`, `readBy[]` внутри документов, base64-картинки в БД, дублирующиеся поля.

## Рассмотренные варианты

1. Оставить MongoDB.
2. PostgreSQL + TypeORM.
3. **PostgreSQL + Prisma.**

## Принятое решение

PostgreSQL 16 + Prisma 7 (`prisma-client` generator → `src/generated/prisma`, драйвер-адаптер `@prisma/adapter-pg`, конфиг `prisma.config.ts`). Миграции в `apps/api/prisma/migrations`.

Модели: `User`, `Profile`, `PrivacySettings`, `NotificationSettings`, `Session`, `RefreshToken`, `VerificationToken`, `Media`, `Post`, `Hashtag`, `PostHashtag`, `ReelHashtag`, `PostMention`, `Comment`, `Like`, `Follow`, `FollowRequest`, `Story`, `StoryView`, `Reel`, `Conversation`, `ConversationParticipant`, `Message`, `MessageReaction`, `Notification`, `Block`, `Report`.

- Связи многие-ко-многим — отдельные таблицы с составными первичными ключами (`Follow`, `StoryView`, `PostHashtag`).
- `Like` и `Comment` полиморфные: ровно одно из `postId` / `reelId` / `commentId`; уникальные индексы `(userId, postId)` и т. п.
- Счётчики (`likesCount`, `commentsCount`) денормализованы и меняются в той же транзакции.
- Удаление пользователя — `onDelete: Cascade` по связям.
- Индексы под ленту и пагинацию: `(authorId, createdAt)`, `(recipientId, createdAt)` и др.
- Пагинация курсорная (`createdAt` + `id`).

## Причины выбора

- Prisma требуется по заданию, даёт типобезопасные запросы и понятные миграции.
- Реляционная модель естественна для подписок, лайков, участников диалогов.

## Последствия

- После изменения `schema.prisma` нужно `npm run db:migrate` (создаёт миграцию) и `npm run db:generate`.
- Сгенерированный клиент лежит в `src/generated/prisma` (не редактировать вручную).
