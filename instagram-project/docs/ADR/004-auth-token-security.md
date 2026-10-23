# ADR-004: Access и refresh токены

**Статус:** принято · **Дата:** 2026-10-23

## Проблема

Исходник использовал NextAuth (запрещено) и не имел ни выхода на сервере, ни отзыва сессий. Нужны: access/refresh, ротация, отзыв, обнаружение повторного использования, управление сессиями.

## Рассмотренные варианты

1. Одна долгоживущая JWT.
2. Access + refresh, оба JWT.
3. **Короткий JWT access + непрозрачный (opaque) refresh, хранящийся в БД в виде хеша.**

## Принятое решение

- **Access token**: JWT (HS256), 15 минут (`JWT_ACCESS_TTL_SECONDS`), payload `{ sub, sid }`. Передаётся в `Authorization: Bearer`. Guard проверяет подпись **и** что сессия `sid` не отозвана — logout действует сразу.
- **Refresh token**: 32 случайных байта, отдаётся только в cookie `rt` (`httpOnly`, `SameSite=Strict`, `path=/api/auth`, `secure` в production). В БД хранится только `sha256` (`RefreshToken.tokenHash`).
- **Session** — одна на устройство; `RefreshToken` — цепочка токенов сессии (`replacedById`).
- **Ротация**: каждый `POST /auth/refresh` помечает токен `usedAt` и выдаёт новый. Проверка выполняется атомарно (`updateMany … where usedAt = null`).
- **Повторное использование**: если пришёл уже использованный или отозванный токен — вся сессия отзывается (признак кражи).
- **Пароли**: bcrypt, cost 12. **Brute-force**: 5 неудачных входов → блокировка на 15 минут + rate limit 10 запросов/мин на auth-маршрутах.
- Смена пароля завершает остальные сессии; сброс пароля — все сессии.
- **Токены email/сброса**: случайные, в БД — хеш, одноразовые, с истечением (`VerificationToken`).
- **2FA (будущее)**: поля `User.twoFactorEnabled`, `twoFactorSecret`; при `twoFactorEnabled` вход отвечает `501`, чтобы нельзя было обойти будущий второй шаг.

## Причины выбора

- Хеш вместо raw-токена: утечка БД не даёт рабочих refresh-токенов.
- Opaque refresh можно отозвать; JWT-refresh отозвать нельзя без таблицы.

## Последствия

- Frontend должен выполнять refresh строго по одному (`lib/refresh-session.ts`, single-flight), иначе два параллельных refresh будут приняты за кражу. Проверено в dev-режиме со StrictMode.
- Две вкладки браузера могут одновременно сделать refresh — одна из них разлогинит сессию. Записано в ROADMAP (BroadcastChannel/lock).
- `SameSite=Strict` работает, пока web и API на одном «сайте» (localhost:3000 и localhost:4000 — один сайт). Для разных доменов нужен прокси или `SameSite=None; Secure` + CSRF-защита.
