# EzFame — SMM & In-Game Top-Up E-Commerce App

A production-grade, zero-crash **SMM (Social Media Marketing) + Game Top-Up store** built with a bespoke glassmorphism UI, ready for **GitHub Pages** (static SPA) and wired to your **Firebase Realtime Database**.

![stack](https://img.shields.io/badge/Next.js%2016-App%20Router-black) ![bun](https://img.shields.io/badge/bun%20%7C%20pnpm-compatible-f472b6) ![GH Pages](https://img.shields.io/badge/GitHub%20Pages-static%20SPA-22d3ee)

---

## ✨ Features

| Area | Details |
| --- | --- |
| 🛒 **Shop** | 17 platforms (Instagram, YouTube, Facebook, TikTok, Telegram, X, Clubhouse, LinkedIn, Google+, Likee, Spotify, Pinterest + PUBG UC, Free Fire, Mobile Legends, Valorant, Roblox). Live price calculator, quantity slider, game packages. |
| 💱 **Dual currency** | Real-time USD ⇄ NPR switcher; admin-controlled exchange rate. |
| 💳 **Payments** | eSewa / Khalti / Bank transfer (admin QR + account details) and Crypto (USDT/BTC wallet copy + auto-generated QR). Transaction ID / receipt screenshot submission. |
| 🔐 **Auth** | Google OAuth, Apple ID, Email+Password (Firebase Auth) **and** a zero-config local fallback engine (guest + local accounts with salted SHA-256). |
| 🌐 **i18n** | English, नेपाली, हिन्दी — native translated UI + live **Google Translate** auto-translation of dynamic content. |
| 🤖 **AI assistant** | Floating chat widget: built-in smart engine (live prices, order tracking, payment help) + optional OpenAI-compatible endpoint, all admin-configurable. |
| 🛠 **Admin panel** | Hidden at `#/original`: dashboard stats, order approve/reject workflow, services & pricing CRUD, payment/QR management, chatbot settings, social links, users, Firebase config, data export. |
| 🌗 **Theme** | Animated light/dark toggle with persistent state. |
| 📡 **Zero-crash data layer** | Firebase SDK → REST+SSE stream → polling → localStorage cache with offline write-queue. The app never white-screens. |

---

## 🚀 Quick start

```bash
# bun (recommended)
bun install
bun run dev          # http://localhost:3000

# pnpm works too
pnpm install && pnpm dev
```

---

## 🗺 Routes (hash-based SPA — GitHub Pages safe)

| Route | Page |
| --- | --- |
| `#/` | Home: hero, category pills, service configurator |
| `#/checkout` | Payment & order submission |
| `#/orders` | Order tracking + lookup by ID |
| `#/account` | Profile, theme, language, currency |
| `#/login` | Google / Apple / Email / Guest |
| **`#/original`** | 🔒 Hidden admin control center |

The admin panel is additionally reachable as **`/original`** (real path) or **`?p=/original`** — on GitHub Pages a `404.html` shim auto-converts the path into the hash route.

### 🔑 Admin credentials

```
Username: agrim
Password: ramesh
```

Change them in **Admin ▸ Settings ▸ Admin credentials** (stored as SHA-256 hashes in the DB).

> Route protection is **strict**: the client session is never trusted — admin-by-role is verified against the database record (`role: admin`, `status: active`), and the master credentials unlock a session-scoped flag that is cleared on every restart. New sign-ups start **pending** and cannot browse or buy until an admin approves them in **Admin ▸ Users** (suspend/restore/delete supported). Every admin action is recorded in **Admin ▸ Logs**. Crypto payments are hidden by default — toggle in **Admin ▸ Payments**.

---

## ☁️ Firebase setup

The store works out of the box with your database endpoint:

```
https://cipher-dump-default-rtdb.asia-southeast1.firebasedatabase.app
```

- If the database rules allow read/write, everything syncs live (users, catalog, orders, settings).
- If rules deny access, the app automatically falls back to local cache + offline write-queue and replays writes on reconnect.
- Data lives under the `csmm/` namespace (`csmm/catalog`, `csmm/settings`, `csmm/orders`, `csmm/users`).

**To enable Google/Apple OAuth + cloud accounts**, provide the Firebase web config either:

1. `.env.local` (copy `.env.example`) with `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_APP_ID`, etc. — or
2. at runtime: **Admin ▸ Settings ▸ Firebase config (JSON)** → paste → Apply & reload.

In Firebase Console also add your domain(s) under **Authentication → Settings → Authorized domains** (e.g. `youruser.github.io`).

---

## 📦 Deploy to GitHub Pages

One command builds a fully static export:

```bash
bun run build:pages       # or: pnpm run build:pages
# → out/  (index.html, 404.html SPA shim, .nojekyll)
```

Or push to `main` — the included workflow (`.github/workflows/deploy.yml`) builds and deploys automatically (repo **Settings → Pages → Source: GitHub Actions**).

> Deploying to a **project site** (`user.github.io/repo`)? Add `basePath` to `next.config.ts` if you serve under a sub-path; user/organization sites need none.

---

## 🗂 Project structure

```
src/
├─ app/
│  ├─ layout.tsx            # fonts, meta, pre-hydration theme boot
│  ├─ page.tsx              # SPA root + hash router + providers
│  └─ globals.css           # cyberpunk-glass design system
├─ components/
│  ├─ Navbar.tsx Footer.tsx # glass chrome, currency/lang/theme
│  ├─ home.tsx              # hero, category pills, configurator
│  ├─ checkout.tsx          # payments, QR, order submission
│  ├─ views.tsx             # orders / account / login
│  ├─ admin.tsx             # hidden control center (#/original)
│  ├─ ChatWidget.tsx        # AI support assistant
│  ├─ icons.tsx             # all inline SVG brand icons
│  └─ ui-kit.tsx            # glass cards, neon buttons, QR, toasts…
└─ lib/
   ├─ rtdb.ts               # resilient Firebase layer (SDK→REST/SSE→poll→cache)
   ├─ auth.tsx              # multi-provider auth + local fallback
   ├─ i18n.tsx              # en/ne/hi dictionaries + Google auto-translate
   ├─ data.ts               # React data hooks + mutations
   ├─ chatbot.ts            # bot engine (live data + optional LLM API)
   ├─ store.ts              # zustand (theme/currency/draft/toasts)
   └─ defaults.ts           # seed catalog & settings
```

## 🧰 Tech stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Framer Motion · Zustand · Firebase (RTDB + Auth) · Lucide · qrcode — package manager: **bun** (or pnpm).
