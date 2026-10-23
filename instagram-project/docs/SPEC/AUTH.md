# SPEC: Auth

Модули NestJS: `auth, sessions` · Swagger: `/api/docs`

## Функциональность

Регистрация, вход по email **или** username, выход, refresh с ротацией, подтверждение email, восстановление и смена пароля, управление сессиями. Подробности безопасности — [ADR-004](../ADR/004-auth-token-security.md).

Источник: перенесено из `POST /api/auth/register`, `POST /api/auth/change-password`, NextAuth credentials. Refresh, logout, сессии, подтверждение email, сброс пароля — **добавлены**.

## API

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| POST | `/api/auth/register` | public, 10/мин | Создать аккаунт, сразу выдать токены, отправить письмо подтверждения |
| POST | `/api/auth/login` | public, 10/мин | Вход; 401 при неверных данных; 5 неудач → блокировка 15 мин (429) |
| POST | `/api/auth/refresh` | cookie `rt`, 30/мин | Ротация refresh, новый access |
| POST | `/api/auth/logout` | cookie `rt` | Отзыв сессии, удаление cookie (204) |
| GET | `/api/auth/me` | bearer | Текущий пользователь (`CurrentUser`) |
| POST | `/api/auth/verify-email` | public | Подтвердить email по токену из письма |
| POST | `/api/auth/resend-verification` | bearer, 3/мин | Отправить письмо ещё раз |
| POST | `/api/auth/forgot-password` | public, 5/мин | Всегда 200; письмо, если email существует |
| POST | `/api/auth/reset-password` | public | Новый пароль по токену; все сессии отзываются |
| POST | `/api/auth/change-password` | bearer | Смена пароля; остальные сессии отзываются → `revokedSessions` |
| GET | `/api/sessions` | bearer | Список активных сессий (`current: true` у текущей) |
| DELETE | `/api/sessions/:id` | bearer | Завершить одну сессию |
| DELETE | `/api/sessions/others` | bearer | Завершить все, кроме текущей |

## DTO

- `RegisterDto { email, username, fullName, password }` — email lowercase; username `^[a-z0-9._]{3,30}$` без точки в начале/конце и `..`; пароль 8–72, буква + цифра.
- `LoginDto { login, password }` — `login` = email или username.
- `ChangePasswordDto { currentPassword, newPassword }`
- `ForgotPasswordDto { email }`, `TokenDto { token }`, `ResetPasswordDto { token, newPassword }`
- Ответ: `AuthResponse { accessToken, expiresIn, user: CurrentUser }`

## Связи с другими модулями

- `users` — `CurrentUser`, проверка пароля для смены email и удаления аккаунта.
- `mail` — письма подтверждения, сброса, уведомления о безопасности.
- `sessions` — выдача/проверка токенов используется guard-ом и `RealtimeGateway`.
- Таблицы: `User`, `Session`, `RefreshToken`, `VerificationToken`.
