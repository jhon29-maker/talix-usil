import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  getDoc,
  getDocs,
  increment,
  arrayUnion,
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { FIREBASE_READY, db, storage } from '../config/firebase';
import { DB } from './db';
import { NotificationsService } from './notifications';

export const ChatService = {
  getConversationId: (uid1, uid2) => [uid1, uid2].sort().join('_'),

  getConversations: (userId, userEmail, userDisplayName, cb) => {
    if (FIREBASE_READY) {
      let stopped = false;
      let timer = null;

      const poll = async () => {
        if (stopped) return;
        try {
          // Collect ALL UIDs: current + email-duplicates + old migrated UIDs
          const allIds = [userId];
          if (userEmail) {
            try {
              const snap = await getDocs(query(collection(db, 'users'), where('email', '==', userEmail)));
              snap.docs.forEach(d => {
                if (!allIds.includes(d.id)) allIds.push(d.id);
                // Include old UIDs saved during UID migration so old conversations are still findable
                (d.data()?.oldUids || []).forEach(uid => { if (!allIds.includes(uid)) allIds.push(uid); });
              });
            } catch (_) {}
          }

          // Query conversations for all known IDs (array-contains-any supports up to 30)
          let fromQuery = [];
          try {
            const q = allIds.length === 1
              ? query(collection(db, 'conversations'), where('participants', 'array-contains', allIds[0]))
              : query(collection(db, 'conversations'), where('participants', 'array-contains-any', allIds.slice(0, 10)));
            const snap = await getDocs(q);
            fromQuery = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          } catch (_) {}

          // Also check conversationIds stored on all user docs
          let fromUserDoc = [];
          try {
            const knownIds = new Set(fromQuery.map(c => c.id));
            for (const uid of allIds) {
              const userSnap = await getDoc(doc(db, 'users', uid));
              const convIds = userSnap.data()?.conversationIds || [];
              const missing = convIds.filter(cid => !knownIds.has(cid));
              if (missing.length) {
                const extras = await Promise.all(missing.map(cid => getDoc(doc(db, 'conversations', cid))));
                extras.filter(d => d.exists()).forEach(d => {
                  fromUserDoc.push({ id: d.id, ...d.data() });
                  knownIds.add(d.id);
                });
              }
            }
          } catch (_) {}

          // Recovery: also find conversations where we sent the last message (catches lost conversations from UID changes)
          let fromDisplayName = [];
          if (userDisplayName) {
            try {
              const knownIds = new Set([...fromQuery, ...fromUserDoc].map(c => c.id));
              const nameSnap = await getDocs(query(collection(db, 'conversations'), where('lastMsgFromName', '==', userDisplayName)));
              nameSnap.docs.forEach(d => {
                if (!knownIds.has(d.id)) {
                  fromDisplayName.push({ id: d.id, ...d.data() });
                  knownIds.add(d.id);
                }
              });
            } catch (_) {}
          }

          const all = [...fromQuery, ...fromUserDoc, ...fromDisplayName];
          // Dedup by doc id
          const seenIds = new Set();
          const unique = all.filter(c => { if (seenIds.has(c.id)) return false; seenIds.add(c.id); return true; });
          // Dedup by participants pair — keep newest conversation per pair
          const byPair = {};
          unique.forEach(c => {
            const key = [...(c.participants || [])].sort().join('_');
            if (!byPair[key] || new Date(c.lastTime || 0) > new Date(byPair[key].lastTime || 0)) byPair[key] = c;
          });
          const sorted = Object.values(byPair)
            .filter(c => !allIds.some(uid => c.deletedFor?.[uid]))
            .sort((a, b) => (new Date(b.lastTime || 0) - new Date(a.lastTime || 0)));
          cb(sorted);
        } catch (_) {}
        if (!stopped) timer = setTimeout(poll, 1000);
      };
      poll();
      return () => { stopped = true; if (timer) clearTimeout(timer); };
    }
    return DB.subscribe('conversations', (convos) => {
      cb((convos || []).filter(c => c.participants?.includes(userId)));
    });
  },

  getMessages: (convId, cb) => {
    if (FIREBASE_READY) {
      let stopped = false;
      let timer = null;
      const q = query(collection(db, 'conversations', convId, 'messages'));
      const poll = async () => {
        if (stopped) return;
        try {
          const snap = await getDocs(q);
          const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => {
            const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
            const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
            return ta - tb;
          });
          cb(msgs);
        } catch (_) {}
        if (!stopped) timer = setTimeout(poll, 1000);
      };
      poll();
      return () => { stopped = true; if (timer) clearTimeout(timer); };
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
        await setDoc(convRef, { lastMsg: msg.text, lastTime: now, unreadCounts, [`participantNames.${fromUser.id}`]: fromUser.displayName }, { merge: true });
      } catch (_) {}
    } else {
      DB.push('msgs_' + convId, msg);
    }
    NotificationsService.add(otherId, { icon: '🎉', text: `${fromUser.displayName} confirmó el trueque con ${itemTitle || 'contigo'}. ¡Confirma tu parte!`, time: 'ahora' });
  },

  deleteConversation: async (convId, userId) => {
    if (FIREBASE_READY) {
      try {
        await updateDoc(doc(db, 'conversations', convId), { [`deletedFor.${userId}`]: true });
      } catch (_) {}
    }
    const convos = DB.get('conversations') || [];
    DB.set('conversations', convos.filter(c => c.id !== convId));
  },

  sendMessage: async (convId, from, text, participants, itemTitle, imageUrl = null, participantNames = null) => {
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
      const now = new Date().toISOString();
      const otherId = participants.find(p => p !== from.id);
      // Use setDoc+merge+increment — creates doc if missing, updates if exists. No getDoc needed.
      const convUpdate = {
        id: convId,
        participants,
        itemTitle: itemTitle || '',
        lastMsg: imageUrl ? '📷 Foto' : text,
        lastTime: now,
        lastMsgFromId: from.id,
        lastMsgFromName: from.displayName,
        [`participantNames.${from.id}`]: from.displayName,
      };
      if (participantNames) {
        Object.entries(participantNames).forEach(([k, v]) => { convUpdate[`participantNames.${k}`] = v; });
      }
      if (otherId) convUpdate[`unreadCounts.${otherId}`] = increment(1);
      await setDoc(doc(db, 'conversations', convId), convUpdate, { merge: true });
      await addDoc(collection(db, 'conversations', convId, 'messages'), msg);

      // Store convId on every participant's user doc so they always find this conversation
      participants.forEach(pid => {
        updateDoc(doc(db, 'users', pid), { conversationIds: arrayUnion(convId) }).catch(() => {});
      });

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

  setMeetup: async (convId, place, dateTime, proposedByUser) => {
    const now = new Date().toISOString();
    let dateLabel = dateTime;
    try { dateLabel = new Date(dateTime).toLocaleString('es', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch(_) {}

    const proposal = {
      place, dateTime,
      proposedBy: proposedByUser.id,
      proposedByName: proposedByUser.displayName,
      status: 'pending',
      proposedAt: now,
    };

    const systemMsg = {
      convId, fromId: 'system', fromName: 'TALIX', fromColor: '#1A7A50',
      text: `📅 ${proposedByUser.displayName} propone: ${place} · ${dateLabel}`,
      read: false, isSystem: true,
      createdAt: FIREBASE_READY ? serverTimestamp() : now,
    };

    if (FIREBASE_READY) {
      await setDoc(doc(db, 'conversations', convId), { meetupProposal: proposal }, { merge: true });
      await addDoc(collection(db, 'conversations', convId, 'messages'), systemMsg);
      return;
    }

    DB.push('msgs_' + convId, systemMsg);
    DB.update('conversations', convId, { meetupProposal: proposal });
  },

  acceptMeetup: async (convId, proposal) => {
    let dateLabel = proposal.dateTime;
    try { dateLabel = new Date(proposal.dateTime).toLocaleString('es', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch(_) {}

    const systemMsg = {
      convId, fromId: 'system', fromName: 'TALIX', fromColor: '#1A7A50',
      text: `✅ ¡Encuentro confirmado por ambas partes! ${proposal.place} · ${dateLabel}`,
      read: false, isSystem: true,
      createdAt: FIREBASE_READY ? serverTimestamp() : new Date().toISOString(),
    };

    if (FIREBASE_READY) {
      await setDoc(doc(db, 'conversations', convId), {
        meetup: { place: proposal.place, dateTime: proposal.dateTime },
        meetupProposal: null,
      }, { merge: true });
      await addDoc(collection(db, 'conversations', convId, 'messages'), systemMsg);
      return;
    }

    DB.push('msgs_' + convId, systemMsg);
    DB.update('conversations', convId, {
      meetup: { place: proposal.place, dateTime: proposal.dateTime },
      meetupProposal: null,
    });
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
