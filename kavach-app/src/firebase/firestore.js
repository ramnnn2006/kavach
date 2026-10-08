import { db, isFirebaseConfigured } from './config';
import {
  collection, doc, addDoc, updateDoc,
  query, where, orderBy, onSnapshot, serverTimestamp,
  getDoc, getDocs, setDoc, Timestamp, runTransaction
} from 'firebase/firestore';

// ── Firestore refs ──
const incidentsRef = collection(db, 'incidents');
const zonesRef = collection(db, 'zones');

// ── Demo data store (in-memory fallback) ──
let demoIncidents = [
  { id: 'demo-1', type: 'lift', description: 'Stuck between floors', locationZone: 'Block B, 3rd Floor', locationBuilding: 'Block B', reporterUid: 'demo-student', reporterName: 'Anjum Sana', status: 'pending', escalationLevel: 1, urgencyScore: 82, peopleAffected: 3, assignedResponder: null, assignedResponderName: null, createdAt: Timestamp.fromDate(new Date(Date.now() - 120000)), acknowledgedAt: null, resolvedAt: null },
  { id: 'demo-2', type: 'power', description: 'Full building outage', locationZone: 'Exam Hall C', locationBuilding: 'Block A', reporterUid: 'demo-student', reporterName: 'Palak Malpani', status: 'pending', escalationLevel: 2, urgencyScore: 71, peopleAffected: 200, assignedResponder: null, assignedResponderName: null, createdAt: Timestamp.fromDate(new Date(Date.now() - 300000)), acknowledgedAt: null, resolvedAt: null },
  { id: 'demo-3', type: 'medical', description: 'Student fainted in lab', locationZone: 'Lab 4, Block C', locationBuilding: 'Block C', reporterUid: 'demo-student', reporterName: 'Abishek', status: 'pending', escalationLevel: 1, urgencyScore: 35, peopleAffected: 1, assignedResponder: null, assignedResponderName: null, createdAt: Timestamp.fromDate(new Date(Date.now() - 600000)), acknowledgedAt: null, resolvedAt: null },
];

// Each listener keeps its own filter so demo updates respect it
let demoListeners = [];
function notifyDemoListeners() {
  demoListeners.forEach(({ cb, filter }) => cb(demoIncidents.filter(filter)));
}
function addDemoListener(cb, filter = () => true) {
  const entry = { cb, filter };
  demoListeners.push(entry);
  cb(demoIncidents.filter(filter));
  return () => { demoListeners = demoListeners.filter(l => l !== entry); };
}


// ── Incidents ──
export function createIncident(data) {
  if (!isFirebaseConfigured) {
    const newInc = { id: `demo-${Date.now()}`, ...data, createdAt: Timestamp.now(), acknowledgedAt: null, resolvedAt: null, status: 'pending', escalationLevel: 1, assignedResponder: null, assignedResponderName: null };
    demoIncidents = [newInc, ...demoIncidents];
    notifyDemoListeners();
    return Promise.resolve({ id: newInc.id });
  }
  return addDoc(incidentsRef, {
    ...data,
    status: 'pending',
    escalationLevel: 1,
    createdAt: serverTimestamp(),
    acknowledgedAt: null,
    resolvedAt: null,
    assignedResponder: null,
    assignedResponderName: null,
  });
}

export function updateIncident(id, data) {
  if (!isFirebaseConfigured) {
    demoIncidents = demoIncidents.map(i => i.id === id ? { ...i, ...data } : i);
    notifyDemoListeners();
    return Promise.resolve();
  }
  // Normalize any timestamp fields
  const sanitized = { ...data };
  if (sanitized.acknowledgedAt instanceof Date) sanitized.acknowledgedAt = Timestamp.fromDate(sanitized.acknowledgedAt);
  if (sanitized.resolvedAt instanceof Date) sanitized.resolvedAt = Timestamp.fromDate(sanitized.resolvedAt);
  return updateDoc(doc(db, 'incidents', id), sanitized);
}

export function listenIncidents(callback) {
  if (!isFirebaseConfigured) return addDemoListener(callback);
  const q = query(incidentsRef, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, (error) => {
    console.error('Firestore listenIncidents error:', error);
    callback([]);
  });
}

export function listenMyIncidents(uid, callback) {
  if (!isFirebaseConfigured) {
    return addDemoListener(callback, i => i.reporterUid === uid || uid?.startsWith('demo'));
  }
  const q = query(incidentsRef, where('reporterUid', '==', uid));
  return onSnapshot(q, (snap) => {
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    docs.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || (a.createdAt instanceof Date ? a.createdAt.getTime() : 0);
      const bTime = b.createdAt?.toMillis?.() || (b.createdAt instanceof Date ? b.createdAt.getTime() : 0);
      return bTime - aTime;
    });
    callback(docs);
  }, (error) => {
    console.error('Firestore listenMyIncidents error:', error);
    callback([]);
  });
}

export function listenIncident(id, callback) {
  if (!isFirebaseConfigured) {
    return addDemoListener(list => callback(list[0] || null), i => i.id === id);
  }
  return onSnapshot(doc(db, 'incidents', id), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  }, (error) => {
    console.error('Firestore listenIncident error:', error);
    callback(null);
  });
}

export function listenPendingIncidents(callback) {
  if (!isFirebaseConfigured) return addDemoListener(callback, i => i.status !== 'resolved');
  const q = query(incidentsRef, where('status', 'in', ['pending', 'acknowledged', 'in_progress']));
  return onSnapshot(q, (snap) => {
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    docs.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || (a.createdAt instanceof Date ? a.createdAt.getTime() : 0);
      const bTime = b.createdAt?.toMillis?.() || (b.createdAt instanceof Date ? b.createdAt.getTime() : 0);
      return bTime - aTime;
    });
    callback(docs);
  }, (error) => {
    console.error('Firestore listenPendingIncidents error:', error);
    callback([]);
  });
}

// ── Zones ──
const defaultZones = [
  { name: 'Medical Center', building: 'Main', type: 'medical', priorityTier: 'P1', powerStatus: 'on', capacityKw: 5 },
  { name: 'Server Room', building: 'Admin', type: 'infrastructure', priorityTier: 'P1', powerStatus: 'on', capacityKw: 15 },
  { name: 'Security Desk', building: 'Gate', type: 'infrastructure', priorityTier: 'P1', powerStatus: 'on', capacityKw: 2 },
  { name: 'Emergency Exits', building: 'All', type: 'infrastructure', priorityTier: 'P1', powerStatus: 'on', capacityKw: 1 },
  { name: 'Exam Hall A', building: 'Block A', type: 'academic', priorityTier: 'P2', powerStatus: 'on', capacityKw: 8 },
  { name: 'Exam Hall B', building: 'Block A', type: 'academic', priorityTier: 'P2', powerStatus: 'on', capacityKw: 8 },
  { name: 'Exam Hall C', building: 'Block B', type: 'academic', priorityTier: 'P2', powerStatus: 'on', capacityKw: 8 },
  { name: 'Hostel 1', building: 'Hostel', type: 'hostel', priorityTier: 'P2', powerStatus: 'on', capacityKw: 20 },
  { name: 'Hostel 2', building: 'Hostel', type: 'hostel', priorityTier: 'P2', powerStatus: 'on', capacityKw: 20 },
  { name: 'Lab 1', building: 'Block C', type: 'academic', priorityTier: 'P2', powerStatus: 'on', capacityKw: 10 },
  { name: 'Lab 2', building: 'Block C', type: 'academic', priorityTier: 'P2', powerStatus: 'on', capacityKw: 10 },
  { name: 'Classroom Block A', building: 'Block A', type: 'academic', priorityTier: 'P3', powerStatus: 'rotating', capacityKw: 12 },
  { name: 'Classroom Block B', building: 'Block B', type: 'academic', priorityTier: 'P3', powerStatus: 'rotating', capacityKw: 12 },
  { name: 'Faculty Building', building: 'Admin', type: 'admin', priorityTier: 'P3', powerStatus: 'rotating', capacityKw: 8 },
  { name: 'Library', building: 'Main', type: 'academic', priorityTier: 'P3', powerStatus: 'rotating', capacityKw: 10 },
  { name: 'Admin Office', building: 'Admin', type: 'admin', priorityTier: 'P3', powerStatus: 'rotating', capacityKw: 5 },
  { name: 'Gym', building: 'Sports', type: 'recreation', priorityTier: 'P4', powerStatus: 'off', capacityKw: 15 },
  { name: 'Canteen', building: 'Main', type: 'recreation', priorityTier: 'P4', powerStatus: 'off', capacityKw: 10 },
  { name: 'Auditorium', building: 'Main', type: 'recreation', priorityTier: 'P4', powerStatus: 'off', capacityKw: 25 },
  { name: 'Parking Area', building: 'Gate', type: 'infrastructure', priorityTier: 'P4', powerStatus: 'off', capacityKw: 3 },
];

export function listenZones(callback) {
  if (!isFirebaseConfigured) {
    callback(defaultZones);
    return () => {};
  }
  return onSnapshot(zonesRef, (snap) => {
    const zones = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(zones.length > 0 ? zones : defaultZones);
  }, (error) => {
    console.error('Firestore listenZones error:', error);
    callback(defaultZones);
  });
}

// ── Users ──
export async function setUserProfile(uid, data) {
  if (!isFirebaseConfigured) return Promise.resolve();
  return setDoc(doc(db, 'users', uid), data, { merge: true });
}

export async function getUserProfile(uid) {
  if (!isFirebaseConfigured) return null;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.error('Error getting user profile:', err);
    return null;
  }
}

// ── Urgency Scoring ──
// Score = hazard×0.35 + people×0.25 + zone×0.25 + age×0.15 (each component 0–100)
const HAZARD_WEIGHTS = { fire: 100, medical: 90, lift: 75, power: 60 };

export function calculateUrgency(type, peopleAffected, zoneCriticality = 3, ageMinutes = 0) {
  const hazard = HAZARD_WEIGHTS[type] ?? 50;
  const people = Math.min(peopleAffected / 50, 1) * 100;
  const zone = Math.min(Math.max(zoneCriticality, 1), 5) * 20;
  const age = Math.min(ageMinutes * 5, 100);
  return Math.min(Math.round(hazard * 0.35 + people * 0.25 + zone * 0.25 + age * 0.15), 100);
}

// ── Seed Zones ──
export async function seedZones() {
  if (!isFirebaseConfigured) return;
  try {
    const existing = await getDocs(zonesRef);
    if (existing.size > 0) return;
    for (const zone of defaultZones) {
      await addDoc(zonesRef, zone);
    }
    console.log('Zones seeded successfully');
  } catch (err) {
    console.error('Error seeding zones:', err);
  }
}

// ── Atomic Operations ──
export async function claimIncident(incidentId, responderUid, responderName) {
  if (!isFirebaseConfigured) {
    demoIncidents = demoIncidents.map(i => i.id === incidentId && i.status === 'pending' ? { ...i, status: 'acknowledged', assignedResponder: responderUid, assignedResponderName: responderName, acknowledgedAt: new Date() } : i);
    notifyDemoListeners();
    return Promise.resolve();
  }
  const incRef = doc(db, 'incidents', incidentId);
  try {
    await runTransaction(db, async (transaction) => {
      const incDoc = await transaction.get(incRef);
      if (!incDoc.exists()) throw "Document does not exist!";
      if (incDoc.data().status !== 'pending') throw "Incident already claimed!";
      
      transaction.update(incRef, {
        status: 'acknowledged',
        assignedResponder: responderUid,
        assignedResponderName: responderName,
        acknowledgedAt: serverTimestamp()
      });
    });
  } catch (e) {
    console.error("Transaction failed: ", e);
    throw e;
  }
}

export async function updateIncidentStatus(incidentId, newStatus) {
  if (!isFirebaseConfigured) {
    demoIncidents = demoIncidents.map(i => i.id === incidentId ? { ...i, status: newStatus, ...(newStatus === 'resolved' ? { resolvedAt: new Date() } : {}) } : i);
    notifyDemoListeners();
    return Promise.resolve();
  }
  const updates = { status: newStatus };
  if (newStatus === 'resolved') updates.resolvedAt = serverTimestamp();
  
  const incRef = doc(db, 'incidents', incidentId);
  return updateDoc(incRef, updates);
}
