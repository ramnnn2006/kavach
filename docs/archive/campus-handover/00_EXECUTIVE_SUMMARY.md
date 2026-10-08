# 🛡️ Kavach - Project Handover & Context Brief

## 1. Project Background & Objective
- **Repository:** `ramnnn2006/kavach` (Campus Emergency Response & Safety Dispatch System)
- **Initial State:** Hackathon prototype running React 19 + Vite + Firebase Firestore.
- **Academic / Presentation Context:** Course requirement requires demonstrating an advanced frontend for a **SQL Database Project**. While the live interactive prototype used Firebase (Firestore) for instant reactive WebSockets (`onSnapshot`), the project architecture is transitioning towards an enterprise PostgreSQL / relational schema for ACID compliance and audit trails.
- **Goal for claydecode / Next Phase:** Transitioning to full-scale development, major UI/UX overhauls, backend decoupling/migration, and feature expansion.

---

## 2. Key Accomplishments to Date
1. **PWA Engine Integration:** Configured `vite-plugin-pwa` with full web manifest, offline service worker capability, and mobile app-like launch traits.
2. **Apple Design System Overhaul:** Cloned & adapted `apple-design-skill`, introducing SF Pro typography, semantic iOS color tokens, "Liquid Glass" frosted cards (`backdrop-filter: blur(24px)`), and active state press-physics with `navigator.vibrate` haptic triggers.
3. **Responsive Landscape vs Mobile Architecture:**
   - Eradicated hardcoded mobile preview wrappers (`maxWidth: 430px` in `App.jsx`).
   - Built a dynamic MacOS-style glassmorphism sidebar (transforming `BottomNav` on wide screens $\ge 768px$).
   - Converted mobile single-column grids into wide Bento grids (8 columns on desktop) and multi-column presentation layouts.
4. **Auth Screen Polish & Lucide Integration:**
   - Fully replaced Material Symbols / raw emojis on login/signup and dev sandbox with `lucide-react` SVG icons.
   - Fixed input icon overlapping & password toggle visibility issues via absolute positioning within relative parent groups.
5. **Backend Concurrency Hardening (Firestore Prototype):**
   - Fixed "Thundering Herd" race conditions in `claimIncident` using Firestore `runTransaction` atomic locking.
   - Enforced `serverTimestamp()` to prevent client clock manipulation.
6. **Curated Backdated Git History:**
   - 6 clean, semantic commits pushed to `origin/main` distributed logically across Sept 15–17, 2026.

---

## 3. Directory Structure Overview
```
kavach/
├── kavach-app/
│   ├── src/
│   │   ├── components/       # BottomNav, ToastContainer, ConnectionBanner, etc.
│   │   ├── context/          # AuthContext, DialogContext, ToastContext
│   │   ├── firebase/         # firestore.js, config.js (concurrency fixes here)
│   │   ├── screens/          # StudentHome, ResponderAlerts, AdminDashboard,
│   │   │                     # LandingPage, Login, ReportForm, CampusMap, etc.
│   │   ├── App.jsx           # Global routes & responsive container
│   │   └── index.css         # Apple design tokens, responsive breakpoints, glassmorphism
│   ├── vite.config.js        # Vite + VitePWA plugin
│   └── package.json          # React 19, Lucide-React, Vite-PWA, Firebase
└── docs/
    └── handover/             # Comprehensive handover documentation
```

---

## 4. Immediate Development Roadmap for claydecode
- [ ] Implement complete Node/PostgreSQL / Supabase backend replacing Firebase client direct calls.
- [ ] Connect interactive 3D landing page / campus map using Three.js / R3F / Spline.
- [ ] Add real-time responder geolocation tracking & routing algorithms.
- [ ] Build offline queue synchronization (IndexedDB -> SQL API).
