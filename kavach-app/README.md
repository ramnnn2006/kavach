# Kavach 🛡️
> Real-time, role-based campus emergency management and safety application.

## ✨ Key Features
- **One-Tap Emergency Reporting**: Instantly report incidents (fire, medical, security) with precise location tracking.
- **Role-Based Dashboards**: Tailored interfaces for Students (reporting), Responders (action), and Admins (oversight).
- **Real-Time Synchronization**: Live updates powered by Firebase Firestore for immediate incident broadcasting.
- **Network Resilient**: Offline banner detection and robust local caching for poor campus networks.
- **Form Sanitization & Security**: Built-in validators prevent duplicate reports, spam, and dangerous payload injections.

## 📸 Screenshots
*(Insert GIF here)*

## 🛠️ Tech Stack
- **Frontend**: React (Vite), Context API, CSS Variables (Dark/Light mode)
- **Backend & DB**: Firebase Authentication & Cloud Firestore
- **Routing**: React Router DOM

## 🚀 Setup & Installation
1. Clone the repository and navigate to the project directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables by copying `.env.example` to `.env` and adding your Firebase credentials.
4. Start the development server:
   ```bash
   npm run dev
   ```

## 🧪 Testing as Different Roles
The Login screen includes a built-in mock role selector. Upon successful authentication, you can choose to enter the app as a **Student**, **Responder**, or **Admin** to test role-specific functionalities without needing multiple test accounts.

## 🏗️ Architecture
Kavach uses a lightweight, Context-driven architecture. Global states like `Auth`, `Toast`, and `Dialog` are managed via React Context providers at the root level (`App.jsx`). Firestore listeners are attached cleanly via custom hooks (`useNetworkStatus`, `useFormValidation`) to ensure UI components remain declarative and decoupled from raw database logic.

## ⚠️ Known Limitations
- Push notifications require active APNs/FCM keys which are not included in the public repository.
- While the UI gracefully handles offline states, full offline creation of reports (syncing once reconnected) is pending implementation.

## 🌐 Deployment
Kavach is optimized for deployment on [Vercel](https://vercel.com). Connect your repository, set the build command to `npm run build`, and add the Firebase configuration to your Vercel Environment Variables.
