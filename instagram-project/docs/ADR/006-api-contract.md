# ADR-006: Контракт REST API

**Статус:** принято · **Дата:** 2026-10-23

## Проблема

Frontend и будущие клиенты должны знать формат запросов и ошибок. В исходнике ошибки отдавались то как `{ error }`, то как `{ message }`.

## Рассмотренные варианты

1. GraphQL.
2. **REST + Swagger (OpenAPI)**.

## Принятое решение

- Префикс `/api`, документация `/api/docs`, JSON-схема `/api/docs-json` (только не в production).
- Ошибки — стандартный формат NestJS `{ statusCode, message, error }`; `message` может быть массивом (ошибки валидации). Ошибки Prisma переводятся фильтром `PrismaExceptionFilter` (`P2002` → 409, `P2025`/`P2003` → 404).
- UUID в путях проверяются `ParseUUIDPipe` → 400.
- Списки: `{ items, nextCursor }`, параметры `?cursor=&limit=` (по умолчанию 20, максимум 50).
- Идемпотентные лайки: `POST …/like` и `DELETE …/like` вместо переключателя.
- Медиа: сначала `POST /media` (multipart, `purpose`), затем id передаётся в пост/story/reel/сообщение. Файлы отдаются по подписанной ссылке `/api/media/:id/file?exp=&sig=`.
- Типы ответов — в `packages/shared/src/types.ts`.
- Полный список endpoint-ов — в `docs/SPEC/*` и Swagger.

## Причины выбора

REST и Swagger требуются заданием; Swagger автоматически описывает DTO.

## Последствия

Нельзя добавлять endpoint во frontend, если его нет в Swagger (правило в `AI_RULES.md`).
