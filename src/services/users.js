import { FIREBASE_READY, db, auth } from '../config/firebase';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { DB } from './db';

export const UsersService = {
  subscribe: (callback) => {
    if (!FIREBASE_READY) {
      return DB.subscribe('users', callback);
    }

    let firestoreUnsub = () => {};

    // Wait for Firebase Auth to confirm session before querying Firestore
    const authUnsub = onAuthStateChanged(auth, (user) => {
      firestoreUnsub(); // cancel any previous subscription
      if (user) {
        // User authenticated — subscribe to all users in real-time
        firestoreUnsub = onSnapshot(
          collection(db, 'users'),
          (snap) => {
            const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            DB.set('users', users); // keep localStorage cache in sync
            callback(users);
          },
          async (err) => {
            console.warn('Firestore users read blocked:', err.code);
            // Firestore rules blocking — try one-shot read, then fall back to cache
            try {
              const snap = await getDocs(collection(db, 'users'));
              const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
              DB.set('users', users);
              callback(users);
            } catch (_) {
              callback(DB.get('users') || []);
            }
          }
        );
      } else {
        callback(DB.get('users') || []);
      }
    });

    return () => { authUnsub(); firestoreUnsub(); };
  },
};
