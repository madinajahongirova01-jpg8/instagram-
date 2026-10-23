# SPEC: Reels

Модули NestJS: `reels (+ comments, likes)` · Swagger: `/api/docs`

## Функциональность

Короткие видео: создание, лента, просмотр, счётчик просмотров, лайки, комментарии, удаление.

Источник: `GET/POST /api/reels` — перенесены (base64 заменено файловым хранилищем; превью из видео через Sharp удалено — оно не работало). Просмотры, удаление, лайки и комментарии reels — **добавлены**.

## API

| Метод | Путь | Описание |
|---|---|---|
| POST | `/api/reels` | Создать из `videoMediaId` (purpose `REEL`, видео) и необязательного `thumbnailMediaId` (изображение) |
| GET | `/api/reels` | Лента: свои + подписки. Пагинация: `?cursor=<id>&limit=1..50` → `{ items, nextCursor }`. |
| GET | `/api/reels/:id` | Один reel |
| POST | `/api/reels/:id/view` | +1 просмотр |
| DELETE | `/api/reels/:id` | Только автор |
| GET | `/api/profiles/:username/reels` | Reels профиля |
| POST/DELETE | `/api/reels/:id/like` | Лайк |
| GET/POST | `/api/reels/:reelId/comments` | Комментарии (учитывает `allowComments`) |

## DTO

- `CreateReelDto { videoMediaId, thumbnailMediaId?, caption?, durationSec?, allowComments? }`

## Связи с другими модулями

`media`, `likes`, `comments`, `notifications`, `privacy`. Таблицы `Reel`, `ReelHashtag`.
