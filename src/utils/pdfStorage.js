// IndexedDB-based PDF storage for client-side Vercel deployment.
// Uploaded PDFs are saved in the browser and survive page refreshes.

const DB_NAME = 'mypdfnotes';
const STORE_NAME = 'pdfs';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'fileName' });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

/** Save a File object to IndexedDB */
export async function savePdf(file, meta = {}) {
  const db = await openDB();
  const arrayBuffer = await file.arrayBuffer();
  const entry = {
    fileName: file.name,
    blob: arrayBuffer,
    title: meta.title || file.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' '),
    subject: meta.subject || 'Uploaded Notes',
    tags: meta.tags || ['Uploaded'],
    isFavorite: false,
    lastReadPage: 1,
    userNotes: '',
    sizeBytes: file.size,
    sizeFormatted: formatSize(file.size),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isLocal: true,            // mark as browser-stored
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(entry);
    tx.oncomplete = () => resolve(entry);
    tx.onerror = (e) => reject(e.target.error);
  });
}

/** Load all locally saved PDFs from IndexedDB */
export async function loadLocalPdfs() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = (e) => {
      const entries = e.result || [];
      // Build blob URLs on the fly for each entry
      const pdfs = entries.map(entry => {
        const blob = new Blob([entry.blob], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        return { ...entry, blob: undefined, url };
      });
      resolve(pdfs);
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

/** Delete a locally saved PDF by fileName */
export async function deleteLocalPdf(fileName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(fileName);
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
  });
}

/** Get a single PDF's blob URL by fileName */
export async function getPdfBlobUrl(fileName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(fileName);
    req.onsuccess = (e) => {
      if (e.result) {
        const blob = new Blob([e.result.blob], { type: 'application/pdf' });
        resolve(URL.createObjectURL(blob));
      } else {
        resolve(null);
      }
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

function formatSize(bytes) {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(1)) + ' ' + sizes[i];
}
