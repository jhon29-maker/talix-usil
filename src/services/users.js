import { FIREBASE_READY, db } from '../config/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { DB } from './db';

export const UsersService = {
  subscribe: (callback) => {
    if (FIREBASE_READY) {
      const unsub = onSnapshot(collection(db, 'users'), snap => {
        const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        callback(users);
      }, () => {
        // Firestore error fallback to localStorage
        callback(DB.get('users') || []);
      });
      return unsub;
    }
    return DB.subscribe('users', callback);
  },

  getOnce: async () => {
    if (FIREBASE_READY) {
      const { getDocs } = await import('firebase/firestore');
      const snap = await getDocs(collection(db, 'users'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
    return DB.get('users') || [];
  },
};
