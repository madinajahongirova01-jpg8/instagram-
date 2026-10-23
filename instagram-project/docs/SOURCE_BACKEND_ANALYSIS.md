# Анализ исходного backend (ZIP `instagram-clone-main`)

Этот документ описывает **только backend** исходного проекта. Frontend из ZIP не анализировался и не использовался.

## 1. Какой backend был обнаружен

В архиве нет отдельного backend-приложения. Backend-логика находится внутри Next.js-приложения:

| Часть | Путь в ZIP | Назначение |
|---|---|---|
| REST API | `src/app/api/**/route.ts` | 18 файлов Next.js Route Handlers |
| Модели | `src/models/*.ts` | TypeScript-интерфейсы для MongoDB-коллекций (без схем и валидации) |
| Авторизация | `src/lib/auth.ts` | NextAuth.js (Credentials provider, JWT-сессия) |
| БД | `src/lib/mongodb.ts` | Подключение к MongoDB через нативный драйвер |
| Realtime | `socket-server.js` | Отдельный Socket.io сервер на порту 3001 |
| WebRTC | `src/lib/webrtc.ts` | Клиентская часть сигналинга (анализировалась только ради протокола событий) |

## 2. Технологии исходного backend

- Next.js 15 Route Handlers (не отдельный сервер)
- MongoDB 6 (нативный драйвер, без ORM и без схем)
- NextAuth.js 4 + `@next-auth/mongodb-adapter`
- bcryptjs (хеширование паролей, cost 12)
- Socket.io 4 (отдельный процесс, JavaScript без типов)
- Sharp (обработка изображений)
- `jsonwebtoken` установлен, но не используется

## 3. Найденные API endpoints

| Метод | Путь | Что делает | Авторизация |
|---|---|---|---|
| GET/POST | `/api/auth/[...nextauth]` | Вход через NextAuth (email + пароль) | — |
| POST | `/api/auth/register` | Регистрация (email, username, fullName, password ≥ 6) | нет |
| POST | `/api/auth/change-password` | Смена пароля (новый ≥ 8) | да |
| GET | `/api/users/me` | Свой профиль + все свои посты | да |
| PUT | `/api/users/me` | Изменение fullName, bio, isPrivate | да |
| GET | `/api/users/suggested` | 10 пользователей, на которых не подписан | да |
| POST | `/api/posts` | Создание поста (multipart, изображения → Sharp → base64) | да |
| GET | `/api/posts/feed` | Лента: свои посты + подписки, 20 шт. | да |
| POST | `/api/posts/:postId/like` | Переключатель like/unlike | да |
| GET | `/api/posts/:postId/comments` | Комментарии поста | **нет** |
| POST | `/api/posts/:postId/comments` | Новый комментарий / ответ (`parentCommentId`) | да |
| GET | `/api/reels` | Reels свои + подписок | да |
| POST | `/api/reels` | Создание reel (видео → base64) | да |
| GET | `/api/stories` | Активные stories, сгруппированные по пользователям | да |
| POST | `/api/stories` | Создание story (истекает через 24 ч) | да |
| GET | `/api/conversations` | Список диалогов | да |
| POST | `/api/conversations` | Создание диалога / группы | да |
| GET | `/api/conversations/:id/messages` | Сообщения диалога + отметка «прочитано» | да |
| GET | `/api/notifications` | 50 последних уведомлений + счётчик непрочитанных | да |
| POST | `/api/notifications` | Создание уведомления **любому** пользователю | да |
| GET | `/api/explore` | Популярные посты/reels, хэштеги, рекомендации | да |
| GET | `/api/search?q=` | Поиск пользователей и постов (regex) | да |
| GET/PUT | `/api/settings/notifications` | Настройки уведомлений | да |
| GET/PUT | `/api/settings/privacy` | Настройки приватности | да |
| GET/PUT | `/api/settings/security` | Настройки безопасности (2FA-флаг и т.п.) | да |

### Socket.io события (`socket-server.js`)

| Клиент → сервер | Сервер → клиент |
|---|---|
| `authenticate(userId)` | `user_online`, `user_offline` |
| `send_message` | `new_message`, `message_error` |
| `mark_as_read` | `message_read` |
| `typing_start`, `typing_stop` | `user_typing` |
| `call_user`, `answer_call`, `reject_call`, `end_call`, `ice_candidate` | `incoming_call`, `call_answered`, `call_rejected`, `call_ended`, `ice_candidate` |

## 4. Модели данных и связи

| Коллекция | Ключевые поля | Связи |
|---|---|---|
| `users` | username, email, password, fullName, bio, profilePicture, isPrivate, `followers[]`, `following[]`, postsCount, isVerified, isOnline, lastSeen | подписки хранятся массивами внутри документа |
| `posts` | userId, caption, `images[]` (base64), videos, location, `tags[]`, `mentions[]`, `likes[]`, счётчики, isArchived, commentsDisabled, hideLikeCount | лайки — массив внутри поста |
| `comments` | postId, userId, content, parentCommentId, `likes[]`, repliesCount | ответы через parentCommentId |
| `stories` | userId, media (base64), mediaType, caption, `viewers[]`, expiresAt | — |
| `reels` | userId, videoUrl (base64), thumbnailUrl, caption, music, `likes[]`, счётчики, isPublic, allowComments | — |
| `ReelComment` | описан в модели | **коллекция не используется** |
| `conversations` | `participants[]`, isGroup, groupName, groupAdmins, lastMessage, unreadCount | — |
| `messages` | conversationId, senderId, content, messageType (text/image/video/audio/post/story/call), `reactions[]`, `readBy[]`, isDeleted | — |
| `notifications` | userId, fromUserId, type, entityId, entityType, isRead | — |
| `BlockedUser`, `Report`, `FollowRequest`, `PrivacySettings` | описаны интерфейсами | **API для них нет** |

## 5. Перенесено в новый backend (с адаптацией под NestJS + Prisma)

| Функция исходника | Где теперь |
|---|---|
| Регистрация, вход, смена пароля | `AuthModule` (+ refresh-токены, сессии) |
| Профиль `me`, изменение fullName/bio/isPrivate | `UsersModule`, `ProfilesModule`, `PrivacyModule` |
| Рекомендации пользователей | `GET /users/suggestions` |
| Создание поста, хэштеги и упоминания из подписи | `PostsModule` (`common/utils/text.ts`, `TaggingService`) |
| Лента из своих постов и подписок | `FeedModule` (`GET /feed`, курсорная пагинация) |
| Explore (популярное от неподписанных) | `GET /feed/explore` |
| Лайки постов | `LikesModule` (идемпотентные `POST`/`DELETE` вместо переключателя) |
| Комментарии и ответы | `CommentsModule` |
| Reels (создание, лента) | `ReelsModule` |
| Stories (24 ч, группировка по авторам, «просмотрено») | `StoriesModule` |
| Диалоги, группы, сообщения, отметка прочтения | `MessagesModule` |
| Уведомления (список, счётчик непрочитанных) | `NotificationsModule` |
| Поиск пользователей / постов / хэштегов | `SearchModule` |
| Настройки уведомлений | `SettingsModule` |
| Настройки приватности | `PrivacyModule` |
| Флаг 2FA из security settings | поля `twoFactorEnabled`/`twoFactorSecret` в `User` (архитектура) |
| Socket.io: онлайн-статус, сообщения, «печатает», прочтение | `RealtimeModule` (`RealtimeGateway`) |
| WebRTC-сигналинг (offer/answer/ICE/reject/end) | `RealtimeGateway` (события `call:*`) |
| Обработка изображений Sharp | `MediaModule` |

## 6. Что пришлось адаптировать

- **MongoDB → PostgreSQL + Prisma.** Массивы `followers[]`, `likes[]`, `viewers[]`, `readBy[]` заменены отдельными таблицами (`Follow`, `Like`, `StoryView`, `ConversationParticipant.lastReadAt`). Это убирает неограниченный рост документов и гонки при одновременных лайках.
- **NextAuth → собственный JWT.** Access-токен (15 мин) + refresh-токен в httpOnly cookie `rt` с ротацией.
- **Base64 в базе → файловое хранилище.** Файлы сохраняются на диск (`storage/`), в БД — только метаданные; ссылки подписываются HMAC и истекают.
- **Like-toggle → `POST`/`DELETE`.** Повторный запрос не меняет результат.
- **`isPrivate` хранился дважды** (`users.isPrivate` и `privacySettings.isPrivateAccount`) — теперь одно поле `PrivacySettings.isPrivate`.
- **Прочтение сообщений** через `readBy[]` в каждом сообщении → `lastReadAt` у участника диалога.
- **Комментарии reels:** модель `ReelComment` в исходнике была, но не использовалась; теперь общий `Comment` с полем `postId` или `reelId`.
- **Explore** перенесён в `FeedModule`; сортировка по несуществующему полю `followersCount` исправлена.

## 7. Добавлено самостоятельно (в исходном backend отсутствовало)

- Refresh-токены, их ротация, отзыв и обнаружение повторного использования
- Управление сессиями (список, завершение одной/всех)
- Выход (logout) на сервере
- Подтверждение email, восстановление и сброс пароля
- Изменение email и username
- Удаление аккаунта
- Подписка / отписка, запросы на подписку для приватных аккаунтов, принятие/отклонение, списки подписчиков и подписок (в исходнике **не было ни одного endpoint для подписок**)
- Блокировка пользователей и жалобы (были только интерфейсы)
- Изменение и удаление постов, удаление комментариев, лайки комментариев и reels, список лайкнувших
- Просмотр одного поста, постов профиля, публичный профиль по username
- Просмотры stories, список зрителей, удаление stories, автоматическая очистка истёкших stories
- Удаление reels, счётчик просмотров reels, комментарии reels
- Удаление сообщений, реакции на сообщения, голосовые сообщения (тип `AUDIO`, медиа `AUDIO`)
- Пометка уведомлений как прочитанных, удаление уведомлений, realtime-доставка уведомлений
- Загрузка медиа отдельным endpoint с проверкой сигнатуры файла
- Helmet, rate limiting, защита от brute-force, структурированное логирование, Swagger, health-check

## 8. Исправленные проблемы исходного backend

| # | Проблема в исходнике | Риск | Исправление |
|---|---|---|---|
| 1 | Socket.io принимает `userId` от клиента в событии `authenticate` без проверки | Любой может выдать себя за другого пользователя | Проверка JWT в handshake + проверка сессии |
| 2 | `send_message` берёт `senderId` из данных клиента и не проверяет участие в диалоге | Отправка сообщений от чужого имени в чужие диалоги | `senderId` берётся из токена, участие проверяется |
| 3 | `POST /api/notifications` позволяет создать уведомление любому пользователю | Спам и фишинг | Публичного endpoint нет, уведомления создаются только сервером |
| 4 | `GET /api/posts/:id/comments` без авторизации и без проверки приватности | Утечка комментариев приватных аккаунтов | Авторизация + `VisibilityService` |
| 5 | Поиск подставляет ввод пользователя прямо в `$regex` | ReDoS / инъекция в шаблон | Экранирование, `ILIKE` через Prisma, лимит длины |
| 6 | `PUT /api/settings/*` сохраняет любой JSON (mass assignment) | Запись произвольных полей | DTO + `whitelist` + `forbidNonWhitelisted` |
| 7 | Изображения и видео хранятся как base64 в документах MongoDB | Документы > 16 МБ, медленные запросы | Файловое хранилище + метаданные в `Media` |
| 8 | Тип файла не проверяется, Sharp вызывается на видео для «превью» | Падение сервера, загрузка чего угодно | Проверка magic bytes, лимиты размера, белый список |
| 9 | `new require('mongodb').ObjectId(...)` в `socket-server.js` | Ошибка выполнения: статусы онлайн не сохраняются | Переписано на TypeScript + Prisma |
| 10 | Неверный `ObjectId` в URL → 500 | Утечка стека, шум в логах | `ParseUUIDPipe` → 400 |
| 11 | События «печатает» отправляются в комнату `conversationId`, в которую никто не входит | Функция не работает | Рассылка в комнаты участников после проверки |
| 12 | WebRTC-сигналинг использует `socket.id` как адрес получателя, а сервер ищет по `userId` | Звонки не работают | Адресация по `userId`, проверка общего диалога и блокировок |
| 13 | Пароль ≥ 6 при регистрации и ≥ 8 при смене | Несогласованность | Единое правило в `packages/shared` (≥ 8, буква и цифра) |
| 14 | Нет rate limiting и защиты от перебора паролей | Brute-force | `@nestjs/throttler` + блокировка аккаунта после 5 неудач |
| 15 | Нет пагинации (все сообщения диалога за раз) | Нагрузка | Курсорная пагинация везде |
| 16 | N+1 запросы (пользователь для каждого поста отдельно) | Медленно | `include`/`select` Prisma |
| 17 | Ответ «email или username уже существует» | Перебор аккаунтов | Сообщение оставлено (нужно для UX регистрации), но на endpoint стоит строгий rate limit; восстановление пароля всегда отвечает одинаково |
| 18 | `console.error` с объектами ошибок | Возможная утечка данных | Pino с `redact` для паролей, токенов и cookie |
| 19 | Смена пароля не завершает другие сессии | Украденная сессия продолжает работать | Все другие сессии отзываются |
| 20 | `textOverlays` для stories парсится, но не сохраняется | Потеря данных | Не перенесено (см. TODO в ROADMAP) |

## 9. Что из ZIP намеренно не использовалось

- Весь frontend: `src/app/**/page.tsx`, `src/components/**`, `src/store/**`, `globals.css`, `public/**`, layout и провайдеры
- Frontend-конфигурации: `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `tsconfig.json`
- Клиентские обёртки `src/lib/socket.ts`, `src/lib/webrtc.ts` (изучены только как описание протокола событий)
- Зависимости исходника: NextAuth, MongoDB, zustand, headlessui, heroicons
- Код исходного backend напрямую не копировался: вся логика переписана под NestJS
- Поля без реальной логики: `music`, `effects`, `allowDuet` у reels, `sharesCount`, групповые аватары — не перенесены (в ROADMAP как TODO)
