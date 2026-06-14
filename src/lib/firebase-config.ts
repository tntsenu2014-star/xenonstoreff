import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB5p_9_2HZXUBFH99S4A2k1EtLgp5_9-mw",
  authDomain: "xenonstoreff.firebaseapp.com",
  projectId: "xenonstoreff",
  storageBucket: "xenonstoreff.firebasestorage.app",
  messagingSenderId: "386410631339",
  appId: "1:386410631339:web:fde55f398ddac028a967ee"
};

const app = initializeApp(firebaseConfig);
export { app };
export const auth = getAuth(app);
export const db = getFirestore(app);
