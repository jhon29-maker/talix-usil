import { useState, useRef } from 'react';
import { DB } from '../services/db';
import { ChatService } from '../services/chat';
import { Auth } from '../services/auth';

const POINTS_PER_TRADE = 10;

function awardPoints(userId) {
  const users = DB.get('users') || [];
  const idx = users.findIndex(u => u.id === userId);
  if (idx >= 0) {
    users[idx] = {
      ...users[idx],
      points: (users[idx].points || 0) + POINTS_PER_TRADE,
      swaps: (users[idx].swaps || 0) + 1,
      co2: (users[idx].co2 || 0) + 3.5,
    };
    DB.set('users', users);
    // update current session
    const current = Auth.getCurrentUser();
    if (current?.id === userId) {
      const updated = { ...current, points: users[idx].points, swaps: users[idx].swaps, co2: users[idx].co2 };
      localStorage.setItem('talix_current_user', JSON.stringify(updated));
    }
  }
}

export default function TradeCompleteModal({ conv, currentUser, theme, onClose, showToast }) {
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef(null);

  const handleFile = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPhoto(ev.target.result);
    reader.readAsDataURL(file);
  };

  const confirm = async () => {
    setLoading(true);
    // Award points to both participants
    (conv.participants || []).forEach(uid => awardPoints(uid));

    // Add system message
    const sysMsg = {
      convId: conv.id,
      fromId: 'system',
      fromName: 'TALIX',
      fromColor: '#2E7D32',
      text: `🎉 ¡Trueque completado! Ambos participantes ganaron +${POINTS_PER_TRADE} puntos TALIX.`,
      isSystem: true,
      evidencePhoto: photo || null,
      read: false,
      createdAt: new Date().toISOString(),
    };

    // Mark conversation as completed
    const convos = DB.get('conversations') || [];
    const idx = convos.findIndex(c => c.id === conv.id);
    if (idx >= 0) {
      convos[idx] = { ...convos[idx], status: 'completado', completedAt: new Date().toISOString() };
      DB.set('conversations', convos);
    }
    DB.push('msgs_' + conv.id, sysMsg);

    setLoading(false);
    setDone(true);
  };

  if (done) return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 8000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 420, padding: '40px 36px', textAlign: 'center', boxShadow: '0 24px 80px rgba(0,0,0,0.2)' }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>🎉</div>
        <div style={{ fontWeight: 800, fontSize: 22, color: '#1C2B2B', marginBottom: 8 }}>¡Trueque completado!</div>
        <div style={{ color: '#555', fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
          Ambas partes ganaron <strong style={{ color: theme.primary }}>+{POINTS_PER_TRADE} puntos TALIX</strong>.<br />
          Acumula puntos para subir de nivel en la comunidad.
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 24 }}>
          {[['🥉', 'Bronce', 10], ['🥈', 'Plata', 50], ['🥇', 'Oro', 100]].map(([medal, name, pts]) => (
            <div key={name} style={{ background: '#F4F6F0', borderRadius: 14, padding: '12px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 28 }}>{medal}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#555', marginTop: 4 }}>{name}</div>
              <div style={{ fontSize: 10, color: '#AAA' }}>{pts}+ pts</div>
            </div>
          ))}
        </div>
        <button onClick={onClose} style={{ width: '100%', padding: 14, background: theme.primary, color: '#fff', border: 'none', borderRadius: 14, fontFamily: 'Poppins', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
          Ver mis puntos →
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 8000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 440, boxShadow: '0 24px 80px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
        <div style={{ padding: '22px 24px 16px', borderBottom: '1px solid #EEE', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 17, color: '#1C2B2B' }}>✅ Confirmar trueque completado</div>
          <button onClick={onClose} style={{ background: '#F4F6F0', border: 'none', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 15 }}>✕</button>
        </div>
        <div style={{ padding: '20px 24px 24px' }}>
          <div style={{ background: '#F0FBF4', border: '1px solid #C8E6C9', borderRadius: 14, padding: '14px 16px', marginBottom: 20, fontSize: 13, color: '#2E7D32', lineHeight: 1.6 }}>
            🏆 Al confirmar, ambas partes recibirán <strong>+{POINTS_PER_TRADE} puntos TALIX</strong> y se sumará un trueque a su historial.
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 10 }}>📷 Foto de evidencia (opcional)</div>
            <div
              onClick={() => fileRef.current?.click()}
              style={{ height: 140, border: `2px dashed ${photo ? theme.primary : '#DDD'}`, borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', background: '#FAFAFA' }}
            >
              {photo ? (
                <img src={photo} alt="evidencia" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <>
                  <span style={{ fontSize: 36, marginBottom: 8 }}>📸</span>
                  <span style={{ fontSize: 12, color: '#888' }}>Sube una foto del intercambio</span>
                  <span style={{ fontSize: 11, color: '#BBB', marginTop: 4 }}>Esto genera confianza en la comunidad</span>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
          </div>

          <button
            onClick={confirm}
            disabled={loading}
            style={{ width: '100%', padding: 14, background: loading ? '#DDD' : '#2E7D32', color: '#fff', border: 'none', borderRadius: 14, fontFamily: 'Poppins', fontWeight: 700, fontSize: 15, cursor: loading ? 'default' : 'pointer' }}
          >
            {loading ? '⏳ Procesando...' : '🎉 Confirmar trueque completado'}
          </button>
        </div>
      </div>
    </div>
  );
}
