# ADR-007: Состояние frontend: Redux Toolkit + RTK Query + Axios

**Статус:** принято · **Дата:** 2026-10-23

## Проблема

Нужно хранить access token, делать запросы с автоматическим обновлением токена и кэшировать данные, не создавая второго кэша.

## Рассмотренные варианты

1. React Query + Axios-интерцепторы.
2. **RTK Query с собственным Axios baseQuery.**
3. Zustand (как в исходнике).

## Принятое решение

- `store/auth-slice.ts` — только `accessToken` и `status` (`unknown` / `authenticated` / `guest`). Данные пользователя **не** дублируются в slice.
- `store/base-query.ts` — `axiosBaseQuery`: добавляет `Authorization`, при `401` один раз вызывает `refreshSession()` и повторяет запрос; ошибки приводятся к `{ status, messages[] }`.
- `store/api.ts` — все endpoints (`createApi`), теги `Me`, `Profile`, `ProfilePosts`. Ответ login/register кладётся в кэш `me` через `upsertQueryData`.
- `lib/http.ts` — Axios-экземпляр (`withCredentials`), используется только как транспорт.
- `lib/refresh-session.ts` — single-flight refresh.

## Причины выбора

RTK Query отвечает за кэш, loading, error, invalidation; Axios — только HTTP. Один кэш — один источник правды.

## Последствия

При logout вызывается `api.util.resetApiState()` — кэш чужого пользователя не остаётся в памяти.
