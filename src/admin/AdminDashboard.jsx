import { useState, useEffect } from 'react';
import { AdminService } from '../services/admin';
import { PDFReportService } from '../services/pdfReport';
import { categoryEmoji } from '../components/ui';

const STATUS_COLOR = { activo: '#4CAF50', inactivo: '#999', pendiente: '#F5A623', baneado: '#E53935' };
const STATUS_BG    = { activo: '#E8F5E9', inactivo: '#F5F5F5', pendiente: '#FFF3E0', baneado: '#FFEBEE' };

export default function AdminDashboard({ onLogout }) {
  const [section, setSection] = useState('overview');
  const [stats, setStats] = useState({ users: [], items: [], convos: [], totalSwaps: 0, totalCO2: '0', activeUsers: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  useEffect(() => {
    setStats(AdminService.getStats());
    const interval = setInterval(() => setStats(AdminService.getStats()), 2000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { key: 'overview', icon: '📊', label: 'Resumen' },
    { key: 'users',    icon: '👥', label: `Usuarios (${stats.users.length})` },
    { key: 'items',    icon: '📦', label: `Artículos (${stats.items.length})` },
    { key: 'chat',     icon: '💬', label: `Chats (${stats.convos.length})` },
    { key: 'reports',  icon: '📈', label: 'Reportes' },
  ];

  const filteredUsers = stats.users.filter(u =>
    (statusFilter === 'todos' || u.status === statusFilter) &&
    ((u.displayName || '').toLowerCase().includes(search.toLowerCase()) ||
     (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
     (u.faculty || '').toLowerCase().includes(search.toLowerCase()))
  );

  const exportEmails = () => {
    const emails = AdminService.getEmailList().join('\n');
    const blob = new Blob([emails], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'talix-emails.txt';
    a.click();
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
              <div style={{ background: '#1A2332', borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 2.5fr 1.5fr 0.8fr 1fr 1fr', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', fontSize: 11, fontWeight: 600, color: '#444', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <span>Nombre</span><span>Correo</span><span>Facultad</span><span>Trueques</span><span>Estado</span><span>Acciones</span>
                </div>
                {filteredUsers.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#444', fontSize: 13 }}>No se encontraron usuarios</div>
                ) : filteredUsers.map((u, i) => (
                  <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '2fr 2.5fr 1.5fr 0.8fr 1fr 1fr', padding: '14px 20px', borderBottom: i < filteredUsers.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: u.avatarColor || '#2A3444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                        {(u.displayName || 'U').split(' ').map(w => w[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{u.displayName || 'Usuario'}</div>
                        <div style={{ fontSize: 11, color: '#444' }}>Desde {u.joined || '2025'}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: '#666', fontFamily: 'monospace' }}>{u.email}</div>
                    <div style={{ fontSize: 12, color: '#777' }}>{u.faculty || '—'}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#F5A623' }}>{u.swaps || 0}</div>
                    <div>
                      <span style={{ background: STATUS_BG[u.status || 'activo'] || '#E8F5E9', color: STATUS_COLOR[u.status || 'activo'] || '#4CAF50', padding: '4px 10px', borderRadius: 100, fontSize: 11, fontWeight: 600 }}>
                        {u.status || 'activo'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {u.status !== 'baneado' && (
                        <button onClick={() => { AdminService.banUser(u.id); setStats(AdminService.getStats()); }} style={{ padding: '5px 10px', background: 'rgba(229,57,53,0.12)', border: '1px solid rgba(229,57,53,0.25)', borderRadius: 8, color: '#E57373', fontSize: 11, cursor: 'pointer', fontFamily: 'Poppins', fontWeight: 600 }}>Banear</button>
                      )}
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
