import { db } from '../lib/firebase';
import { GAMES } from '../constants';
import { collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, serverTimestamp, or, setDoc, QueryConstraint, onSnapshot, limit } from '../lib/firestore-compat';
import { Package, Order, Settings, OrderStatus, PaymentMethod, Banner, Service, Event, AccountListing, AccountOrder, AppNotification, WalletTransactionType, WalletTransactionStatus, WalletTransaction, Game } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function getAuthUser() {
  if (typeof localStorage !== 'undefined') {
    const userStr = localStorage.getItem('authUser');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (e) {
        return null;
      }
    }
  }
  return null;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const user = getAuthUser();
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: user?.id,
      email: user?.email,
      emailVerified: false,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const PACKAGES_COL = 'packages';
const ORDERS_COL = 'orders';
const SETTINGS_COL = 'settings';
const BANNERS_COL = 'banners';
const SERVICES_COL = 'services';
const GAMES_COL = 'games';
const EVENTS_COL = 'events';
const SERVICE_TEMPLATES_COL = 'serviceTemplates';
const ACCOUNTS_COL = 'accounts';
const ACCOUNT_ORDERS_COL = 'accountOrders';
const NOTIFICATIONS_COL = 'notifications';

export const mapDocData = <T>(doc: any): T => {
  const data = doc.data();
  let createdAt = 0;
  if (data.createdAt?.toDate) {
    createdAt = data.createdAt.toDate().getTime();
  } else if (data.createdAt?.seconds) {
    createdAt = data.createdAt.seconds * 1000;
  } else if (data.createdAt) {
    createdAt = new Date(data.createdAt).getTime();
  } else {
    createdAt = Date.now();
  }
  return { id: doc.id, ...data, createdAt } as unknown as T;
};

// --- Service Templates ---
export async function getServiceTemplates(serviceId: string, onlyActive = true): Promise<any[]> {
  const constraints: QueryConstraint[] = [where('serviceId', '==', serviceId)];
  if (onlyActive) constraints.push(where('isActive', '==', true));
  
  try {
    const q = query(collection(db, SERVICE_TEMPLATES_COL), ...constraints);
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => mapDocData<any>(doc));
    return data.sort((a: any, b: any) => b.createdAt - a.createdAt);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, SERVICE_TEMPLATES_COL);
    return [];
  }
}

export async function addServiceTemplate(data: Omit<any, 'id' | 'createdAt'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, SERVICE_TEMPLATES_COL), {
      ...data,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, SERVICE_TEMPLATES_COL);
    throw error;
  }
}

export async function updateServiceTemplate(id: string, data: Partial<any>): Promise<void> {
  try {
    await updateDoc(doc(db, SERVICE_TEMPLATES_COL, id), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${SERVICE_TEMPLATES_COL}/${id}`);
  }
}

export async function deleteServiceTemplate(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, SERVICE_TEMPLATES_COL, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${SERVICE_TEMPLATES_COL}/${id}`);
  }
}

// --- Services ---
export async function getServices(onlyActive = true): Promise<Service[]> {
  if (onlyActive && cache.services && isCacheValid(cache.services.timestamp)) {
    return cache.services.data;
  }

  if (onlyActive) {
    // Check localStorage if memory cache is empty
    const stored = getFromLocalStorage<Service[]>('services');
    if (stored && isCacheValid(stored.timestamp, 24 * 60 * 60 * 1000)) { // 24 hours for storage
      cache.services = stored;
      return stored.data;
    }
  }

  const constraints: QueryConstraint[] = [];
  if (onlyActive) constraints.push(where('isActive', '==', true));
  
  try {
    const q = query(collection(db, SERVICES_COL), ...constraints);
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => mapDocData<Service>(doc));
    const sorted = data.sort((a: any, b: any) => b.createdAt - a.createdAt);
    if (onlyActive) {
      cache.services = { data: sorted, timestamp: Date.now() };
      saveToLocalStorage('services', sorted);
    }
    return sorted;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, SERVICES_COL);
    return [];
  }
}

export async function getService(id: string): Promise<Service | null> {
  try {
    const docRef = doc(db, SERVICES_COL, id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    return mapDocData<Service>(snapshot);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${SERVICES_COL}/${id}`);
    return null;
  }
}

export async function addService(serviceData: Omit<Service, 'id' | 'createdAt'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, SERVICES_COL), {
      ...serviceData,
      createdAt: serverTimestamp()
    });
    cache.services = null;
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, SERVICES_COL);
    throw error;
  }
}

export async function updateService(id: string, serviceData: Partial<Service>): Promise<void> {
  try {
    await updateDoc(doc(db, SERVICES_COL, id), serviceData);
    cache.services = null;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${SERVICES_COL}/${id}`);
  }
}

export async function deleteService(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, SERVICES_COL, id));
    cache.services = null;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${SERVICES_COL}/${id}`);
  }
}

// --- Games ---
export async function getDBGames(onlyActive = true): Promise<Game[]> {
  const constraints: QueryConstraint[] = [];
  if (onlyActive) constraints.push(where('isActive', '==', true));
  
  try {
    const q = query(collection(db, GAMES_COL), ...constraints);
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => mapDocData<Game>(doc));
    return data.sort((a: any, b: any) => b.createdAt - a.createdAt);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, GAMES_COL);
    return [];
  }
}

export async function addGame(gameData: Omit<Game, 'id' | 'createdAt'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, GAMES_COL), {
      ...gameData,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, GAMES_COL);
    throw error;
  }
}

export async function updateGame(id: string, gameData: Partial<Game>): Promise<void> {
  try {
    await updateDoc(doc(db, GAMES_COL, id), gameData);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${GAMES_COL}/${id}`);
  }
}

export async function deleteGame(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, GAMES_COL, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${GAMES_COL}/${id}`);
  }
}

// --- Events ---
export async function getEvents(onlyActive = true): Promise<Event[]> {
  if (onlyActive && cache.events && isCacheValid(cache.events.timestamp)) {
    return cache.events.data;
  }

  if (onlyActive) {
    const stored = getFromLocalStorage<Event[]>('events');
    if (stored && isCacheValid(stored.timestamp, 24 * 60 * 60 * 1000)) {
      cache.events = stored;
      return stored.data;
    }
  }

  const constraints: QueryConstraint[] = [];
  if (onlyActive) constraints.push(where('isActive', '==', true));
  
  try {
    const q = query(collection(db, EVENTS_COL), ...constraints);
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => mapDocData<Event>(doc));
    const sorted = data.sort((a: any, b: any) => b.createdAt - a.createdAt);
    if (onlyActive) {
      cache.events = { data: sorted, timestamp: Date.now() };
      saveToLocalStorage('events', sorted);
    }
    return sorted;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, EVENTS_COL);
    return [];
  }
}

export async function addEvent(eventData: Omit<Event, 'id' | 'createdAt'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, EVENTS_COL), {
      ...eventData,
      createdAt: serverTimestamp()
    });
    cache.events = null;
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, EVENTS_COL);
    throw error;
  }
}

export async function updateEvent(id: string, eventData: Partial<Event>): Promise<void> {
  try {
    await updateDoc(doc(db, EVENTS_COL, id), eventData);
    cache.events = null;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${EVENTS_COL}/${id}`);
  }
}

export async function deleteEvent(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, EVENTS_COL, id));
    cache.events = null;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${EVENTS_COL}/${id}`);
  }
}

// --- Banners ---
export async function getBanners(onlyActive = true): Promise<Banner[]> {
  if (onlyActive && cache.banners && isCacheValid(cache.banners.timestamp)) {
    return cache.banners.data;
  }

  if (onlyActive) {
    const stored = getFromLocalStorage<Banner[]>('banners');
    if (stored && isCacheValid(stored.timestamp, 24 * 60 * 60 * 1000)) {
      cache.banners = stored;
      return stored.data;
    }
  }

  const constraints: QueryConstraint[] = [];
  if (onlyActive) constraints.push(where('isActive', '==', true));
  
  try {
    const q = query(collection(db, BANNERS_COL), ...constraints);
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => mapDocData<Banner>(doc));
    const sorted = data.sort((a, b) => (a.order || 0) - (b.order || 0));
    if (onlyActive) {
      cache.banners = { data: sorted, timestamp: Date.now() };
      saveToLocalStorage('banners', sorted);
    }
    return sorted;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, BANNERS_COL);
    return [];
  }
}

export async function addBanner(bannerData: Omit<Banner, 'id' | 'createdAt'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, BANNERS_COL), {
      ...bannerData,
      createdAt: serverTimestamp()
    });
    cache.banners = null;
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, BANNERS_COL);
    throw error;
  }
}

export async function updateBanner(id: string, bannerData: Partial<Banner>): Promise<void> {
  try {
    await updateDoc(doc(db, BANNERS_COL, id), bannerData);
    cache.banners = null;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${BANNERS_COL}/${id}`);
  }
}

export async function deleteBanner(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, BANNERS_COL, id));
    cache.banners = null;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${BANNERS_COL}/${id}`);
  }
}

// --- Cache Configuration ---
const CACHE_KEY_PREFIX = 'gr4d_cache_';
const cache = {
  packages: new Map<string, { data: Package[]; timestamp: number }>(),
  settings: null as { data: Settings; timestamp: number } | null,
  banners: null as { data: Banner[]; timestamp: number } | null,
  services: null as { data: Service[]; timestamp: number } | null,
  events: null as { data: Event[]; timestamp: number } | null,
};

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes for memory

function isCacheValid(timestamp: number, ttl = CACHE_TTL) {
  return Date.now() - timestamp < ttl;
}

function saveToLocalStorage(key: string, data: any) {
  try {
    localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.warn('LocalStorage save failed:', e);
  }
}

function getFromLocalStorage<T>(key: string): { data: T; timestamp: number } | null {
  try {
    const item = localStorage.getItem(CACHE_KEY_PREFIX + key);
    if (!item) return null;
    return JSON.parse(item);
  } catch (e) {
    return null;
  }
}

/**
 * Utility to pre-render or pre-fetch images as soon as possible in the background.
 */
export function preloadImage(url: string | undefined | null) {
  if (!url || typeof window === 'undefined') return;
  const img = new Image();
  img.src = url;
}

/**
 * Fetches all critical data for the home page in parallel to warm up the cache.
 */
export async function prewarmCache() {
  // Pre-load from localStorage first to memory
  const storedServices = getFromLocalStorage<Service[]>('services');
  if (storedServices) {
    cache.services = storedServices;
    storedServices.data?.forEach(s => preloadImage(s.imageUrl));
  }
  
  const storedBanners = getFromLocalStorage<Banner[]>('banners');
  if (storedBanners) {
    cache.banners = storedBanners;
    storedBanners.data?.forEach(b => preloadImage(b.imageUrl));
  }

  const storedEvents = getFromLocalStorage<Event[]>('events');
  if (storedEvents) {
    cache.events = storedEvents;
    storedEvents.data?.forEach(e => preloadImage(e.imageUrl));
  }

  const storedSettings = getFromLocalStorage<Settings>('settings');
  if (storedSettings) {
    cache.settings = storedSettings;
    if (storedSettings.data?.logoUrl) preloadImage(storedSettings.data.logoUrl);
    if (storedSettings.data?.heroBannerUrl) preloadImage(storedSettings.data.heroBannerUrl);
  }

  // Preload static game images early
  GAMES.forEach(game => {
    if (game.image) preloadImage(game.image);
  });

  try {
    const [packages, services, events, banners, settings] = await Promise.all([
      getPackages(true),
      getServices(true),
      getEvents(true),
      getBanners(true),
      getSettings()
    ]);

    // Preload freshly fetched image assets in the background
    if (settings) {
      if (settings.logoUrl) preloadImage(settings.logoUrl);
      if (settings.heroBannerUrl) preloadImage(settings.heroBannerUrl);
    }
    if (banners) {
      banners.forEach(b => preloadImage(b.imageUrl));
    }
    if (events) {
      events.forEach(e => preloadImage(e.imageUrl));
    }
    if (services) {
      services.forEach(s => preloadImage(s.imageUrl));
    }
    if (packages) {
      packages.slice(0, 10).forEach(p => preloadImage(p.imageUrl)); // prefetch first 10 package images
    }
  } catch (error) {
    console.warn('Cache prewarm partial failure:', error);
  }
}

// --- Settings ---
export function clearSettingsCache() {
  cache.settings = null;
}

export async function getSettings(): Promise<Settings | null> {
  if (cache.settings && isCacheValid(cache.settings.timestamp)) {
    return cache.settings.data;
  }

  const stored = getFromLocalStorage<Settings>('settings');
  if (stored && isCacheValid(stored.timestamp, 24 * 60 * 60 * 1000)) {
    cache.settings = stored;
    return stored.data;
  }

  try {
    const docRef = doc(db, SETTINGS_COL, 'config');
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    const data = { ...snapshot.data() } as Settings;
    cache.settings = { data, timestamp: Date.now() };
    saveToLocalStorage('settings', data);
    return data;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${SETTINGS_COL}/config`);
    return null;
  }
}

export async function updateSettings(settings: Settings): Promise<void> {
  try {
    await setDoc(doc(db, SETTINGS_COL, 'config'), settings);
    cache.settings = null; // Invalidate cache
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${SETTINGS_COL}/config`);
  }
}

// --- Packages ---
export async function getPackages(onlyActive = true, gameId?: string): Promise<Package[]> {
  const cacheKey = `${onlyActive}-${gameId || 'all'}`;
  const cached = cache.packages.get(cacheKey);
  
  if (cached && isCacheValid(cached.timestamp)) {
    return cached.data;
  }

  const stored = getFromLocalStorage<Package[]>(`packages_${cacheKey}`);
  if (stored && isCacheValid(stored.timestamp, 24 * 60 * 60 * 1000)) {
    cache.packages.set(cacheKey, stored);
    return stored.data;
  }

  const constraints: QueryConstraint[] = [];
  if (onlyActive) constraints.push(where('isActive', '==', true));
  if (gameId) constraints.push(where('gameId', '==', gameId));
  
  try {
    const q = query(collection(db, PACKAGES_COL), ...constraints);
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => mapDocData<Package>(doc));
    const sortedData = data.sort((a: any, b: any) => b.createdAt - a.createdAt);
    
    cache.packages.set(cacheKey, { data: sortedData, timestamp: Date.now() });
    saveToLocalStorage(`packages_${cacheKey}`, sortedData);
    return sortedData;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, PACKAGES_COL);
    return [];
  }
}

export async function addPackage(pkg: Omit<Package, 'id'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, PACKAGES_COL), {
      ...pkg,
      createdAt: serverTimestamp()
    });
    invalidatePackagesCache();
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, PACKAGES_COL);
    throw error;
  }
}

export async function updatePackage(id: string, pkg: Partial<Package>): Promise<void> {
  try {
    await updateDoc(doc(db, PACKAGES_COL, id), pkg);
    invalidatePackagesCache();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${PACKAGES_COL}/${id}`);
  }
}

export async function deletePackage(id: string): Promise<void> {
  try {
    const q = query(collection(db, ORDERS_COL), where('packageId', '==', id));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      throw new Error("Cannot delete package: Orders exist for this package.");
    }
    await deleteDoc(doc(db, PACKAGES_COL, id));
    invalidatePackagesCache();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${PACKAGES_COL}/${id}`);
  }
}

function invalidatePackagesCache() {
  cache.packages.clear();
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(CACHE_KEY_PREFIX + 'packages_')) {
            keysToRemove.push(k);
        }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch(e) {}
}

// --- Garena Shell Stock Functions ---
export function isPubgOrder(packageName: string, gameId?: string, gameName?: string): boolean {
  const normPkg = (packageName || '').toLowerCase();
  const normGameId = (gameId || '').toLowerCase();
  const normGameName = (gameName || '').toLowerCase();
  return (
    normPkg.includes('pubg') || 
    normGameId.includes('pubg') || 
    normGameName.includes('pubg')
  );
}

export function getShellsForPackage(packageName: string, diamonds?: number): number {
  if (isPubgOrder(packageName)) {
    return 0;
  }

  let totalShells = 0;

  // Extract part after colon if prefix game name is present (e.g. "Free Fire: Weekly Lite (x2)")
  let stripped = packageName;
  const colonIndex = packageName.indexOf(':');
  if (colonIndex !== -1) {
    stripped = packageName.substring(colonIndex + 1);
  }

  // Split by comma in case of multi-package orders
  const parts = stripped.split(',');

  for (const rawPart of parts) {
    let part = rawPart.toLowerCase().trim();
    if (!part) continue;

    // Detect quantity multiplier e.g. "Weekly Lite (x2)" or "weekly lite x2" or "weekly lite (x 10)"
    const qtyRegex = /[\s(]*x\s*(\d+)\s*\)?$/i;
    const match = part.match(qtyRegex);
    let qty = 1;
    let baseName = part;
    if (match) {
      qty = parseInt(match[1], 10);
      baseName = part.replace(qtyRegex, '').trim();
    }

    let itemShells = 0;

    // Direct string match against all known dictionary items from user's list
    if (baseName.includes('weekly lite x 10') || baseName.includes('weekly lite x10')) {
      itemShells = 180;
    } else if (baseName.includes('weekly lite x 8') || baseName.includes('weekly lite x8')) {
      itemShells = 144;
    } else if (baseName.includes('weekly lite x 5') || baseName.includes('weekly lite x5')) {
      itemShells = 90;
    } else if (baseName.includes('weekly lite x 3') || baseName.includes('weekly lite x3')) {
      itemShells = 54;
    } else if (baseName.includes('weekly lite')) {
      itemShells = 18;
    } else if (baseName.includes('weekly x 10') || baseName.includes('weekly x10')) {
      itemShells = 860;
    } else if (baseName.includes('weekly x 8') || baseName.includes('weekly x8')) {
      itemShells = 688;
    } else if (baseName.includes('weekly x 5') || baseName.includes('weekly x5')) {
      itemShells = 430;
    } else if (baseName.includes('weekly x 3') || baseName.includes('weekly x3')) {
      itemShells = 258;
    } else if (baseName.includes('weekly max') || baseName.includes('wekkly max')) {
      itemShells = 104;
    } else if (baseName.includes('weekly')) {
      itemShells = 86;
    } else if (baseName.includes('monthly x 10') || baseName.includes('monthly x10')) {
      itemShells = 4300;
    } else if (baseName.includes('monthly x 8') || baseName.includes('monthly x8')) {
      itemShells = 3440;
    } else if (baseName.includes('monthly x 5') || baseName.includes('monthly x5')) {
      itemShells = 2150;
    } else if (baseName.includes('monthly x 3') || baseName.includes('monthly x3')) {
      itemShells = 1290;
    } else if (baseName.includes('monthly')) {
      itemShells = 430;
    } else if (baseName.includes('evo30') || baseName.includes('evo 30')) {
      itemShells = 135;
    } else if (baseName.includes('evo7') || baseName.includes('evo 7')) {
      itemShells = 45;
    } else if (baseName.includes('evo3') || baseName.includes('evo 3')) {
      itemShells = 30;
    } else if (baseName.includes('level30') || baseName.includes('level 30')) {
      itemShells = 50;
    } else if (baseName.includes('level25') || baseName.includes('level 25')) {
      itemShells = 34;
    } else if (baseName.includes('level20') || baseName.includes('level 20')) {
      itemShells = 34;
    } else if (baseName.includes('level15') || baseName.includes('level 15')) {
      itemShells = 34;
    } else if (baseName.includes('level10') || baseName.includes('level 10')) {
      itemShells = 34;
    } else if (baseName.includes('level6') || baseName.includes('level 6')) {
      itemShells = 16;
    } else if (baseName.includes('all level up pass') || baseName.includes('level up pass')) {
      itemShells = 202;
    } else if (baseName.includes('better buddy s vip') || baseName.includes('better buddy s-vip')) {
      itemShells = 156;
    } else if (baseName.includes('better buddy vip')) {
      itemShells = 122;
    } else if (baseName.includes('s vip pack') || baseName.includes('s-vip')) {
      itemShells = 2774;
    } else if (baseName.includes('vip pack') || baseName.includes('vip')) {
      itemShells = 2516;
    } else if (baseName.includes('all in one pack') || baseName.includes('all in one')) {
      itemShells = 2534;
    } else {
      // Find numeric values if any
      const regex = /(\d+[\d,\s]*)/g;
      const matches = baseName.match(regex);
      let matchedNumber = 0;
      if (matches) {
        for (const m of matches) {
          const num = parseInt(m.replace(/[\s,]/g, ''), 10);
          if (num > 0) {
            matchedNumber = num;
            break;
          }
        }
      }

      const targetDiamonds = matchedNumber || diamonds || 0;
      if (targetDiamonds === 25) itemShells = 13;
      else if (targetDiamonds === 100) itemShells = 50;
      else if (targetDiamonds === 310) itemShells = 152;
      else if (targetDiamonds === 520) itemShells = 254;
      else if (targetDiamonds === 1060) itemShells = 500;
      else if (targetDiamonds === 2180) itemShells = 1010;
      else if (targetDiamonds === 5600) itemShells = 2500;
      else if (targetDiamonds === 11500) itemShells = 5150;
      else if (targetDiamonds > 0) {
        itemShells = Math.ceil(targetDiamonds * 0.48);
      }
    }

    totalShells += itemShells * qty;
  }

  return totalShells;
}

export async function getActiveShellStock(): Promise<{ totalAvailable: number; stocks: any[] }> {
  try {
    const q = query(collection(db, 'shell_stock'), where('isActive', '==', true));
    const snap = await getDocs(q);
    const stocks = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    const totalAvailable = stocks.reduce((sum, s) => sum + (Number(s.availableBalance) || 0), 0);
    return { totalAvailable, stocks };
  } catch (err) {
    console.warn("Failed to query active shell stock:", err);
    return { totalAvailable: 99999, stocks: [] };
  }
}

export async function deductShellStock(shellsToDeduct: number): Promise<void> {
  if (shellsToDeduct <= 0) return;
  const { stocks } = await getActiveShellStock();
  stocks.sort((a, b) => a.createdAt - b.createdAt);
  
  let remainingNeed = shellsToDeduct;
  for (const stock of stocks) {
    if (remainingNeed <= 0) break;
    const available = Number(stock.availableBalance) || 0;
    const used = Number(stock.usedBalance) || 0;
    
    if (available > 0) {
      const deduction = Math.min(available, remainingNeed);
      const newAvailable = available - deduction;
      const newUsed = used + deduction;
      
      await updateDoc(doc(db, 'shell_stock', stock.id), {
        availableBalance: newAvailable,
        usedBalance: newUsed
      });
      
      remainingNeed -= deduction;
    }
  }
}

export async function refundShellStock(shellsToRefund: number): Promise<void> {
  if (shellsToRefund <= 0) return;
  const { stocks } = await getActiveShellStock();
  // Refund to the latest stock first (LIFO) or just the first one. Let's use FIFO for consistency.
  stocks.sort((a, b) => b.createdAt - a.createdAt); // Latest first for refunding
  
  let remainingRefund = shellsToRefund;
  for (const stock of stocks) {
    if (remainingRefund <= 0) break;
    const available = Number(stock.availableBalance) || 0;
    const used = Number(stock.usedBalance) || 0;
    
    if (used > 0) {
      const refund = Math.min(used, remainingRefund);
      const newAvailable = available + refund;
      const newUsed = used - refund;
      
      await updateDoc(doc(db, 'shell_stock', stock.id), {
        availableBalance: newAvailable,
        usedBalance: newUsed
      });
      
      remainingRefund -= refund;
    }
  }
}

// --- Customers & Leaderboard ---
export async function getTopSpenders(limitCount = 3): Promise<any[]> {
  try {
    const q = query(
      collection(db, 'customers'),
      orderBy('loyaltyPoints', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => mapDocData<any>(doc));
  } catch (error) {
    console.warn('Failed to fetch top spenders:', error);
    return [];
  }
}

// --- Orders ---
// --- Notifications ---
async function notifyOrderServerSide(data: { orderId: string; customerName: string; packageName: string; amount: number; type: 'PACKAGE' | 'ACCOUNT' }) {
  try {
    await fetch('/api/notify-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  } catch (error) {
    console.warn('Failed to call server-side notification:', error);
  }
}

export async function createOrder(order: Omit<Order, 'id' | 'createdAt' | 'status'> & { gameId?: string; gameName?: string }): Promise<string> {
  const initialStatus = OrderStatus.PENDING;
  
  // Validate order data before sending to Firestore
  if (!order.packageName || !order.customerName || !order.customerPhone || order.amount === undefined) {
    throw new Error('Missing required order fields. Please fill in all details.');
  }

  // Check required Garena Shell stock unless it is a PUBG order
  let shellsDeductedAtCreation = false;
  const isPubg = isPubgOrder(order.packageName, order.gameId, order.gameName);
  if (!isPubg) {
    const requiredShells = getShellsForPackage(order.packageName, order.diamonds);
    if (requiredShells > 0) {
      const { totalAvailable } = await getActiveShellStock();
      if (totalAvailable < requiredShells) {
        throw new Error(`Order Placement Blocked: Garena Shell stock is currently depleted for this package. Required: ${requiredShells} Shells, but only ${totalAvailable} available. Please retry later or contact support.`);
      }
      // Deduct immediately on placement
      await deductShellStock(requiredShells);
      shellsDeductedAtCreation = true;
    }
  }

  // STRICT ENFORCEMENT: Manual payments MUST have proof URL
  if ((order.paymentMethod === PaymentMethod.BANK || order.paymentMethod === PaymentMethod.EZ_CASH || order.paymentMethod === PaymentMethod.BINANCE) && !order.paymentProofUrl) {
    throw new Error('Payment proof screenshot is required for Bank Transfer, eZ Cash, and Binance payments.');
  }

  // Deduct Wallet points immediately if WALLET payment method is used
  if (order.paymentMethod === PaymentMethod.WALLET) {
    try {
      const user = getAuthUser();
      const uid = user?.id;
      if (!uid) {
        throw new Error('You must be signed in to use your Redeem Wallet.');
      }
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const currentPoints = Number(userData.loyaltyPoints) || 0;
        const walletBalanceLkr = currentPoints * 0.000002;
        if (walletBalanceLkr < order.amount) {
          throw new Error(`Insufficient Redeem Wallet balance. You need LKR ${order.amount.toLocaleString()} but only have LKR ${walletBalanceLkr.toLocaleString()}`);
        }
        // Deduct points
        const pointsToDeduct = order.amount / 0.000002;
        const remainingPoints = currentPoints - pointsToDeduct;
        await updateDoc(userRef, { loyaltyPoints: remainingPoints });

        // Sync with CRM customers collection
        try {
          const customersCol = collection(db, 'customers');
          const userEmail = userData.email || user?.email;
          if (userEmail) {
            const custSnap = await getDocs(query(customersCol, where('email', '==', userEmail)));
            if (!custSnap.empty) {
              const custDoc = custSnap.docs[0];
              await updateDoc(doc(db, 'customers', custDoc.id), { loyaltyPoints: remainingPoints });
            }
          }
        } catch (crmErr) {
          console.warn("Could not sync wallet balance with customers collection:", crmErr);
        }
      } else {
        throw new Error('User profile not found. Unable to authenticate Redeem Wallet.');
      }
    } catch (err: any) {
      throw new Error(err.message || 'Redeem Wallet transaction failed.');
    }
  }

  try {
    const user = getAuthUser();
    const orderData = {
      ...order,
      status: initialStatus,
      diamonds: (order.diamonds !== undefined && !isNaN(Number(order.diamonds))) ? Number(order.diamonds) : 0,
      createdAt: serverTimestamp(),
      authUid: user?.id || null,
      shellsDeducted: shellsDeductedAtCreation
    };

    console.log('Finalizing order submission to Firestore...', { ...orderData, createdAt: 'SERVER_TIMESTAMP' });
    
    console.log('--- DB.TS: Attempting addDoc to', ORDERS_COL, '---');
    console.log('Data:', JSON.stringify(orderData));
    const docRef = await addDoc(collection(db, ORDERS_COL), orderData);
    console.log('--- DB.TS: addDoc successful. Order ID:', docRef.id, '---');

    // Create notification for admin
    try {
      await createNotification({
        title: 'New Order Received',
        message: `A new order for ${order.diamonds || 0} diamonds has been placed by ${order.customerName}.`,
        type: 'info',
        target: 'admin'
      });
    } catch (nError) {
      console.warn('Failed to create notification:', nError);
    }

    // Server-side notify (email)
    notifyOrderServerSide({
      orderId: docRef.id,
      customerName: order.customerName,
      packageName: order.packageName,
      amount: order.amount,
      type: 'PACKAGE'
    });

    console.log('--- DB.TS: returning docRef.id', docRef.id, '---');
    return docRef.id;
  } catch (error) {
    console.error('--- DB.TS: Error in createOrder ---', error);
    handleFirestoreError(error, OperationType.CREATE, ORDERS_COL);
    throw error;
  }
}

export async function getOrder(id: string): Promise<Order | null> {
  try {
    const docRef = doc(db, ORDERS_COL, id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    return mapDocData<Order>(snapshot);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${ORDERS_COL}/${id}`);
    return null;
  }
}

export async function getUserOrders(identifier: string): Promise<Order[]> {
  const q = query(
    collection(db, ORDERS_COL),
    or(where('userId', '==', identifier), where('customerPhone', '==', identifier))
  );
  try {
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => mapDocData<Order>(doc));
    return data.sort((a: any, b: any) => b.createdAt - a.createdAt);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, ORDERS_COL);
    return [];
  }
}

export async function getOrders(statusFilter?: string): Promise<Order[]> {
  const constraints: QueryConstraint[] = [];
  if (statusFilter && statusFilter !== 'all') {
    constraints.push(where('status', '==', statusFilter));
  }
  try {
    const q = query(collection(db, ORDERS_COL), ...constraints);
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => mapDocData<Order>(doc));
    return data.sort((a: any, b: any) => b.createdAt - a.createdAt);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, ORDERS_COL);
    return [];
  }
}

export async function updateOrderStatus(id: string, status: OrderStatus, adminNotes?: string): Promise<void> {
  try {
    const orderRef = doc(db, ORDERS_COL, id);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) {
      throw new Error(`Order ${id} not found`);
    }
    const orderData = orderSnap.data() || {};

    // Deduct shells if status is COMPLETED and not already deducted
    if (status === OrderStatus.COMPLETED && !orderData.shellsDeducted) {
      const isPubg = isPubgOrder(orderData.packageName, orderData.gameId, orderData.gameName);
      if (!isPubg) {
        const requiredShells = getShellsForPackage(orderData.packageName, orderData.diamonds);
        if (requiredShells > 0) {
          const { totalAvailable } = await getActiveShellStock();
          if (totalAvailable < requiredShells) {
            throw new Error(`Insufficient Garena Shell Stock on active accounts. Required: ${requiredShells}, Available: ${totalAvailable}. Replenishment needed!`);
          }
          await deductShellStock(requiredShells);
          await updateDoc(orderRef, { shellsDeducted: true });
        }
      }
    }

    const updateData: any = { status };
    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes;
    }
    await updateDoc(orderRef, updateData);

    // Refund shells if canceled and they were deducted
    if (status === OrderStatus.CANCELED && orderData.shellsDeducted) {
      const requiredShells = getShellsForPackage(orderData.packageName, orderData.diamonds);
      if (requiredShells > 0) {
        await refundShellStock(requiredShells);
        await updateDoc(orderRef, { shellsDeducted: false });
      }
    }

    // sync totalSpent in customers on COMPLETED status
    if (status === OrderStatus.COMPLETED) {
      try {
        const diamondsCount = orderData.diamonds || 0;
        const amount = Number(orderData.amount) || 0;
        
        // Sync with CRM customers collection
        const customersCol = collection(db, 'customers');
        const userEmail = orderData.email || orderData.customerEmail;
        const authUid = orderData.authUid;
        
        if (authUid || userEmail) {
          let custDocRef = authUid ? doc(db, 'customers', authUid) : null;
          let custSnap = custDocRef ? await getDoc(custDocRef) : null;
          
          if (!custSnap?.exists() && userEmail) {
            const emailQuery = query(customersCol, where('email', '==', userEmail));
            const emailSnap = await getDocs(emailQuery);
            if (!emailSnap.empty) {
              custDocRef = doc(db, 'customers', emailSnap.docs[0].id);
              custSnap = emailSnap.docs[0];
            }
          }
          
          if (custDocRef && custSnap?.exists()) {
            const currentTotalSpent = Number(custSnap.data().totalSpent) || 0;
            await updateDoc(custDocRef, { totalSpent: currentTotalSpent + amount });
          }
        }
      } catch (spentErr) {
        console.warn("Could not sync totalSpent with customers collection:", spentErr);
      }
    }

    // Try awarding loyalty points on COMPLETED status
    if (status === OrderStatus.COMPLETED) {
      try {
        if (orderData && !orderData.pointsCredited && orderData.authUid) {
          const userRef = doc(db, 'users', orderData.authUid);
          const userSnap = await getDoc(userRef);
          
          const diamondsCount = orderData.diamonds || 0;
          const pointsEarned = Math.floor(diamondsCount / 10);
            
            if (pointsEarned > 0) {
              let currentPoints = 0;
              if (userSnap.exists()) {
                currentPoints = userSnap.data().loyaltyPoints || 0;
              }
              const newPoints = currentPoints + pointsEarned;
              
              // Update user doc
              await updateDoc(userRef, { loyaltyPoints: newPoints });
              
              // Update order to mark points as credited
              await updateDoc(orderRef, { 
                pointsCredited: true, 
                pointsEarned 
              });
              
              // Sync with CRM customers collection
              try {
                const customersCol = collection(db, 'customers');
                const userEmail = orderData.email || (userSnap.exists() ? userSnap.data().email : '');
                if (userEmail) {
                  const custSnap = await getDocs(query(customersCol, where('email', '==', userEmail)));
                  if (!custSnap.empty) {
                    const custDoc = custSnap.docs[0];
                    const custPoints = custDoc.data().loyaltyPoints || 0;
                    await updateDoc(doc(db, 'customers', custDoc.id), { loyaltyPoints: custPoints + pointsEarned });
                  }
                }
              } catch (crmErr) {
                console.warn("Could not sync earned points with customers CRM collection:", crmErr);
              }
            }
          }
        } catch (err) {
        console.warn("Error awarding loyalty points on order completion:", err);
      }
    }

    // Create notification for all if completed/confirmed
    if (status === OrderStatus.COMPLETED || status === OrderStatus.CONFIRMED) {
      await createNotification({
        title: `Order #${id.slice(-6)} ${status.toUpperCase()}`,
        message: status === OrderStatus.COMPLETED 
          ? `Order for ${id.slice(-6)} has been successfully delivered!` 
          : `Payment for Order #${id.slice(-6)} has been confirmed.`,
        type: status === OrderStatus.COMPLETED ? 'success' : 'info',
        target: 'all'
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${ORDERS_COL}/${id}`);
  }
}

export async function updateOrderAmount(id: string, amount: number): Promise<void> {
  try {
    await updateDoc(doc(db, ORDERS_COL, id), { amount });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${ORDERS_COL}/${id}`);
  }
}

export async function uploadOrderProof(id: string, proofUrl: string): Promise<void> {
  try {
    await updateDoc(doc(db, ORDERS_COL, id), { 
      paymentProofUrl: proofUrl,
      proofSubmittedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${ORDERS_COL}/${id}`);
  }
}

// --- Account Listings ---
export async function getAccountListings(onlyActive = true, includeSold = false): Promise<AccountListing[]> {
  const constraints: QueryConstraint[] = [];
  if (onlyActive) constraints.push(where('isActive', '==', true));
  if (!includeSold) constraints.push(where('isSold', '==', false));
  
  try {
    const q = query(collection(db, ACCOUNTS_COL), ...constraints);
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => mapDocData<AccountListing>(doc));
    return data.sort((a: any, b: any) => b.createdAt - a.createdAt);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, ACCOUNTS_COL);
    return [];
  }
}

export async function getAccountListing(id: string): Promise<AccountListing | null> {
  try {
    const docRef = doc(db, ACCOUNTS_COL, id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    return mapDocData<AccountListing>(snapshot);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${ACCOUNTS_COL}/${id}`);
    return null;
  }
}

export async function addAccountListing(data: Omit<AccountListing, 'id' | 'createdAt'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, ACCOUNTS_COL), {
      ...data,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, ACCOUNTS_COL);
    throw error;
  }
}

export async function updateAccountListing(id: string, data: Partial<AccountListing>): Promise<void> {
  try {
    await updateDoc(doc(db, ACCOUNTS_COL, id), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${ACCOUNTS_COL}/${id}`);
  }
}

export async function deleteAccountListing(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, ACCOUNTS_COL, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${ACCOUNTS_COL}/${id}`);
  }
}

// --- Account Orders ---
export async function createAccountOrder(order: Omit<AccountOrder, 'id' | 'createdAt' | 'status'>): Promise<string> {
  const initialStatus = OrderStatus.PENDING;
  
  // STRICT ENFORCEMENT: Manual payments MUST have proof URL
  if ((order.paymentMethod === PaymentMethod.BANK || order.paymentMethod === PaymentMethod.EZ_CASH || order.paymentMethod === PaymentMethod.BINANCE) && !order.paymentProofUrl) {
    throw new Error('Payment proof screenshot is required for account purchases via Bank, eZ Cash, or Binance.');
  }

  // Deduct Wallet points immediately if WALLET payment method is used
  if (order.paymentMethod === PaymentMethod.WALLET) {
    try {
      const user = getAuthUser();
      const uid = user?.id;
      if (!uid) {
        throw new Error('You must be signed in to use your Redeem Wallet.');
      }
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const currentPoints = Number(userData.loyaltyPoints) || 0;
        const walletBalanceLkr = currentPoints * 0.000002;
        if (walletBalanceLkr < order.amount) {
          throw new Error(`Insufficient Redeem Wallet balance. You need LKR ${order.amount.toLocaleString()} but only have LKR ${walletBalanceLkr.toLocaleString()}`);
        }
        // Deduct points
        const pointsToDeduct = order.amount / 0.000002;
        const remainingPoints = currentPoints - pointsToDeduct;
        await updateDoc(userRef, { loyaltyPoints: remainingPoints });

        // Sync with CRM customers collection
        try {
          const customersCol = collection(db, 'customers');
          const userEmail = userData.email || user?.email;
          if (userEmail) {
            const custSnap = await getDocs(query(customersCol, where('email', '==', userEmail)));
            if (!custSnap.empty) {
              const custDoc = custSnap.docs[0];
              await updateDoc(doc(db, 'customers', custDoc.id), { loyaltyPoints: remainingPoints });
            }
          }
        } catch (crmErr) {
          console.warn("Could not sync wallet balance with customers collection:", crmErr);
        }
      } else {
        throw new Error('User profile not found. Unable to authenticate Redeem Wallet.');
      }
    } catch (err: any) {
      throw new Error(err.message || 'Redeem Wallet transaction failed.');
    }
  }

  try {
    const user = getAuthUser();
    const docRef = await addDoc(collection(db, ACCOUNT_ORDERS_COL), {
      ...order,
      status: initialStatus,
      createdAt: serverTimestamp(),
      authUid: user?.id || null
    });
    
    // Mark account as sold immediately
    try {
      await updateDoc(doc(db, ACCOUNTS_COL, order.accountId), { isSold: true });
    } catch (e) {
      console.warn("Could not mark account as sold, firestore rules may not be deployed:", e);
    }
    
    // Create notification for admin
    try {
      await createNotification({
        title: 'New Account Purchase',
        message: `${order.customerName} just purchased account: ${order.accountTitle}.`,
        type: 'info',
        target: 'admin'
      });
    } catch (nError) {
      console.warn('Failed to create notification:', nError);
    }

    // Server-side notify (email)
    notifyOrderServerSide({
      orderId: docRef.id,
      customerName: order.customerName,
      packageName: order.accountTitle,
      amount: order.amount,
      type: 'ACCOUNT'
    });

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, ACCOUNT_ORDERS_COL);
    throw error;
  }
}

export async function getAccountOrders(statusFilter?: string): Promise<AccountOrder[]> {
  const constraints: QueryConstraint[] = [];
  if (statusFilter && statusFilter !== 'all') {
    constraints.push(where('status', '==', statusFilter));
  }
  try {
    const q = query(collection(db, ACCOUNT_ORDERS_COL), ...constraints);
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => mapDocData<AccountOrder>(doc));
    return data.sort((a: any, b: any) => b.createdAt - a.createdAt);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, ACCOUNT_ORDERS_COL);
    return [];
  }
}

export async function updateAccountOrderStatus(id: string, status: OrderStatus): Promise<void> {
  try {
    await updateDoc(doc(db, ACCOUNT_ORDERS_COL, id), { status });

    if (status === OrderStatus.COMPLETED || status === OrderStatus.CONFIRMED) {
      await createNotification({
        title: `Account Order ${status.toUpperCase()}`,
        message: status === OrderStatus.COMPLETED 
          ? `An account purchase has been completed successfully.` 
          : `An account purchase payment has been confirmed.`,
        type: status === OrderStatus.COMPLETED ? 'success' : 'info',
        target: 'all'
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${ACCOUNT_ORDERS_COL}/${id}`);
  }
}

// --- Notifications ---
export async function createNotification(data: Omit<AppNotification, 'id' | 'createdAt'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, NOTIFICATIONS_COL), {
      ...data,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, NOTIFICATIONS_COL);
    throw error;
  }
}

export function listenNotifications(callback: (notifications: AppNotification[]) => void, target: 'admin' | 'all' = 'all') {
  // Fetch recent notifications without the 'where' clause to avoid composite index requirement
  // We'll filter by target in memory since we only need the latest few
  const q = query(
    collection(db, NOTIFICATIONS_COL),
    orderBy('createdAt', 'desc'),
    limit(20)
  );

  return onSnapshot(q, (snapshot) => {
    const allNotifications = snapshot.docs.map(doc => mapDocData<AppNotification>(doc));
    const filtered = allNotifications
      .filter(n => n.target === target)
      .slice(0, 5);
    callback(filtered);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, NOTIFICATIONS_COL);
  });
}

// --- Wallet System Collections & Helper Functions ---
const WALLET_TRANS_COL = 'walletTransactions';

export async function createWalletTransaction(transaction: Omit<WalletTransaction, 'id' | 'createdAt'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, WALLET_TRANS_COL), {
      ...transaction,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, WALLET_TRANS_COL);
    throw error;
  }
}

export async function getWalletTransactions(userId?: string): Promise<WalletTransaction[]> {
  try {
    const constraints: QueryConstraint[] = [];
    if (userId) {
      constraints.push(where('userId', '==', userId));
    }
    const q = query(
      collection(db, WALLET_TRANS_COL),
      ...constraints,
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => mapDocData<WalletTransaction>(doc));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, WALLET_TRANS_COL);
    return [];
  }
}

export async function updateWalletTransactionStatus(id: string, status: WalletTransactionStatus, adminNotes?: string): Promise<void> {
  try {
    const txRef = doc(db, WALLET_TRANS_COL, id);
    const txSnap = await getDoc(txRef);
    if (!txSnap.exists()) {
      throw new Error('Transaction not found');
    }
    const txData = txSnap.data();
    const oldStatus = txData.status;

    // Only allow approving pending transactions to prevent double-crediting
    if (status === WalletTransactionStatus.APPROVED && oldStatus === WalletTransactionStatus.PENDING) {
      const { userId, amount, type, customerName, customerPhone } = txData;
      if (type === WalletTransactionType.TOPUP || type === WalletTransactionType.MANUAL) {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        
        let currentPoints = 0;
        let userEmail = '';
        let resolvedName = customerName || 'Gamer';
        let resolvedPhone = customerPhone || '';

        if (userSnap.exists()) {
          const userData = userSnap.data();
          currentPoints = Number(userData.loyaltyPoints) || 0;
          userEmail = userData.email || '';
          if (userData.customerName) resolvedName = userData.customerName;
          if (userData.whatsappNumber) resolvedPhone = userData.whatsappNumber;
        } else {
          // Try to fetch from customers collection to see if they exist there
          const customerRef = doc(db, 'customers', userId);
          const customerSnap = await getDoc(customerRef);
          if (customerSnap.exists()) {
            const custData = customerSnap.data();
            currentPoints = Number(custData.loyaltyPoints) || 0;
            userEmail = custData.email || '';
            resolvedName = custData.customerName || 'Gamer';
            resolvedPhone = custData.whatsappNumber || '';
          }
        }

        // Ensure both currentPoints and amount are treated as numbers
        const numericAmount = Number(amount) || 0;
        // In topup scenarios, amount is LKR, we need to convert it to points (1 LKR = 500,000 points)
        const pointsToAdd = numericAmount / 0.000002;
        const newPoints = currentPoints + pointsToAdd;
        
        // Save to users collection (merge: true so it creates the document if missing)
        await setDoc(userRef, { 
          loyaltyPoints: newPoints,
          customerName: resolvedName,
          whatsappNumber: resolvedPhone,
          email: userEmail
        }, { merge: true });

        // Sync with CRM customers
        try {
          const custByIdRef = doc(db, 'customers', userId);
          const custByIdSnap = await getDoc(custByIdRef);
          
          if (custByIdSnap.exists()) {
            await updateDoc(custByIdRef, { loyaltyPoints: newPoints });
          } else {
            let foundByEmail = false;
            if (userEmail) {
              const customersCol = collection(db, 'customers');
              const custByEmailSnap = await getDocs(query(customersCol, where('email', '==', userEmail)));
              if (!custByEmailSnap.empty) {
                await updateDoc(doc(db, 'customers', custByEmailSnap.docs[0].id), { loyaltyPoints: newPoints });
                foundByEmail = true;
              }
            }
            
            if (!foundByEmail) {
              await setDoc(custByIdRef, {
                customerName: resolvedName,
                email: userEmail,
                whatsappNumber: resolvedPhone,
                playerId: '',
                isBanned: false,
                loyaltyPoints: newPoints,
                photoURL: '',
                createdAt: Date.now()
              });
            }
          }
        } catch (crmErr) {
          console.warn("Could not sync wallet balance with customers collection:", crmErr);
        }
      }
    }

    await updateDoc(txRef, { status, adminNotes: adminNotes || '' });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${WALLET_TRANS_COL}/${id}`);
    throw error;
  }
}

export async function manuallyAdjustWallet(userId: string, amount: number, notes: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    let currentPoints = 0;
    let userEmail = '';
    let customerName = 'Gamer';
    let whatsappNumber = '';

    if (userSnap.exists()) {
      const userData = userSnap.data();
      currentPoints = Number(userData.loyaltyPoints) || 0;
      userEmail = userData.email || '';
      customerName = userData.customerName || 'Gamer';
      whatsappNumber = userData.whatsappNumber || '';
    } else {
      // Try to fetch from customers collection to see if they exist there
      const customerRef = doc(db, 'customers', userId);
      const customerSnap = await getDoc(customerRef);
      if (customerSnap.exists()) {
        const custData = customerSnap.data();
        currentPoints = Number(custData.loyaltyPoints) || 0;
        userEmail = custData.email || '';
        customerName = custData.customerName || 'Gamer';
        whatsappNumber = custData.whatsappNumber || '';
      }
    }
    
    const newPoints = Math.max(0, currentPoints + amount);

    // Save to users collection
    await setDoc(userRef, { 
      loyaltyPoints: newPoints,
      customerName,
      whatsappNumber,
      email: userEmail
    }, { merge: true });

    // Sync with CRM customers
    try {
      const custByIdRef = doc(db, 'customers', userId);
      const custByIdSnap = await getDoc(custByIdRef);
      
      if (custByIdSnap.exists()) {
        await updateDoc(custByIdRef, { loyaltyPoints: newPoints });
      } else {
        let foundByEmail = false;
        if (userEmail) {
          const customersCol = collection(db, 'customers');
          const custByEmailSnap = await getDocs(query(customersCol, where('email', '==', userEmail)));
          if (!custByEmailSnap.empty) {
            await updateDoc(doc(db, 'customers', custByEmailSnap.docs[0].id), { loyaltyPoints: newPoints });
            foundByEmail = true;
          }
        }
        
        if (!foundByEmail) {
          await setDoc(custByIdRef, {
            customerName,
            email: userEmail,
            whatsappNumber,
            playerId: '',
            isBanned: false,
            loyaltyPoints: newPoints,
            photoURL: '',
            createdAt: Date.now()
          });
        }
      }
    } catch (crmErr) {
      console.warn("Could not sync wallet balance with customers collection:", crmErr);
    }

    // Log manual adjustment transaction
    await addDoc(collection(db, WALLET_TRANS_COL), {
      userId,
      customerName,
      customerPhone: whatsappNumber,
      amount: Math.abs(amount),
      type: WalletTransactionType.MANUAL,
      status: WalletTransactionStatus.APPROVED,
      adminNotes: notes || 'Manual Admin adjustment',
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    throw error;
  }
}

export async function getLeaderboard(limitCount = 20): Promise<any[]> {
  try {
    const q = query(
      collection(db, 'users'), 
      where('loyaltyPoints', '>', 0),
      orderBy('loyaltyPoints', 'desc'), 
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.warn('Leaderboard fetch fallback active:', error);
    // Fallback: try customers collection if users fail
    try {
      const q = query(
        collection(db, 'customers'),
        where('loyaltyPoints', '>', 0),
        orderBy('loyaltyPoints', 'desc'),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      return [];
    }
  }
}

export async function getSpendersLeaderboard(limitCount = 50, period: 'ALL_TIME' | 'THIS_MONTH' = 'ALL_TIME'): Promise<any[]> {
  try {
    const [ordersSnap, accOrdersSnap, walletSnap] = await Promise.all([
      getDocs(collection(db, ORDERS_COL)),
      getDocs(collection(db, ACCOUNT_ORDERS_COL)),
      getDocs(collection(db, WALLET_TRANS_COL))
    ]);

    const orders = ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const accOrders = accOrdersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const walletTrans = walletSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const allItems = [...orders, ...accOrders, ...walletTrans];
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const spendersMap: Record<string, any> = {};

    allItems.forEach((item: any) => {
      const status = item.status;
      const isOrder = 'packageName' in item || 'accountTitle' in item;
      const isWalletTx = 'type' in item && (item.type === WalletTransactionType.TOPUP || item.type === WalletTransactionType.MANUAL);

      if (isOrder) {
        if (status !== OrderStatus.COMPLETED && status !== OrderStatus.CONFIRMED) return;
        if (item.paymentMethod === PaymentMethod.WALLET) return;
      } else if (isWalletTx) {
        if (status !== WalletTransactionStatus.APPROVED) return;
      } else {
        return;
      }

      if (period === 'THIS_MONTH') {
        let itemDate = 0;
        if (item.createdAt?.toDate) itemDate = item.createdAt.toDate().getTime();
        else if (item.createdAt?.seconds) itemDate = item.createdAt.seconds * 1000;
        else if (item.createdAt) itemDate = new Date(item.createdAt).getTime();
        if (itemDate < startOfMonth) return;
      }

      const rawId = item.authUid || item.userId || item.customerPhone || item.customerEmail || item.email;
      if (!rawId) return;
      const id = String(rawId).toLowerCase();

      if (!spendersMap[id]) {
        spendersMap[id] = {
          id,
          customerName: item.customerName || 'Elite Guard',
          totalSpent: 0,
          photoURL: '', 
        };
      }
      spendersMap[id].totalSpent += (Number(item.amount) || 0);
      
      if (item.customerName && (!spendersMap[id].customerName || spendersMap[id].customerName === 'Elite Guard')) {
        spendersMap[id].customerName = item.customerName;
      }
    });

    const sortedLeaders = Object.values(spendersMap)
      .filter((user: any) => user.totalSpent > 0)
      .sort((a, b) => b.totalSpent - a.totalSpent);

    const finalLeaders = sortedLeaders.slice(0, Math.max(limitCount, 500));

    if (finalLeaders.length > 0) {
      try {
        const topIds = finalLeaders.slice(0, 15).map(l => l.id);
        const enrichmentPromises = topIds.map(async (uid) => {
          try {
            let custRef = doc(db, 'customers', uid);
            let snap = await getDoc(custRef);
            if (!snap.exists()) {
              const q = query(collection(db, 'customers'), or(where('email', '==', uid), where('customerPhone', '==', uid)));
              const searchSnap = await getDocs(q);
              if (!searchSnap.empty) snap = searchSnap.docs[0];
            }
            if (snap.exists()) return { id: uid, photoURL: snap.data().photoURL };
          } catch (e) {}
          return { id: uid, photoURL: '' };
        });
        const photos = await Promise.all(enrichmentPromises);
        photos.forEach(p => {
          const index = finalLeaders.findIndex(l => l.id === p.id);
          if (index !== -1 && p.photoURL) finalLeaders[index].photoURL = p.photoURL;
        });
      } catch (enrichErr) {
        console.warn('Enrichment failed:', enrichErr);
      }
    }

    return finalLeaders;
  } catch (error) {
    console.error('Failed to fetch spenders leaderboard:', error);
    return [];
  }
}
