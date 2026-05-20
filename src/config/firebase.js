import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAV7EMCzdrZQMe17U-yC4n7HkbOw-YqVdY",
  authDomain: "talix-final.firebaseapp.com",
  projectId: "talix-final",
  storageBucket: "talix-final.firebasestorage.app",
  messagingSenderId: "740464633969",
  appId: "1:740464633969:web:90c847dbb16a1339add3d0",
  measurementId: "G-YC5SLFBRH7",
};

export const FIREBASE_READY = true;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
