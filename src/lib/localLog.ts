import { openDB, type IDBPDatabase } from 'idb'

const DB_NAME = 'life-pwa'
const STORE   = 'logs'

interface LocalLog {
  id?: number
  label: string
  start: number
  end?: number
}

let db: IDBPDatabase
export async function getDB() {
  if (!db) {
    db = await openDB(DB_NAME, 1, {
      upgrade(db) { db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true }) }
    })
  }
  return db
}

export const localLog = {
  async add(label: string) {
    const id = await (await getDB()).add(STORE, { label, start: Date.now() } as LocalLog)
    return id as number
  },
  async finish(id: number) {
    const tx = (await getDB()).transaction(STORE, 'readwrite')
    const log = await tx.store.get(id)
    if (!log.end) {
      log.end = Date.now()
      await tx.store.put(log)
    }
    await tx.done
  },
  async getAll() {
    return (await getDB()).getAll(STORE) as Promise<LocalLog[]>
  },
  async clear() {
    return (await getDB()).clear(STORE)
  }
}