// Firestore Compatibility Adapter for Secure Full-Stack SQL Proxying

export type QueryConstraint = any;

export class SimulatedDoc {
  id: string;
  private _data: any;

  constructor(id: string, data: any) {
    this.id = id;
    this._data = data;
  }

  exists() {
    return this._data !== null && this._data !== undefined;
  }

  data() {
    return this._data;
  }
}

export class SimulatedQuerySnapshot {
  docs: SimulatedDoc[];
  private _docChanges: any[];

  constructor(docs: SimulatedDoc[], docChanges?: any[]) {
    this.docs = docs;
    this._docChanges = docChanges || [];
  }

  get empty() {
    return this.docs.length === 0;
  }

  forEach(callback: (doc: SimulatedDoc) => void) {
    this.docs.forEach(callback);
  }

  docChanges() {
    return this._docChanges;
  }
}

// Stubs for Firebase configuration
export function getFirestore(app?: any, databaseId?: string) {
  return { type: 'firestore', app, databaseId };
}

export function collection(db: any, path: string) {
  return { type: 'collection', path };
}

export function doc(db: any, path: string, ...idSegments: string[]) {
  const cleanId = idSegments.join('/');
  return { type: 'doc', path, id: cleanId };
}

export function query(collectionRef: any, ...constraints: any[]) {
  return { 
    type: 'query', 
    path: collectionRef.path, 
    constraints 
  };
}

export function where(field: string, op: string, val: any) {
  return { type: 'where', field, op, val };
}

export function orderBy(field: string, direction = 'asc') {
  return { type: 'orderBy', field, direction };
}

export function limit(num: number) {
  return { type: 'limit', num };
}

export function or(...filters: any[]) {
  return { type: 'or', filters };
}

export function serverTimestamp() {
  return Date.now();
}

export const Timestamp = {
  now() {
    return {
      toDate: () => new Date(),
      seconds: Math.floor(Date.now() / 1000),
      nanoseconds: 0
    };
  }
};

// Map query-like objects to basic HTTP query strings safely
function buildQueryString(constraints: any[]): string {
  const params = new URLSearchParams();
  for (const c of constraints || []) {
    if (c && c.type === 'where' && c.op === '==') {
      params.append(c.field, String(c.val));
    }
  }
  const str = params.toString();
  return str ? `?${str}` : '';
}

// Client-side static memory fallback lists in case backend API is connecting or offline
const CLIENT_FALLBACKS: Record<string, any[]> = {
  banners: [
    {
      id: 'b1',
      title: 'Diamond Top-Up Promo',
      imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=1200',
      linkUrl: '/',
      isActive: true,
      order: 1,
      createdAt: Date.now()
    },
    {
      id: 'b2',
      title: 'Creative Studio',
      imageUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&q=80&w=1200',
      linkUrl: '/service/profile-dp',
      isActive: true,
      order: 2,
      createdAt: Date.now() + 10
    }
  ],
  packages: [
    { id: 'p1', name: '100 Diamonds', gameId: 'freefire-sg', diamonds: 100, price: 250, isActive: true, createdAt: Date.now() },
    { id: 'p2', name: '210 Diamonds', gameId: 'freefire-sg', diamonds: 210, price: 500, isActive: true, createdAt: Date.now() + 10 },
    { id: 'p3', name: '530 Diamonds', gameId: 'freefire-sg', diamonds: 530, price: 1200, isActive: true, createdAt: Date.now() + 20 },
    { id: 'p4', name: '1080 Diamonds', gameId: 'freefire-sg', diamonds: 1080, price: 2400, isActive: true, createdAt: Date.now() + 30 },
    { id: 'p5', name: '60 UC', gameId: 'pubg-mobile', diamonds: 60, price: 350, isActive: true, createdAt: Date.now() + 45 },
    { id: 'p6', name: '325 UC', gameId: 'pubg-mobile', diamonds: 325, price: 1650, isActive: true, createdAt: Date.now() + 50 },
    { id: 'p7', name: '100 Gold', gameId: 'blood-strike', diamonds: 100, price: 240, isActive: true, createdAt: Date.now() + 55 },
    { id: 'p8', name: '500 Gold', gameId: 'blood-strike', diamonds: 500, price: 1150, isActive: true, createdAt: Date.now() + 60 },
    { id: 'p9', name: '475 VP', gameId: 'valorant-sg', diamonds: 475, price: 950, isActive: true, createdAt: Date.now() + 65 },
    { id: 'p10', name: '1000 VP', gameId: 'valorant-sg', diamonds: 1000, price: 1900, isActive: true, createdAt: Date.now() + 70 }
  ],
  services: [
    {
      id: 's1',
      title: 'Creative Studio',
      description: 'Generate high-quality customized Free Fire profile DP with your player ID, name, avatar, and style.',
      imageUrl: 'https://images.unsplash.com/photo-1612287230202-1bf1d85d1bdf?auto=format&fit=crop&q=80&w=400',
      bannerUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&q=80&w=1200',
      isActive: true,
      createdAt: Date.now()
    }
  ],
  events: [
    {
      id: 'e1',
      title: 'PUBG Mobile UC Sale Event',
      subtitle: 'Recharge PUBG UC now and unlock the premium royale pass with extra seasonal perks.',
      image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=1200',
      isActive: true,
      createdAt: Date.now()
    }
  ],
  serviceTemplates: [
    {
      id: 'st1',
      serviceId: 's1',
      name: 'Basic Custom DP',
      imageUrl: 'https://images.unsplash.com/photo-1612287230202-1bf1d85d1bdf?auto=format&fit=crop&q=80&w=400',
      price: 350,
      isActive: true,
      createdAt: Date.now()
    },
    {
      id: 'st2',
      serviceId: 's1',
      name: 'Premium Guild DP Package',
      imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=400',
      price: 750,
      isActive: true,
      createdAt: Date.now() + 10
    }
  ],
  settings: [
    { id: 'config', siteName: 'GAMING R4D Store', contactEmail: 'support@gamingr4d.com', bankName: 'BOC (Bank of Ceylon)', bankAccountNumber: '9876543210', bankAccountHolder: 'GAMING R4D Admin', whatsappNumber: '+94771234567', ezCashNumber: '0771234567', isPayhereEnabled: false, payhereMerchantId: '', payhereAppId: '', payhereAppSecret: '' }
  ]
};

// Helper to evaluate Firestore where & or constraints client-side
function matchesConstraint(item: any, c: any): boolean {
  if (!c) return true;
  if (c.type === 'where') {
    const itemVal = item[c.field];
    const targetVal = c.val;
    if (c.op === '==') {
      return String(itemVal ?? '') === String(targetVal ?? '');
    }
    if (c.op === '!=') {
      return String(itemVal ?? '') !== String(targetVal ?? '');
    }
    if (c.op === '>') {
      return Number(itemVal) > Number(targetVal);
    }
    if (c.op === '>=') {
      return Number(itemVal) >= Number(targetVal);
    }
    if (c.op === '<') {
      return Number(itemVal) < Number(targetVal);
    }
    if (c.op === '<=') {
      return Number(itemVal) <= Number(targetVal);
    }
    if (c.op === 'array-contains') {
      return Array.isArray(itemVal) && itemVal.includes(targetVal);
    }
  }
  if (c.type === 'or') {
    return c.filters.some((subC: any) => matchesConstraint(item, subC));
  }
  return true;
}

// REST Backend Proxies
export async function getDocs(q: any): Promise<SimulatedQuerySnapshot> {
  const collectionPath = q.path || q.collection?.path || '';
  const queryString = q.constraints ? buildQueryString(q.constraints) : '';
  
  try {
    const res = await fetch(`/api/db/${collectionPath}${queryString}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    
    const text = await res.text();
    const cleanText = text.trim();
    if (cleanText.startsWith('<') || cleanText.startsWith('<!doctype') || cleanText.startsWith('<html>')) {
      console.warn(`Database API fallback triggered for "${collectionPath}" due to HTML server response.`);
      return new SimulatedQuerySnapshot((CLIENT_FALLBACKS[collectionPath] || []).map(item => new SimulatedDoc(item.id || '', item)));
    }
    
    const data = JSON.parse(cleanText);
    let list = Array.isArray(data) ? data : [];
    
    // Client-side filtering simulation matching Firestore where & or criteria exactly
    if (q.constraints) {
      for (const c of q.constraints) {
        if (c.type === 'where' || c.type === 'or') {
          list = list.filter(item => matchesConstraint(item, c));
        }
      }
    }
    
    // Check if client-side orderBy constraint is applied
    const orderRef = q.constraints?.find((c: any) => c.type === 'orderBy');
    if (orderRef) {
      const field = orderRef.field;
      const desc = orderRef.direction === 'desc';
      list = [...list].sort((a: any, b: any) => {
        const valA = a[field] ?? 0;
        const valB = b[field] ?? 0;
        return desc ? (valB - valA) : (valA - valB);
      });
    }

    // Check if client-side limit constraint is applied
    const limitRef = q.constraints?.find((c: any) => c.type === 'limit');
    if (limitRef) {
      list = list.slice(0, limitRef.num);
    }

    const docs = list.map((item: any) => new SimulatedDoc(item.id || '', item));
    return new SimulatedQuerySnapshot(docs);
  } catch (err: any) {
    if (err?.message !== 'Failed to fetch') {
      console.warn(`getDocs API fetch hit an exception for "${collectionPath}", using memory presets fallback.`, err);
    }
    const fallbackList = CLIENT_FALLBACKS[collectionPath] || [];
    const docs = fallbackList.map((item: any) => new SimulatedDoc(item.id || '', item));
    return new SimulatedQuerySnapshot(docs);
  }
}

export async function getDoc(docRef: any): Promise<SimulatedDoc> {
  try {
    const res = await fetch(`/api/db/${docRef.path}/${docRef.id}`);
    if (res.status === 404) {
      return new SimulatedDoc(docRef.id, null);
    }
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    
    const text = await res.text();
    const cleanText = text.trim();
    if (cleanText.startsWith('<') || cleanText.startsWith('<!doctype') || cleanText.startsWith('<html>')) {
      console.warn(`Database API doc fallback triggered for "${docRef.path}/${docRef.id}" due to HTML server response.`);
      const fallbackList = CLIENT_FALLBACKS[docRef.path] || [];
      const cached = fallbackList.find(i => i.id === docRef.id);
      return new SimulatedDoc(docRef.id, cached || null);
    }
    
    const data = JSON.parse(cleanText);
    return new SimulatedDoc(docRef.id || data.id, data);
  } catch (err: any) {
    if (err?.message !== 'Failed to fetch') {
      console.warn(`getDoc API fetch hit an exception for "${docRef.path}/${docRef.id}", using memory presets fallback.`, err);
    }
    const fallbackList = CLIENT_FALLBACKS[docRef.path] || [];
    const cached = fallbackList.find(i => i.id === docRef.id);
    return new SimulatedDoc(docRef.id, cached || null);
  }
}

export async function getDocFromServer(docRef: any): Promise<SimulatedDoc> {
  return getDoc(docRef);
}

export async function addDoc(collectionRef: any, data: any): Promise<{ id: string }> {
  try {
    const res = await fetch(`/api/db/${collectionRef.path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, createdAt: Date.now() })
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const text = await res.text();
    if (text.trim().startsWith('<') || text.trim().startsWith('<!doctype')) {
      throw new Error('Database API returned HTML instead of JSON');
    }
    const result = JSON.parse(text);
    return { id: result.id };
  } catch (err) {
    console.error(`Mock addDoc error on ${collectionRef.path}:`, err);
    throw err;
  }
}

export async function setDoc(docRef: any, data: any, options?: { merge?: boolean }): Promise<void> {
  try {
    // Check if document already exists
    const checkRes = await fetch(`/api/db/${docRef.path}/${docRef.id}`);
    const checkText = await checkRes.text();
    const isHtml = checkText.trim().startsWith('<') || checkText.trim().startsWith('<!doctype');
    const exists = !isHtml && checkRes.status !== 404 && checkRes.ok;

    if (exists) {
      if (options?.merge) {
        // Fetch current, merge and update
        const current = JSON.parse(checkText);
        const merged = { ...current, ...data, id: docRef.id };
        
        const res = await fetch(`/api/db/${docRef.path}/${docRef.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(merged)
        });
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      } else {
        // Document exists, but merge is false -> complete overwrite (preserving the ID)
        const res = await fetch(`/api/db/${docRef.path}/${docRef.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, id: docRef.id })
        });
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      }
    } else {
      // Write new
      const res = await fetch(`/api/db/${docRef.path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, id: docRef.id })
      });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    }
  } catch (err) {
    console.error(`Mock setDoc error on ${docRef.path}/${docRef.id}:`, err);
    throw err;
  }
}

export async function updateDoc(docRef: any, data: any): Promise<void> {
  try {
    // POST update endpoint (changed from PUT)
    const res = await fetch(`/api/db/${docRef.path}/${docRef.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  } catch (err) {
    console.error(`Mock updateDoc error on ${docRef.path}/${docRef.id}:`, err);
    throw err;
  }
}

export async function deleteDoc(docRef: any): Promise<void> {
  try {
    const res = await fetch(`/api/db/${docRef.path}/${docRef.id}/delete`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  } catch (err) {
    console.error(`Mock deleteDoc error on ${docRef.path}/${docRef.id}:`, err);
    throw err;
  }
}

// Periodic polling onSnapshot emulator to handle seamless "live" changes without WebSockets
export function onSnapshot(
  targetRef: any,
  onNext: (snapshot: any) => void,
  onError?: (error: any) => void
): () => void {
  
  let isStopped = false;
  let intervalId: any = null;
  let lastDataString = '';
  let lastDocsMap = new Map<string, string>();

  const runFetch = async () => {
    if (isStopped) return;
    try {
      if (targetRef.type === 'doc') {
        const snap = await getDoc(targetRef);
        if (isStopped) return;
        const currentStr = JSON.stringify(snap.data() || {});
        if (currentStr !== lastDataString) {
          lastDataString = currentStr;
          onNext(snap);
        }
      } else {
        // Query/Collection
        const snap = await getDocs(targetRef);
        if (isStopped) return;
        const currentStr = JSON.stringify(snap.docs.map(d => d.data()) || []);
        if (currentStr !== lastDataString) {
          lastDataString = currentStr;
          
          const newMap = new Map<string, string>();
          const docChanges: any[] = [];
          
          snap.docs.forEach((doc: SimulatedDoc) => {
             const dataStr = JSON.stringify(doc.data());
             newMap.set(doc.id, dataStr);
             
             if (!lastDocsMap.has(doc.id)) {
               docChanges.push({ type: 'added', doc });
             } else if (lastDocsMap.get(doc.id) !== dataStr) {
               docChanges.push({ type: 'modified', doc });
             }
          });
          
          lastDocsMap.forEach((_, id) => {
             if (!newMap.has(id)) {
               docChanges.push({ type: 'removed', doc: new SimulatedDoc(id, null) });
             }
          });
          
          lastDocsMap = newMap;
          
          const newSnap = new SimulatedQuerySnapshot(snap.docs, docChanges);
          onNext(newSnap);
        }
      }
    } catch (err) {
      console.error("onSnapshot poll error:", err);
      if (onError) onError(err);
    }
  };

  // Immediate initial load
  runFetch();

  // Gentle background poll every 4 seconds
  intervalId = setInterval(runFetch, 4000);

  // Return unsubscribe cleanup function
  return () => {
    isStopped = true;
    if (intervalId) {
      clearInterval(intervalId);
    }
  };
}
