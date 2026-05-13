import { useState, useEffect } from 'react';
import { DB } from '../services/db';
import { TTopBar, TAvatar, TItemCard } from '../components/ui';
import { LEVELS, getLevel, isEliteUser } from './PointsPage';

function StarRating({ rating, count }) {
  if (!rating) return <span style={{ fontSize: 12, color: '#AAA' }}>Sin calificaciones</span>;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      {[1,2,3,4,5].map(s => (
        <span key={s} style={{ fontSize: 13, color: s <= Math.round(rating) ? '#F5A623' : '#DDD' }}>★</span>
      ))}
      <span style={{ fontSize: 11, color: '#888', marginLeft: 3 }}>{Number(rating).toFixed(1)}</span>
    </div>
  );
}

export default function ElitePage({ currentUser, theme, showToast, setPage, setSelectedItem }) {
  const [eliteUsers, setEliteUsers] = useState([]);
  const [eliteItems, setEliteItems] = useState([]);

  const amElite = isEliteUser(currentUser);

  useEffect(() => {
    if (!amElite) return;
    return DB.subscribe('users', (all) => {
      setEliteUsers((all || []).filter(u => isEliteUser(u) && u.id !== currentUser?.id));
    });
  }, [amElite, currentUser]);

  useEffect(() => {
    if (!amElite) return;
    return DB.subscribe('items', (all) => {
      const eliteUserIds = new Set(eliteUsers.map(u => u.id));
      setEliteItems((all || []).filter(i => eliteUserIds.has(i.userId)));
    });
  }, [amElite, eliteUsers]);

  const myRatings = currentUser?.ratings || [];
  const myAvg = myRatings.length ? myRatings.reduce((s, r) => s + r.stars, 0) / myRatings.length : null;
  const myLevel = getLevel(currentUser?.points || 0, myAvg, myRatings.length);
  const nextEliteLevel = LEVELS.find(l => ['plata','oro','platino','leyenda'].includes(l.key) && !isEliteUser(currentUser));

  if (!amElite) {
    const minPts = 50;
    const myPoints = currentUser?.points || 0;
    const progress = Math.min(100, (myPoints / minPts) * 100);
    return (
      <div>
        <TTopBar title="💎 Sala Elite" subtitle="Intercambiadores de alta confianza" theme={theme} />
        <div style={{ padding: '60px 32px', maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 80, marginBottom: 20 }}>🔒</div>
          <div style={{ fontWeight: 800, fontSize: 24, color: '#1C2B2B', marginBottom: 10 }}>Sala Elite bloqueada</div>
          <div style={{ color: '#666', fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
            La Sala Elite es exclusiva para <strong>Intercambiadores Plata</strong> o superior.<br />
            Necesitas al menos <strong>50 puntos</strong> y una calificación de <strong>★3.5+</strong>.
          </div>
          <div style={{ background: '#F4F6F0', borderRadius: 20, padding: '24px', marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: '#555' }}>
              <span>Tu progreso</span><span>{myPoints}/{minPts} pts</span>
            </div>
            <div style={{ height: 10, background: '#E0E0E0', borderRadius: 100, marginBottom: 12 }}>
              <div style={{ height: '100%', width: `${progress}%`, background: theme.primary, borderRadius: 100, transition: 'width 0.5s' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 20 }}>
              {LEVELS.filter(l => ['plata','oro','platino','leyenda'].includes(l.key)).map(l => (
                <div key={l.key} style={{ textAlign: 'center', opacity: isEliteUser({ points: currentUser?.points, ratings: currentUser?.ratings }) ? 1 : 0.4 }}>
                  <div style={{ fontSize: 28 }}>{l.medal}</div>
                  <div style={{ fontSize: 10, color: '#888' }}>{l.min}pts</div>
                </div>
              ))}
            </div>
          </div>
          <button onClick={() => setPage('points')} style={{ padding: '13px 32px', background: theme.primary, color: '#fff', border: 'none', borderRadius: 14, fontFamily: 'Poppins', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            Ver mi progreso →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TTopBar
        title="💎 Sala Elite TALIX"
        subtitle={`Intercambiadores de alta confianza · ${myLevel.medal} ${myLevel.name}`}
        theme={theme}
      />
      <div style={{ padding: '28px 32px' }}>

        {/* Elite banner */}
        <div style={{ background: 'linear-gradient(135deg, #1C2B2B, #2A3A3A)', borderRadius: 20, padding: '22px 28px', color: '#fff', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ fontSize: 48 }}>💎</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 20 }}>Bienvenido, {myLevel.name}</div>
            <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>
              Esta sala es exclusiva para intercambiadores verificados con alto nivel de confianza en la comunidad TALIX.
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#F5A623', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Tu nivel</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{myLevel.medal} {myLevel.name.split(' ').pop()}</div>
            {myAvg && <div style={{ fontSize: 12, color: '#F5A623' }}>★ {myAvg.toFixed(1)}/5</div>}
          </div>
        </div>

        {/* Elite members */}
        <div style={{ fontWeight: 700, fontSize: 16, color: '#1C2B2B', marginBottom: 14 }}>
          👥 Intercambiadores Elite ({eliteUsers.length + 1})
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 28 }}>
          {/* Self card */}
          {[currentUser, ...eliteUsers].filter(Boolean).map(u => {
            const r = u.ratings || [];
            const avg = r.length ? r.reduce((s, x) => s + x.stars, 0) / r.length : null;
            const lvl = getLevel(u.points || 0, avg, r.length);
            const isMe = u.id === currentUser?.id;
            return (
              <div key={u.id} style={{ background: '#fff', borderRadius: 18, padding: '18px 20px', width: 180, boxShadow: isMe ? `0 0 0 2px ${theme.primary}` : '0 2px 12px rgba(0,0,0,0.07)', textAlign: 'center' }}>
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: 10 }}>
                  <TAvatar name={u.displayName || 'U'} color={u.avatarColor} size={52} photo={u.photo} />
                  <span style={{ position: 'absolute', bottom: -4, right: -4, fontSize: 18 }}>{lvl.medal}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#1C2B2B', marginBottom: 2 }}>
                  {u.displayName} {isMe && <span style={{ fontSize: 10, color: theme.primary }}>Tú</span>}
                </div>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>{u.faculty?.split(' ')[0] || 'USIL'}</div>
                <StarRating rating={avg} count={r.length} />
                <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: theme.primary }}>{u.points || 0} pts</div>
              </div>
            );
          })}
        </div>

        {/* Elite items */}
        {eliteItems.length > 0 && (
          <>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1C2B2B', marginBottom: 14 }}>
              📦 Artículos de intercambiadores Elite
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
              {eliteItems.map(item => (
                <TItemCard key={item.id} item={item} theme={theme}
                  onClick={() => { setSelectedItem(item); setPage('detail'); }}
                  currentUserId={currentUser?.id}
                  onLike={() => {}}
                />
              ))}
            </div>
          </>
        )}

        {eliteItems.length === 0 && eliteUsers.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#AAA' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🌱</div>
            <div style={{ fontSize: 14 }}>Eres el primer intercambiador Elite. ¡Invita a otros a subir de nivel!</div>
          </div>
        )}
      </div>
    </div>
  );
}
