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
    };
  },
  getAllUsers: () => DB.get('users') || [],
  banUser: (userId) => DB.update('users', userId, { status: 'baneado' }),
  deleteItem: (itemId) => DB.delete('items', itemId),
  getEmailList: () => (DB.get('users') || []).map(u => u.email),
};
