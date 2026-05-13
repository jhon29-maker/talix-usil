import { DB } from './db';

export const AdminService = {
  getStats: () => {
    const users = DB.get('users') || [];
    const items = DB.get('items') || [];
    const convos = DB.get('conversations') || [];
    const totalSwaps = users.reduce((s, u) => s + (u.swaps || 0), 0);
    const totalCO2 = users.reduce((s, u) => s + (u.co2 || 0), 0);
    return {
      users,
      items,
      convos,
      totalSwaps,
      totalCO2: totalCO2.toFixed(1),
      activeUsers: users.filter(u => u.status === 'activo').length,
      bannedUsers: users.filter(u => u.status === 'baneado').length,
    };
  },
  getAllUsers: () => DB.get('users') || [],

  banUser: (userId, reason = 'Incumplimiento de normas', banIp = false) => {
    const users = DB.get('users') || [];
    const user = users.find(u => u.id === userId);
    if (!user) return;
    DB.update('users', userId, {
      status: 'baneado',
      banReason: reason,
      bannedAt: new Date().toISOString(),
    });
    if (banIp && user.lastIp) {
      const bannedIps = DB.get('banned_ips') || [];
      if (!bannedIps.includes(user.lastIp)) {
        bannedIps.push(user.lastIp);
        DB.set('banned_ips', bannedIps);
      }
    }
  },

  unbanUser: (userId) => {
    DB.update('users', userId, { status: 'activo', banReason: null, bannedAt: null });
  },

  deleteUser: (userId) => {
    // Remove user
    const users = DB.get('users') || [];
    DB.set('users', users.filter(u => u.id !== userId));
    // Remove their items
    const items = DB.get('items') || [];
    DB.set('items', items.filter(i => i.userId !== userId));
    // Remove conversations they participated in
    const convos = DB.get('conversations') || [];
    DB.set('conversations', convos.filter(c => !c.participants?.includes(userId)));
    // Remove from email_registry
    const registry = DB.get('email_registry') || [];
    const userObj = users.find(u => u.id === userId);
    if (userObj) DB.set('email_registry', registry.filter(r => r.email !== userObj.email));
    // Remove scam reports involving them
    const scams = DB.get('scam_reports') || [];
    DB.set('scam_reports', scams.filter(r => r.reporterId !== userId));
  },

  deleteItem: (itemId) => DB.delete('items', itemId),
  getEmailList: () => (DB.get('users') || []).map(u => u.email),
  getBannedIps: () => DB.get('banned_ips') || [],
};
