# 🎨 Design System, UI/UX & Responsive Mechanics

## 1. Aesthetic DNA: Apple "Liquid Glass" (iOS / macOS)
The visual identity follows Apple's Human Interface Guidelines (HIG) with modern "Liquid Glass" materials.

### Color Tokens (CSS Variables in `src/index.css`)
- **Primary:** `var(--primary)` $\rightarrow$ `#007aff` (iOS System Blue)
- **Emergency Red:** `var(--sos-red)` $\rightarrow$ `#ff3b30` (Medical / Fire Alert)
- **Warning Orange:** `var(--sos-orange)` $\rightarrow$ `#ff9500` (Urgent Hazard)
- **Amber:** `var(--sos-amber)` $\rightarrow$ `#ffcc00` (Power / Equipment Alert)
- **Success:** `var(--success)` $\rightarrow$ `#34c759` (Resolved / Safe State)
- **Backgrounds:**
  - Light: `#f5f5f7` (macOS System Gray 6)
  - Dark: `#1c1c1e` (iOS Dark Canvas)
- **Glass Effect:**
  - `backdrop-filter: blur(24px) saturate(180%)`
  - Border: `1px solid rgba(255, 255, 255, 0.2)`
  - Background: `rgba(255, 255, 255, 0.65)` (Light) / `rgba(30, 30, 30, 0.65)` (Dark)

---

## 2. Responsive Mechanics: Dual Experience Paradigm

### Mobile PWA Mode ($< 768px$)
- Strict thumb-zone ergonomics.
- Fixed bottom tab bar (`BottomNav.jsx`) with iOS home indicator bar (`.ios-home-indicator`).
- Haptic feedback on button interactions (`navigator.vibrate(50)`).
- Asymmetric 4-column Bento grid in `StudentHome.jsx`:
  - "Medical" spans all 4 columns (Priority trigger).
  - "Fire", "Power", "Lift" span 2 columns each.

### Desktop Presentation Mode ($\ge 768px$)
- **App Container:** Spans full viewport (`100vw`, `100vh`).
- **Sidebar Navigation:** Bottom tab bar transforms into a fixed 260px left sidebar with frosted glass styling and text labels.
- **Content Expansion:**
  - Main view gains `padding-left: 260px` to clear the sidebar.
  - Bento Grid stretches to an 8-column wide dashboard layout.
  - Landing page cards reflow into 4- and 5-column landscape presentation grids.
  - Header icons scale 2x with labels repositioned beneath icons.

---

## 3. Form & Component Patterns
- **Input Fields:** Relative container wrapper with Lucide vector icons absolutely pinned at `left: 1rem; top: 50%; transform: translateY(-50%)` and `padding-left: 3rem`.
- **Password Toggle:** Absolutely pinned at `right: 1rem; top: 50%; transform: translateY(-50%)` with zero layout shifting.
- **Dev Sandbox Bar:** Sticky badge with quick one-click impersonation (`Student`, `Responder`, `Admin`) for effortless demonstrations.
