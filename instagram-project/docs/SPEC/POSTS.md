# SPEC: Posts, Comments, Likes

Модули NestJS: `posts, comments, likes` · Swagger: `/api/docs`

## Функциональность

Публикации с 1–10 медиафайлами, подпись с #хэштегами и @упоминаниями, изменение, архив, удаление; комментарии и ответы; лайки постов, reels и комментариев.

Источник: создание поста, хэштеги/упоминания из подписи, комментарии с `parentCommentId`, лайк-переключатель — перенесены (лайк стал идемпотентным). Изменение/удаление поста, удаление комментариев, лайки комментариев, список лайкнувших — **добавлены**.

## API

| Метод | Путь | Описание |
|---|---|---|
| POST | `/api/posts` | Создать пост из загруженных медиа (`purpose=POST`) |
| GET | `/api/posts/:id` | Пост (проверка видимости) |
| PATCH | `/api/posts/:id` | Изменить подпись/место/флаги/архив (только автор) |
| DELETE | `/api/posts/:id` | Удалить (только автор) |
| GET | `/api/profiles/:username/posts` | Посты профиля. Пагинация: `?cursor=<id>&limit=1..50` → `{ items, nextCursor }`. |
| GET | `/api/posts/:postId/comments` | Комментарии верхнего уровня |
| POST | `/api/posts/:postId/comments` | Комментарий / ответ (`parentId`); учитывает `commentsDisabled` и `allowComments` |
| GET | `/api/comments/:id/replies` | Ответы |
| DELETE | `/api/comments/:id` | Автор комментария или владелец поста |
| POST/DELETE | `/api/posts/:id/like` | Лайк / снять лайк |
| GET | `/api/posts/:id/likes` | Кто лайкнул |
| POST/DELETE | `/api/comments/:id/like` | Лайк комментария |
| POST/DELETE | `/api/posts/:id/save` | Сохранить / убрать из «Сохранённого» → `{ saved }` (ADR-011) |
| GET | `/api/users/me/saved` | Мои сохранённые посты, без скрытых для меня. Пагинация: `?cursor=<postId>&limit=1..50` |

## DTO

- `CreatePostDto { mediaIds: uuid[1..10], caption? (≤2200), location?, commentsDisabled?, hideLikeCount? }`
- `UpdatePostDto { caption?, location?, commentsDisabled?, hideLikeCount?, isArchived? }`
- `CreateCommentDto { content (1..1000), parentId? }`
- Ответ: `PostDto` (`likesCount = null`, если `hideLikeCount` и смотрит не автор; `savedByMe` — сохранён ли пост текущим пользователем).

## Связи с другими модулями

- `media` — проверка, что медиа принадлежит автору и ещё не привязано.
- `TaggingService` — хэштеги (`Hashtag`, `PostHashtag`), упоминания (`PostMention`) с учётом `allowMentions`.
- `notifications` — LIKE, COMMENT, MENTION.
- `privacy/VisibilityService` — доступ к посту.
