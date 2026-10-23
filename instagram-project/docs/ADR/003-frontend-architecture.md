# ADR-003: Архитектура frontend (Next.js App Router)

**Статус:** принято · **Дата:** 2026-10-23

## Проблема

Нужен новый frontend (frontend из ZIP использовать запрещено) с шестью страницами: Login, Register, Profile, Logout, Change Password, Forgot Password. Авторизация — только через NestJS, без NextAuth.

## Рассмотренные варианты

1. Pages Router.
2. **App Router** с клиентскими формами.
3. Server Actions для форм.

## Принятое решение

Next.js 15 App Router + TypeScript + Tailwind CSS 4 + shadcn/ui (компоненты лежат в `src/components/ui`) + Lucide + React Icons.

- `src/app/[locale]/<page>/page.tsx` — серверный компонент: метаданные, `setRequestLocale`, обёртка-guard.
- `src/components/auth/*`, `src/components/profile/*` — клиентские формы.
- `RequireAuth` / `GuestOnly` — клиентские guards: пока сессия не восстановлена — спиннер.
- `src/app/[locale]/page.tsx` — не страница, а только редирект на `/profile`.
- Ссылки из писем: `/login?verifyToken=…` (подтверждение email) и `/forgot-password?token=…` (сброс пароля) — обрабатываются существующими страницами, новых страниц не добавлено.
- Кнопки GitHub/Google есть в дизайне, но OAuth не реализован: кнопка показывает сообщение «пока недоступно».

## Причины выбора

- Server Actions не подходят: access token хранится в памяти браузера, а refresh-cookie выдаёт API на другом порту.
- Access token в памяти (а не в `localStorage`) защищён от кражи через XSS-скрипты, читающие хранилище.

## Последствия

- Защита страниц выполняется на клиенте; реальная защита данных — на backend (каждый запрос проверяет JWT).
- Первая отрисовка защищённой страницы показывает спиннер, пока выполняется `POST /auth/refresh`.
