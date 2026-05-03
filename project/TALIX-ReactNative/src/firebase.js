// TALIX React Native — firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// 🔥 REEMPLAZA CON TU CONFIG DE FIREBASE
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "talix-usil.firebaseapp.com",
  projectId: "talix-usil",
  storageBucket: "talix-usil.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
