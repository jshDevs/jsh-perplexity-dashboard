/**
 * idb.js — IndexedDB wrapper minimal (Promise-based)
 * Almacena datasets completos sin límite de 5MB de localStorage.
 * DB: jsh_local | Store: datasets
 */

const DB_NAME    = 'jsh_local'
const DB_VERSION = 1
const STORE      = 'datasets'

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = e => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'name' })
      }
    }
    req.onsuccess = e => resolve(e.target.result)
    req.onerror   = e => reject(e.target.error)
  })
}

export async function idbSave(dataset) {
  const db  = await openDB()
  const tx  = db.transaction(STORE, 'readwrite')
  tx.objectStore(STORE).put({
    name:      dataset.name,
    schema:    dataset.schema,
    rows:      dataset.rows,
    savedAt:   Date.now(),
  })
  return new Promise((res, rej) => {
    tx.oncomplete = () => res()
    tx.onerror    = e  => rej(e.target.error)
  })
}

export async function idbLoad(name) {
  const db  = await openDB()
  const tx  = db.transaction(STORE, 'readonly')
  const req = tx.objectStore(STORE).get(name)
  return new Promise((res, rej) => {
    req.onsuccess = e => res(e.target.result ?? null)
    req.onerror   = e => rej(e.target.error)
  })
}

export async function idbList() {
  const db  = await openDB()
  const tx  = db.transaction(STORE, 'readonly')
  const req = tx.objectStore(STORE).getAll()
  return new Promise((res, rej) => {
    req.onsuccess = e => res(e.target.result)
    req.onerror   = e => rej(e.target.error)
  })
}

export async function idbDelete(name) {
  const db  = await openDB()
  const tx  = db.transaction(STORE, 'readwrite')
  tx.objectStore(STORE).delete(name)
  return new Promise((res, rej) => {
    tx.oncomplete = () => res()
    tx.onerror    = e  => rej(e.target.error)
  })
}
