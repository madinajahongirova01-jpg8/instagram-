# SPEC: Users, Profiles, Settings

Модули NestJS: `users, profiles, settings` · Swagger: `/api/docs`

## Функциональность

Аккаунт (username, email, удаление), публичный профиль, аватар, рекомендации, онлайн-статус, настройки уведомлений.

Источник: `GET/PUT /api/users/me`, `GET /api/users/suggested`, `GET/PUT /api/settings/notifications` — перенесены. Смена username/email, удаление аккаунта, публичный профиль по username, presence — **добавлены**.

## API

| Метод | Путь | Описание |
|---|---|---|
| PATCH | `/api/users/me/username` | Сменить username (409, если занят) |
| PATCH | `/api/users/me/email` | Сменить email (нужен пароль); новый email не подтверждён, на старый — уведомление |
| DELETE | `/api/users/me` | Удалить аккаунт (нужен пароль), каскадное удаление данных |
| GET | `/api/users/suggested` | Рекомендации: не подписан, не заблокирован |
| GET | `/api/users/:id/presence` | Онлайн / `lastSeenAt` с учётом `showOnlineStatus` |
| GET | `/api/users/me/contacts` | `ContactDto[]`: собеседники личных диалогов (до 20, новые сверху), без заблокированных; `online` / `lastSeenAt` с учётом `showOnlineStatus` (добавлено по ADR-011) |
| GET | `/api/profiles/:username` | `ProfileDto`: счётчики, `followStatus`, `canViewContent` |
| PATCH | `/api/profiles/me` | Имя, био (≤150), сайт (http/https) |
| PUT | `/api/profiles/me/avatar` | Установить аватар (`mediaId` с purpose `AVATAR`) |
| DELETE | `/api/profiles/me/avatar` | Убрать аватар |
| GET | `/api/settings/notifications` | Настройки уведомлений |
| PATCH | `/api/settings/notifications` | Изменить настройки |

## DTO

- `ChangeUsernameDto { username }`, `ChangeEmailDto { email, password }`, `CurrentPasswordDto { password }`
- `UpdateProfileDto { fullName?, bio?, website? | null }`, `SetAvatarDto { mediaId }`
- `UpdateNotificationSettingsDto { likes?, comments?, follows?, followRequests?, mentions?, messages?, emailNotifications? }`

## Связи с другими модулями

- `privacy` — `isPrivate`, блокировки влияют на `ProfileDto`.
- `follows` — счётчики и `followStatus`.
- `media` — аватар.
- `notifications` — читает `NotificationSettings` перед созданием уведомления.
- Frontend использует: `/auth/me`, `/profiles/:username`, `/profiles/:username/posts`, `PATCH /profiles/me`, `/media`, `/profiles/me/avatar`.
