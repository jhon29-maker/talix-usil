// Local DB backed by localStorage — used when Firebase is not configured
export const DB = {
  get: (key) => {
    try { return JSON.parse(localStorage.getItem('talix_db_' + key) || 'null'); }
    catch { return null; }
  },
  set: (key, val) => localStorage.setItem('talix_db_' + key, JSON.stringify(val)),
  push: (key, item) => {
    const arr = DB.get(key) || [];
    const newItem = { ...item, id: Date.now().toString(), createdAt: new Date().toISOString() };
    arr.unshift(newItem);
    DB.set(key, arr);
    return newItem;
  },
  update: (key, id, updates) => {
    const arr = DB.get(key) || [];
    const idx = arr.findIndex(i => i.id === id);
    if (idx >= 0) { arr[idx] = { ...arr[idx], ...updates }; DB.set(key, arr); }
  },
  delete: (key, id) => {
    const arr = DB.get(key) || [];
    DB.set(key, arr.filter(i => i.id !== id));
  },
  subscribe: (key, cb) => {
    cb(DB.get(key) || []);
    const interval = setInterval(() => cb(DB.get(key) || []), 1500);
    return () => clearInterval(interval);
  },
};
