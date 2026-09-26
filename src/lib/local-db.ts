const DB_NAME = "pedido-sugerido-tucuman";
const DB_VERSION = 1;
const STORE = "kv";

function abrirDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("El almacenamiento local no está disponible en este navegador."));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("No se pudo abrir el almacenamiento local."));
  });
}

export async function localGet<T>(key: string): Promise<T | null> {
  const db = await abrirDb();
  try {
    return await new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const request = tx.objectStore(STORE).get(key);
      request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
      request.onerror = () => reject(request.error ?? new Error("No se pudo leer el almacenamiento local."));
    });
  } finally {
    db.close();
  }
}

export async function localSet<T>(key: string, value: T): Promise<void> {
  const db = await abrirDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("No se pudo guardar en el almacenamiento local."));
      tx.onabort = () => reject(tx.error ?? new Error("No se pudo guardar en el almacenamiento local."));
    });
  } finally {
    db.close();
  }
}

export async function localRemove(key: string): Promise<void> {
  const db = await abrirDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("No se pudo borrar del almacenamiento local."));
      tx.onabort = () => reject(tx.error ?? new Error("No se pudo borrar del almacenamiento local."));
    });
  } finally {
    db.close();
  }
}
