import { useState, useRef } from 'react';
import { DB } from '../services/db';
import { Auth } from '../services/auth';
import { ChatService } from '../services/chat';
import { FIREBASE_READY, db } from '../config/firebase';
import { doc, updateDoc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';

const POINTS_PER_TRADE = 10;

function awardPoints(userId, delta = POINTS_PER_TRADE) {
  const users = DB.get('users') || [];
  const idx = users.findIndex(u => u.id === userId);
  if (idx < 0) return;
  users[idx] = {
    ...users[idx],
    points: Math.max(0, (users[idx].points || 0) + delta),
    swaps: (users[idx].swaps || 0) + (delta > 0 ? 1 : 0),
    co2: (users[idx].co2 || 0) + (delta > 0 ? 3.5 : 0),
  };
  DB.set('users', users);
  const current = Auth.getCurrentUser();
  if (current?.id === userId) {
    localStorage.setItem('talix_current_user', JSON.stringify({ ...current, ...users[idx] }));
  }
}

function saveRating(targetUserId, fromUserId, stars, comment) {
  const users = DB.get('users') || [];
  const idx = users.findIndex(u => u.id === targetUserId);
  if (idx < 0) return;
  const ratings = [...(users[idx].ratings || []), { from: fromUserId, stars, comment, date: new Date().toISOString() }];
  users[idx] = { ...users[idx], ratings };
  DB.set('users', users);
}

function saveScamReport(conv, currentUser, description, photo) {
  const reports = DB.get('scam_reports') || [];
  reports.unshift({
    id: Date.now().toString(),
    convId: conv.id,
    itemTitle: conv.itemTitle || '',
    reportedBy: currentUser.id,
    reporterName: currentUser.displayName,
    participants: conv.participants || [],
    description,
    photo: photo || null,
    date: new Date().toISOString(),
    status: 'pendiente',
  });
  DB.set('scam_reports', reports);
}

export default function TradeCompleteModal({ conv, currentUser, theme, onClose, showToast }) {
  const [mode, setMode] = useState(null); // 'complete' | 'scam'
  const [photo, setPhoto] = useState(null);
  const [comment, setComment] = useState('');
  const [stars, setStars] = useState(0);
  const [hoverStar, setHoverStar] = useState(0);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [doneModeResult, setDoneModeResult] = useState(null);
  const fileRef = useRef(null);

  const otherId = (conv.participants || []).find(p => p !== currentUser?.id);
  const otherName = (() => {
    if (conv.participantNames) {
      const k = Object.keys(conv.participantNames).find(k => k !== currentUser?.id && k !== 'demo_joel');
      if (k) return conv.participantNames[k];
    }
    const users = DB.get('users') || [];
    return users.find(u => u.id === otherId)?.displayName || 'tu compañero';
  })();

  const handleFile = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPhoto(ev.target.result);
    reader.readAsDataURL(file);
  };

  const confirmComplete = async () => {
    setLoading(true);
    [currentUser.id, otherId].filter(Boolean).forEach(uid => awardPoints(uid));
    if (stars > 0 && otherId) saveRating(otherId, currentUser.id, stars, comment);

    const sysMsg = {
      convId: conv.id, fromId: 'system', fromName: 'TALIX', fromColor: '#2E7D32',
      text: `🎉 ¡Trueque completado por ${currentUser.displayName}! Ambas partes ganaron +${POINTS_PER_TRADE} pts TALIX.${comment ? ` "${comment}"` : ''}`,
      isSystem: true, evidencePhoto: photo || null, read: false,
      createdAt: FIREBASE_READY ? serverTimestamp() : new Date().toISOString(),
    };

    if (FIREBASE_READY) {
      try {
        await addDoc(collection(db, 'conversations', conv.id, 'messages'), sysMsg);
        await setDoc(doc(db, 'conversations', conv.id), { status: 'completado', completedAt: new Date().toISOString() }, { merge: true });
      } catch (_) {}
      // Notify the other participant to confirm
      if (otherId) {
        await ChatService.notifyTradeComplete(conv.id, currentUser, otherId, conv.participants || [], conv.itemTitle);
      }
    } else {
      const convos = DB.get('conversations') || [];
      const idx = convos.findIndex(c => c.id === conv.id);
      if (idx >= 0) { convos[idx] = { ...convos[idx], status: 'completado', completedAt: new Date().toISOString() }; DB.set('conversations', convos); }
      DB.push('msgs_' + conv.id, sysMsg);
    }

    setLoading(false);
    setDone(true);
    setDoneModeResult('complete');
  };

  const confirmScam = async () => {
    if (!comment.trim()) { showToast('Por favor describe lo que ocurrió', 'error'); return; }
    setLoading(true);
    saveScamReport(conv, currentUser, comment, photo);
    const sysMsg = {
      convId: conv.id, fromId: 'system', fromName: 'TALIX', fromColor: '#E53935',
      text: '🚨 Se ha reportado una incidencia en este trueque. El equipo de TALIX revisará el caso.',
      isSystem: true, read: false, createdAt: new Date().toISOString(),
    };
    DB.push('msgs_' + conv.id, sysMsg);
    setLoading(false);
    setDone(true);
    setDoneModeResult('scam');
  };

  if (done) return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 8000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 420, padding: '40px 36px', textAlign: 'center' }}>
        {doneModeResult === 'complete' ? (
          <>
            <div style={{ fontSize: 72, marginBottom: 12 }}>🎉</div>
            <div style={{ fontWeight: 800, fontSize: 22, color: '#1C2B2B', marginBottom: 8 }}>¡Trueque completado!</div>
            <div style={{ color: '#555', fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
              Ambas partes ganaron <strong style={{ color: theme.primary }}>+{POINTS_PER_TRADE} puntos TALIX</strong>.
              {stars > 0 && <><br />Calificaste a {otherName} con {stars} ★</>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
              {[['🌱','Semilla',0],['🥉','Bronce',10],['🥈','Plata',50],['🥇','Oro',100]].map(([m,n,p]) => (
                <div key={n} style={{ background: '#F4F6F0', borderRadius: 12, padding: '10px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 24 }}>{m}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#555', marginTop: 3 }}>{n}</div>
                  <div style={{ fontSize: 10, color: '#AAA' }}>{p}+ pts</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 72, marginBottom: 12 }}>🚨</div>
            <div style={{ fontWeight: 800, fontSize: 22, color: '#C62828', marginBottom: 8 }}>Reporte enviado</div>
            <div style={{ color: '#555', fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
              El equipo de TALIX revisará tu reporte y tomará las medidas necesarias. Gracias por ayudar a mantener la comunidad segura.
            </div>
          </>
        )}
        <button onClick={onClose} style={{ width: '100%', padding: 14, background: theme.primary, color: '#fff', border: 'none', borderRadius: 14, fontFamily: 'Poppins', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
          {doneModeResult === 'complete' ? 'Ver mis puntos →' : 'Cerrar'}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 8000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '22px 24px 16px', borderBottom: '1px solid #EEE', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 17, color: '#1C2B2B' }}>¿Cómo finalizó el trueque?</div>
          <button onClick={onClose} style={{ background: '#F4F6F0', border: 'none', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 15 }}>✕</button>
        </div>

        {!mode && (
          <div style={{ padding: '24px' }}>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 20, textAlign: 'center' }}>
              Selecciona lo que ocurrió con el intercambio con <strong>{otherName}</strong>:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <button onClick={() => setMode('complete')} style={{ padding: '24px 16px', background: '#F0FBF4', border: '2px solid #C8E6C9', borderRadius: 18, cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#2E7D32'; e.currentTarget.style.background = '#E8F5E9'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#C8E6C9'; e.currentTarget.style.background = '#F0FBF4'; }}
              >
                <div style={{ fontSize: 44, marginBottom: 10 }}>✅</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#2E7D32', marginBottom: 4 }}>Trueque exitoso</div>
                <div style={{ fontSize: 12, color: '#555' }}>El intercambio se realizó correctamente</div>
              </button>
              <button onClick={() => setMode('scam')} style={{ padding: '24px 16px', background: '#FFF3F3', border: '2px solid #FFCDD2', borderRadius: 18, cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#E53935'; e.currentTarget.style.background = '#FFEBEE'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#FFCDD2'; e.currentTarget.style.background = '#FFF3F3'; }}
              >
                <div style={{ fontSize: 44, marginBottom: 10 }}>🚨</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#C62828', marginBottom: 4 }}>Reportar estafa</div>
                <div style={{ fontSize: 12, color: '#555' }}>El otro usuario no cumplió con el trato</div>
              </button>
            </div>
          </div>
        )}

        {mode === 'complete' && (
          <div style={{ padding: '20px 24px 24px' }}>
            <div style={{ background: '#F0FBF4', border: '1px solid #C8E6C9', borderRadius: 12, padding: '12px 16px', marginBottom: 18, fontSize: 13, color: '#2E7D32' }}>
              🏆 Ambas partes recibirán <strong>+{POINTS_PER_TRADE} puntos TALIX</strong>.
            </div>

            {/* Rating */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 8 }}>⭐ Califica a {otherName}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[1,2,3,4,5].map(s => (
                  <span key={s} onClick={() => setStars(s)} onMouseEnter={() => setHoverStar(s)} onMouseLeave={() => setHoverStar(0)}
                    style={{ fontSize: 32, cursor: 'pointer', color: s <= (hoverStar || stars) ? '#F5A623' : '#DDD', transition: 'color 0.1s' }}>★</span>
                ))}
                {stars > 0 && <span style={{ fontSize: 13, color: '#888', alignSelf: 'center', marginLeft: 8 }}>{['','Muy malo','Malo','Regular','Bueno','Excelente'][stars]}</span>}
              </div>
            </div>

            {/* Comment */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 6 }}>💬 Observaciones (opcional)</div>
              <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="¿Cómo fue el intercambio? Comparte tu experiencia..." rows={3}
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #EEE', borderRadius: 12, fontFamily: 'Poppins', fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = theme.primary} onBlur={e => e.target.style.borderColor = '#EEE'}
              />
            </div>

            {/* Photo */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 8 }}>📷 Foto de evidencia (opcional)</div>
              <div onClick={() => fileRef.current?.click()} style={{ height: 120, border: `2px dashed ${photo ? theme.primary : '#DDD'}`, borderRadius: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', background: '#FAFAFA' }}>
                {photo ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <><span style={{ fontSize: 28, marginBottom: 6 }}>📸</span><span style={{ fontSize: 12, color: '#888' }}>Sube una foto del intercambio</span></>}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setMode(null)} style={{ flex: 1, padding: 12, background: '#F4F6F0', border: 'none', borderRadius: 12, fontFamily: 'Poppins', fontSize: 13, cursor: 'pointer', color: '#666' }}>← Volver</button>
              <button onClick={confirmComplete} disabled={loading} style={{ flex: 2, padding: 12, background: loading ? '#DDD' : '#2E7D32', color: '#fff', border: 'none', borderRadius: 12, fontFamily: 'Poppins', fontWeight: 700, fontSize: 14, cursor: loading ? 'default' : 'pointer' }}>
                {loading ? '⏳ Procesando...' : '🎉 Confirmar trueque'}
              </button>
            </div>
          </div>
        )}

        {mode === 'scam' && (
          <div style={{ padding: '20px 24px 24px' }}>
            <div style={{ background: '#FFEBEE', border: '1px solid #FFCDD2', borderRadius: 12, padding: '12px 16px', marginBottom: 18, fontSize: 13, color: '#C62828' }}>
              🚨 Tu reporte será revisado por el equipo de TALIX. El usuario infractor será sancionado.
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 6 }}>📝 Describe lo que ocurrió <span style={{ color: '#E53935' }}>*</span></div>
              <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Explica con detalle: ¿qué prometió el otro usuario? ¿qué ocurrió realmente? ¿perdiste algún artículo?" rows={4}
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #FFCDD2', borderRadius: 12, fontFamily: 'Poppins', fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#E53935'} onBlur={e => e.target.style.borderColor = '#FFCDD2'}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 8 }}>📷 Foto de evidencia (opcional pero recomendado)</div>
              <div onClick={() => fileRef.current?.click()} style={{ height: 120, border: `2px dashed ${photo ? '#E53935' : '#FFCDD2'}`, borderRadius: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', background: '#FFF8F8' }}>
                {photo ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <><span style={{ fontSize: 28, marginBottom: 6 }}>📸</span><span style={{ fontSize: 12, color: '#E57373' }}>Sube capturas o fotos como prueba</span></>}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setMode(null)} style={{ flex: 1, padding: 12, background: '#F4F6F0', border: 'none', borderRadius: 12, fontFamily: 'Poppins', fontSize: 13, cursor: 'pointer', color: '#666' }}>← Volver</button>
              <button onClick={confirmScam} disabled={loading} style={{ flex: 2, padding: 12, background: loading ? '#DDD' : '#C62828', color: '#fff', border: 'none', borderRadius: 12, fontFamily: 'Poppins', fontWeight: 700, fontSize: 14, cursor: loading ? 'default' : 'pointer' }}>
                {loading ? '⏳ Enviando...' : '🚨 Enviar reporte'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
