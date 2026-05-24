# Kavach 🛡️
> Real-time, role-based campus emergency management and safety network.

## ✨ Key Features
- **Interactive Onboarding Walkthrough**: Step-by-step swipeable tutorial covering key safety features, with smooth transitions, pagination progress, and memory of completion.
- **Unified Sign In & Account Registration**: Support for both Sign In and Sign Up modes. Features a context-aware **Password Strength Meter** active exclusively during registration.
- **Developer Demo Sandbox**: Prominent one-click sandbox entry, letting developers instantly test the Student, Responder, or Admin workspaces without entering credentials or forms.
- **One-Tap Emergency Reporting**: Instantly report high-priority campus incidents (fire, medical, elevator, power outage) with active telemetry.
- **Role-Based Dynamic Workspaces**: Tailored visual dashboards for Students (reporting & timeline tracker), Responders (alerts & dispatch flow), and Admins (campus overview & stats).
- **Network Resilience Banner**: High-priority offline status tracking to warn users about signal dropouts.
- **Glassmorphic 404 Safety Zone**: An elegant "Area Unsecured" 404 handler that automatically routes users back to their active workspace based on their current auth state and role.

## 📸 Screenshots
*(Insert GIF here)*

## 🛠️ Tech Stack
- **Frontend**: React (Vite), Context API, CSS Variables (Harmonious Dark/Light & High-contrast themes)
- **Backend & DB**: Firebase Authentication & Cloud Firestore
- **Routing**: React Router DOM (v6)

## 🚀 Setup & Installation
1. Clone the repository and navigate to the project directory:
   ```bash
   cd kavach-app
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables by copying `.env.example` to `.env` and adding your Firebase credentials. (If left unconfigured, Kavach automatically enables its fully-featured Local Sandbox Demo mode).
4. Start the development server:
   ```bash
   npm run dev
   ```

## 🧪 Dynamic Sandbox Testing
No database credentials? No problem! If Kavach detects that your Firebase API keys are absent, it automatically boots into **Demo Sandbox Mode**.
* You can register a mock account under the **Register** tab.
* Or, you can use the **Developer Sandbox Panel** at the bottom of the sign-in screen to instantly log in as a **Student**, **Responder**, or **Admin** with a single click.

## 🏗️ Architecture
Kavach is designed around a lightweight, Context-driven structure. Global states like `AuthContext`, `ToastContext`, and `DialogContext` wrap the main `AppRoutes` tree at the root (`App.jsx`). Firestore triggers and network listeners are managed through clean hooks (`useNetworkStatus`, `useFormValidation`) to guarantee highly declarative, performant updates.

## 🌐 Deployment
Kavach is fully optimized for quick deployment on [Vercel](https://vercel.com). Simply configure the build commands to `npm run build` and append your Firebase variables to the Vercel project configuration.
