# SPEC: Privacy, Blocks, Reports

Модули NestJS: `privacy` · Swagger: `/api/docs`

## Функциональность

Настройки приватности, приватный аккаунт, блокировки, жалобы. Центральный `VisibilityService`.

Источник: `GET/PUT /api/settings/privacy` — перенесены с DTO-валидацией. Интерфейсы `BlockedUser`, `Report` были без API — блокировки и жалобы **добавлены**.

## API

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/privacy/settings` | Настройки |
| PATCH | `/api/privacy/settings` | Изменить; переход в публичный режим принимает ожидающие запросы |
| GET | `/api/privacy/blocks` | Мои блокировки |
| POST | `/api/privacy/blocks/:userId` | Заблокировать: взаимные подписки и запросы удаляются |
| DELETE | `/api/privacy/blocks/:userId` | Разблокировать |
| GET | `/api/privacy/close-friends` | «Близкие друзья» (ADR-012) |
| PUT / DELETE | `/api/privacy/close-friends/:userId` | Добавить / убрать (нельзя себя, 404 для заблокированных и несуществующих) |
| GET | `/api/privacy/story-hidden` | Люди, от которых скрыты мои stories (ADR-012) |
| PUT / DELETE | `/api/privacy/story-hidden/:userId` | Скрыть / показать stories |
| POST | `/api/reports` | Жалоба (статус PENDING) |

## Правила видимости (ADR-012)

- `Audience`: `EVERYONE` / `FOLLOWERS` (отправитель подписан на меня) / `FOLLOWING` (я подписана на отправителя) / `NO_ONE`. `allowDirectMessages` проверяется при создании диалога **и при каждой отправке** сообщения в личный диалог.
- Блокировка удаляет подписки, запросы и «Близких друзей» в обе стороны.
- Stories: `VisibilityService.storyVisibleWhere` — автор видит всё; остальные — только если нет блокировки, автор не скрыл от них stories, и `audience` разрешает (`EVERYONE`: публичный аккаунт или подписчик; `FOLLOWERS`: подписчик; `CLOSE_FRIENDS`: в списке «Близких друзей»).

## DTO

- `UpdatePrivacySettingsDto { isPrivate?, allowTagging?, allowMentions?, allowComments?, allowDirectMessages? (EVERYONE|FOLLOWERS|NO_ONE), showOnlineStatus?, showReadReceipts?, allowStoryReplies? }`
- `CreateReportDto { targetType: USER|POST|COMMENT|STORY|REEL|MESSAGE, targetId, reason: SPAM|HARASSMENT|HATE_SPEECH|VIOLENCE|NUDITY|FALSE_INFORMATION|COPYRIGHT|OTHER, description? }`

## Связи с другими модулями

`VisibilityService` используют почти все модули: `profiles`, `posts`, `comments`, `likes`, `stories`, `reels`, `feed`, `search`, `messages`, `media`, `realtime`. Таблицы `PrivacySettings`, `Block`, `Report`.
