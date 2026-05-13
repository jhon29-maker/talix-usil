import { useState, useEffect } from 'react';
import { DB } from '../services/db';
import { TTopBar, TAvatar } from '../components/ui';

const LEVELS = [
  { name: 'Semilla',   min: 0,   max: 9,   medal: '🌱', color: '#8BC34A', prize: 'Acceso a la comunidad TALIX' },
  { name: 'Bronce',    min: 10,  max: 49,  medal: '🥉', color: '#CD7F32', prize: 'Badge Bronce en tu perfil público' },
  { name: 'Plata',     min: 50,  max: 99,  medal: '🥈', color: '#9E9E9E', prize: 'Tus artículos aparecen primero en búsquedas' },
  { name: 'Oro',       min: 100, max: 199, medal: '🥇', color: '#FFC107', prize: 'Badge Oro + mención en ranking USIL' },
  { name: 'Platino',   min: 200, max: 499, medal: '💎', color: '#00BCD4', prize: 'Verificación especial TALIX Elite' },
  { name: 'Leyenda',   min: 500, max: Infinity, medal: '🏆', color: '#9C27B0', prize: 'Perfil destacado + reconocimiento institucional USIL' },
];

function getLevel(pts) {
  return LEVELS.find(l => pts >= l.min && pts <= l.max) || LEVELS[0];
}

function StarRating({ rating, count }) {
  if (!rating) return <span style={{ fontSize: 12, color: '#AAA' }}>Sin calificaciones</span>;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {[1,2,3,4,5].map(s => (
        <span key={s} style={{ fontSize: 14, color: s <= Math.round(rating) ? '#F5A623' : '#DDD' }}>★</span>
      ))}
      <span style={{ fontSize: 12, color: '#888', marginLeft: 2 }}>{Number(rating).toFixed(1)} ({count})</span>
    </div>
  );
}

export default function PointsPage({ currentUser, theme }) {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    return DB.subscribe('users', (all) => {
      const sorted = (all || []).sort((a, b) => (b.points || 0) - (a.points || 0));
      setUsers(sorted);
    });
  }, []);

  const myPoints = currentUser?.points || 0;
  const myLevel = getLevel(myPoints);
  const nextLevel = LEVELS[LEVELS.indexOf(myLevel) + 1];
  const progress = nextLevel
    ? Math.min(100, ((myPoints - myLevel.min) / (nextLevel.min - myLevel.min)) * 100)
    : 100;

  const myRatings = currentUser?.ratings || [];
  const myAvgRating = myRatings.length
    ? myRatings.reduce((s, r) => s + r.stars, 0) / myRatings.length
    : null;

  const myRank = users.findIndex(u => u.id === currentUser?.id) + 1;

  return (
    <div>
      <TTopBar title="🏆 Puntos & Ranking" subtitle="Tu reputación en la comunidad TALIX" theme={theme} />
      <div style={{ padding: '28px 32px', maxWidth: 900 }}>

        {/* My points card */}
        <div style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.primary}CC)`, borderRadius: 24, padding: '28px 32px', color: '#fff', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -20, top: -20, fontSize: 120, opacity: 0.12 }}>{myLevel.medal}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 56 }}>{myLevel.medal}</div>
            <div>
              <div style={{ fontSize: 13, opacity: 0.75, fontWeight: 600, letterSpacing: 1 }}>TU NIVEL</div>
              <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.1 }}>{myLevel.name}</div>
              <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>🏅 Puesto #{myRank || '—'} en TALIX</div>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ fontSize: 52, fontWeight: 800, lineHeight: 1 }}>{myPoints}</div>
              <div style={{ fontSize: 13, opacity: 0.75 }}>puntos acumulados</div>
            </div>
          </div>

          {nextLevel && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, opacity: 0.8 }}>
                <span>Progreso a {nextLevel.medal} {nextLevel.name}</span>
                <span>{myPoints}/{nextLevel.min} pts</span>
              </div>
              <div style={{ height: 8, background: 'rgba(255,255,255,0.2)', borderRadius: 100 }}>
                <div style={{ height: '100%', width: `${progress}%`, background: '#fff', borderRadius: 100, transition: 'width 0.5s' }} />
              </div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 6 }}>🎁 Premio: {nextLevel.prize}</div>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          {/* Stats */}
          <div style={{ background: '#fff', borderRadius: 20, padding: '22px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#1C2B2B', marginBottom: 16 }}>📊 Mis estadísticas</div>
            {[
              ['🔄', 'Trueques completados', currentUser?.swaps || 0],
              ['🏆', 'Puntos TALIX', myPoints],
              ['⭐', 'Calificación promedio', myAvgRating ? `${myAvgRating.toFixed(1)}/5` : 'Sin calificaciones'],
              ['🌿', 'CO₂ ahorrado', `${(currentUser?.co2 || 0).toFixed(1)}kg`],
            ].map(([icon, label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F5F5F5' }}>
                <span style={{ fontSize: 13, color: '#666' }}>{icon} {label}</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: theme.primary }}>{val}</span>
              </div>
            ))}
            {myAvgRating && <div style={{ marginTop: 12 }}><StarRating rating={myAvgRating} count={myRatings.length} /></div>}
          </div>

          {/* Prizes */}
          <div style={{ background: '#fff', borderRadius: 20, padding: '22px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#1C2B2B', marginBottom: 16 }}>🎁 Premios por nivel</div>
            {LEVELS.map(l => {
              const earned = myPoints >= l.min;
              return (
                <div key={l.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, marginBottom: 6, background: earned ? `${theme.primary}10` : '#FAFAFA', border: earned ? `1px solid ${theme.primary}30` : '1px solid #F0F0F0' }}>
                  <span style={{ fontSize: 20 }}>{l.medal}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: earned ? theme.primary : '#999' }}>{l.name} ({l.min}+ pts)</div>
                    <div style={{ fontSize: 11, color: '#888' }}>{l.prize}</div>
                  </div>
                  {earned && <span style={{ fontSize: 16 }}>✅</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Leaderboard */}
        <div style={{ background: '#fff', borderRadius: 20, padding: '22px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1C2B2B', marginBottom: 16 }}>🏅 Ranking TALIX · USIL</div>
          {users.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#AAA', padding: '24px 0' }}>Sin usuarios aún</div>
          ) : users.map((u, i) => {
            const isMe = u.id === currentUser?.id;
            const lvl = getLevel(u.points || 0);
            const avgRating = u.ratings?.length
              ? u.ratings.reduce((s, r) => s + r.stars, 0) / u.ratings.length
              : null;
            return (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 14, marginBottom: 6, background: isMe ? `${theme.primary}10` : 'transparent', border: isMe ? `1.5px solid ${theme.primary}30` : '1.5px solid transparent', transition: 'all 0.15s' }}>
                <div style={{ width: 28, textAlign: 'center', fontWeight: 800, fontSize: 15, color: i < 3 ? ['#FFC107','#9E9E9E','#CD7F32'][i] : '#CCC' }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </div>
                <TAvatar name={u.displayName || 'U'} color={u.avatarColor} size={38} photo={u.photo} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: isMe ? 700 : 600, fontSize: 14, color: '#1C2B2B' }}>
                    {u.displayName} {isMe && <span style={{ fontSize: 11, color: theme.primary, fontWeight: 600 }}>← Tú</span>}
                  </div>
                  <div style={{ fontSize: 11, color: '#AAA' }}>{u.faculty}</div>
                  {avgRating && <StarRating rating={avgRating} count={u.ratings.length} />}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 22 }}>{lvl.medal}</div>
                  <div style={{ fontSize: 11, color: '#AAA' }}>{lvl.name}</div>
                </div>
                <div style={{ textAlign: 'right', minWidth: 60 }}>
                  <div style={{ fontWeight: 800, fontSize: 20, color: theme.primary }}>{u.points || 0}</div>
                  <div style={{ fontSize: 11, color: '#AAA' }}>pts</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
