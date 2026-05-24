<div align="center">
  
  # 🛡️ KAVACH 
  
  **Next-Gen Campus Emergency & Incident Response System**

</div>

---

## ⚡ Overview

**Kavach** (Hindi for _Shield_) is a centralized real-time emergency management platform designed for large university campuses. It bridges the critical delay between an incident occurring (medical emergencies, elevator hazards, localized fires, power outages) and the campus response team arriving on the scene.

With dedicated workspaces for **Students**, **Responders**, and **Admins**, Kavach eliminates the chaos of phone chains and ensures that help gets exactly where it is needed, instantly.

---

## 🔥 Key Features

### 🌟 Interactive Welcome Experience
- **Interactive Onboarding Walkthrough**: A swipeable step-by-step tutorial covering key safety features, with paging progress indicators, skipping, and session memory of completion.
- **Unified Sign In & Account Registration**: Support for both standard Sign In and Sign Up modes, complete with real-time email validation checks.
- **Contextual Password Strength Meter**: A color-coded strength bar (Weak, Medium, Strong) active exclusively during registration, hidden during simple sign-in.
- **Glassmorphic 404 Safety Zone**: An elegant "Area Unsecured" 404 handler that automatically routes users back to their active workspace based on their current auth state and role.

### 🎓 For Students
- **1-Click SOS Grids**: Immediately trigger categorized emergency flows (Medical, Fire, Lift Stuck, Power).
- **Live Tracking**: Watch in real-time as a responder is assigned to your incident and arrives on the scene.
- **Micro-Accessibility**: Full support for Dark Mode, High Contrast Mode, and oversized text for panic-state usability.
- **Silent SOS & Haptics**: Covert reporting options when vocalizing an emergency isn't viable.

### 🚑 For Responders
- **Smart Alerting**: Instant geofenced notifications for ongoing incidents with auto-calculated Urgency Scores.
- **One-Tap Acceptance**: Claim incidents instantly to clear the queue and log accurate response times.
- **Live Action Status**: Update statuses from _En Route_ to _On Scene_ to _Resolved_ with one tap.

### 🛡️ For Campus Admins (Command Center)
- **Live Command Dashboard**: View the entire campus grid. See localized power outages and active incident hotspots in real time.
- **Auto-Escalation Protocol**: If an incident goes unacknowledged by a responder for too long, Kavach automatically bumps the incident to Supervisor and Campus Admin priority.
- **Power Rotation UI**: Instantly initiate "Outage Mode" and visually manage priority power grids (Hostels vs. Academic Blocks) during load shedding.

---

## 🛠️ Architecture & Tech Stack

Kavach was built with speed and reliability in mind:

- **Frontend Layer**: React 18, Vite (for lightning-fast HMR and bundling), Vanilla CSS (Handcrafted design system using CSS variables supporting Dark, Light, and High Contrast styling).
- **Backend & Real-time Layer**: Firebase Firestore (NoSQL Document Store, instantly syncing WebSockets).
- **Auth Layer**: Firebase Authentication (Role-based access controls and secure session management).

---

## 🚀 Setup & Local Sandbox Testing

No database credentials? No problem! If Kavach detects that your Firebase API keys are absent, it automatically boots into **Demo Sandbox Mode** with local fallbacks.

**1. Clone the repository & Navigate**

```bash
git clone https://github.com/ramnnn2006/kavach.git
cd kavach/kavach-app
```

**2. Install Dependencies**

```bash
npm install
```

**3. Configure Environment Variables (Optional)**

If you want to use live Firebase backend:
- Copy the `.env.example` file to `.env`:
  ```bash
  cp .env.example .env
  ```
- Paste your Firebase config keys into the new `.env` file.

**4. Launch the Local Server**

```bash
npm run dev
```

> The app will launch at `http://localhost:5173`.
> _Note: In Sandbox Mode, you can use the **Developer Sandbox Panel** at the bottom of the sign-in screen to instantly log in as a **Student**, **Responder**, or **Admin** with a single click, skipping forms and credential requirements to test workspaces instantly!_

---

## ☁️ Deployment (Vercel)

Kavach is optimized for zero-config Vercel deployments:

1. Push your repository to GitHub.
2. Import the project in your Vercel dashboard.
3. In the Vercel **Environment Variables** settings, copy all `VITE_FIREBASE_*` keys from your local `.env` file and paste them in.
4. Click **Deploy**.

---

## 🏆 The Team

- **Anjum Sana**
- **Abishek B S**
- **Palak Malpani**
- **Ramakrishnan P H**

---

<div align="center">
  <i>"Because in emergencies, every single second counts."</i>
</div>
