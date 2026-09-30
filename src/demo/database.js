import { deleteDB, openDB } from 'idb'
import { AppStartupError } from '@/app-mode/errors'
import { createDemoSeed, DEMO_SCHEMA_VERSION, DEMO_SEED_VERSION } from './seeds'

const DATABASE_NAME = 'podsc-demo'
const DATABASE_CHANNEL = 'podsc-demo-database'
const STORE_NAMES = Object.freeze(['scenarios', 'companies', 'users', 'pods', 'hosts', 'podModels', 'locations', 'bookings', 'podCommands'])
let databasePromise = null
let currentDatabase = null
let coordinationChannel = null

const startupError = (code, message, cause) => new AppStartupError(code, message, cause)

const withTimeout = (promise, milliseconds, code, message) => new Promise((resolve, reject) => {
  const timer = window.setTimeout(() => reject(startupError(code, message)), milliseconds)
  promise.then(
    value => {
      window.clearTimeout(timer)
      resolve(value)
    },
    error => {
      window.clearTimeout(timer)
      reject(error)
    }
  )
})

const mapDatabaseError = (error, fallbackCode) => {
  if (error instanceof AppStartupError) return error
  if (error?.name === 'QuotaExceededError') {
    return startupError('E_DEMO_QUOTA', 'Demo storage quota is exhausted', error)
  }
  return startupError(fallbackCode, 'Demo storage operation failed', error)
}

const closeCurrentDatabase = () => {
  const pendingDatabase = databasePromise
  databasePromise = null
  if (currentDatabase) currentDatabase.close()
  currentDatabase = null
  if (pendingDatabase) pendingDatabase.then(database => database.close()).catch(() => {})
}

const requestOtherTabsClose = reason => {
  coordinationChannel?.postMessage({ type: 'CLOSE_DATABASE', reason })
}

const bindDatabaseCoordination = () => {
  if (coordinationChannel || typeof BroadcastChannel === 'undefined') return
  coordinationChannel = new BroadcastChannel(DATABASE_CHANNEL)
  coordinationChannel.addEventListener('message', event => {
    if (event.data?.type === 'CLOSE_DATABASE') closeCurrentDatabase()
  })
}

const databaseEvent = name => {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(name))
}

const openDatabase = () => openDB(DATABASE_NAME, DEMO_SCHEMA_VERSION, {
  upgrade (upgradingDatabase) {
    if (!upgradingDatabase.objectStoreNames.contains('metadata')) upgradingDatabase.createObjectStore('metadata')
    STORE_NAMES.forEach(name => {
      if (!upgradingDatabase.objectStoreNames.contains(name)) upgradingDatabase.createObjectStore(name, { keyPath: name === 'scenarios' ? 'id' : 'uuid' })
    })
    if (!upgradingDatabase.objectStoreNames.contains('districts')) upgradingDatabase.createObjectStore('districts')
  },
  blocked () {
    requestOtherTabsClose('upgrade')
    databaseEvent('podsc-demo-database-blocked')
  },
  blocking () {
    closeCurrentDatabase()
    databaseEvent('podsc-demo-database-versionchange')
  },
  terminated () {
    currentDatabase = null
    databasePromise = null
    databaseEvent('podsc-demo-database-terminated')
  }
})

const seedDatabase = async database => {
  const currentVersion = await database.get('metadata', 'seedVersion')
  if (currentVersion === DEMO_SEED_VERSION) {
    const transaction = database.transaction('metadata', 'readwrite')
    const metadata = transaction.objectStore('metadata')
    await Promise.all([
      metadata.put(DEMO_SCHEMA_VERSION, 'schemaVersion'),
      metadata.put('ready', 'initializationState')
    ])
    await transaction.done
    return
  }

  const seed = createDemoSeed()
  const transaction = database.transaction(['metadata', 'districts', ...STORE_NAMES], 'readwrite')
  await Promise.all(STORE_NAMES.map(async name => {
    const store = transaction.objectStore(name)
    await store.clear()
    await Promise.all(seed[name].map(item => store.put(item)))
  }))
  const districtStore = transaction.objectStore('districts')
  await districtStore.clear()
  await Promise.all(Object.entries(seed.districts).map(([key, value]) => districtStore.put(value, key)))
  const metadata = transaction.objectStore('metadata')
  await Promise.all([
    metadata.put(DEMO_SCHEMA_VERSION, 'schemaVersion'),
    metadata.put(DEMO_SEED_VERSION, 'seedVersion'),
    metadata.put('ready', 'initializationState'),
    metadata.put({
      fromSeedVersion: currentVersion,
      toSeedVersion: DEMO_SEED_VERSION,
      completedAt: new Date().toISOString()
    }, 'lastMigration')
  ])
  await transaction.done
}

export async function initializeDemoDatabase () {
  if (typeof window === 'undefined' || !window.indexedDB) {
    throw startupError('E_DEMO_IDB_UNAVAILABLE', 'IndexedDB is not supported')
  }
  bindDatabaseCoordination()
  let database
  try {
    if (!databasePromise) {
      databasePromise = withTimeout(
        openDatabase(),
        10000,
        'E_DEMO_IDB_BLOCKED',
        'Demo storage is blocked by another browser tab'
      )
    }
    database = await databasePromise
    currentDatabase = database
  } catch (error) {
    databasePromise = null
    throw mapDatabaseError(error, 'E_DEMO_IDB_OPEN')
  }
  let currentSeedVersion = null
  try {
    currentSeedVersion = await database.get('metadata', 'seedVersion')
    await withTimeout(
      seedDatabase(database),
      10000,
      'E_DEMO_IDB_BLOCKED',
      'Demo data migration did not complete'
    )
    if (navigator.storage?.persist) navigator.storage.persist().catch(() => {})
    return database
  } catch (error) {
    closeCurrentDatabase()
    throw mapDatabaseError(error, currentSeedVersion == null ? 'E_DEMO_SEED' : 'E_DEMO_MIGRATION')
  }
}

export async function getDemoDatabase () {
  return initializeDemoDatabase()
}

export async function resetDemoDatabase () {
  bindDatabaseCoordination()
  requestOtherTabsClose('reset')
  closeCurrentDatabase()
  try {
    await withTimeout(
      deleteDB(DATABASE_NAME, {
        blocked () {
          requestOtherTabsClose('reset-blocked')
          databaseEvent('podsc-demo-database-blocked')
        }
      }),
      10000,
      'E_DEMO_IDB_BLOCKED',
      'Demo data reset is blocked by another browser tab'
    )
    return initializeDemoDatabase()
  } catch (error) {
    throw mapDatabaseError(error, 'E_DEMO_IDB_OPEN')
  }
}
