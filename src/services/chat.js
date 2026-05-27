import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { FIREBASE_READY, db, storage } from '../config/firebase';
import { DB } from './db';
import { NotificationsService } from './notifications';

export const ChatService = {
  getConversationId: (uid1, uid2) => [uid1, uid2].sort().join('_'),

  getConversations: (userId, cb) => {
    if (FIREBASE_READY) {
      // No orderBy to avoid composite index requirement — sort client-side
      const q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', userId)
      );
      return onSnapshot(q, (snap) => {
        const sorted = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const ta = a.lastTime ? new Date(a.lastTime).getTime() : 0;
            const tb = b.lastTime ? new Date(b.lastTime).getTime() : 0;
            return tb - ta;
          });
        cb(sorted);
      });
    }
    return DB.subscribe('conversations', (convos) => {
      cb((convos || []).filter(c => c.participants?.includes(userId)));
    });
  },

  getMessages: (convId, cb) => {
    if (FIREBASE_READY) {
      const q = query(
        collection(db, 'conversations', convId, 'messages'),
        orderBy('createdAt', 'asc')
      );
      return onSnapshot(q, (snap) => {
        cb(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }
    return DB.subscribe('msgs_' + convId, (msgs) => cb(msgs || []));
  },

  uploadPhoto: async (convId, dataUrl) => {
    if (!FIREBASE_READY || !storage) return null;
    try {
      const storageRef = ref(storage, `chat/${convId}/${Date.now()}`);
      await uploadString(storageRef, dataUrl, 'data_url');
      return await getDownloadURL(storageRef);
    } catch (_) { return null; }
  },

  resetUnread: async (convId, userId) => {
    if (!FIREBASE_READY) return;
    try {
      const { updateDoc, doc: firestoreDoc } = await import('firebase/firestore');
      await updateDoc(firestoreDoc(db, 'conversations', convId), { [`unreadCounts.${userId}`]: 0 });
    } catch (_) {}
  },

  notifyTradeComplete: async (convId, fromUser, otherId, participants, itemTitle) => {
    const msg = {
      convId, fromId: 'system', fromName: 'TALIX', fromColor: '#2E7D32',
      text: `🎉 ${fromUser.displayName} confirmó el trueque. ¿Lo confirmas por tu parte?`,
      isSystem: true, isTradeConfirm: true, requesterId: fromUser.id,
      createdAt: FIREBASE_READY ? serverTimestamp() : new Date().toISOString(),
    };
    if (FIREBASE_READY) {
      await addDoc(collection(db, 'conversations', convId, 'messages'), msg);
      const convRef = doc(db, 'conversations', convId);
      const now = new Date().toISOString();
      try {
        const snap = await getDoc(convRef);
        const unreadCounts = snap.exists() ? (snap.data().unreadCounts || {}) : {};
        unreadCounts[otherId] = (unreadCounts[otherId] || 0) + 1;
        await setDoc(convRef, { lastMsg: msg.text, lastTime: now, unreadCounts }, { merge: true });
      } catch (_) {}
    } else {
      DB.push('msgs_' + convId, msg);
    }
    NotificationsService.add(otherId, { icon: '🎉', text: `${fromUser.displayName} confirmó el trueque con ${itemTitle || 'contigo'}. ¡Confirma tu parte!`, time: 'ahora' });
  },

  sendMessage: async (convId, from, text, participants, itemTitle, imageUrl = null) => {
    const msg = {
      convId,
      fromId: from.id,
      fromName: from.displayName,
      fromColor: from.avatarColor,
      text: text || '',
      imageUrl: imageUrl || null,
      read: false,
      createdAt: FIREBASE_READY ? serverTimestamp() : new Date().toISOString(),
    };

    if (FIREBASE_READY) {
      await addDoc(collection(db, 'conversations', convId, 'messages'), msg);

      const convRef = doc(db, 'conversations', convId);
      const snap = await getDoc(convRef);
      const now = new Date().toISOString();
      const otherId2 = participants.find(p => p !== from.id);
      if (snap.exists()) {
        const unreadCounts = snap.data().unreadCounts || {};
        if (otherId2) unreadCounts[otherId2] = (unreadCounts[otherId2] || 0) + 1;
        await updateDoc(convRef, { lastMsg: imageUrl ? '📷 Foto' : text, lastTime: now, unreadCounts });
      } else {
        const unreadCounts = {};
        if (otherId2) unreadCounts[otherId2] = 1;
        await setDoc(convRef, { id: convId, participants, itemTitle: itemTitle || '', lastMsg: imageUrl ? '📷 Foto' : text, lastTime: now, unreadCounts });
      }

      const otherId = participants.find(p => p !== from.id);
      NotificationsService.add(otherId, {
        icon: '💬',
        text: `${from.displayName}: ${imageUrl ? '📷 Foto' : text.slice(0, 40)}`,
        time: 'ahora',
      });
      return;
    }

    // localStorage fallback
    DB.push('msgs_' + convId, msg);
    const convos = DB.get('conversations') || [];
    const existing = convos.find(c => c.id === convId);
    const now = new Date().toISOString();
    if (existing) {
      DB.update('conversations', convId, { lastMsg: imageUrl ? '📷 Foto' : text, lastTime: now, unread: (existing.unread || 0) + 1 });
    } else {
      DB.push('conversations', { id: convId, participants, itemTitle: itemTitle || '', lastMsg: imageUrl ? '📷 Foto' : text, lastTime: now, unread: 1 });
    }

    const otherId = participants.find(p => p !== from.id);
    NotificationsService.add(otherId, { icon: '💬', text: `${from.displayName}: ${imageUrl ? '📷 Foto' : text.slice(0, 40)}`, time: 'ahora' });
  },

  setMeetup: async (convId, place, dateTime) => {
    const systemMsg = {
      convId,
      fromId: 'system',
      fromName: 'TALIX',
      fromColor: '#1A7A50',
      text: `📅 Encuentro coordinado: ${place} · ${dateTime}`,
      read: false,
      isSystem: true,
      createdAt: FIREBASE_READY ? serverTimestamp() : new Date().toISOString(),
    };

    if (FIREBASE_READY) {
      await addDoc(collection(db, 'conversations', convId, 'messages'), systemMsg);
      await updateDoc(doc(db, 'conversations', convId), { meetup: { place, dateTime } });
      return;
    }

    DB.push('msgs_' + convId, systemMsg);
    DB.update('conversations', convId, { meetup: { place, dateTime } });
  },
};

export function seedDefaultChats() {
  if (DB.get('chats_seeded')) return;

  const defaultConvos = [
    {
      id: 'conv_demo_1',
      participants: ['demo_joel', 'demo_ana'],
      participantNames: { demo_joel: 'Joel Santiago', demo_ana: 'Ana Martínez' },
      itemTitle: 'Cálculo Larson 9na Edición',
      lastMsg: '¡Trato! Nos vemos el miércoles 📚',
      lastTime: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      unread: 0,
      meetup: { place: 'Biblioteca Central USIL', dateTime: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString() },
    },
    {
      id: 'conv_demo_2',
      participants: ['demo_joel', 'demo_carlos'],
      participantNames: { demo_joel: 'Joel Santiago', demo_carlos: 'Carlos Ruiz' },
      itemTitle: 'Mouse Logitech MX Master 3',
      lastMsg: '¿Tienes el cargador incluido?',
      lastTime: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      unread: 2,
      meetup: null,
    },
    {
      id: 'conv_demo_3',
      participants: ['demo_joel', 'demo_lucia'],
      participantNames: { demo_joel: 'Joel Santiago', demo_lucia: 'Lucía Peralta' },
      itemTitle: 'Chaqueta Deportiva USIL XL',
      lastMsg: 'El viernes puedo en la cafetería 🙌',
      lastTime: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      unread: 0,
      meetup: null,
    },
  ];

  const defaultMsgs = {
    conv_demo_1: [
      { id: 'm1', fromId: 'demo_ana', fromName: 'Ana Martínez', fromColor: '#6DBE7E', text: '¡Hola! Vi que tienes el Cálculo de Larson, me interesa mucho 📚', createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), read: true },
      { id: 'm2', fromId: 'demo_joel', fromName: 'Joel Santiago', fromColor: '#1A7A50', text: 'Sí! Está en buen estado, sin subrayados. ¿Qué me ofrecerías a cambio?', createdAt: new Date(Date.now() - 1000 * 60 * 55).toISOString(), read: true },
      { id: 'm3', fromId: 'demo_ana', fromName: 'Ana Martínez', fromColor: '#6DBE7E', text: 'Tengo Química General de Chang, 9na edición. Casi nuevo 😊', createdAt: new Date(Date.now() - 1000 * 60 * 50).toISOString(), read: true },
      { id: 'm4', fromId: 'demo_joel', fromName: 'Joel Santiago', fromColor: '#1A7A50', text: '¡Perfecto, justo lo que necesito! ¿Cuándo podemos hacer el trueque?', createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), read: true },
      { id: 'm5', fromId: 'demo_ana', fromName: 'Ana Martínez', fromColor: '#6DBE7E', text: 'Puedo el miércoles o viernes después de clases. ¿En la biblioteca?', createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(), read: true },
      { id: 'm6', fromId: 'demo_joel', fromName: 'Joel Santiago', fromColor: '#1A7A50', text: 'El miércoles a las 4pm en la biblioteca me va perfecto 👍', createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(), read: true },
      { id: 'm7', fromId: 'demo_ana', fromName: 'Ana Martínez', fromColor: '#6DBE7E', text: '¡Trato! Nos vemos el miércoles 📚', createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), read: true },
      { id: 'sys1', fromId: 'system', fromName: 'TALIX', fromColor: '#1A7A50', text: '📅 Encuentro coordinado: Biblioteca Central USIL · Miércoles 4:00 PM', createdAt: new Date(Date.now() - 1000 * 60 * 28).toISOString(), read: true, isSystem: true },
    ],
    conv_demo_2: [
      { id: 'm1', fromId: 'demo_joel', fromName: 'Joel Santiago', fromColor: '#1A7A50', text: 'Hola Carlos, vi tu Mouse Logitech. ¿Está en buen estado?', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), read: true },
      { id: 'm2', fromId: 'demo_carlos', fromName: 'Carlos Ruiz', fromColor: '#5B9BD5', text: 'Sí, prácticamente nuevo. Lo usé solo 2 semanas. Sin rayones 🖱️', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3.5).toISOString(), read: true },
      { id: 'm3', fromId: 'demo_joel', fromName: 'Joel Santiago', fromColor: '#1A7A50', text: '¿Tienes el cargador incluido?', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), read: false },
    ],
    conv_demo_3: [
      { id: 'm1', fromId: 'demo_lucia', fromName: 'Lucía Peralta', fromColor: '#F5A623', text: 'Hola! Me interesa tu propuesta de trueque por la chaqueta 👕', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString(), read: true },
      { id: 'm2', fromId: 'demo_joel', fromName: 'Joel Santiago', fromColor: '#1A7A50', text: '¡Hola Lucía! ¿Qué tienes para ofrecer a cambio?', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24.5).toISOString(), read: true },
      { id: 'm3', fromId: 'demo_lucia', fromName: 'Lucía Peralta', fromColor: '#F5A623', text: 'Tengo libros de Administración y una mochila Samsonite', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24.2).toISOString(), read: true },
      { id: 'm4', fromId: 'demo_joel', fromName: 'Joel Santiago', fromColor: '#1A7A50', text: 'Me interesa la mochila. ¿Podemos coordinarnos esta semana?', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), read: true },
      { id: 'm5', fromId: 'demo_lucia', fromName: 'Lucía Peralta', fromColor: '#F5A623', text: 'El viernes puedo en la cafetería 🙌', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 23).toISOString(), read: true },
    ],
  };

  DB.set('conversations', defaultConvos);
  Object.entries(defaultMsgs).forEach(([convId, msgs]) => DB.set('msgs_' + convId, msgs));
  DB.set('chats_seeded', true);
}
