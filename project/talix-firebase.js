// ============================================================
// TALIX v3 — Firebase Config + Data Layer
// ============================================================
// 🔥 INSTRUCCIONES: Reemplaza estos valores con los de tu proyecto Firebase
// Ve a: https://console.firebase.google.com → Tu proyecto → Configuración → Config web
// ============================================================

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDEMO_REPLACE_WITH_YOUR_KEY",
  authDomain: "talix-usil.firebaseapp.com",
  projectId: "talix-usil",
  storageBucket: "talix-usil.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// ── DEMO MODE (sin Firebase real) ────────────────────────────
// Si Firebase no está configurado, usamos localStorage como fallback
const DEMO_MODE = FIREBASE_CONFIG.apiKey.includes('DEMO');

// ── LOCAL DB (demo / fallback) ───────────────────────────────
const DB = {
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
  }
};

// ── AUTH LAYER ────────────────────────────────────────────────
const Auth = {
  getCurrentUser: () => {
    try { return JSON.parse(localStorage.getItem('talix_current_user') || 'null'); }
    catch { return null; }
  },
  register: async (email, password, displayName, faculty) => {
    if (!email.endsWith('@usil.edu.pe') && !email.endsWith('@gmail.com')) {
      throw new Error('Usa tu correo institucional USIL (@usil.edu.pe)');
    }
    const users = DB.get('users') || [];
    if (users.find(u => u.email === email)) throw new Error('Este correo ya está registrado.');
    const user = {
      id: Date.now().toString(), email, displayName, faculty,
      swaps: 0, co2: 0, verified: true, joined: new Date().toLocaleDateString('es', { month: 'long', year: 'numeric' }),
      avatarColor: ['#6DBE7E','#5B9BD5','#F5A623','#9C6BBE','#E57373','#4DB6AC'][Math.floor(Math.random()*6)],
      createdAt: new Date().toISOString(), status: 'activo', isAdmin: false
    };
    DB.push('users', user);
    localStorage.setItem('talix_current_user', JSON.stringify(user));
    return user;
  },
  login: async (email, password) => {
    // Demo: acepta cualquier usuario registrado o crea sesión de demo
    const users = DB.get('users') || [];
    let user = users.find(u => u.email === email);
    if (!user) {
      // Demo user si no existe
      user = {
        id: 'demo_' + Date.now(), email, displayName: email.split('@')[0],
        faculty: 'Ingeniería Industrial', swaps: 5, co2: 12.5, verified: true,
        joined: 'Mayo 2025', avatarColor: '#1A7A50',
        createdAt: new Date().toISOString(), status: 'activo', isAdmin: false
      };
      const allUsers = DB.get('users') || [];
      allUsers.unshift(user);
      DB.set('users', allUsers);
    }
    localStorage.setItem('talix_current_user', JSON.stringify(user));
    return user;
  },
  logout: () => {
    localStorage.removeItem('talix_current_user');
    localStorage.removeItem('talix_logged');
  },
  isAdmin: (email) => email === 'admin@talix.usil.edu.pe'
};

// ── ITEMS SERVICE ─────────────────────────────────────────────
const ItemsService = {
  getAll: (cb) => DB.subscribe('items', (items) => {
    // Merge with seed data if empty
    if (!items || items.length === 0) {
      const seeded = (typeof TALIX_ITEMS !== 'undefined' ? TALIX_ITEMS : []).map(i => ({
        ...i, id: i.id.toString(), createdAt: new Date().toISOString(), likes: [], proposals: []
      }));
      DB.set('items', seeded);
      cb(seeded);
    } else { cb(items); }
  }),
  publish: (item, user) => {
    const newItem = {
      title: item.title, category: item.category, condition: item.condition,
      description: item.description, want: item.want, photo: item.photo || null,
      userId: user.id, user: user.displayName, avatarColor: user.avatarColor,
      faculty: user.faculty, co2: CO2_BY_CATEGORY[item.category] || 3,
      bgColor: { Libros:'#E8F5E9', Tecnología:'#E3F2FD', Ropa:'#FFF3E0', Accesorios:'#ECEFF1' }[item.category] || '#F5F5F5',
      posted: 'ahora mismo', likes: [], proposals: [], status: 'activo'
    };
    return DB.push('items', newItem);
  },
  toggleLike: (itemId, userId) => {
    const items = DB.get('items') || [];
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const likes = item.likes || [];
    const idx = likes.indexOf(userId);
    if (idx >= 0) likes.splice(idx, 1); else likes.push(userId);
    DB.update('items', itemId, { likes });
  },
  sendProposal: (itemId, fromUser, offerText) => {
    const items = DB.get('items') || [];
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const proposals = item.proposals || [];
    proposals.push({ from: fromUser.displayName, fromId: fromUser.id, offer: offerText, date: new Date().toISOString(), status: 'pendiente' });
    DB.update('items', itemId, { proposals });
    // Create notification
    NotificationsService.add(item.userId, { icon:'🔄', text:`${fromUser.displayName} propuso un trueque por ${item.title}`, time:'ahora' });
  },
  deleteItem: (itemId) => DB.delete('items', itemId),
  getUserItems: (userId) => {
    const items = DB.get('items') || [];
    return items.filter(i => i.userId === userId);
  }
};

// ── CHAT SERVICE ──────────────────────────────────────────────
const ChatService = {
  getConversationId: (uid1, uid2) => [uid1, uid2].sort().join('_'),
  getConversations: (userId, cb) => {
    return DB.subscribe('conversations', (convos) => {
      cb((convos || []).filter(c => c.participants?.includes(userId)));
    });
  },
  getMessages: (convId, cb) => DB.subscribe('msgs_' + convId, (msgs) => cb(msgs || [])),
  sendMessage: (convId, from, text, participants, itemTitle) => {
    const msg = { convId, fromId: from.id, fromName: from.displayName, fromColor: from.avatarColor, text, read: false };
    DB.push('msgs_' + convId, msg);
    // Update or create conversation
    const convos = DB.get('conversations') || [];
    const existing = convos.find(c => c.id === convId);
    if (existing) {
      DB.update('conversations', convId, { lastMsg: text, lastTime: new Date().toISOString(), unread: (existing.unread || 0) + 1 });
    } else {
      DB.push('conversations', { id: convId, participants, itemTitle: itemTitle || '', lastMsg: text, lastTime: new Date().toISOString(), unread: 1 });
    }
    NotificationsService.add(participants.find(p => p !== from.id), { icon:'💬', text:`${from.displayName}: ${text.slice(0,40)}`, time:'ahora' });
  },
  setMeetup: (convId, place, dateTime) => {
    const items = DB.get('msgs_' + convId) || [];
    DB.push('msgs_' + convId, {
      convId, fromId: 'system', fromName: 'TALIX', fromColor: '#1A7A50',
      text: `📅 Encuentro coordinado: ${place} · ${dateTime}`, read: false, isSystem: true
    });
    DB.update('conversations', convId, { meetup: { place, dateTime } });
  }
};

// ── NOTIFICATIONS SERVICE ─────────────────────────────────────
const NotificationsService = {
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
  subscribe: (userId, cb) => DB.subscribe('notifs_' + userId, (notifs) => cb(notifs || []))
};

// ── ADMIN SERVICE ─────────────────────────────────────────────
const AdminService = {
  getStats: () => {
    const users = DB.get('users') || [];
    const items = DB.get('items') || [];
    const convos = DB.get('conversations') || [];
    const totalSwaps = users.reduce((s, u) => s + (u.swaps || 0), 0);
    const totalCO2 = users.reduce((s, u) => s + (u.co2 || 0), 0);
    return { users, items, convos, totalSwaps, totalCO2: totalCO2.toFixed(1), activeUsers: users.filter(u => u.status === 'activo').length };
  },
  getAllUsers: () => DB.get('users') || [],
  banUser: (userId) => DB.update('users', userId, { status: 'baneado' }),
  deleteItem: (itemId) => DB.delete('items', itemId),
  getEmailList: () => (DB.get('users') || []).map(u => u.email)
};

// ── SEED DEFAULT CHATS ────────────────────────────────────────
function seedDefaultChats() {
  if (DB.get('chats_seeded')) return;

  const defaultConvos = [
    {
      id: 'conv_demo_1',
      participants: ['demo_joel', 'demo_ana'],
      participantNames: { demo_joel: 'Joel Santiago', demo_ana: 'Ana Martínez' },
      itemTitle: 'Cálculo Larson 9na Edición',
      lastMsg: '¡Trato! Nos vemos el miércoles 📚',
      lastTime: new Date(Date.now() - 1000*60*30).toISOString(),
      unread: 0,
      meetup: { place: 'Biblioteca Central USIL', dateTime: new Date(Date.now() + 1000*60*60*48).toISOString() }
    },
    {
      id: 'conv_demo_2',
      participants: ['demo_joel', 'demo_carlos'],
      participantNames: { demo_joel: 'Joel Santiago', demo_carlos: 'Carlos Ruiz' },
      itemTitle: 'Mouse Logitech MX Master 3',
      lastMsg: '¿Tienes el cargador incluido?',
      lastTime: new Date(Date.now() - 1000*60*60*3).toISOString(),
      unread: 2,
      meetup: null
    },
    {
      id: 'conv_demo_3',
      participants: ['demo_joel', 'demo_lucia'],
      participantNames: { demo_joel: 'Joel Santiago', demo_lucia: 'Lucía Peralta' },
      itemTitle: 'Chaqueta Deportiva USIL XL',
      lastMsg: 'El viernes puedo en la cafetería 🙌',
      lastTime: new Date(Date.now() - 1000*60*60*24).toISOString(),
      unread: 0,
      meetup: null
    },
  ];

  const defaultMsgs = {
    conv_demo_1: [
      { id:'m1', fromId:'demo_ana', fromName:'Ana Martínez', fromColor:'#6DBE7E', text:'¡Hola! Vi que tienes el Cálculo de Larson, me interesa mucho 📚', createdAt: new Date(Date.now()-1000*60*60).toISOString(), read:true },
      { id:'m2', fromId:'demo_joel', fromName:'Joel Santiago', fromColor:'#1A7A50', text:'Sí! Está en buen estado, sin subrayados. ¿Qué me ofrecerías a cambio?', createdAt: new Date(Date.now()-1000*60*55).toISOString(), read:true },
      { id:'m3', fromId:'demo_ana', fromName:'Ana Martínez', fromColor:'#6DBE7E', text:'Tengo Química General de Chang, 9na edición. Casi nuevo 😊', createdAt: new Date(Date.now()-1000*60*50).toISOString(), read:true },
      { id:'m4', fromId:'demo_joel', fromName:'Joel Santiago', fromColor:'#1A7A50', text:'¡Perfecto, justo lo que necesito! ¿Cuándo podemos hacer el trueque?', createdAt: new Date(Date.now()-1000*60*45).toISOString(), read:true },
      { id:'m5', fromId:'demo_ana', fromName:'Ana Martínez', fromColor:'#6DBE7E', text:'Puedo el miércoles o viernes después de clases. ¿En la biblioteca?', createdAt: new Date(Date.now()-1000*60*40).toISOString(), read:true },
      { id:'m6', fromId:'demo_joel', fromName:'Joel Santiago', fromColor:'#1A7A50', text:'El miércoles a las 4pm en la biblioteca me va perfecto 👍', createdAt: new Date(Date.now()-1000*60*35).toISOString(), read:true },
      { id:'m7', fromId:'demo_ana', fromName:'Ana Martínez', fromColor:'#6DBE7E', text:'¡Trato! Nos vemos el miércoles 📚', createdAt: new Date(Date.now()-1000*60*30).toISOString(), read:true },
      { id:'sys1', fromId:'system', fromName:'TALIX', fromColor:'#1A7A50', text:'📅 Encuentro coordinado: Biblioteca Central USIL · Miércoles 4:00 PM', createdAt: new Date(Date.now()-1000*60*28).toISOString(), read:true, isSystem:true },
    ],
    conv_demo_2: [
      { id:'m1', fromId:'demo_joel', fromName:'Joel Santiago', fromColor:'#1A7A50', text:'Hola Carlos, vi tu Mouse Logitech. ¿Está en buen estado?', createdAt: new Date(Date.now()-1000*60*60*4).toISOString(), read:true },
      { id:'m2', fromId:'demo_carlos', fromName:'Carlos Ruiz', fromColor:'#5B9BD5', text:'Sí, prácticamente nuevo. Lo usé solo 2 semanas. Sin rayones 🖱️', createdAt: new Date(Date.now()-1000*60*60*3.5).toISOString(), read:true },
      { id:'m3', fromId:'demo_joel', fromName:'Joel Santiago', fromColor:'#1A7A50', text:'¿Tienes el cargador incluido?', createdAt: new Date(Date.now()-1000*60*60*3).toISOString(), read:false },
    ],
    conv_demo_3: [
      { id:'m1', fromId:'demo_lucia', fromName:'Lucía Peralta', fromColor:'#F5A623', text:'Hola! Me interesa tu propuesta de trueque por la chaqueta 👕', createdAt: new Date(Date.now()-1000*60*60*25).toISOString(), read:true },
      { id:'m2', fromId:'demo_joel', fromName:'Joel Santiago', fromColor:'#1A7A50', text:'¡Hola Lucía! ¿Qué tienes para ofrecer a cambio?', createdAt: new Date(Date.now()-1000*60*60*24.5).toISOString(), read:true },
      { id:'m3', fromId:'demo_lucia', fromName:'Lucía Peralta', fromColor:'#F5A623', text:'Tengo libros de Administración y una mochila Samsonite', createdAt: new Date(Date.now()-1000*60*60*24.2).toISOString(), read:true },
      { id:'m4', fromId:'demo_joel', fromName:'Joel Santiago', fromColor:'#1A7A50', text:'Me interesa la mochila. ¿Podemos coordinarnos esta semana?', createdAt: new Date(Date.now()-1000*60*60*24).toISOString(), read:true },
      { id:'m5', fromId:'demo_lucia', fromName:'Lucía Peralta', fromColor:'#F5A623', text:'El viernes puedo en la cafetería 🙌', createdAt: new Date(Date.now()-1000*60*60*23).toISOString(), read:true },
    ],
  };

  DB.set('conversations', defaultConvos);
  Object.entries(defaultMsgs).forEach(([convId, msgs]) => DB.set('msgs_' + convId, msgs));
  DB.set('chats_seeded', true);
}

// ── PDF REPORT SERVICE ────────────────────────────────────────
const PDFReportService = {
  generateAdminReport: () => {
    const stats = AdminService.getStats();
    const now = new Date().toLocaleDateString('es', { day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' });

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Reporte TALIX — ${now}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Poppins, sans-serif; color: #1C2B2B; background: #fff; padding: 40px; }
  .header { display:flex; align-items:center; justify-content:space-between; border-bottom: 3px solid #1B4FBE; padding-bottom: 24px; margin-bottom: 32px; }
  .logo { font-size: 32px; font-weight: 800; color: #1B4FBE; letter-spacing: -1px; }
  .logo span { color: #F5A623; }
  .date { font-size: 13px; color: #888; }
  h2 { font-size: 18px; font-weight: 700; color: #1B4FBE; margin: 28px 0 14px; border-left: 4px solid #1B4FBE; padding-left: 12px; }
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
  .stat-card { background: #F0F4FA; border-radius: 16px; padding: 20px; text-align: center; }
  .stat-icon { font-size: 28px; margin-bottom: 8px; }
  .stat-val { font-size: 28px; font-weight: 800; color: #1B4FBE; }
  .stat-label { font-size: 12px; color: #888; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 28px; }
  th { background: #1B4FBE; color: #fff; padding: 10px 14px; text-align: left; font-weight: 600; }
  td { padding: 10px 14px; border-bottom: 1px solid #EEE; }
  tr:nth-child(even) td { background: #F8F9FF; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 100px; font-size: 11px; font-weight: 600; }
  .badge-activo { background: #E8F5E9; color: #2E7D32; }
  .badge-inactivo { background: #F5F5F5; color: #888; }
  .badge-baneado { background: #FFEBEE; color: #E53935; }
  .co2-banner { background: linear-gradient(135deg, #1A7A50, #2E7D32); color: #fff; border-radius: 20px; padding: 28px 32px; margin-bottom: 28px; display: flex; align-items: center; justify-content: space-between; }
  .co2-val { font-size: 48px; font-weight: 800; }
  .co2-label { font-size: 14px; opacity: 0.85; margin-top: 4px; }
  .footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #EEE; display: flex; justify-content: space-between; font-size: 12px; color: #AAA; }
  .section-info { background: #F8F9FF; border-radius: 14px; padding: 16px 20px; margin-bottom: 20px; font-size: 13px; color: #555; line-height: 1.7; }
  @media print { body { padding: 20px; } .no-print { display: none; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">TALIX <span>USIL</span></div>
      <div style="font-size:13px;color:#888;margin-top:4px;">Plataforma de Trueque Universitario Sostenible</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:16px;font-weight:700;color:#1C2B2B;">REPORTE ADMINISTRATIVO</div>
      <div class="date">Generado: ${now}</div>
    </div>
  </div>

  <!-- CO2 Banner -->
  <div class="co2-banner">
    <div>
      <div style="font-size:12px;opacity:0.7;font-weight:600;letter-spacing:1px;margin-bottom:6px;">IMPACTO AMBIENTAL TOTAL</div>
      <div class="co2-val">${stats.totalCO2} kg</div>
      <div class="co2-label">de CO₂ ahorrado por la comunidad USIL</div>
      <div style="font-size:12px;opacity:0.7;margin-top:8px;">≈ ${(parseFloat(stats.totalCO2)/21).toFixed(1)} árboles/año · ${(parseFloat(stats.totalCO2)*4).toFixed(0)} km no recorridos</div>
    </div>
    <div style="font-size:72px;">🌍</div>
  </div>

  <!-- Stats -->
  <h2>📊 Resumen General</h2>
  <div class="stats-grid">
    <div class="stat-card"><div class="stat-icon">👥</div><div class="stat-val">${stats.users.length}</div><div class="stat-label">Usuarios registrados</div></div>
    <div class="stat-card"><div class="stat-icon">🔄</div><div class="stat-val">${stats.totalSwaps}</div><div class="stat-label">Trueques completados</div></div>
    <div class="stat-card"><div class="stat-icon">📦</div><div class="stat-val">${stats.items.length}</div><div class="stat-label">Artículos publicados</div></div>
    <div class="stat-card"><div class="stat-icon">💬</div><div class="stat-val">${stats.convos.length}</div><div class="stat-label">Conversaciones activas</div></div>
  </div>

  <!-- Users table -->
  <h2>👥 Usuarios Registrados (${stats.users.length})</h2>
  <div class="section-info">Lista completa de usuarios registrados en la plataforma TALIX. Incluye correo institucional, facultad, trueques realizados y estado de cuenta.</div>
  <table>
    <thead><tr><th>#</th><th>Nombre</th><th>Correo</th><th>Facultad</th><th>Trueques</th><th>CO₂ ahorrado</th><th>Estado</th><th>Registro</th></tr></thead>
    <tbody>
      ${stats.users.map((u,i) => `
        <tr>
          <td>${i+1}</td>
          <td><strong>${u.displayName||'—'}</strong></td>
          <td style="font-family:monospace;font-size:12px;">${u.email||'—'}</td>
          <td>${u.faculty||'—'}</td>
          <td><strong style="color:#1B4FBE;">${u.swaps||0}</strong></td>
          <td><strong style="color:#2E7D32;">${((u.swaps||0)*2.4).toFixed(1)} kg</strong></td>
          <td><span class="badge badge-${u.status||'activo'}">${u.status||'activo'}</span></td>
          <td>${u.joined||u.createdAt?new Date(u.createdAt||Date.now()).toLocaleDateString('es'):'-'}</td>
        </tr>
      `).join('')}
      ${stats.users.length===0?'<tr><td colspan="8" style="text-align:center;color:#AAA;padding:24px;">Sin usuarios registrados aún</td></tr>':''}
    </tbody>
  </table>

  <!-- Items table -->
  <h2>📦 Artículos Publicados (${stats.items.length})</h2>
  <div class="section-info">Todos los artículos disponibles para trueque en la plataforma, ordenados por fecha de publicación más reciente.</div>
  <table>
    <thead><tr><th>#</th><th>Título</th><th>Categoría</th><th>Estado</th><th>Publicado por</th><th>Facultad</th><th>CO₂ estimado</th><th>Propuestas</th></tr></thead>
    <tbody>
      ${stats.items.map((item,i) => `
        <tr>
          <td>${i+1}</td>
          <td><strong>${item.title||'—'}</strong></td>
          <td>${item.category||'—'}</td>
          <td>${item.condition||'—'}</td>
          <td>${item.user||'—'}</td>
          <td>${item.faculty||'—'}</td>
          <td><strong style="color:#2E7D32;">${item.co2||0} kg</strong></td>
          <td>${(item.proposals||[]).length}</td>
        </tr>
      `).join('')}
      ${stats.items.length===0?'<tr><td colspan="8" style="text-align:center;color:#AAA;padding:24px;">Sin artículos publicados aún</td></tr>':''}
    </tbody>
  </table>

  <!-- Conversations -->
  <h2>💬 Conversaciones Activas (${stats.convos.length})</h2>
  <table>
    <thead><tr><th>#</th><th>Artículo en trueque</th><th>Último mensaje</th><th>Fecha</th></tr></thead>
    <tbody>
      ${stats.convos.map((c,i) => `
        <tr>
          <td>${i+1}</td>
          <td><strong>${c.itemTitle||'Conversación general'}</strong></td>
          <td>${(c.lastMsg||'').slice(0,60)}</td>
          <td>${c.lastTime?new Date(c.lastTime).toLocaleDateString('es'):'-'}</td>
        </tr>
      `).join('')}
      ${stats.convos.length===0?'<tr><td colspan="4" style="text-align:center;color:#AAA;padding:24px;">Sin conversaciones aún</td></tr>':''}
    </tbody>
  </table>

  <!-- Emails -->
  <h2>📧 Correos Registrados</h2>
  <div class="section-info" style="font-family:monospace;font-size:12px;word-break:break-all;">
    ${AdminService.getEmailList().join(' · ') || 'Sin correos registrados aún'}
  </div>

  <!-- Faculty breakdown -->
  <h2>🎓 Distribución por Facultad</h2>
  <table>
    <thead><tr><th>Facultad</th><th>Usuarios</th><th>% del total</th></tr></thead>
    <tbody>
      ${Object.entries(stats.users.reduce((acc,u)=>{ const f=u.faculty||'No especificada'; acc[f]=(acc[f]||0)+1; return acc; },{})).sort((a,b)=>b[1]-a[1]).map(([f,count]) => `
        <tr><td>${f}</td><td><strong>${count}</strong></td><td>${stats.users.length?((count/stats.users.length)*100).toFixed(1):'0'}%</td></tr>
      `).join('')}
      ${stats.users.length===0?'<tr><td colspan="3" style="text-align:center;color:#AAA;">Sin datos</td></tr>':''}
    </tbody>
  </table>

  <div class="footer">
    <div>TALIX · Plataforma de Trueque Universitario · Universidad San Ignacio de Loyola</div>
    <div>Reporte generado automáticamente · ${now}</div>
  </div>
</body>
</html>`;
    return html;
  },

  openPDF: () => {
    const html = PDFReportService.generateAdminReport();
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 800);
  }
};

// Run seed on load
seedDefaultChats();

// Expose all services
Object.assign(window, { Auth, DB, ItemsService, ChatService, NotificationsService, AdminService, PDFReportService, DEMO_MODE });
