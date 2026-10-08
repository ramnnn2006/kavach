# 🧠 Business Logic, Algorithms & System Rules

## 1. Heuristic Incident Priority Scoring Algorithm
Incidents are triaged using a dynamic heuristic equation rather than simple chronological queues (FIFO).

$$\text{Priority Score} = (\text{Base Hazard Weight} \times 0.35) + (\text{Affected Count} \times 0.25) + (\text{Zone Criticality} \times 0.25) + (\text{Age Factor} \times 0.15)$$

### Weights Table:
- **Base Hazard Weight:**
  - Fire: `100`
  - Medical: `90`
  - Lift: `75`
  - Power: `60`
- **Zone Criticality (1–5 Scale $\times 20$):**
  - Exam Hall / Server Room / Chemical Lab: `5` ($\rightarrow 100$)
  - Hostels / Classroom Blocks: `3` ($\rightarrow 60$)
  - Sports Ground / Parking: `1` ($\rightarrow 20$)
- **Age Factor:** Auto-increments by `5` points for every 60 seconds an incident sits in `pending` state to prevent starvation.

---

## 2. Thundering Herd & Concurrency Defense
### The Problem:
During a major incident, multiple responders concurrently click "Accept/Claim" on the notification. Without concurrency barriers, two responders are assigned to the same incident while other incidents go unmanned.

### The Solution:
- **Current (Firestore):** `runTransaction` atomic lock ensuring document state hasn't deviated from `pending`.
- **SQL Target:** Row-level pessimistic locking via `SELECT ... FOR UPDATE`:
  ```sql
  BEGIN;
  SELECT id, status FROM incidents 
  WHERE id = $1 FOR UPDATE;

  -- Verify status is still 'pending'
  UPDATE incidents 
  SET status = 'acknowledged', claimed_by = $2, claimed_at = NOW() 
  WHERE id = $1 AND status = 'pending';

  INSERT INTO incident_logs (incident_id, actor_id, action) 
  VALUES ($1, $2, 'CLAIMED');
  COMMIT;
  ```

---

## 3. Server-Side Timestamp Verification
Client device clocks are notoriously unreliable or deliberately altered.
- All timeline milestones (`created_at`, `claimed_at`, `resolved_at`) must be stamped strictly at the database layer (`serverTimestamp()` in Firebase, `NOW()` / `CURRENT_TIMESTAMP` in SQL).
- Guarantees forensic validity for incident post-mortems and emergency compliance audits.

---

## 4. Offline-First Resilience Protocol
- During campus power grid drops, local WiFi access points go offline.
- **Service Worker Caching:** Caches core React bundle, assets, and styling for instant offline launch.
- **Pending Feature for claydecode:** Local queue buffer using IndexedDB. If an SOS is submitted offline, it stores locally and initiates an exponential backoff background sync as soon as connectivity resumes.
