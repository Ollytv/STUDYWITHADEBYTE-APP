# StudyWithAdebyte

> 📚 Smart Timetable & Attendance Tracker for POLYIBADAN Students

A premium Progressive Web App (PWA) built for Polytechnic Ibadan students. Manage your timetable, track attendance, import official timetables, and never miss a class.

---

## ✨ Features

- **Smart Timetable** — Add, edit, delete courses with full details
- **Attendance Tracker** — Mark attended/missed, visualize progress, get at-risk warnings
- **Import Timetable** — Parse PDF, DOCX, or image screenshots automatically
- **Notifications** — Local reminders 10min / 30min / 1hr before class
- **PWA / Installable** — Works offline, installable on iPhone (Safari) & Android (Chrome)
- **Premium Dark UI** — Glassmorphism, Framer Motion animations, green accents
- **Student Profile** — Name, department, level, semester dates

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (recommended: Node 20)
- npm

### Install & Run

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 📦 Deployment (Netlify)

This project is pre-configured for Netlify deployment.

### Option 1 – Netlify CLI
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod --dir=dist
```

### Option 2 – Drag & Drop
1. Run `npm run build`
2. Go to [app.netlify.com](https://app.netlify.com)
3. Drag the `dist/` folder into the deploy area

### Option 3 – Git Integration
1. Push this repo to GitHub
2. Connect on Netlify → New site from Git
3. Build command: `npm run build`
4. Publish directory: `dist`

---

## 📱 Installing as PWA

### iPhone (Safari)
1. Open the app URL in Safari
2. Tap the **Share** button (bottom center)
3. Scroll down → **Add to Home Screen**
4. Tap **Add**

### Android (Chrome)
1. Open the app URL in Chrome
2. Tap the **⋮** menu → **Add to Home Screen**
3. Or tap the install banner that appears automatically

---

## 🏗️ Tech Stack

| Technology | Purpose |
|---|---|
| React 18 + TypeScript | UI framework |
| Vite | Build tool |
| TailwindCSS | Styling |
| Framer Motion | Animations |
| Zustand | State management |
| IndexedDB (idb) | Offline data storage |
| vite-plugin-pwa | PWA / Service Worker |
| pdf.js | PDF parsing |
| mammoth.js | DOCX parsing |
| tesseract.js | OCR for images |

---

## 📁 Project Structure

```
src/
├── components/
│   ├── layout/       # BottomNav
│   ├── timetable/    # ClassCard, ClassForm
│   └── ui/           # Card, Button, Input, Modal, etc.
├── hooks/
│   ├── useStore.ts   # Zustand store
│   └── useInstallPrompt.ts
├── pages/
│   ├── Dashboard.tsx
│   ├── Timetable.tsx
│   ├── Attendance.tsx
│   ├── Import.tsx
│   ├── Settings.tsx
│   ├── Onboarding.tsx
│   └── SplashScreen.tsx
├── services/
│   ├── db.ts         # IndexedDB CRUD
│   ├── importer.ts   # File parsing
│   └── notifications.ts
├── types/index.ts
└── utils/
    ├── colors.ts
    ├── id.ts
    └── time.ts
public/
├── icons/            # PWA icons (all sizes)
└── manifest.json
```

---

## 🎨 Design System

- **Theme**: Dark mode default, light mode toggle
- **Accent**: Green (`#22c55e`)
- **Fonts**: Syne (display) + DM Sans (body) + JetBrains Mono
- **Components**: Rounded cards, glassmorphism, smooth animations

---

## 📄 License

MIT — Free to use and modify for POLYIBADAN students.

---

Made with 💚 for **POLYIBADAN** students
