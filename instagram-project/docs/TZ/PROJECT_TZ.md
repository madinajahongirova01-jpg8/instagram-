# Техническое задание: Instagram-like проект

## 1. Цель проекта

Создать учебный, но production-ориентированный Instagram-like сервис для команды из двух начинающих разработчиков: безопасный backend со всей основной функциональностью социальной сети и минимальный frontend для авторизации и профиля. Функциональность берётся из backend исходного проекта (ZIP), переносится на NestJS + PostgreSQL + Prisma и дополняется недостающим. Анализ исходника — [`SOURCE_BACKEND_ANALYSIS.md`](../SOURCE_BACKEND_ANALYSIS.md).

## 2. Основные функции

| Область | Функции |
|---|---|
| Аккаунт | регистрация, вход (email или username), выход, refresh-токены, сессии, подтверждение email, сброс/смена пароля, смена email/username, удаление аккаунта |
| Профиль | имя, био, сайт, аватар, счётчики, рекомендации, онлайн-статус |
| Публикации | посты 1–10 медиа, хэштеги, упоминания, изменение, архив, удаление |
| Взаимодействие | комментарии и ответы, лайки постов/reels/комментариев |
| Подписки | подписка, отписка, запросы для приватных аккаунтов, принятие/отклонение, списки |
| Stories | 24 часа, лента, просмотры, зрители, автоочистка |
| Reels | видео, лента, просмотры, лайки, комментарии |
| Лента и поиск | лента подписок, explore, поиск пользователей/постов/хэштегов |
| Сообщения | диалоги и группы, текст/медиа/голос/пост, реакции, удаление, прочтение, «печатает», онлайн, WebRTC-сигналинг |
| Уведомления | лайки, комментарии, упоминания, подписки, запросы, сообщения; realtime |
| Приватность | приватный аккаунт, аудитории действий, блокировки, жалобы |

## 3. Требования к backend

- `apps/api`: NestJS 11, TypeScript strict, REST + Swagger (`/api/docs`), Socket.io.
- Модули: Auth, Users, Profiles, Posts, Comments, Likes, Follows, Stories, Reels, Feed, Search, Messages, Notifications, Media, Privacy, Sessions, Settings (+ Realtime, Mail, Health).
- Controller → Service → Prisma; входные данные только через DTO (class-validator, class-transformer).
- Структурированные логи (pino) без секретов; Helmet; rate limiting.
- Медиа — файловое хранилище, обработка Sharp; в БД только метаданные.

## 4. Требования к frontend

- `apps/web`: Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Lucide, React Icons, Redux Toolkit, RTK Query, Axios (только транспорт), next-intl (en/ru/tg).
- Страницы авторизации и профиля: **Login, Register, Profile, Logout, Change Password, Forgot Password**.
- Страницы Core Social Features ([ADR-011](../ADR/011-social-features-frontend.md)): **Главная (лента + stories), Explore, Search, Reels, Create, Post, Stories viewer, чужой профиль**; по [ADR-012](../ADR/012-realtime-notifications-privacy.md): **Notifications, Settings, Messages**.
- Дизайн: Login/Register — по макетам (карточка: форма слева, градиентная иллюстрация справа); остальные страницы — по макетам из `img/` (3 колонки, тёмная и светлая тема); адаптивный.
- Авторизация только через NestJS; NextAuth запрещён.

## 5. Требования безопасности

- Пароли — bcrypt (cost 12); правила: 8–72 символа, буква и цифра.
- Access JWT 15 мин; refresh — opaque, в httpOnly cookie, в БД только хеш; ротация, отзыв, обнаружение повторного использования.
- Блокировка входа после 5 неудач на 15 минут; строгие лимиты на auth-маршрутах.
- Проверка владельца ресурса и видимости (приватность, блокировки) на каждом запросе.
- Проверка сигнатуры и размера файлов; подписанные ссылки на медиа.
- Никаких паролей, токенов и cookie в логах.

## 6. Требования к базе данных

- PostgreSQL 16, Prisma 7, миграции в `apps/api/prisma/migrations`.
- Таблицы: см. [ADR-005](../ADR/005-database-prisma.md). Связи многие-ко-многим — отдельные таблицы; уникальные ограничения на лайки, подписки, просмотры; индексы под ленты и пагинацию; каскадное удаление пользователя.

## 7. Требования к API

- Префикс `/api`, JSON, ошибки `{ statusCode, message, error }`.
- Курсорная пагинация `{ items, nextCursor }`.
- UUID в путях валидируются (400).
- Все endpoint-ы описаны в Swagger и в `docs/SPEC`.

## 8. Требования к тестированию

- Jest: unit-тесты утилит и сервисов; e2e-тесты (supertest, socket.io-client) против **реальной** тестовой БД PostgreSQL.
- Обязательно покрыть: регистрацию, вход, refresh rotation и reuse detection, права доступа, приватность, основные модули, realtime.
- Результаты тестов в документации указываются только после фактического запуска.

## 9. Этапы реализации

1. Анализ backend из ZIP → `SOURCE_BACKEND_ANALYSIS.md`.
2. Monorepo, `packages/shared`, документация.
3. Prisma schema + миграция, модули NestJS, realtime.
4. Frontend: 6 страниц, подключение к API.
5. Тесты, проверка безопасности, обновление ROADMAP/PROGRESS.

## 10. Критерии завершения

- `npm install`, миграция и запуск обоих приложений по README без ошибок.
- `npm test` и `npm run test:e2e` проходят.
- `npm run build` собирает shared, api и web.
- На frontend работают все 6 страниц (проверено в браузере: регистрация, вход по email и username, профиль, аватар, смена пароля, выход, восстановление пароля по ссылке, подтверждение email).
- Документы ADR (10), SPEC (12), TZ, AI_RULES, ROADMAP, PROGRESS, EXPLANATIONS, README созданы.
