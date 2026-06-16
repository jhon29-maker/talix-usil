import { useState, useEffect } from 'react';
import { AdminService } from '../services/admin';
import { PDFReportService } from '../services/pdfReport';
import { categoryEmoji } from '../components/ui';
import { DB } from '../services/db';
import { UsersService } from '../services/users';
import { FIREBASE_READY, db, auth } from '../config/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';

const STATUS_COLOR = { activo: '#4CAF50', inactivo: '#999', pendiente: '#F5A623', baneado: '#E53935' };
const STATUS_BG    = { activo: '#E8F5E9', inactivo: '#F5F5F5', pendiente: '#FFF3E0', baneado: '#FFEBEE' };

export default function AdminDashboard({ onLogout }) {
  const [section, setSection] = useState('overview');
  const [stats, setStats] = useState({ users: [], items: [], convos: [], totalSwaps: 0, totalCO2: '0', activeUsers: 0, bannedUsers: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [banModal, setBanModal] = useState(null);
  const [banReason, setBanReason] = useState('');
  const [banIp, setBanIp] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null); // { userId, displayName }
  const [scamReportsState, setScamReportsState] = useState(DB.get('scam_reports') || []);

  // Poll Firestore for scam reports every 3s
  useEffect(() => {
    if (!FIREBASE_READY) return;
    let stopped = false;
    const poll = async () => {
      if (stopped) return;
      // Admin login is hardcoded (no Firebase Auth) — sign in anonymously so Firestore rules pass
      if (!auth.currentUser) {
        try { await signInAnonymously(auth); } catch (_) {}
      }
      if (!auth.currentUser) {
        setScamReportsState(DB.get('scam_reports') || []);
        if (!stopped) setTimeout(poll, 3000);
        return;
      }
      try {
        const snap = await getDocs(collection(db, 'scam_reports'));
        const firestoreReports = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const local = DB.get('scam_reports') || [];
        // Merge: prefer Firestore entries, keep local-only entries by id
        const allById = {};
        [...local, ...firestoreReports].forEach(r => { if (r.id) allById[r.id] = r; });
        const merged = Object.values(allById).sort((a, b) => (b.date || '') > (a.date || '') ? 1 : -1);
        DB.set('scam_reports', merged);
        setScamReportsState(merged);
      } catch (_) {
        setScamReportsState(DB.get('scam_reports') || []);
      }
      if (!stopped) setTimeout(poll, 3000);
    };
    poll();
    return () => { stopped = true; };
  }, []);

  useEffect(() => {
    // Subscribe to users in real-time (Firestore or localStorage)
    const unsub = UsersService.subscribe(users => {
      setStats(prev => {
        const base = AdminService.getStats();
        return {
          ...base,
          users,
          activeUsers: users.filter(u => u.status === 'activo' || !u.status).length,
          bannedUsers: users.filter(u => u.status === 'baneado').length,
          totalSwaps: users.reduce((s, u) => s + (u.swaps || 0), 0),
          totalCO2: users.reduce((s, u) => s + (u.co2 || 0), 0).toFixed(1),
        };
      });
    });
    // Still poll items/convos from localStorage every 2s
    const interval = setInterval(() => {
      setStats(prev => {
        const base = AdminService.getStats();
        return { ...prev, items: base.items, convos: base.convos };
      });
    }, 2000);
    return () => { unsub(); clearInterval(interval); };
  }, []);

  const scamReports = scamReportsState;
  const emailRegistry = (DB.get('email_registry') || []);
  // Merge users + email_registry, deduplicate by email
  const allEmails = Object.values(
    [...stats.users, ...emailRegistry].reduce((acc, u) => {
      if (u.email && !acc[u.email]) acc[u.email] = u;
      return acc;
    }, {})
  );

  const navItems = [
    { key: 'overview', icon: '📊', label: 'Resumen' },
    { key: 'users',    icon: '👥', label: `Usuarios (${stats.users.length})` },
    { key: 'emails',   icon: '📧', label: `Correos (${allEmails.length})` },
    { key: 'items',    icon: '📦', label: `Artículos (${stats.items.length})` },
    { key: 'chat',     icon: '💬', label: `Chats (${stats.convos.length})` },
    { key: 'scams',    icon: '🚨', label: `Estafas (${scamReports.length})` },
    { key: 'reports',  icon: '📈', label: 'Reportes' },
  ];

  const filteredUsers = stats.users.filter(u =>
    (statusFilter === 'todos' || u.status === statusFilter) &&
    ((u.displayName || '').toLowerCase().includes(search.toLowerCase()) ||
     (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
     (u.faculty || '').toLowerCase().includes(search.toLowerCase()))
  );

  const exportEmails = (format = 'txt') => {
    let content, filename, type;
    if (format === 'csv') {
      const header = 'Nombre,Correo,Facultad,Fecha Registro\n';
      const rows = allEmails.map(u => `"${u.displayName || ''}","${u.email || ''}","${u.faculty || ''}","${u.registeredAt || u.createdAt || ''}"`).join('\n');
      content = header + rows; filename = 'talix-correos.csv'; type = 'text/csv';
    } else {
      content = allEmails.map(u => u.email).join('\n');
      filename = 'talix-correos.txt'; type = 'text/plain';
    }
    const blob = new Blob([content], { type });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  };

  const facultyBreakdown = stats.users.reduce((acc, u) => {
    const f = u.faculty || 'Otra'; acc[f] = (acc[f] || 0) + 1; return acc;
  }, {});
  const faculties = Object.entries(facultyBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const recentActivity = [
    ...stats.users.slice(-3).map(u => ({ icon: '👤', text: `${u.displayName || 'Usuario'} se registró`, time: u.createdAt ? new Date(u.createdAt).toLocaleDateString('es') : '' })),
    ...stats.items.slice(0, 3).map(i => ({ icon: '📦', text: `${i.user || 'Usuario'} publicó: ${i.title || 'Artículo'}`, time: i.createdAt ? new Date(i.createdAt).toLocaleDateString('es') : '' })),
    ...stats.convos.slice(0, 2).map(c => ({ icon: '💬', text: 'Nueva conversación iniciada', time: c.lastTime ? new Date(c.lastTime).toLocaleDateString('es') : '' })),
  ].slice(0, 8);

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Poppins, sans-serif', background: '#0F1923' }}>
      {/* Admin sidebar */}
      <div style={{ width: 240, background: '#1A2332', display: 'flex', flexDirection: 'column', padding: '0 0 24px', height: '100vh', position: 'fixed', left: 0, top: 0 }}>
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontWeight: 800, fontSize: 22, color: '#fff' }}>TALIX</div>
          <div style={{ fontSize: 11, color: '#F5A623', fontWeight: 600, letterSpacing: '2px', marginTop: 2 }}>ADMINISTRADOR</div>
        </div>
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navItems.map(n => (
            <button key={n.key} onClick={() => setSection(n.key)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, border: 'none', background: section === n.key ? 'rgba(245,166,35,0.15)' : 'transparent', color: section === n.key ? '#F5A623' : 'rgba(255,255,255,0.5)', fontWeight: section === n.key ? 700 : 400, fontSize: 13, cursor: 'pointer', fontFamily: 'Poppins', textAlign: 'left', width: '100%', transition: 'all 0.15s' }}>
              <span style={{ fontSize: 16 }}>{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: 11, color: '#333', marginBottom: 8 }}>Última actualización: ahora</div>
          <button onClick={onLogout} style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#666', fontFamily: 'Poppins', fontSize: 13, cursor: 'pointer' }}>← Cerrar sesión admin</button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ marginLeft: 240, flex: 1, overflowY: 'auto', height: '100vh' }}>
        {/* Top bar */}
        <div style={{ padding: '20px 32px', background: '#1A2332', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: '#fff' }}>
              {navItems.find(n => n.key === section)?.icon} {navItems.find(n => n.key === section)?.label?.split(' (')[0]}
            </div>
            <div style={{ fontSize: 12, color: '#444', marginTop: 1 }}>Panel de control TALIX · USIL · Datos en tiempo real</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4CAF50', animation: 'blink 2s infinite' }} />
            <span style={{ fontSize: 12, color: '#4CAF50', fontWeight: 600 }}>EN VIVO</span>
            <button
              onClick={() => PDFReportService.openPDF()}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.3)', padding: '8px 16px', borderRadius: 100, cursor: 'pointer', fontFamily: 'Poppins', fontWeight: 600, fontSize: 12, color: '#F5A623', transition: 'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,166,35,0.25)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(245,166,35,0.15)'}
            >
              📄 Exportar PDF
            </button>
            <div style={{ background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.3)', padding: '6px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600, color: '#F5A623' }}>🔐 Admin USIL</div>
          </div>
        </div>

        <div style={{ padding: '28px 32px' }}>
          {/* OVERVIEW */}
          {section === 'overview' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
                {[
                  { icon: '👥', val: stats.users.length, label: 'Usuarios registrados', sub: `${stats.activeUsers} activos`, color: '#5B9BD5' },
                  { icon: '🔄', val: stats.totalSwaps, label: 'Trueques totales', sub: 'Acumulado', color: '#6DBE7E' },
                  { icon: '📦', val: stats.items.length, label: 'Artículos activos', sub: 'En plataforma', color: '#F5A623' },
                  { icon: '🌿', val: `${stats.totalCO2}kg`, label: 'CO₂ ahorrado', sub: 'Impacto total', color: '#4CAF50' },
                ].map((s, i) => (
                  <div key={i} style={{ background: '#1A2332', borderRadius: 20, padding: '20px 22px', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ fontSize: 28, marginBottom: 10 }}>{s.icon}</div>
                    <div style={{ fontWeight: 800, fontSize: 30, color: s.color, letterSpacing: '-1px' }}>{s.val}</div>
                    <div style={{ fontSize: 13, color: '#CCC', fontWeight: 600, marginTop: 2 }}>{s.label}</div>
                    <div style={{ fontSize: 11, color: '#555', marginTop: 3 }}>{s.sub}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div style={{ background: '#1A2332', borderRadius: 20, padding: 24, border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 18 }}>📊 Usuarios por facultad</div>
                  {faculties.length === 0
                    ? <div style={{ color: '#444', fontSize: 13 }}>Sin usuarios aún</div>
                    : faculties.map(([f, count], i) => {
                      const pct = (count / stats.users.length * 100).toFixed(0);
                      const colors = ['#5B9BD5', '#F5A623', '#6DBE7E', '#9C6BBE', '#4DB6AC', '#78909C'];
                      return (
                        <div key={f} style={{ marginBottom: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 12, color: '#888' }}>{f}</span>
                            <span style={{ fontSize: 12, color: colors[i % colors.length], fontWeight: 600 }}>{count} ({pct}%)</span>
                          </div>
                          <div style={{ height: 6, background: '#0F1923', borderRadius: 100 }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: colors[i % colors.length], borderRadius: 100 }} />
                          </div>
                        </div>
                      );
                    })
                  }
                </div>
                <div style={{ background: '#1A2332', borderRadius: 20, padding: 24, border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 18 }}>⚡ Actividad reciente</div>
                  {recentActivity.length === 0
                    ? <div style={{ color: '#444', fontSize: 13 }}>Sin actividad aún</div>
                    : recentActivity.map((a, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'flex-start' }}>
                        <span style={{ fontSize: 16, flexShrink: 0 }}>{a.icon}</span>
                        <div>
                          <div style={{ fontSize: 12, color: '#CCC', lineHeight: 1.4 }}>{a.text}</div>
                          <div style={{ fontSize: 11, color: '#444', marginTop: 2 }}>{a.time}</div>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
              <div style={{ background: '#1A2332', borderRadius: 20, padding: 24, border: '1px solid rgba(255,255,255,0.07)', marginTop: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 16 }}>📋 Estado de la plataforma</div>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Usuarios activos', val: stats.activeUsers, color: '#4CAF50' },
                    { label: 'Correos registrados', val: stats.users.length, color: '#5B9BD5' },
                    { label: 'Conversaciones abiertas', val: stats.convos.length, color: '#9C6BBE' },
                    { label: 'Artículos disponibles', val: stats.items.length, color: '#F5A623' },
                    { label: 'Pendientes de verificar', val: stats.users.filter(u => !u.verified).length, color: '#FF8A65' },
                  ].map((s, i) => (
                    <div key={i} style={{ background: '#0F1923', borderRadius: 14, padding: '14px 20px', flex: 1, minWidth: 120, textAlign: 'center' }}>
                      <div style={{ fontWeight: 800, fontSize: 24, color: s.color }}>{s.val}</div>
                      <div style={{ fontSize: 11, color: '#444', marginTop: 4 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* USERS */}
          {section === 'users' && (
            <div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15 }}>🔍</span>
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar por nombre, correo o facultad..."
                    style={{ width: '100%', padding: '10px 16px 10px 42px', background: '#1A2332', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontFamily: 'Poppins', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                {['todos', 'activo', 'inactivo', 'baneado'].map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)} style={{ padding: '9px 16px', borderRadius: 100, border: statusFilter !== s ? '1px solid rgba(255,255,255,0.1)' : 'none', cursor: 'pointer', background: statusFilter === s ? '#F5A623' : '#1A2332', color: statusFilter === s ? '#1C2B2B' : '#888', fontFamily: 'Poppins', fontWeight: 600, fontSize: 12, textTransform: 'capitalize' }}>{s}</button>
                ))}
                <button onClick={exportEmails} style={{ padding: '9px 18px', background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.3)', borderRadius: 100, color: '#F5A623', fontFamily: 'Poppins', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>📧 Exportar correos</button>
              </div>
              {/* Ban modal */}
              {banModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ background: '#1A2332', borderRadius: 20, width: 420, padding: 28, border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#fff', marginBottom: 6 }}>🚫 Banear usuario</div>
                    <div style={{ fontSize: 13, color: '#888', marginBottom: 18 }}>Usuario: <strong style={{ color: '#E57373' }}>{banModal.displayName}</strong></div>
                    <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Razón del baneo</label>
                    <input
                      value={banReason}
                      onChange={e => setBanReason(e.target.value)}
                      placeholder="Ej: Contenido inapropiado, múltiples incidencias..."
                      style={{ width: '100%', padding: '10px 14px', background: '#0F1923', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', fontFamily: 'Poppins', fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 14 }}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#E57373', marginBottom: 20 }}>
                      <input type="checkbox" checked={banIp} onChange={e => setBanIp(e.target.checked)} style={{ accentColor: '#E57373' }} />
                      También banear IP ({banModal.lastIp || 'IP no registrada'})
                    </label>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={() => { setBanModal(null); setBanReason(''); setBanIp(false); }} style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#888', fontFamily: 'Poppins', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
                      <button onClick={() => { AdminService.banUser(banModal.userId, banReason || 'Incumplimiento de normas', banIp); setStats(AdminService.getStats()); setBanModal(null); setBanReason(''); setBanIp(false); }} style={{ flex: 1, padding: '10px', background: 'rgba(229,57,53,0.2)', border: '1px solid rgba(229,57,53,0.4)', borderRadius: 10, color: '#E57373', fontFamily: 'Poppins', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Confirmar baneo</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Delete user confirmation modal */}
              {deleteModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ background: '#1A2332', borderRadius: 20, width: 400, padding: 28, border: '1px solid rgba(229,57,53,0.3)' }}>
                    <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 12 }}>⚠️</div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#fff', marginBottom: 8, textAlign: 'center' }}>Eliminar usuario permanentemente</div>
                    <div style={{ fontSize: 13, color: '#888', marginBottom: 20, textAlign: 'center', lineHeight: 1.6 }}>
                      ¿Seguro que quieres eliminar a <strong style={{ color: '#E57373' }}>{deleteModal.displayName}</strong>?<br />
                      Se borrarán sus artículos, mensajes y toda su actividad. <strong style={{ color: '#E57373' }}>Esta acción es irreversible.</strong>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={() => setDeleteModal(null)} style={{ flex: 1, padding: '11px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#888', fontFamily: 'Poppins', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
                      <button onClick={async () => { setDeleteModal(null); await AdminService.deleteUser(deleteModal.userId); setStats(AdminService.getStats()); }} style={{ flex: 1, padding: '11px', background: 'rgba(229,57,53,0.25)', border: '1px solid rgba(229,57,53,0.5)', borderRadius: 10, color: '#E57373', fontFamily: 'Poppins', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>🗑️ Eliminar todo</button>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ background: '#1A2332', borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1.5fr 0.7fr 1.2fr 1fr 1.2fr', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', fontSize: 11, fontWeight: 600, color: '#444', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <span>Nombre</span><span>Correo</span><span>Contraseña</span><span>Facultad</span><span>Pts</span><span>IP</span><span>Estado</span><span>Acciones</span>
                </div>
                {filteredUsers.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#444', fontSize: 13 }}>No se encontraron usuarios</div>
                ) : filteredUsers.map((u, i) => (
                  <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1.5fr 0.7fr 1.2fr 1fr 1.2fr', padding: '14px 20px', borderBottom: i < filteredUsers.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: u.avatarColor || '#2A3444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                        {(u.displayName || 'U').split(' ').map(w => w[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{u.displayName || 'Usuario'}</div>
                        {u.status === 'baneado' && u.banReason && <div style={{ fontSize: 10, color: '#E57373' }}>🚫 {u.banReason}</div>}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: '#666', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
                    <div style={{ fontSize: 11, color: '#6DBE7E', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u._pwd || '••••••'}</div>
                    <div style={{ fontSize: 12, color: '#777' }}>{u.faculty || '—'}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#F5A623' }}>{u.points || u.swaps || 0}</div>
                    <div style={{ fontSize: 10, color: '#555', fontFamily: 'monospace' }}>{u.lastIp || '—'}</div>
                    <div>
                      <span style={{ background: STATUS_BG[u.status || 'activo'] || '#E8F5E9', color: STATUS_COLOR[u.status || 'activo'] || '#4CAF50', padding: '4px 10px', borderRadius: 100, fontSize: 11, fontWeight: 600 }}>
                        {u.status || 'activo'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {u.status !== 'baneado' ? (
                        <button onClick={() => setBanModal({ userId: u.id, displayName: u.displayName, lastIp: u.lastIp })} style={{ padding: '5px 8px', background: 'rgba(229,57,53,0.12)', border: '1px solid rgba(229,57,53,0.25)', borderRadius: 8, color: '#E57373', fontSize: 11, cursor: 'pointer', fontFamily: 'Poppins', fontWeight: 600 }}>Banear</button>
                      ) : (
                        <button onClick={() => { AdminService.unbanUser(u.id); setStats(AdminService.getStats()); }} style={{ padding: '5px 8px', background: 'rgba(76,175,80,0.12)', border: '1px solid rgba(76,175,80,0.25)', borderRadius: 8, color: '#4CAF50', fontSize: 11, cursor: 'pointer', fontFamily: 'Poppins', fontWeight: 600 }}>Desbanear</button>
                      )}
                      <button onClick={() => setDeleteModal({ userId: u.id, displayName: u.displayName })} style={{ padding: '5px 8px', background: 'rgba(180,0,0,0.18)', border: '1px solid rgba(180,0,0,0.4)', borderRadius: 8, color: '#FF5252', fontSize: 11, cursor: 'pointer', fontFamily: 'Poppins', fontWeight: 700 }}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
              {/* Email list */}
              <div style={{ background: '#1A2332', borderRadius: 20, padding: 20, marginTop: 16, border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>📧 Correos registrados ({stats.users.length})</div>
                  <button onClick={exportEmails} style={{ padding: '7px 16px', background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.3)', borderRadius: 100, color: '#F5A623', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins' }}>↓ Descargar .txt</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {stats.users.map(u => (
                    <span key={u.id} style={{ background: '#0F1923', border: '1px solid rgba(255,255,255,0.06)', padding: '5px 12px', borderRadius: 100, fontSize: 11, color: '#666', fontFamily: 'monospace' }}>{u.email}</span>
                  ))}
                  {stats.users.length === 0 && <span style={{ fontSize: 13, color: '#444' }}>Sin usuarios registrados aún</span>}
                </div>
              </div>
            </div>
          )}

          {/* EMAILS */}
          {section === 'emails' && (
            <div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#fff', flex: 1 }}>📧 Base de correos registrados ({allEmails.length})</div>
                <button onClick={() => exportEmails('csv')} style={{ padding: '9px 18px', background: 'rgba(109,190,126,0.15)', border: '1px solid rgba(109,190,126,0.3)', borderRadius: 100, color: '#6DBE7E', fontFamily: 'Poppins', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>⬇️ Exportar CSV</button>
                <button onClick={() => exportEmails('txt')} style={{ padding: '9px 18px', background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.3)', borderRadius: 100, color: '#F5A623', fontFamily: 'Poppins', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>⬇️ Exportar TXT</button>
              </div>
              <div style={{ background: '#1A2332', borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 2.5fr 2fr 1.5fr', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', fontSize: 11, fontWeight: 600, color: '#444', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <span>Nombre</span><span>Correo</span><span>Facultad</span><span>Fecha registro</span>
                </div>
                {allEmails.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#444', fontSize: 13 }}>Sin correos registrados aún</div>
                ) : allEmails.map((u, i) => (
                  <div key={u.email} style={{ display: 'grid', gridTemplateColumns: '2fr 2.5fr 2fr 1.5fr', padding: '14px 20px', borderBottom: i < allEmails.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', alignItems: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#CCC' }}>{u.displayName || '—'}</div>
                    <div style={{ fontSize: 12, color: '#5B9BD5', fontFamily: 'monospace' }}>{u.email}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>{u.faculty || '—'}</div>
                    <div style={{ fontSize: 11, color: '#444' }}>{(u.registeredAt || u.createdAt) ? new Date(u.registeredAt || u.createdAt).toLocaleDateString('es') : '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ITEMS */}
          {section === 'items' && (
            <div style={{ background: '#1A2332', borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', fontWeight: 700, fontSize: 15, color: '#fff' }}>
                📦 Artículos en plataforma ({stats.items.length})
              </div>
              {stats.items.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#444', fontSize: 13 }}>Sin artículos publicados aún</div>
              ) : stats.items.map((item, i) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: i < stats.items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: item.bgColor || '#2A3444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, overflow: 'hidden' }}>
                    {item.photo ? <img src={item.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : categoryEmoji(item.category)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: '#555' }}>{item.user || 'Usuario'} · {item.faculty || ''} · {item.createdAt ? new Date(item.createdAt).toLocaleDateString('es') : ''}</div>
                  </div>
                  <span style={{ fontSize: 11, color: '#6DBE7E', fontWeight: 600, background: 'rgba(109,190,126,0.12)', padding: '4px 10px', borderRadius: 100, flexShrink: 0 }}>{item.category}</span>
                  <span style={{ fontSize: 12, color: '#F5A623', fontWeight: 700, flexShrink: 0 }}>-{item.co2}kg CO₂</span>
                  <span style={{ fontSize: 11, color: '#555', flexShrink: 0 }}>{(item.proposals || []).length} propuestas</span>
                  <button onClick={() => { AdminService.deleteItem(item.id); setStats(AdminService.getStats()); }} style={{ padding: '5px 12px', background: 'rgba(229,57,53,0.12)', border: '1px solid rgba(229,57,53,0.25)', borderRadius: 8, color: '#E57373', fontSize: 11, cursor: 'pointer', fontFamily: 'Poppins', fontWeight: 600, flexShrink: 0 }}>Retirar</button>
                </div>
              ))}
            </div>
          )}

          {/* CHATS */}
          {section === 'chat' && (
            <div style={{ background: '#1A2332', borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', fontWeight: 700, fontSize: 15, color: '#fff' }}>
                💬 Conversaciones activas ({stats.convos.length})
              </div>
              {stats.convos.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#444', fontSize: 13 }}>Sin conversaciones aún</div>
              ) : stats.convos.map((c, i) => (
                <div key={c.id} style={{ padding: '16px 20px', borderBottom: i < stats.convos.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 40, height: 40, background: '#0F1923', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>💬</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#CCC', fontWeight: 500 }}>{c.itemTitle || 'Conversación general'}</div>
                    <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{(c.lastMsg || '').slice(0, 60) || 'Sin mensajes'}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: '#F5A623', fontWeight: 600 }}>{c.unread || 0} sin leer</div>
                    <div style={{ fontSize: 11, color: '#444' }}>{c.lastTime ? new Date(c.lastTime).toLocaleDateString('es') : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SCAM REPORTS */}
          {section === 'scams' && (
            <div style={{ background: '#1A2332', borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', fontWeight: 700, fontSize: 15, color: '#fff' }}>
                🚨 Reportes de estafa ({scamReports.length})
              </div>
              {scamReports.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#444', fontSize: 13 }}>Sin reportes de estafa</div>
              ) : scamReports.map((r, i) => {
                const reportText = r.description || r.comment || '';
                const reportPhoto = r.photo || r.photoUrl || null;
                const reportDate = r.date || (r.createdAt?.toDate ? r.createdAt.toDate().toISOString() : r.createdAt) || '';
                return (
                <div key={r.id} style={{ padding: '18px 20px', borderBottom: i < scamReports.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <div style={{ fontSize: 32, flexShrink: 0 }}>🚨</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#E57373' }}>Reporte de {r.reporterName}</div>
                        <div style={{ fontSize: 11, color: '#444' }}>{reportDate ? new Date(reportDate).toLocaleDateString('es') : ''}</div>
                      </div>
                      <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>📦 Artículo: {r.itemTitle || 'No especificado'}</div>
                      {reportText ? <div style={{ fontSize: 13, color: '#CCC', lineHeight: 1.5, marginBottom: 8 }}>"{reportText}"</div> : null}
                      {reportPhoto && <img src={reportPhoto} alt="evidencia" style={{ maxWidth: 240, maxHeight: 160, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', display: 'block', marginBottom: 6 }} />}
                    </div>
                    <span style={{ background: r.status === 'pendiente' ? 'rgba(245,166,35,0.15)' : 'rgba(76,175,80,0.15)', color: r.status === 'pendiente' ? '#F5A623' : '#4CAF50', padding: '4px 10px', borderRadius: 100, fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                      {r.status}
                    </span>
                  </div>
                </div>
              );})}
            </div>
          )}

          {/* REPORTS */}
          {section === 'reports' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                <div style={{ background: '#1A2332', borderRadius: 20, padding: 24, border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#fff', marginBottom: 20 }}>📦 Artículos por categoría</div>
                  {['Libros', 'Tecnología', 'Ropa', 'Accesorios'].map((cat, i) => {
                    const count = stats.items.filter(item => item.category === cat).length;
                    const pct = stats.items.length ? Math.round(count / stats.items.length * 100) : 0;
                    const colors = ['#6DBE7E', '#5B9BD5', '#F5A623', '#9C6BBE'];
                    return (
                      <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                        <span style={{ fontSize: 20, flexShrink: 0 }}>{categoryEmoji(cat)}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 12, color: '#888' }}>{cat}</span>
                            <span style={{ fontSize: 12, color: colors[i], fontWeight: 600 }}>{count}</span>
                          </div>
                          <div style={{ height: 6, background: '#0F1923', borderRadius: 100 }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: colors[i], borderRadius: 100 }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ background: '#1A2332', borderRadius: 20, padding: 24, border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#fff', marginBottom: 20 }}>🌿 Impacto ambiental acumulado</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ background: '#0F1923', borderRadius: 16, padding: '18px 20px', textAlign: 'center' }}>
                      <div style={{ fontSize: 36, marginBottom: 6 }}>🌍</div>
                      <div style={{ fontWeight: 800, fontSize: 28, color: '#4CAF50' }}>{stats.totalCO2} kg</div>
                      <div style={{ fontSize: 13, color: '#666' }}>CO₂ total ahorrado</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div style={{ background: '#0F1923', borderRadius: 14, padding: '14px', textAlign: 'center' }}>
                        <div style={{ fontWeight: 800, fontSize: 20, color: '#5B9BD5' }}>{(parseFloat(stats.totalCO2) / 21).toFixed(1)}</div>
                        <div style={{ fontSize: 11, color: '#555', marginTop: 3 }}>Árboles/año equiv.</div>
                      </div>
                      <div style={{ background: '#0F1923', borderRadius: 14, padding: '14px', textAlign: 'center' }}>
                        <div style={{ fontWeight: 800, fontSize: 20, color: '#F5A623' }}>{(parseFloat(stats.totalCO2) * 4).toFixed(0)}</div>
                        <div style={{ fontSize: 11, color: '#555', marginTop: 3 }}>Km no recorridos</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ background: '#1A2332', borderRadius: 20, padding: 24, border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#fff', marginBottom: 16 }}>📋 Resumen ejecutivo</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14 }}>
                  {[
                    { label: 'Total usuarios', val: stats.users.length, color: '#5B9BD5' },
                    { label: 'Total artículos', val: stats.items.length, color: '#F5A623' },
                    { label: 'Total chats', val: stats.convos.length, color: '#9C6BBE' },
                    { label: 'CO₂ ahorrado', val: `${stats.totalCO2}kg`, color: '#4CAF50' },
                    { label: 'Usuarios activos', val: stats.activeUsers, color: '#6DBE7E' },
                  ].map((s, i) => (
                    <div key={i} style={{ background: '#0F1923', borderRadius: 14, padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ fontWeight: 800, fontSize: 22, color: s.color }}>{s.val}</div>
                      <div style={{ fontSize: 11, color: '#444', marginTop: 4 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
