# ROADMAP

Статусы: **TODO** · **IN_PROGRESS** · **DONE** · **BLOCKED**

## Этап 1 — Анализ исходного backend

| Задача | Статус |
|---|---|
| Найти backend в ZIP (Next.js API routes, models, socket-server) | DONE |
| `docs/SOURCE_BACKEND_ANALYSIS.md` | DONE |

## Этап 2 — Monorepo и документация

| Задача | Статус |
|---|---|
| npm workspaces: `apps/api`, `apps/web`, `packages/shared` | DONE |
| ADR 001–010 | DONE |
| TZ, SPEC (12), AI_RULES, EXPLANATIONS, README | DONE |

## Этап 3 — Backend

| Задача | Статус |
|---|---|
| Prisma schema + начальная миграция | DONE |
| Auth: регистрация, вход, logout, refresh rotation, reuse detection | DONE |
| Sessions, подтверждение email, сброс/смена пароля, смена email/username, удаление аккаунта | DONE |
| Brute-force защита, rate limiting, Helmet, pino с redact | DONE |
| Users, Profiles, Settings | DONE |
| Posts, Comments, Likes, хэштеги, упоминания | DONE |
| Follows + запросы на подписку | DONE |
| Stories (24 ч, просмотры, cron-очистка) | DONE |
| Reels | DONE |
| Feed + Explore | DONE |
| Search | DONE |
| Messages + Socket.io + WebRTC-сигналинг | DONE |
| Notifications (+ realtime) | DONE |
| Media (Sharp, проверка сигнатур, подписанные ссылки, очистка) | DONE |
| Privacy: настройки, блокировки, жалобы | DONE |

## Этап 4 — Frontend

| Задача | Статус |
|---|---|
| Next.js App Router, Tailwind, shadcn/ui, next-intl (en/ru/tg) | DONE |
| Redux Toolkit + RTK Query + Axios baseQuery + single-flight refresh | DONE |
| Login (email / username), подтверждение email по ссылке | DONE |
| Register | DONE |
| Profile (просмотр, редактирование, аватар, посты) | DONE |
| Logout | DONE |
| Change Password | DONE |
| Forgot Password (запрос ссылки + сброс по токену) | DONE |

## Этап 5 — Тесты и проверка

| Задача | Статус |
|---|---|
| Unit-тесты (Jest) | DONE |
| E2E-тесты API на реальном PostgreSQL | DONE |
| Браузерная проверка 6 страниц (Playwright, вне репозитория) | DONE |
| Автотесты frontend внутри репозитория | TODO |

## Этап 6 — Core Social Features (ADR-011)

| Задача | Статус |
|---|---|
| ADR-011, обновление AI_RULES, ТЗ, ROADMAP | DONE |
| Темы (светлая / тёмная / системная) + общий layout (сайдбар, правая колонка, мобильная навигация) | DONE |
| Backend: контакты (`GET /users/me/contacts`), счётчик непрочитанных диалогов (`GET /conversations/unread-count`) | DONE |
| Backend: сохранённые посты (`SavedPost`, `/posts/:id/save`, `/users/me/saved`) | DONE |
| Realtime во frontend: бейджи уведомлений/сообщений, онлайн-статус контактов | DONE |
| Posts + лента (cursor pagination) + лайки / комментарии / сохранение / удаление / жалоба | DONE |
| Profile со статистикой, вкладки Posts / Reels / Saved, follow/unfollow, чужой профиль | DONE |
| Stories: лента кружков, просмотрщик, создание, 24 часа | DONE |
| Reels: вертикальная лента, автоплей, лайк, комментарии, создание | DONE |
| Search (debounce 300 мс, история) + Explore + страница хэштега | DONE |
| Realtime: счётчики лайков/комментариев своих постов (через `notification:new`) | DONE |

## Этап 7 — Уведомления, приватность, сообщения (ADR-012)

| Задача | Статус |
|---|---|
| ADR-012, AI_RULES, ТЗ, SPEC | DONE |
| Страница `/notifications`: «Сегодня / Ранее», прочитать одно / все, запросы на подписку | DONE |
| Настройки уведомлений по типам | DONE |
| Приватный аккаунт, блокировки (список + «Разблокировать»), жалобы (пользователь / пост / комментарий) | DONE |
| «Кто может писать мне»: все / только мои подписки (`Audience.FOLLOWING`), проверка при каждом сообщении | DONE |
| Аудитория stories, «Близкие друзья», скрыть stories от человека (backend + e2e) | DONE |
| Страница `/messages`: диалоги, чат, текст, фото, голосовые (MediaRecorder), реакции, «печатает…», онлайн, «прочитано/доставлено» | DONE |
| Звонки WebRTC 1:1: аудио и видео, окно входящего звонка, микрофон/камера, публичный STUN | DONE (без TURN — работает на localhost и в одной сети) |

## Дальше (не входит в текущий этап)

| Задача | Статус |
|---|---|
| OAuth (GitHub, Google) — кнопки уже есть в дизайне | TODO |
| Двухфакторная авторизация (TOTP) — поля в БД готовы, вход отвечает 501 | TODO |
| Координация refresh между вкладками (BroadcastChannel / Web Locks) | TODO |
| SMTP-провайдер для production (сейчас письма пишутся в `.dev-mail/`, если SMTP не задан) | TODO |
| Хранилище S3 вместо локального диска | TODO |
| Redis-адаптер Socket.io для нескольких экземпляров API | TODO |
| Превью для видео (ffmpeg) | TODO |
| Text overlays для stories, музыка/эффекты reels (были в исходнике без логики) | TODO |
| Персонализированный алгоритм ленты | TODO |
| Модерация жалоб (админ-панель) | TODO |
| TURN-сервер для звонков через интернет; переключение аудио → видео во время звонка (нужна перенастройка соединения) | TODO |
| Групповые диалоги во frontend (backend готов) | TODO |
| Поделиться постом в сообщения (backend готов: `POST_SHARE`) | TODO |
| Лайки комментариев и ответы на комментарии во frontend (backend готов) | TODO |
| Кнопка «Подписаться» в результатах поиска (нужен `followStatus` в результатах поиска) | TODO |
| Страница отдельного reel и пагинация Explore | TODO |
| Автотесты frontend внутри репозитория | TODO |
