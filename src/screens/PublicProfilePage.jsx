import { useState, useEffect } from 'react';
import { DB } from '../services/db';
import { ItemsService } from '../services/items';
import { ChatService } from '../services/chat';
import { TTopBar, TAvatar, TItemCard, TButton } from '../components/ui';

export default function PublicProfilePage({ userId, setPage, currentUser, theme, showToast }) {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);

  useEffect(() => {
    const users = DB.get('users') || [];
    const found = users.find(u => u.id === userId);
    setUser(found || null);
    const unsub = ItemsService.getAll(all => setItems(all.filter(i => i.userId === userId)));
    return unsub;
  }, [userId]);

  const handleMessage = () => {
    const convId = ChatService.getConversationId(currentUser.id, user.id);
    ChatService.sendMessage(convId, currentUser, `Hola ${user.displayName}, me gustaría hacer un trueque contigo.`, [currentUser.id, user.id], 'General');
    setPage('chat');
    showToast('Conversación iniciada con ' + user.displayName, 'success');
  };

  if (!user) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#AAA' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>👤</div>
        <div style={{ marginTop: 12 }}>Usuario no encontrado</div>
      </div>
    </div>
  );

  return (
    <div>
      <TTopBar
        title="Perfil de usuario"
        theme={theme}
        rightEl={<button onClick={() => setPage('feed')} style={{ background: '#F4F6F0', border: 'none', padding: '8px 18px', borderRadius: 100, cursor: 'pointer', fontFamily: 'Poppins', fontSize: 13, fontWeight: 600, color: '#555' }}>← Volver</button>}
      />
      <div style={{ padding: '32px', maxWidth: 900 }}>
        <div style={{ background: '#fff', borderRadius: 24, overflow: 'hidden', border: '1px solid #EEE', marginBottom: 24 }}>
          <div style={{ height: 110, background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})` }} />
          <div style={{ padding: '0 32px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -36, marginBottom: 12 }}>
              <TAvatar name={user.displayName || 'U'} color={user.avatarColor} size={72} />
              {currentUser?.id !== user.id && (
                <TButton onClick={handleMessage} theme={theme} style={{ padding: '11px 24px' }}>💬 Enviar mensaje</TButton>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontWeight: 800, fontSize: 20, color: '#1C2B2B' }}>{user.displayName}</span>
              <span style={{ background: '#E8F5E9', color: '#2E7D32', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100 }}>✓ USIL Verificado</span>
            </div>
            <div style={{ fontSize: 14, color: '#888', marginBottom: 16 }}>{user.faculty} · USIL</div>
          </div>
          <div style={{ display: 'flex', borderTop: '1px solid #EEE' }}>
            {[
              { val: user.swaps || 0, label: 'Trueques' },
              { val: `${user.co2 || 0}kg`, label: 'CO₂ ahorrado' },
              { val: items.length, label: 'Artículos' },
              { val: user.joined || '2025', label: 'Miembro desde' },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, padding: '18px 0', textAlign: 'center', borderRight: i < 3 ? '1px solid #EEE' : 'none' }}>
                <div style={{ fontWeight: 800, fontSize: 22, color: theme.primary }}>{s.val}</div>
                <div style={{ fontSize: 12, color: '#999' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontWeight: 700, fontSize: 16, color: '#1C2B2B', marginBottom: 14 }}>Artículos de {user.displayName}</div>
        {items.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 20, padding: '40px', textAlign: 'center', border: '1px solid #EEE', color: '#AAA' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📦</div>
            <div style={{ fontSize: 14 }}>Sin artículos publicados aún</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16 }}>
            {items.map(item => <TItemCard key={item.id} item={item} theme={theme} currentUserId={currentUser?.id} onClick={() => {}} onUserClick={() => {}} />)}
          </div>
        )}
      </div>
    </div>
  );
}
