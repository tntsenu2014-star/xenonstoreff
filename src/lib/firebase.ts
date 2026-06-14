import { auth as realAuth, db as realDb, app as realApp } from './firebase-config';
import { 
  signInWithPopup as realSignInWithPopup, 
  signInWithEmailAndPassword as realSignInWithEmailAndPassword,
  createUserWithEmailAndPassword as realCreateUserWithEmailAndPassword,
  GoogleAuthProvider as realGoogleAuthProvider,
  signOut as realSignOut,
  updateProfile as realUpdateProfile,
  onAuthStateChanged as realOnAuthStateChanged
} from 'firebase/auth';
import { getStorage } from 'firebase/storage';

export const auth = realAuth;
export const db = realDb;
export const storage = getStorage(realApp);

export const GoogleAuthProvider = realGoogleAuthProvider;

export async function signInWithPopup(authInstance: any, provider: any) {
  return await realSignInWithPopup(realAuth, provider);
}

export async function signInWithEmailAndPassword(authInstance: any, email: string, pass: string) {
  return await realSignInWithEmailAndPassword(realAuth, email, pass);
}

export async function createUserWithEmailAndPassword(authInstance: any, email: string, pass: string) {
  return await realCreateUserWithEmailAndPassword(realAuth, email, pass);
}

export async function signOut(authInstance: any) {
  return await realSignOut(realAuth);
}

export async function updateProfile(userInstance: any, updates: { photoURL?: string | null; displayName?: string | null }) {
  if (realAuth.currentUser) {
    return await realUpdateProfile(realAuth.currentUser, updates);
  }
}

export function onAuthStateChanged(authInstance: any, callback: any) {
  return realOnAuthStateChanged(realAuth, callback);
}

export { getFirestore } from 'firebase/firestore';
