// IndexedDB persistent storage for user uploaded audio tracks
import { nativeBridge } from './nativeBridge';

const DB_NAME = 'ThreadPetAudioDB';
const DB_VERSION = 2;
const STORE_NAME = 'custom_audio';

interface SavedAudioRecord {
  id: string;
  buffer?: ArrayBuffer;
  mimeType?: string;
  blob?: Blob;
  fileName: string;
  title: string;
  timestamp: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePersistentAudio(file: File | Blob, fileName: string): Promise<string> {
  const title = fileName.replace(/\.[^/.]+$/, '');
  try {
    const arrayBuf = await file.arrayBuffer();
    const db = await openDB();
    const record: SavedAudioRecord = {
      id: 'active_custom_track',
      buffer: arrayBuf,
      mimeType: file.type || 'audio/mpeg',
      fileName,
      title,
      timestamp: Date.now(),
    };

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    localStorage.setItem('threadpet_has_custom_audio', 'true');
    localStorage.setItem('threadpet_custom_track_name', title);
  } catch (err) {
    console.error('Failed to save audio to IndexedDB:', err);
    localStorage.setItem('threadpet_has_custom_audio', 'true');
    localStorage.setItem('threadpet_custom_track_name', title);
  }
  return title;
}

export async function loadPersistentAudio(): Promise<{ blob: Blob; fileName: string; title: string } | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get('active_custom_track');
      req.onsuccess = () => {
        const record = req.result as SavedAudioRecord | undefined;
        if (record) {
          if (record.buffer) {
            const blob = new Blob([record.buffer], { type: record.mimeType || 'audio/mpeg' });
            resolve({ blob, fileName: record.fileName, title: record.title });
            return;
          }
          if (record.blob) {
            resolve({ blob: record.blob, fileName: record.fileName, title: record.title });
            return;
          }
        }
        resolve(null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function clearPersistentAudio(): Promise<void> {
  try {
    nativeBridge.clearAudioFromNative();
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete('active_custom_track');
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch (err) {
    console.error('Failed to clear audio from IndexedDB:', err);
  }
  localStorage.removeItem('threadpet_has_custom_audio');
  localStorage.removeItem('threadpet_custom_track_name');
}
