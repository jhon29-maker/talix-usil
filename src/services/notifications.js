import { DB } from './db';

export const NotificationsService = {
  get: (userId) => (DB.get('notifs_' + userId) || []).slice(0, 20),

  add: (userId, notif) => {
    if (!userId) return;
    const notifs = DB.get('notifs_' + userId) || [];
    notifs.unshift({ ...notif, id: Date.now().toString(), read: false, createdAt: new Date().toISOString() });
    DB.set('notifs_' + userId, notifs.slice(0, 50));
  },

  markRead: (userId) => {
    const notifs = DB.get('notifs_' + userId) || [];
    DB.set('notifs_' + userId, notifs.map(n => ({ ...n, read: true })));
  },

  subscribe: (userId, cb) => DB.subscribe('notifs_' + userId, (notifs) => cb(notifs || [])),
};
