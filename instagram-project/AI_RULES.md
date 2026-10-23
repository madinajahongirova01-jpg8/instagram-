# Правила для AI-ассистентов (и для людей)

Эти правила обязательны для любого, кто меняет проект: Claude, Copilot, ChatGPT или разработчик.

## Источник и границы

1. **Не добавлять frontend из ZIP** исходного проекта — ни страницы, ни компоненты, ни CSS, ни конфиги. Из ZIP используется только backend как источник бизнес-логики.
2. **Не копировать небезопасные решения исходного backend** (доверие `userId` от клиента, base64 в БД, regex из пользовательского ввода, публичное создание уведомлений и т. п. — список в `docs/SOURCE_BACKEND_ANALYSIS.md`, раздел 8).
3. **Не добавлять лишние страницы.** Во frontend разрешены только: Login, Register, Profile (`/profile` и `/profile/[username]`), Logout, Change Password, Forgot Password, а также страницы Core Social Features по [ADR-011](docs/ADR/011-social-features-frontend.md): Главная (`/`), Explore (`/explore`, `/explore/tags/[name]`), Search (`/search`), Reels (`/reels`), Create (`/create`), Post (`/p/[id]`), Stories (`/stories/[username]`); по [ADR-012](docs/ADR/012-realtime-notifications-privacy.md): Notifications (`/notifications`), Settings (`/settings`, приватность и уведомления), Messages (`/messages`, `/messages/[id]`). Новые страницы — только после изменения ТЗ и нового ADR.

## Архитектура

4. **Не менять архитектуру без ADR.** Новая технология, другой способ хранения токенов, другая БД, новый state-менеджер — сначала новый файл `docs/ADR/NNN-*.md`.
5. **Не использовать NextAuth.js.** Авторизация — только через NestJS (`/api/auth/*`).
6. Стек фиксирован: npm workspaces (не pnpm/Yarn/Turborepo/Nx), NestJS, PostgreSQL, Prisma, Next.js App Router, RTK Query + Axios.
7. Во frontend не создавать второй кэш API: данные сервера — только через RTK Query (`src/store/api.ts`).
8. Бизнес-логика — в сервисах, не в контроллерах.

## Код

9. **Не использовать `any` без обоснования.** Если без него никак — короткое объяснение в описании PR.
10. Не писать комментарии в коде проекта (договорённость команды); объяснения — в `EXPLANATIONS.md` и docs.
11. **Не придумывать API endpoints.** Frontend вызывает только то, что есть в Swagger (`/api/docs`) и `docs/SPEC`. Новый endpoint = изменение backend + SPEC + тест.
12. Общие типы и правила валидации — в `packages/shared`, не дублировать.
13. Никогда не логировать пароли, токены, cookie.
14. Новый текст интерфейса — ключ во **все три** файла `apps/web/messages/{en,ru,tg}.json`.

## Тесты и честность

15. **Не утверждать, что тесты пройдены, если они не запускались.** В PROGRESS.md записывать только фактические результаты с датой.
16. Не писать фиктивные тесты (`expect(true).toBe(true)`, тесты без проверок).
17. Не утверждать, что функция реализована, если она только описана в документации.

## Для начинающих

18. **Сохранять понятную структуру**: один модуль = папка с `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`. Простые имена, маленькие файлы.
19. Важные решения объяснять простым русским языком в `EXPLANATIONS.md`.
20. После каждого этапа обновлять `ROADMAP.md` и `PROGRESS.md`.
