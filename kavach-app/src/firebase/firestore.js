import { db, isFirebaseConfigured } from './config';
import {
  collection, doc, addDoc, updateDoc,
  query, where, orderBy, onSnapshot, serverTimestamp,
  getDoc, getDocs, setDoc, Timestamp
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

let demoListeners = [];
function notifyDemoListeners() {
  demoListeners.forEach(cb => cb([...demoIncidents]));
}


// ── Incidents ──
export function createIncident(data) {
  if (!isFirebaseConfigured) {
    const newInc = { id: `demo-${Date.now()}`, ...data, createdAt: Timestamp.fromDate(new Date()), acknowledgedAt: null, resolvedAt: null, status: 'pending', escalationLevel: 1, assignedResponder: null, assignedResponderName: null };
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
  if (!isFirebaseConfigured) {
    demoListeners.push(callback);
    callback([...demoIncidents]);
    return () => { demoListeners = demoListeners.filter(cb => cb !== callback); };
  }
  const q = query(incidentsRef, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, (error) => {
    console.error('Firestore listenIncidents error:', error);
    // Fallback to demo data on permission errors
    callback([...demoIncidents]);
  });
}

export function listenMyIncidents(uid, callback) {
  if (!isFirebaseConfigured) {
    const mine = demoIncidents.filter(i => i.reporterUid === uid || uid?.startsWith('demo'));
    demoListeners.push(callback);
    callback(mine);
    return () => { demoListeners = demoListeners.filter(cb => cb !== callback); };
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

export function listenPendingIncidents(callback) {
  if (!isFirebaseConfigured) {
    const pending = demoIncidents.filter(i => i.status !== 'resolved');
    demoListeners.push(callback);
    callback(pending);
    return () => { demoListeners = demoListeners.filter(cb => cb !== callback); };
  }
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
export function calculateUrgency(type, peopleAffected, zoneCriticality = 0.5) {
  const typeWeights = { fire: 1.0, medical: 0.9, lift: 0.8, power: 0.6 };
  const tw = typeWeights[type] || 0.5;
  const people = Math.min(peopleAffected / 50, 1);
  const score = Math.round((tw * 30) + (people * 20) + (0 * 25) + (zoneCriticality * 25));
  return Math.min(score, 100);
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
