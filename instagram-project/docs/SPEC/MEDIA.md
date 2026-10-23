# SPEC: Media

Модули NestJS: `media` · Swagger: `/api/docs`

## Функциональность

Загрузка и выдача файлов. В БД — только метаданные (`Media`), файлы — в `STORAGE_DIR` (локальный диск, интерфейс `StorageService` позволяет заменить на S3).

Источник: обработка изображений Sharp — перенесена; base64 в БД и «превью» видео через Sharp — **исправлены**.

## API

| Метод | Путь | Описание |
|---|---|---|
| POST | `/api/media` | multipart: `file`, `purpose` (AVATAR, POST, STORY, REEL, MESSAGE) → `MediaDto` |
| GET | `/api/media/:id` | Метаданные (владелец) |
| DELETE | `/api/media/:id` | Удалить неиспользованный файл (владелец) |
| GET | `/api/media/:id/file?exp=&sig=` | Файл по подписанной ссылке (public, HMAC, 1–2 ч) |

## DTO

`UploadMediaDto { purpose }`; `SignedFileQueryDto { exp, sig }`.

Правила: тип определяется по сигнатуре (magic bytes), не по имени. Изображения — JPEG/PNG/WebP ≤ 10 МБ → поворот по EXIF, уменьшение, JPEG без метаданных. Видео — MP4/WebM/QuickTime ≤ 100 МБ. Аудио — WebM/Ogg/MPEG/MP4 ≤ 10 МБ. AVATAR только изображение; REEL — видео (или изображение для превью); MESSAGE — любое.

## Связи с другими модулями

Ссылки создаёт `MediaUrlService` только после проверки видимости владельцем контента (`DtoMapper`). `@Cron(EVERY_6_HOURS)` удаляет загруженные, но не привязанные файлы.
