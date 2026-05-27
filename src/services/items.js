import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { FIREBASE_READY, db, storage } from '../config/firebase';
import { DB } from './db';
import { NotificationsService } from './notifications';
import { TALIX_ITEMS, CO2_BY_CATEGORY } from '../data/mockData';

const BG_BY_CATEGORY = {
  Libros: '#E8F5E9',
  Tecnología: '#E3F2FD',
  Ropa: '#FFF3E0',
  Accesorios: '#ECEFF1',
};

let _seeded = false;

export const ItemsService = {
  getAll: (cb) => {
    if (FIREBASE_READY) {
      const q = query(collection(db, 'items'), orderBy('createdAt', 'desc'));
      return onSnapshot(q, (snap) => {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (items.length === 0 && !_seeded) {
          _seeded = true;
          // Seed demo items to Firestore so carousel has content
          TALIX_ITEMS.forEach(i => {
            addDoc(collection(db, 'items'), {
              title: i.title, category: i.category, condition: i.condition,
              description: i.description, want: i.want, photo: null,
              userId: i.userId, user: i.user, avatarColor: i.avatarColor,
              faculty: i.faculty, co2: i.co2, bgColor: i.bgColor,
              posted: 'hace 1d', likes: [], proposals: [], status: 'activo',
              createdAt: serverTimestamp(), isDemo: true,
            }).catch(() => {});
          });
        } else {
          cb(items);
        }
      });
    }

    // localStorage fallback
    return DB.subscribe('items', (items) => {
      if (!items || items.length === 0) {
        const seeded = TALIX_ITEMS.map(i => ({
          ...i,
          id: i.id.toString(),
          createdAt: new Date().toISOString(),
          likes: [],
          proposals: [],
        }));
        DB.set('items', seeded);
        cb(seeded);
      } else {
        cb(items);
      }
    });
  },

  publish: async (item, user) => {
    let photoUrl = item.photo || null;

    // Upload photo to Firebase Storage if available
    if (FIREBASE_READY && item.photo && item.photo.startsWith('data:')) {
      try {
        const storageRef = ref(storage, `items/${user.id}/${Date.now()}`);
        await uploadString(storageRef, item.photo, 'data_url');
        photoUrl = await getDownloadURL(storageRef);
      } catch (e) {
        console.warn('Photo upload failed, using base64:', e.message);
      }
    }

    const newItem = {
      title: item.title,
      category: item.category,
      condition: item.condition,
      description: item.description,
      want: item.want,
      photo: photoUrl,
      userId: user.id,
      user: user.displayName,
      avatarColor: user.avatarColor,
      faculty: user.faculty,
      co2: CO2_BY_CATEGORY[item.category] || 3,
      bgColor: BG_BY_CATEGORY[item.category] || '#F5F5F5',
      posted: 'ahora mismo',
      likes: [],
      proposals: [],
      status: 'activo',
      createdAt: FIREBASE_READY ? serverTimestamp() : new Date().toISOString(),
    };

    if (FIREBASE_READY) {
      const docRef = await addDoc(collection(db, 'items'), newItem);
      return { id: docRef.id, ...newItem };
    }

    return DB.push('items', newItem);
  },

  toggleLike: async (itemId, userId) => {
    if (FIREBASE_READY) {
      const ref = doc(db, 'items', itemId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const likes = snap.data().likes || [];
      const isLiked = likes.includes(userId);
      await updateDoc(ref, { likes: isLiked ? arrayRemove(userId) : arrayUnion(userId) });
      return;
    }

    const items = DB.get('items') || [];
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const likes = item.likes || [];
    const idx = likes.indexOf(userId);
    if (idx >= 0) likes.splice(idx, 1); else likes.push(userId);
    DB.update('items', itemId, { likes });
  },

  sendProposal: async (itemId, fromUser, offerText) => {
    const proposal = {
      from: fromUser.displayName,
      fromId: fromUser.id,
      offer: offerText,
      date: new Date().toISOString(),
      status: 'pendiente',
    };

    if (FIREBASE_READY) {
      const ref = doc(db, 'items', itemId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const item = snap.data();
      const proposals = [...(item.proposals || []), proposal];
      await updateDoc(ref, { proposals });
      NotificationsService.add(item.userId, {
        icon: '🔄',
        text: `${fromUser.displayName} propuso un trueque por ${item.title}`,
        time: 'ahora',
      });
      return;
    }

    const items = DB.get('items') || [];
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const proposals = [...(item.proposals || []), proposal];
    DB.update('items', itemId, { proposals });
    NotificationsService.add(item.userId, {
      icon: '🔄',
      text: `${fromUser.displayName} propuso un trueque por ${item.title}`,
      time: 'ahora',
    });
  },

  deleteItem: async (itemId) => {
    if (FIREBASE_READY) {
      await deleteDoc(doc(db, 'items', itemId));
      return;
    }
    DB.delete('items', itemId);
  },

  getUserItems: (userId) => {
    const items = DB.get('items') || [];
    return items.filter(i => i.userId === userId);
  },
};
