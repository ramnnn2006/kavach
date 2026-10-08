# 🏗️ Technical Architecture & Tech Stack Details

## 1. Frontend Specification
- **Framework:** React 19 (`react`, `react-dom`)
- **Build System:** Vite 7 with Fast Refresh & ESM bundling
- **Routing:** React Router DOM v7 (`BrowserRouter`, nested routes, role-based `ProtectedRoute`)
- **Iconography:** `lucide-react` (clean vector SVGs, replaced emojis & legacy webfonts)
- **Styling Architecture:**
  - Zero heavy CSS runtime libraries (vanilla CSS + dynamic CSS Custom Properties on `:root`).
  - Native Apple Liquid Glass styling (`backdrop-filter: blur(24px)`, subtle white borders `rgba(255,255,255,0.2)`).
  - Responsive layout modes:
    - Mobile ($< 768px$): Standalone PWA view, bottom tab navigation, compact bento grid.
    - Desktop ($\ge 768px$): MacOS app style, fixed 260px frosted sidebar, wide multi-column layout, presentation grids.

## 2. Progressive Web App (PWA) Layer
- **Plugin:** `vite-plugin-pwa`
- **Manifest Configuration (`vite.config.js`):**
  - `display: 'standalone'`
  - `theme_color: '#007aff'`, `background_color: '#f5f5f7'`
  - Full Apple Touch icon registration (`apple-touch-icon`).
  - Cache strategies for offline static assets via Workbox.

## 3. State Management & Context Pipeline
1. **`AuthContext.jsx`:**
   - Handles global authentication state, Firebase user session, and localized user role profile (`student`, `responder`, `admin`).
   - Includes **Sandbox Dev Mode** (`demoLogin(role)`) allowing one-click role switching for testing without credentials.
2. **`ToastContext.jsx`:**
   - Global notification dispatcher for transient alerts, error warnings, and operation acknowledgments.
3. **`DialogContext.jsx`:**
   - Modal dialog coordinator for destructive actions, confirmations, and SOS dispatch verifications.

## 4. Current Prototype Backend: Firebase Firestore
- Real-time reactivity via `onSnapshot` subscriptions.
- **Critical Fixes Implemented:**
  - **Atomic Concurrency Control in `claimIncident`:**
    ```javascript
    await runTransaction(db, async (transaction) => {
      const incidentDoc = await transaction.get(incidentRef);
      if (!incidentDoc.exists()) throw new Error("Incident not found");
      const data = incidentDoc.data();
      if (data.status !== 'pending') {
        throw new Error("Incident already claimed by another responder");
      }
      transaction.update(incidentRef, {
        status: 'acknowledged',
        claimedBy: responderId,
        claimedAt: serverTimestamp()
      });
    });
    ```
  - **Timestamp Integrity:** Enforced `serverTimestamp()` across all writes to eradicate client clock spoofing.

## 5. Target SQL Architecture (PostgreSQL / Relational Model)
To satisfy the course's strict SQL requirements, the architecture is designed to swap direct Firebase calls for an Express/Fastify/Go API backed by PostgreSQL:

```sql
-- Core Enums
CREATE TYPE user_role AS ENUM ('student', 'responder', 'admin');
CREATE TYPE incident_type AS ENUM ('medical', 'fire', 'lift', 'power');
CREATE TYPE incident_status AS ENUM ('pending', 'acknowledged', 'en_route', 'on_scene', 'resolved');
CREATE TYPE power_grid_status AS ENUM ('normal', 'critical', 'islanded', 'blackout');

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role user_role DEFAULT 'student',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Campus Geofence Zones
CREATE TABLE zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    building_code VARCHAR(50) NOT NULL,
    criticality_score INT DEFAULT 1 CHECK (criticality_score BETWEEN 1 AND 5),
    geo_polygon JSONB
);

-- Incident Master Table
CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type incident_type NOT NULL,
    status incident_status DEFAULT 'pending',
    reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
    zone_id UUID REFERENCES zones(id) ON DELETE RESTRICT,
    details TEXT,
    affected_count INT DEFAULT 1,
    priority_score INT DEFAULT 0,
    claimed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    claimed_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Immutable Audit Ledger Table
CREATE TABLE incident_logs (
    id BIGSERIAL PRIMARY KEY,
    incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    metadata JSONB DEFAULT '{}',
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for High Concurrency Queries
CREATE INDEX idx_incidents_status_priority ON incidents(status, priority_score DESC);
CREATE INDEX idx_incidents_zone ON incidents(zone_id);
CREATE INDEX idx_incident_logs_incident ON incident_logs(incident_id);
```
