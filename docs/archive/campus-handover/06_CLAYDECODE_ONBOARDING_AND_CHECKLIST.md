# 🛠️ Claydecode Agent Onboarding, Codebase Map & Action Checklist

Welcome to the **Kavach** repository! This document is tailored specifically for onboarding any developer or AI assistant (such as claydecode) picking up this project.

---

## 1. Quick Start Commands
```bash
# Navigate to app directory
cd kavach-app

# Install dependencies (Node 20+ recommended)
npm install

# Start local dev server (default port 5173)
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

---

## 2. Codebase Map & Critical File Directory

| File / Directory | Purpose & Key Mechanics |
| :--- | :--- |
| [`src/App.jsx`](file:///home/sparxz/Desktop/fuckitweball/kavach/kavach-app/src/App.jsx) | Root routing tree, `ProtectedRoute` guards, and the fluid widescreen `<div className="app-container">`. |
| [`src/index.css`](file:///home/sparxz/Desktop/fuckitweball/kavach/kavach-app/src/index.css) | Central design tokens (Apple Liquid Glass), dark mode variables, and mobile vs desktop breakpoints ($\ge 768px$). |
| [`src/components/BottomNav.jsx`](file:///home/sparxz/Desktop/fuckitweball/kavach/kavach-app/src/components/BottomNav.jsx) | Dual-mode navigation: renders bottom tab bar on mobile, and transforms into a fixed 260px frosted sidebar on desktop. |
| [`src/screens/StudentHome.jsx`](file:///home/sparxz/Desktop/fuckitweball/kavach/kavach-app/src/screens/StudentHome.jsx) | Student hub featuring the asymmetric Apple-style Bento grid SOS triggers (Medical, Fire, Power, Lift) with haptic feedback. |
| [`src/screens/ResponderAlerts.jsx`](file:///home/sparxz/Desktop/fuckitweball/kavach/kavach-app/src/screens/ResponderAlerts.jsx) | Responder dispatch interface with live incident streams, status progression, and atomic claim transactions. |
| [`src/screens/AdminDashboard.jsx`](file:///home/sparxz/Desktop/fuckitweball/kavach/kavach-app/src/screens/AdminDashboard.jsx) | Incident command center, zone health matrix, power grid toggles, and metrics overview. |
| [`src/screens/LandingPage.jsx`](file:///home/sparxz/Desktop/fuckitweball/kavach/kavach-app/src/screens/LandingPage.jsx) | Presentation-ready pitch deck view with keyboard navigation (arrow keys) and widescreen landscape grid reflow. |
| [`src/screens/Login.jsx`](file:///home/sparxz/Desktop/fuckitweball/kavach/kavach-app/src/screens/Login.jsx) | Modernized auth screen with Lucide icons, password strength meter, and Sandbox Dev Tools (instant role switcher). |
| [`src/firebase/firestore.js`](file:///home/sparxz/Desktop/fuckitweball/kavach/kavach-app/src/firebase/firestore.js) | Backend abstraction layer. Contains the atomic `claimIncident` lock and `serverTimestamp()` data pipelines. |
| [`src/context/AuthContext.jsx`](file:///home/sparxz/Desktop/fuckitweball/kavach/kavach-app/src/context/AuthContext.jsx) | Manages authentication states, Firebase session, and local mock demo users. |

---

## 3. High-Priority Checklist for Major Upcoming Changes

### Phase A: Architecture Decoupling & SQL Backend
- [ ] **Node.js/Express or Supabase API:** Build REST / WebSocket endpoints replacing direct Firebase SDK calls in the frontend components.
- [ ] **PostgreSQL Database:** Deploy the schema provided in [`01_ARCHITECTURE_AND_TECHSTACK.md`](file:///home/sparxz/Desktop/fuckitweball/kavach/docs/handover/01_ARCHITECTURE_AND_TECHSTACK.md).
- [ ] **Data Access Layer:** Migrate queries in `firestore.js` to an API client (e.g., `axios` or native `fetch` with JWT auth).

### Phase B: Advanced Visuals & 3D Integration
- [ ] **3D Canvas Landing Page:** Implement the Three.js / React Three Fiber / Spline campus grid model outlined in [`04_FUTURE_ROADMAP_AND_SPECS.md`](file:///home/sparxz/Desktop/fuckitweball/kavach/docs/handover/04_FUTURE_ROADMAP_AND_SPECS.md).
- [ ] **Spring Animations:** Integrate `framer-motion` for smoother layout transitions on the Bento grid and modals.

### Phase C: Emergency Intelligence & Dispatch Enhancements
- [ ] **Interactive Geofence Map:** Hook Mapbox / Leaflet to display live responder coordinates and campus hazard zones.
- [ ] **Auto-Escalation Worker:** Background task to alert administrative leads when pending emergencies sit unattended.
- [ ] **Offline Queue Sync:** Implement local IndexedDB queuing for emergency reports logged during network dropouts.
