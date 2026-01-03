
import { db } from "../firebaseConfig";
import { collection, addDoc, getDocs, query, orderBy, limit, Timestamp, setDoc, deleteDoc, doc, onSnapshot, writeBatch } from "firebase/firestore";

export type LogType = 'BROADCAST' | 'LOCK_INPUT' | 'UNLOCK_INPUT' | 'PERSISTENT' | 'KILL_ALERTS';

export interface NotificationLog {
  id?: string;
  type: LogType;
  companyName: string;
  title: string;
  message: string;
  logo: string;
  url: string;
  targets: string[]; 
  duration?: number;
  timestamp: any;
}

export interface Station {
  id: string;
  name: string;
  status: 'ONLINE' | 'OFFLINE' | 'BUSY' | 'LOCKED';
  ip: string;
  password?: string;
}

const LOGS_COLLECTION = "notification_logs";
const STATIONS_COLLECTION = "stations";

export const addNewStation = async (name: string, password?: string) => {
  let id = name.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '-');
  if (!id || !/[A-Z0-9]/.test(id)) { id = `STATION-${Date.now()}`; }
  const stationRef = doc(db, STATIONS_COLLECTION, id);
  const finalPassword = password || Math.random().toString(36).slice(-6).toUpperCase();
  await setDoc(stationRef, {
    id, 
    name: name.trim(),
    status: 'OFFLINE',
    ip: '10.0.0.' + Math.floor(Math.random() * 200 + 10),
    password: finalPassword
  }, { merge: true });
  return id;
};

export const deleteStation = async (id: string) => {
  if (!id) return;
  const stationRef = doc(db, STATIONS_COLLECTION, id);
  try { await deleteDoc(stationRef); } catch (e) { console.error(e); }
};

export const subscribeToStations = (callback: (stations: Station[]) => void) => {
  const q = query(collection(db, STATIONS_COLLECTION));
  return onSnapshot(q, (snapshot) => {
    const stations = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Station));
    callback(stations);
  });
};

export const saveBroadcastToHistory = async (
  companyName: string, title: string, message: string, logo: string, url: string, targets: string[], type: LogType = 'BROADCAST', duration: number = 0
) => {
  try {
    await addDoc(collection(db, LOGS_COLLECTION), {
      type, companyName, title, message, logo, url, targets, duration, timestamp: Timestamp.now()
    });
  } catch (e) { console.error(e); }
};

export const getBroadcastHistory = async (): Promise<NotificationLog[]> => {
  try {
    const q = query(collection(db, LOGS_COLLECTION), orderBy("timestamp", "desc"), limit(20));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NotificationLog));
  } catch (e) { return []; }
};

export const clearBroadcastHistory = async () => {
  const collectionRef = collection(db, LOGS_COLLECTION);
  try {
    while (true) {
      const q = query(collectionRef, limit(50));
      const snapshot = await getDocs(q);
      if (snapshot.empty) break;
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }
  } catch (e) { throw e; }
};
