<div align="center">
  
  # 🛡️ KAVACH 
  
  **Next-Gen Campus Emergency & Incident Response System**

</div>

---

## ⚡ Overview

**Kavach** (Hindi for _Shield_) is a hyper-fast, centralized real-time emergency management platform designed specifically for large university campuses. It bridges the critical delay between an incident occurring (medical emergencies, localized fires, power outages, elevator hazards) and the campus response team arriving on the scene.

With dedicated routing for **Students**, **Responders**, and **Admins**, Kavach eliminates the chaos of phone chains and ensures that help gets exactly where it is needed, _instantly_.

---

## 🔥 Key Features

### 🎓 For Students

- **1-Click SOS Grids**: Immediately trigger categorized emergency flows (Medical, Fire, Lift Stuck, Power).
- **Live Tracking**: Watch in real-time as a responder is assigned to your incident and arrives on the scene.
- **Micro-Accessibility**: Full support for Dark Mode, High Contrast Mode, and oversized text for panic-state usability.
- **Silent SOS & Haptics**: Covert reporting options when vocalizing an emergency isn't viable.

### 🚑 For Responders

- **Smart Alerting**: Instant geofenced notifications for ongoing incidents with auto-calculated Urgency Scores.
- **One-Tap Acceptance**: Claim incidents instantly to clear the queue and log accurate response times.
- **Live Action Status**: Update statuses from _En Route_ ➔ _On Scene_ ➔ _Resolved_ with one tap.

### 🛡️ For Campus Admins (Command Center)

- **Live Command Dashboard**: View the entire campus grid. See localized power outages and active incident hotspots in real time.
- **Auto-Escalation Protocol**: If an incident goes unacknowledged by a responder for too long, Kavach automatically bumps the incident to Level 3 (Supervisor) and Level 4 (Campus Admin) priority.
- **Power Rotation UI**: Instantly initiate "Outage Mode" and visually manage priority power grids (Hostels vs. Academic Blocks) during load shedding.

---

## 🛠️ Architecture & Tech Stack

Kavach was built with absolute speed and reliability in mind.

- **Frontend Layer**: React 18, Vite (for lightning-fast HMR and bundling), Vanilla CSS (Zero-dependency, handcrafted design system using CSS variables).
- **Backend & Real-time Layer**: Firebase Firestore (NoSQL Document Store, instantly syncing WebSockets).
- **Auth Layer**: Firebase Authentication (Role-based access controls and secure JWT session management).

---

## 🚀 Quick Start / Local Deployment

Thinking about spinning up a local command center? Here is how to get it running in 60 seconds.

**1. Clone the repository & Install**

```bash
git clone https://github.com/your-repo/kavach-app.git
cd kavach-app
npm install
```

**2. Configure your Environment Variables**

- Create a new project in the Firebase Console.
- Enable **Firestore Database** and **Authentication** (Email/Password).
- Copy the `.env.example` file to `.env`:
  ```bash
  cp .env.example .env
  ```
- Paste your Firebase config keys into the new `.env` file.

**3. Launch the Local Server**

```bash
npm run dev
```

> The app will launch at `http://localhost:5173`.
> _Note: By default, new accounts register as "Students". To demo the Admin or Responder view, a database administrator must manually elevate the account's role in the Firebase Firestore Console (change the `role` field on the user document to `admin` or `responder`)._

---

## ☁️ Deployment (Vercel)

Kavach is optimized for zero-config Vercel deployments:

1. Push your repository to GitHub.
2. Import the project in your Vercel dashboard.
3. In the Vercel **Environment Variables** settings, copy all 6 `VITE_FIREBASE_*` keys from your local `.env` file and paste them in.
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
