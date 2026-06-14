import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc, onSnapshot } from './firestore-compat';
import { auth, db } from './firebase';

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
  authInfo: any
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: { userId: null },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

interface UserProfile {
  playerId: string;
  whatsappNumber: string;
  customerName: string;
  email?: string;
  photoURL?: string;
  loyaltyPoints?: number;
}

export interface AuthUser {
  id: string;
  email: string;
  customerName?: string;
}

interface UserContextType {
  user: AuthUser | null;
  profile: UserProfile;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  loading: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('userProfile');
    return saved ? JSON.parse(saved) : { playerId: '', whatsappNumber: '', customerName: '', loyaltyPoints: 0 };
  });

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          localStorage.setItem('authUser', JSON.stringify(data.user));
        } else if (res.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('authUser');
          setUser(null);
        } else {
          console.warn('Failed to fetch user, status:', res.status);
        }
      } catch (err) {
        console.warn('Network error fetching user, server might be down or unreachable:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    // Set up a real-time listener on the user's Firestore document
    const userRef = doc(db, 'users', user.id);
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const updatedProfile = {
          playerId: data.playerId || '',
          whatsappNumber: data.whatsappNumber || '',
          customerName: data.customerName || user.customerName || 'Gamer',
          email: data.email || user.email || '',
          photoURL: data.photoURL || '',
          loyaltyPoints: Number(data.loyaltyPoints) || 0
        };
        setProfile(updatedProfile);
        localStorage.setItem('userProfile', JSON.stringify(updatedProfile));
      } else {
        // If the document doesn't exist, we can establish it using initial values safely
        const initialProfile = {
          playerId: profile.playerId || '',
          whatsappNumber: profile.whatsappNumber || '',
          customerName: profile.customerName || user.customerName || 'Gamer',
          email: user.email || '',
          photoURL: profile.photoURL || '',
          loyaltyPoints: profile.loyaltyPoints || 0
        };
        setDoc(userRef, initialProfile, { merge: true });
      }
    }, (error) => {
      console.warn("Error listening to user doc snapshot:", error);
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  const login = (token: string, newUser: AuthUser) => {
    localStorage.setItem('token', token);
    localStorage.setItem('authUser', JSON.stringify(newUser));
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('authUser');
    localStorage.removeItem('userProfile');
    setUser(null);
    setProfile({ playerId: '', whatsappNumber: '', customerName: '', loyaltyPoints: 0 });
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    // Merge locally first for immediate responsiveness
    const newProfile = { ...profile, ...updates };
    setProfile(newProfile);
    localStorage.setItem('userProfile', JSON.stringify(newProfile));

    if (user) {
      try {
        // Crucial: Only set the precise updates in the database to prevent overwriting other fields with stale state
        await setDoc(doc(db, 'users', user.id), updates, { merge: true });
        
        // Sync with CRM customers collection
        try {
          const customersCol = collection(db, 'customers');
          let custSnap;
          if (user.email) {
            const custQuery = query(customersCol, where('email', '==', user.email));
            custSnap = await getDocs(custQuery);
          }
          
          if (custSnap && !custSnap.empty) {
            const custDocId = custSnap.docs[0].id;
            await updateDoc(doc(db, 'customers', custDocId), updates);
          } else {
            // If they don't exist in CRM customers, we create the skeleton and merge updates
            await setDoc(doc(db, 'customers', user.id), {
              customerName: updates.customerName || profile.customerName || user.customerName || 'Gamer',
              email: user.email || '',
              whatsappNumber: updates.whatsappNumber || profile.whatsappNumber || '',
              playerId: updates.playerId || profile.playerId || '',
              isBanned: false,
              loyaltyPoints: Number(updates.loyaltyPoints !== undefined ? updates.loyaltyPoints : profile.loyaltyPoints) || 0,
              photoURL: updates.photoURL || profile.photoURL || '',
              createdAt: Date.now()
            }, { merge: true });
          }
        } catch (crmErr) {
          console.warn("Could not sync with CRM Customers database:", crmErr);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.id}`);
      }
    }
  };

  return (
    <UserContext.Provider value={{ user, profile, updateProfile, loading, login, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

