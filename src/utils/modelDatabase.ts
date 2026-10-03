/**
 * IndexedDB Persistent Storage for 3D Binary GLB Files
 * Stores binary ArrayBuffers permanently in the browser database.
 */

const DB_NAME = 'Dragon3DDatabase';
const DB_VERSION = 1;
const STORE_NAME = 'models';

export interface StoredModelRecord {
  id: string;
  fileName: string;
  data: ArrayBuffer;
  size: number;
  timestamp: number;
}

export function openModelDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveModelToDatabase(id: string, file: File): Promise<StoredModelRecord> {
  const db = await openModelDatabase();
  const arrayBuffer = await file.arrayBuffer();

  const record: StoredModelRecord = {
    id,
    fileName: file.name,
    data: arrayBuffer,
    size: file.size,
    timestamp: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(record);

    request.onsuccess = () => resolve(record);
    request.onerror = () => reject(request.error);
  });
}

export async function getModelFromDatabase(id: string): Promise<StoredModelRecord | null> {
  const db = await openModelDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function removeModelFromDatabase(id: string): Promise<void> {
  const db = await openModelDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
