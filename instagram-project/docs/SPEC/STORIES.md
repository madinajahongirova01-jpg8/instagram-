# SPEC: Stories

Модули NestJS: `stories` · Swagger: `/api/docs`

## Функциональность

Stories на 24 часа, лента stories сгруппирована по авторам, просмотры, список зрителей, удаление, автоочистка.

Источник: создание (24 ч) и группировка с флагом «просмотрено» — перенесены. Просмотры, зрители, удаление, cron-очистка — **добавлены**. `textOverlays` не перенесены (ROADMAP).

## API

| Метод | Путь | Описание |
|---|---|---|
| POST | `/api/stories` | Создать из медиа `purpose=STORY` (изображение или видео) |
| GET | `/api/stories/feed` | Активные stories: свои + подписки, группы `{ user, stories[], hasUnseen }` |
| GET | `/api/profiles/:username/stories` | Активные stories пользователя (с проверкой видимости) |
| POST | `/api/stories/:id/view` | Отметить просмотр (повтор не дублирует) |
| GET | `/api/stories/:id/viewers` | Зрители — только автор |
| DELETE | `/api/stories/:id` | Удалить — только автор |

## DTO

- `CreateStoryDto { mediaId, caption?, audience? (EVERYONE | FOLLOWERS | CLOSE_FRIENDS, по умолчанию EVERYONE) }` — ADR-012
- `StoryDto` содержит `audience`. Лента stories, stories профиля и `POST /stories/:id/view` фильтруются правилами видимости (см. SPEC PRIVACY).

## Связи с другими модулями

- Истечение: запросы фильтруют `expiresAt > now`; `@Cron(EVERY_HOUR)` удаляет истёкшие stories и их файлы.
- `privacy` — видимость, блокировки. Таблицы `Story`, `StoryView`.
