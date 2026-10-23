# Instagram-like monorepo

NestJS + PostgreSQL + Prisma backend со всей основной функциональностью Instagram и Next.js frontend со страницами авторизации и профиля.

```text
instagram-project/
├── apps/
│   ├── api/                 NestJS 11 · Prisma 7 · PostgreSQL · Socket.io · Swagger
│   │   ├── prisma/          schema.prisma + migrations
│   │   ├── src/             17 модулей + realtime, mail, health, common
│   │   └── test/            e2e-тесты (реальная БД)
│   └── web/                 Next.js 15 App Router · Tailwind 4 · shadcn/ui · RTK Query · next-intl
│       ├── messages/        en.json · ru.json · tg.json
│       └── src/app/[locale]/ login · register · profile · logout · change-password · forgot-password
├── packages/shared/         общие типы, правила валидации, имена realtime-событий, локали
├── docs/
│   ├── ADR/                 001–010 архитектурные решения
│   ├── SPEC/                AUTH, USERS, POSTS, FOLLOWS, STORIES, REELS, FEED, SEARCH, MESSAGES, NOTIFICATIONS, MEDIA, PRIVACY
│   ├── TZ/PROJECT_TZ.md
│   └── SOURCE_BACKEND_ANALYSIS.md
├── AI_RULES.md · ROADMAP.md · PROGRESS.md · EXPLANATIONS.md
└── package.json             npm workspaces
```

## Требования

- Node.js **20.11+** (рекомендуется 22, см. `.nvmrc`)
- npm 10+
- PostgreSQL **14+** (проверено на 16)

## 1. Установка

```bash
npm install
```

`postinstall` автоматически собирает `packages/shared`.

## 2. PostgreSQL

**Вариант A — Docker:**

```bash
docker run -d --name insta-pg -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16
docker exec -it insta-pg psql -U postgres -c "CREATE DATABASE instagram;" -c "CREATE DATABASE instagram_test;"
```

**Вариант B — установленный PostgreSQL** (Windows: SQL Shell (psql); macOS/Linux: `psql -U postgres`):

```sql
CREATE DATABASE instagram;
CREATE DATABASE instagram_test;
```

Если у пользователя `postgres` другой пароль — поменяйте его в `DATABASE_URL` ниже.

## 3. Файлы `.env`

```bash
cp apps/api/.env.example apps/api/.env
cp apps/api/.env.test.example apps/api/.env.test
cp apps/web/.env.example apps/web/.env.local
```

Windows (PowerShell): `Copy-Item apps/api/.env.example apps/api/.env` и т. д.

`apps/api/.env`:

| Переменная | Значение |
|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/instagram?schema=public` |
| `PORT` | `4000` |
| `WEB_ORIGIN` | адрес frontend для CORS: `http://localhost:3000` |
| `JWT_ACCESS_SECRET` | **случайная строка ≥ 32 символов** |
| `MEDIA_URL_SECRET` | **другая** случайная строка ≥ 32 символов |
| `JWT_ACCESS_TTL_SECONDS` | `900` (15 минут) |
| `REFRESH_TOKEN_TTL_DAYS` | `30` |
| `COOKIE_SECURE` | `false` локально, `true` в production (HTTPS) |
| `STORAGE_DIR` | папка для загруженных файлов (`./storage`) |
| `MAIL_OUTBOX_DIR` | если `SMTP_HOST` пустой, письма сохраняются сюда как JSON (`./.dev-mail`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | настоящая почта (необязательно) |
| `THROTTLE_LIMIT` | запросов в минуту на клиента (`120`) |

Сгенерировать секрет: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`

`apps/web/.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:4000`

## 4. Миграции и Prisma Client

```bash
cd apps/api
npx prisma migrate deploy
npx prisma generate
cd ../..
```

Во время разработки при изменении `schema.prisma`: `npm run db:migrate` (создаёт новую миграцию).

## 5. Запуск

В двух терминалах:

```bash
npm run dev:api     # http://localhost:4000/api   Swagger: http://localhost:4000/api/docs
npm run dev:web     # http://localhost:3000
```

Production-сборка: `npm run build`, затем `npm run start -w @insta/api` и `npm run start -w @insta/web`.

### Как проверить вручную

1. `http://localhost:3000/register` — создать аккаунт → откроется главная (лента).
2. Письмо подтверждения лежит в `apps/api/.dev-mail/*.json` — откройте ссылку `http://localhost:3000/login?verifyToken=…`.
3. `Forgot your password?` → письмо со ссылкой `/forgot-password?token=…` в той же папке.
4. Языки: `/login`, `/ru/login`, `/tg/login`.
5. Два пользователя: откройте сайт в обычном окне и в окне инкогнито (или в двух разных браузерах). Две вкладки одного браузера делят одну refresh-cookie и могут разлогинить друг друга (см. ROADMAP).

### Realtime и голосовые

- Realtime (уведомления, сообщения, «печатает…», онлайн) идёт через Socket.io на том же порту, что и API (4000).
- Голосовые сообщения записываются в браузере (`MediaRecorder`); микрофон браузер даёт только на `localhost` или по HTTPS.
- Звонки WebRTC во frontend пока не сделаны (ROADMAP). Когда будут: без TURN-сервера они работают только на localhost / в одной сети.

## Демо-данные

Для показа проекта можно заполнить базу `insta_clone` демо-пользователями, постами, reels и stories.

1. Положите файлы (они не попадают в git, подробности — в [apps/api/prisma/seed-media/README.md](apps/api/prisma/seed-media/README.md)):
   - видео (`.mp4`, вертикальные, до 20 с, 720p) → `apps/api/prisma/seed-media/videos/`
   - фото (`.jpg` / `.png` / `.webp`) → `apps/api/prisma/seed-media/images/`
   - аватары (необязательно) → `apps/api/prisma/seed-media/avatars/`
2. Запустите (API может работать в это время):

```bash
npm run db:seed         # создать или дополнить демо-данные (повторный запуск не создаёт дубликаты)
npm run db:seed:reset   # удалить ТОЛЬКО демо-данные (пользователи с почтой @demo.insta.local и всё, что они создали)
```

Без фото seed рисует простые картинки-пейзажи; без видео reels не создаются (seed пишет об этом). Файлы загружаются через `MediaService` — как при обычной загрузке (проверка типа, Sharp, хранилище).

**Пароль всех демо-пользователей: `Demo12345`**

| Логин | Имя | Особенность |
|---|---|---|
| `aziza.dushanbe` | Aziza Rahimova | Душанбе, галочка «verified» |
| `farrukh.travel` | Farrukh Nazarov | путешествия, есть сайт |
| `nilufar.art` | Nilufar Saidova | художница из Душанбе |
| `rustam.pamir` | Rustam Davlatov | Хорог → Душанбе |
| `malika.private` | Malika Karimova | **закрытый аккаунт** |
| `dilshod.food` | Dilshod Umarov | еда в Душанбе |

Войти можно и по email: `<логин>@demo.insta.local`. Если в базе есть `pwcheck_madina` и `pwcheck_zarina`, демо-пользователи подписываются на них, а они — на демо-пользователей (запрос `pwcheck_zarina` к закрытому `malika.private` остаётся ожидающим — для показа запросов на подписку). Stories живут 24 часа: чтобы появились свежие, запустите `npm run db:seed` ещё раз.

## 6. Тесты

```bash
npm test             # unit (Jest)
npm run test:e2e     # e2e: нужна отдельная БД *_test с применённой миграцией
```

E2E-тесты очищают все таблицы. Нужен `apps/api/.env.test` (`cp apps/api/.env.test.example apps/api/.env.test`), а имя базы в `DATABASE_URL` должно заканчиваться на `_test` — иначе тесты не запустятся.

Подготовка тестовой БД (один раз и после новых миграций):

```bash
cd apps/api
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/instagram_test?schema=public" npx prisma migrate deploy
```

PowerShell: `$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/instagram_test?schema=public"; npx prisma migrate deploy`, затем закройте терминал (или `Remove-Item Env:DATABASE_URL`).

После новых миграций примените их и к тестовой БД (команда выше). Последние фактические результаты — в [PROGRESS.md](PROGRESS.md): 47 unit + 75 e2e тестов пройдено.

## Технологии

**Backend:** NestJS 11, TypeScript, PostgreSQL, Prisma 7 (`@prisma/adapter-pg`), REST, Swagger, JWT access + opaque refresh (ротация, reuse detection), Socket.io, WebRTC-сигналинг, bcrypt, class-validator, class-transformer, Helmet, @nestjs/throttler, nestjs-pino, Sharp, @nestjs/schedule, Nodemailer, Jest, Supertest.

**Frontend:** Next.js 15 App Router, TypeScript, Tailwind CSS 4, shadcn/ui, Lucide, React Icons, Redux Toolkit, RTK Query (infinite queries), Axios, next-intl, socket.io-client.

## Документация

- [Анализ исходного backend](docs/SOURCE_BACKEND_ANALYSIS.md) — что перенесено, адаптировано, добавлено, исправлено
- [ТЗ](docs/TZ/PROJECT_TZ.md) · [ADR](docs/ADR) · [SPEC](docs/SPEC)
- [Объяснения для начинающих](EXPLANATIONS.md) · [Правила AI](AI_RULES.md)
- [ROADMAP](ROADMAP.md) · [PROGRESS](PROGRESS.md)

## Оставшиеся TODO

Звонки WebRTC во frontend (+ TURN), OAuth GitHub/Google, TOTP 2FA, синхронизация refresh между вкладками, S3, Redis-адаптер Socket.io, превью видео (ffmpeg), обновление `sharp` по `npm audit`, автотесты frontend. Подробно — [ROADMAP.md](ROADMAP.md).
