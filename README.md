# 🎵 LieMusic (EchoStream)

> **Zero-Server / Local-First Music Client** для экосистемы **Lie** (LieVPN, LieCord, LieBrowser, LieMusic).

---

## ⚡ Ключевые принципы

1. **0 рублей расходов на серверы:**
   Плеер стримит напрямую с открытых мировых CDN (YouTube Music InnerTube, SoundCloud API) без промежуточных прокси-серверов.
2. **0 личных данных в облаке:**
   Никаких аккаунтов, паролей и сбора email. Локальный текстовый профиль (`profile.json`), SQLite-кэш, история и плейлисты хранятся только на устройстве.
3. **Монетизация без сервера лицензий (249 ₽ навсегда):**
   Альтернатива бесконечным подпискам Spotify / Apple Music. Однократный платеж 249 ₽ через LiePay (`https://pay.lie2srvv.com/music/`) с офлайн-валидацией ключа.

---

## 📱 Функции LieMusic

- 🎨 **Material You Dynamic Theming (Monet Engine):** живое извлечение палитры из обложки текущего трека (Ambient Glow, адаптивная подсветка кнопок и спектра).
- 🎚️ **10-полосный эквалайзер & Bass Boost:** 32Hz, 64Hz, 125Hz, 250Hz, 500Hz, 1kHz, 2kHz, 4kHz, 8kHz, 16kHz + пресеты (Bass Boost, Flat, Vocal, Rock, Pop, Electronic).
- 🎤 **Синхронизированные тексты (LRCLIB Karaoke):** автоматическая построчная подсветка текста песни синхронно с воспроизведением + перемотка по клику на строчку.
- 📥 **Офлайн-режим (Скачивание):** прямое сохранение треков для прослушивания без сети.
- 🔒 **Приватность и локальный профиль:** режим инкогнито (Stealth Mode), экспорт и импорт профиля в `.json`.
- 🎮 **MediaSession & MPRIS:** нативное управление музыкой со шторки уведомлений Android, экрана блокировки, кнопок наушников и Linux MPRIS.

---

## 🛠️ Стек технологий

- **Ядро:** Rust (Tauri 2.0 Mobile + Desktop)
- **Фронтенд:** React 19 + TypeScript + Vite + Tailwind CSS + Lucide Icons
- **Аудиодвижок:** Web Audio API (BiquadFilter peaking filters, AnalyserNode, GainNode)
- **Платформы:** Android (APK) + Linux + Windows

---

## 🚀 Запуск и сборка

### Разработка в браузере / эмуляторе
```bash
pnpm install
pnpm dev
```

### Запуск и сборка под Android
```bash
# Сборка debug APK под x86_64 / arm64
pnpm tauri android build -d --target x86_64 --apk

# Установка на эмулятор через adb
adb install -r src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk
```
