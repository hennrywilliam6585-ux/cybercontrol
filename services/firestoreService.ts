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

// --- STATION MANAGEMENT ---

export const addNewStation = async (name: string, password?: string) => {
  // Generate ID from name (uppercase, dashed)
  let id = name.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '-');
  
  // Ensure ID is not empty or just dashes if user typed weird symbols
  if (!id || !/[A-Z0-9]/.test(id)) {
      id = `STATION-${Date.now()}`;
  }
  
  const stationRef = doc(db, STATIONS_COLLECTION, id);
  
  // Default password if not provided
  const finalPassword = password || Math.random().toString(36).slice(-6).toUpperCase();
  
  await setDoc(stationRef, {
    id, // Storing ID in data as well for reference
    name: name.trim(),
    status: 'OFFLINE',
    ip: '10.0.0.' + Math.floor(Math.random() * 200 + 10), // Mock IP generation
    password: finalPassword
  }, { merge: true });
  
  return id;
};

export const deleteStation = async (id: string) => {
  console.log(`[Firestore] Requesting delete for station: ${id}`);
  if (!id) {
    console.error("Attempted to delete station with invalid ID");
    return;
  }
  const stationRef = doc(db, STATIONS_COLLECTION, id);
  try {
    await deleteDoc(stationRef);
    console.log(`[Firestore] Station ${id} deleted successfully`);
  } catch (e) {
    console.error("[Firestore] Error deleting station: ", e);
    alert("Failed to delete station. Check console for details.");
  }
};

export const subscribeToStations = (callback: (stations: Station[]) => void) => {
  const q = query(collection(db, STATIONS_COLLECTION));
  return onSnapshot(q, (snapshot) => {
    const stations = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id // CRITICAL: Always use the document key as the ID
      } as Station;
    });
    callback(stations);
  });
};

// --- LOGGING & HISTORY ---

// Save a new broadcast or command to history
export const saveBroadcastToHistory = async (
  companyName: string,
  title: string,
  message: string,
  logo: string,
  url: string,
  targets: string[],
  type: LogType = 'BROADCAST',
  duration: number = 0
) => {
  try {
    await addDoc(collection(db, LOGS_COLLECTION), {
      type,
      companyName,
      title,
      message,
      logo,
      url,
      targets, 
      duration,
      timestamp: Timestamp.now()
    });
    console.log(`Document (${type}) written to Firestore`);
  } catch (e) {
    console.error("Error adding document to Firestore: ", e);
  }
};

// Fetch recent history
export const getBroadcastHistory = async (): Promise<NotificationLog[]> => {
  try {
    const q = query(
      collection(db, LOGS_COLLECTION),
      orderBy("timestamp", "desc"),
      limit(20)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as NotificationLog));
  } catch (e) {
    console.error("Error fetching logs: ", e);
    return [];
  }
};

// Clear all history
export const clearBroadcastHistory = async () => {
  const collectionRef = collection(db, LOGS_COLLECTION);
  const BATCH_SIZE = 50; 

  try {
    console.log("Starting full log purge...");
    let deletedCount = 0;
    
    while (true) {
      // Simple query: just get any docs in the collection. 
      // Removed orderBy to prevent index errors and ensure all docs are found.
      const q = query(collectionRef, limit(BATCH_SIZE));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
         console.log("No more logs found to delete.");
         break;
      }

      console.log(`Found batch of ${snapshot.size} logs. Deleting...`);
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      deletedCount += snapshot.size;
    }
    console.log(`Successfully purged ${deletedCount} logs.`);
  } catch (e) {
    console.error("CRITICAL ERROR clearing logs: ", e);
    throw e;
  }
};