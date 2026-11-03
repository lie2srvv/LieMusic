<div align="center">

<img src="assets/icon.png" alt="LieMusic Logo" width="100" style="margin-bottom: 12px;" />

# LieMusic

### Fast, elegant and lightweight open-source Android music player powered by YouTube Music, SoundCloud, and offline playback.

[![Latest Release](https://img.shields.io/github/v/release/lie2srvv/LieMusic?style=for-the-badge&logo=github&color=10B981&labelColor=18181b)](https://github.com/lie2srvv/LieMusic/releases/latest)
[![Platform](https://img.shields.io/badge/Platform-Android%20(ARM64%20%7C%20x86__64)-blue?style=for-the-badge&logo=android&logoColor=white&color=0ea5e9&labelColor=18181b)](https://github.com/lie2srvv/LieMusic/releases/latest)
[![Tech Stack](https://img.shields.io/badge/Tech-Tauri%202%20%7C%20React%2019%20%7C%20Rust-8b5cf6?style=for-the-badge&logo=rust&logoColor=white&labelColor=18181b)](https://github.com/lie2srvv/LieMusic)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge&color=22c55e&labelColor=18181b)](LICENSE)
[![Telegram](https://img.shields.io/badge/Telegram-@lie2srvv-229ED9?style=for-the-badge&logo=telegram&logoColor=white&labelColor=18181b)](https://t.me/lie2srvv)

<br/>

[📥 **Download Latest APK**](https://github.com/lie2srvv/LieMusic/releases/latest) • [💬 **Developer / Telegram**](https://t.me/lie2srvv) • [☕ **Support Project**](https://yoomoney.ru/to/4100119666781214)

<br/>

</div>

---

## ✨ Overview

**LieMusic** is a modern, privacy-focused open-source music player built for Android. It combines seamless access to millions of tracks from **YouTube Music** and **SoundCloud**, an offline audio library, and an audiophile-grade 10-band equalizer.

Designed with a **Zero-Server / Local-First** philosophy: all streaming and downloading happens directly between your device and open content delivery networks without intermediate proxy servers. Your listening history, favorites, playlists, and offline cache remain strictly on your personal device.

---

## 🚀 Key Features

- 🔍 **Universal Streaming & Search**: Unified search across both **YouTube Music** and **SoundCloud** catalogs with live suggestions, fast debouncing, and one-tap source switching.
- 🎨 **Adaptive Palette (Monet Dynamic Color)**: Real-time color extraction from active track artwork, casting a soft ambient glow and fluid gradient across the entire player.
- 🎚️ **10-Band Equalizer & Bass Boost**: Precision frequency control (32 Hz – 16 kHz), Bass Boost, surround sound Virtualizer, and audio presets (*Rock, Pop, Electronic, Vocal, Flat*).
- 📥 **Offline Audio Library**: Download any track to device storage in a single tap. Complete offline playback, multi-track selection, and batch library management without internet access.
- 🎧 **Native Android Foreground Service**:
  - Full **Android MediaSession** integration: persistent artwork, title, artist, seekbar progress in the notification shade and lock screen.
  - Media button controls support for wired and Bluetooth headphones.
  - Seamless audio focus handling (ducking/pausing during incoming calls, turn-by-turn navigation, and system notifications).
- 📱 **Edge-to-Edge & Gesture Navigation**: Built with safe-area insets accommodating punch-hole camera cutouts and system navigation gesture bars without overlapping buttons.
- 🔒 **Privacy-First & Clean**:
  - Zero advertisement banners or audio interruptions.
  - Zero telemetry, tracking, or analytical reporting.
  - Zero mandatory accounts, logins, or paid subscription gates.

---

## 📸 Screenshots

<div align="center">

| Home Screen | Fullscreen Player |
| :---: | :---: |
| <img src="assets/screenshots/home.png" width="280" alt="Home Screen" /> | <img src="assets/screenshots/player.png" width="280" alt="Fullscreen Player" /> |

</div>

---

## 📦 Download & Installation

Pre-built, ready-to-install Android packages are available directly from the **[Releases](https://github.com/lie2srvv/LieMusic/releases)** page:

| Platform | Package Format | Architecture | Download Link |
| :--- | :--- | :--- | :--- |
| **Android** | `APK` | `Universal (arm64-v8a + x86_64)` | [**Download LieMusic-v1.0.0.apk**](https://github.com/lie2srvv/LieMusic/releases/latest) |

> [!NOTE]
> When installing the APK manually outside of an app store, you may need to grant permission to "Install unknown apps" in your Android system security settings.

---

## 🛠️ Architecture & Tech Stack

- **Core Engine**: [Tauri 2.0 Mobile](https://v2.tauri.app/) (Rust 2024, Android NDK).
- **Frontend Layer**: React 19, TypeScript, Vite.
- **Styling & Physics**: Tailwind CSS, Framer Motion, Lucide Icons.
- **Audio Processing**: Web Audio API (peaking BiquadFilter bands, AnalyserNode, GainNode).
- **Android Native Services**: Android MediaSessionCompat, NotificationCompat, AudioManager.

---

## 🔨 Building from Source

To compile LieMusic locally from source:

### 1. Prerequisites
- [Node.js](https://nodejs.org/) 20+ and [pnpm](https://pnpm.io/)
- [Rust](https://rustup.rs/) (stable toolchain)
- Android SDK (API 34+) and Android NDK (`r26+` / `r28+`)
- Rust Android targets:
  ```bash
  rustup target add aarch64-linux-android armv7-linux-androideabi x86_64-linux-android
  ```

### 2. Clone & Install Dependencies
```bash
git clone https://github.com/lie2srvv/LieMusic.git
cd LieMusic
pnpm install
```

### 3. Build Android Universal Release APK
```bash
# Export path to Android NDK
export NDK_HOME=$HOME/Android/Sdk/ndk/<your_ndk_version>

# Build signed universal release APK
pnpm tauri android build --ci -t aarch64 x86_64 --apk
```

The compiled package will be generated at:  
`src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk`

---

## 💳 Support & Donations

Development and maintenance are carried out independently. If you enjoy using LieMusic and would like to support ongoing development:

- ☕ **YooMoney (Bank Card / Wallet)**: [**4100119666781214**](https://yoomoney.ru/to/4100119666781214)
- 💬 **Direct Telegram**: [@lie2srvv](https://t.me/lie2srvv)

---

## 📄 License

This project is licensed under the open-source **MIT License**. See the [LICENSE](LICENSE) file for complete details.

<div align="center">
<sub>Crafted with ❤️ by <a href="https://github.com/lie2srvv">lie2srvv</a>.</sub>
</div>
