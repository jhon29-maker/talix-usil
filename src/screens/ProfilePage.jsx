import { useState, useEffect, useRef } from 'react';
import { DB } from '../services/db';
import { ItemsService } from '../services/items';
import { TTopBar, TAvatar, TItemCard, TButton } from '../components/ui';

const HISTORY = [
  { item: 'Cálculo Larson', with: 'Ana M.', date: '15 Abr', co2: 2.4 },
  { item: 'Auriculares Sony', with: 'Carlos R.', date: '10 Abr', co2: 8.0 },
];

export default function ProfilePage({ setPage, currentUser, theme, showToast }) {
  const [myItems, setMyItems] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [avatarPhoto, setAvatarPhoto] = useState(null);
  const avatarRef = useRef(null);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = ItemsService.getAll(items => setMyItems(items.filter(i => i.userId === currentUser.id)));
    return unsub;
  }, [currentUser]);

  const handleAvatarChange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setAvatarPhoto(ev.target.result);
    reader.readAsDataURL(file);
  };

  const saveProfile = () => {
    const users = DB.get('users') || [];
    const idx = users.findIndex(u => u.id === currentUser.id);
    if (idx >= 0) {
      users[idx] = { ...users[idx], displayName, ...(avatarPhoto ? { photo: avatarPhoto } : {}) };
      DB.set('users', users);
      localStorage.setItem('talix_current_user', JSON.stringify(users[idx]));
    }
    setEditMode(false);
    showToast('¡Perfil actualizado!', 'success');
  };

  return (
    <div>
      <TTopBar
        title="Mi Perfil"
        subtitle="Tu actividad en TALIX"
        theme={theme}
        rightEl={
          <button
            onClick={() => editMode ? saveProfile() : setEditMode(true)}
            style={{ background: editMode ? theme.primary : '#F4F6F0', color: editMode ? '#fff' : '#555', border: 'none', padding: '9px 18px', borderRadius: 100, cursor: 'pointer', fontFamily: 'Poppins', fontWeight: 600, fontSize: 13, transition: 'all 0.2s' }}
          >
            {editMode ? '✓ Guardar cambios' : '✏️ Editar perfil'}
          </button>
        }
      />
      <div style={{ padding: '32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24 }}>
          {/* Profile card */}
          <div>
            <div style={{ background: '#fff', borderRadius: 24, overflow: 'hidden', border: '1px solid #EEE', marginBottom: 16 }}>
              <div style={{ height: 90, background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})` }} />
              <div style={{ padding: '0 24px 24px' }}>
                <div style={{ marginTop: -36, marginBottom: 12, position: 'relative', width: 'fit-content' }}>
                  {avatarPhoto
                    ? <img src={avatarPhoto} alt="avatar" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid #fff' }} />
                    : <TAvatar name={currentUser?.displayName || 'U'} color={currentUser?.avatarColor} size={72} />
                  }
                  {editMode && (
                    <button onClick={() => avatarRef.current?.click()} style={{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: '50%', background: theme.primary, border: '2px solid #fff', color: '#fff', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📷</button>
                  )}
                  <input ref={avatarRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
                </div>
                {editMode ? (
                  <input value={displayName} onChange={e => setDisplayName(e.target.value)} style={{ fontWeight: 700, fontSize: 17, color: '#1C2B2B', border: '1.5px solid #EEE', borderRadius: 8, padding: '6px 10px', fontFamily: 'Poppins', width: '100%', boxSizing: 'border-box', marginBottom: 6 }} />
                ) : (
                  <div style={{ fontWeight: 700, fontSize: 17, color: '#1C2B2B', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {currentUser?.displayName}
                    <span style={{ background: '#E8F5E9', color: '#2E7D32', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100 }}>✓ USIL</span>
                  </div>
                )}
                <div style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>{currentUser?.faculty} · USIL</div>
                <div style={{ fontSize: 12, color: '#AAA', marginBottom: 4 }}>📧 {currentUser?.email}</div>
                <div style={{ fontSize: 12, color: '#AAA', marginBottom: 16 }}>📅 Miembro desde {currentUser?.joined}</div>
                <TButton onClick={() => setPage('post')} theme={theme} style={{ width: '100%', padding: '10px 0', fontSize: 13, textAlign: 'center' }}>+ Publicar artículo</TButton>
              </div>
            </div>
            {/* Stats */}
            <div style={{ background: '#fff', borderRadius: 24, padding: 20, border: '1px solid #EEE' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1C2B2B', marginBottom: 14 }}>Estadísticas</div>
              {[
                { label: 'Artículos publicados', val: myItems.length, icon: '📦' },
                { label: 'Trueques completados', val: currentUser?.swaps || 0, icon: '🔄' },
                { label: 'CO₂ ahorrado', val: `${currentUser?.co2 || 0}kg`, icon: '🌿' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F5F5F5' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{s.icon}</span>
                    <span style={{ fontSize: 13, color: '#555' }}>{s.label}</span>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 14, color: theme.primary }}>{s.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Items + history */}
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, color: '#1C2B2B', marginBottom: 14 }}>Mis artículos publicados ({myItems.length})</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14, marginBottom: 24 }}>
              {myItems.map(item => (
                <TItemCard key={item.id} item={item} theme={theme} currentUserId={currentUser?.id} onClick={() => {}} onUserClick={() => {}} />
              ))}
              <div
                onClick={() => setPage('post')}
                style={{ minHeight: 240, border: '2px dashed #C8D8C8', borderRadius: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: 8, transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = theme.primary; e.currentTarget.style.background = `${theme.primary}05`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#C8D8C8'; e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ fontSize: 36 }}>➕</span>
                <span style={{ fontSize: 13, color: '#888', fontWeight: 500 }}>Publicar artículo</span>
              </div>
            </div>

            {/* Trade history */}
            <div style={{ background: '#fff', borderRadius: 20, padding: 20, border: '1px solid #EEE' }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#1C2B2B', marginBottom: 14 }}>Historial de trueques</div>
              {HISTORY.map((h, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: i < HISTORY.length - 1 ? '1px solid #F5F5F5' : 'none' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: '#E8F5E9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🔄</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1C2B2B' }}>{h.item}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>Con {h.with} · {h.date}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: '#2E7D32', fontWeight: 600 }}>-{h.co2}kg CO₂</div>
                    <div style={{ fontSize: 11, color: '#AAA' }}>✅ Completado</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
