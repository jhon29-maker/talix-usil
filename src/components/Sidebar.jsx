import { TAvatar } from './ui';

const NAV = [
  { key: 'feed',      icon: '🏠', label: 'Inicio' },
  { key: 'post',      icon: '➕', label: 'Publicar' },
  { key: 'chat',      icon: '💬', label: 'Mensajes' },
  { key: 'dashboard', icon: '🌿', label: 'Impacto CO₂' },
  { key: 'points',    icon: '🏆', label: 'Puntos' },
  { key: 'profile',   icon: '👤', label: 'Mi Perfil' },
];

export default function Sidebar({ page, setPage, currentUser, theme, onLogout }) {
  return (
    <div style={{ width: 220, background: theme.primary, display: 'flex', flexDirection: 'column', padding: '0 0 20px', height: '100vh', position: 'fixed', left: 0, top: 0, zIndex: 100, boxShadow: '2px 0 16px rgba(0,0,0,0.12)' }}>
      <div style={{ padding: '26px 22px 18px', borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
        <div style={{ fontWeight: 800, fontSize: 26, color: '#fff', letterSpacing: '-1px' }}>TALIX</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2, fontWeight: 500 }}>Trueque Universitario · USIL</div>
      </div>
      <nav style={{ flex: 1, padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
        {NAV.map(n => (
          <button
            key={n.key}
            onClick={() => setPage(n.key)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 14, border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', background: page === n.key ? 'rgba(255,255,255,0.18)' : 'transparent', color: page === n.key ? '#fff' : 'rgba(255,255,255,0.65)', fontWeight: page === n.key ? 600 : 400, fontSize: 14, fontFamily: 'Poppins', transition: 'all 0.15s' }}
            onMouseEnter={e => { if (page !== n.key) e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; }}
            onMouseLeave={e => { if (page !== n.key) e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{ fontSize: 17 }}>{n.icon}</span>{n.label}
          </button>
        ))}
      </nav>
      <div style={{ padding: '14px 16px 0', borderTop: '1px solid rgba(255,255,255,0.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <TAvatar name={currentUser?.displayName || 'U'} color="rgba(255,255,255,0.2)" size={36} />
          <div style={{ minWidth: 0 }}>
            <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentUser?.displayName || 'Usuario'}</div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>{currentUser?.faculty?.split(' ')[0] || 'USIL'}</div>
          </div>
        </div>
        <button onClick={onLogout} style={{ width: '100%', padding: '8px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'rgba(255,255,255,0.45)', fontFamily: 'Poppins', fontSize: 12, cursor: 'pointer' }}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
