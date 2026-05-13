import { useState, useEffect } from 'react';
import { DB } from '../services/db';
import { TTopBar, TAvatar } from '../components/ui';

export const LEVELS = [
  { key: 'semilla',  name: 'Semilla',              min: 0,   minRating: 0,   medal: '🌱', color: '#8BC34A', desc: 'Bienvenido a TALIX. ¡Empieza a intercambiar!' },
  { key: 'bronce',   name: 'Intercambiador Bronce', min: 10,  minRating: 0,   medal: '🥉', color: '#CD7F32', desc: 'Badge Bronce visible en tu perfil' },
  { key: 'plata',    name: 'Intercambiador Plata',  min: 50,  minRating: 3.5, medal: '🥈', color: '#9E9E9E', desc: 'Acceso a la Sala Elite + artículos destacados' },
  { key: 'oro',      name: 'Intercambiador Oro',    min: 100, minRating: 4.0, medal: '🥇', color: '#FFC107', desc: 'Badge Oro + prioridad en búsquedas' },
  { key: 'platino',  name: 'Intercambiador Platino',min: 200, minRating: 4.5, medal: '💎', color: '#00BCD4', desc: 'Perfil verificado TALIX + acceso a sala VIP' },
  { key: 'leyenda',  name: 'Leyenda TALIX',         min: 500, minRating: 4.8, medal: '🏆', color: '#9C27B0', desc: 'Reconocimiento institucional USIL + mentor oficial' },
];

export function getLevel(pts, avgRating = null, ratingCount = 0) {
  const r = avgRating || 0;
  const hasRatings = ratingCount > 0;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    const l = LEVELS[i];
    const meetsPoints = pts >= l.min;
    const meetsRating = !hasRatings || l.minRating === 0 || r >= l.minRating;
    if (meetsPoints && meetsRating) return l;
  }
  return LEVELS[0];
}

export function isEliteUser(user) {
  const pts = user?.points || 0;
  const ratings = user?.ratings || [];
  const avg = ratings.length ? ratings.reduce((s, r) => s + r.stars, 0) / ratings.length : null;
  const lvl = getLevel(pts, avg, ratings.length);
  return ['plata', 'oro', 'platino', 'leyenda'].includes(lvl.key);
}

function StarRating({ rating, count }) {
  if (!rating) return <span style={{ fontSize: 12, color: '#AAA' }}>Sin calificaciones</span>;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {[1,2,3,4,5].map(s => (
        <span key={s} style={{ fontSize: 13, color: s <= Math.round(rating) ? '#F5A623' : '#DDD' }}>★</span>
      ))}
      <span style={{ fontSize: 12, color: '#888', marginLeft: 2 }}>{Number(rating).toFixed(1)} ({count})</span>
    </div>
  );
}

export default function PointsPage({ currentUser, theme }) {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    return DB.subscribe('users', (all) => {
      setUsers((all || []).sort((a, b) => (b.points || 0) - (a.points || 0)));
    });
  }, []);

  const myPoints = currentUser?.points || 0;
  const myRatings = currentUser?.ratings || [];
  const myAvgRating = myRatings.length ? myRatings.reduce((s, r) => s + r.stars, 0) / myRatings.length : null;
  const myLevel = getLevel(myPoints, myAvgRating, myRatings.length);
  const myLevelIdx = LEVELS.indexOf(myLevel);
  const nextLevel = LEVELS[myLevelIdx + 1];
  const progress = nextLevel
    ? Math.min(100, ((myPoints - myLevel.min) / (nextLevel.min - myLevel.min)) * 100)
    : 100;
  const myRank = users.findIndex(u => u.id === currentUser?.id) + 1;
  const elite = isEliteUser(currentUser);

  return (
    <div>
      <TTopBar title="🏆 Nivel & Ranking" subtitle="Tu trayectoria como intercambiador TALIX" theme={theme} />
      <div style={{ padding: '28px 32px', maxWidth: 940 }}>

        {/* Hero card */}
        <div style={{ background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primary}AA 100%)`, borderRadius: 24, padding: '28px 32px', color: '#fff', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -10, top: -10, fontSize: 130, opacity: 0.1 }}>{myLevel.medal}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginBottom: 22 }}>
            <div style={{ fontSize: 60 }}>{myLevel.medal}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Tu nivel actual</div>
              <div style={{ fontSize: 26, fontWeight: 800 }}>{myLevel.name}</div>
              <div style={{ fontSize: 13, opacity: 0.8, marginTop: 2 }}>🏅 Puesto #{myRank || '—'} en TALIX · {myPoints} puntos</div>
              {myAvgRating && <div style={{ fontSize: 12, opacity: 0.8 }}>⭐ Calificación promedio: {myAvgRating.toFixed(1)}/5</div>}
            </div>
            {elite && (
              <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 14, padding: '12px 18px', textAlign: 'center', backdropFilter: 'blur(10px)' }}>
                <div style={{ fontSize: 28 }}>💎</div>
                <div style={{ fontSize: 11, fontWeight: 700 }}>SALA ELITE</div>
                <div style={{ fontSize: 10, opacity: 0.8 }}>Acceso desbloqueado</div>
              </div>
            )}
          </div>
          {nextLevel && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, opacity: 0.8 }}>
                <span>Progreso a {nextLevel.medal} {nextLevel.name}</span>
                <span>{myPoints}/{nextLevel.min} pts {nextLevel.minRating > 0 ? `· ★${nextLevel.minRating}+ requerido` : ''}</span>
              </div>
              <div style={{ height: 8, background: 'rgba(255,255,255,0.2)', borderRadius: 100 }}>
                <div style={{ height: '100%', width: `${progress}%`, background: '#fff', borderRadius: 100, transition: 'width 0.6s' }} />
              </div>
              {nextLevel.minRating > 0 && (!myAvgRating || myAvgRating < nextLevel.minRating) && (
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 6 }}>
                  ⭐ Necesitas calificación ≥ {nextLevel.minRating} para subir (actual: {myAvgRating ? myAvgRating.toFixed(1) : 'sin calificaciones'})
                </div>
              )}
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
              ['⭐', 'Calificación promedio', myAvgRating ? `${myAvgRating.toFixed(1)}/5 (${myRatings.length} reseñas)` : 'Sin reseñas aún'],
              ['🌿', 'CO₂ ahorrado', `${(currentUser?.co2 || 0).toFixed(1)}kg`],
            ].map(([icon, label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F5F5F5' }}>
                <span style={{ fontSize: 13, color: '#666' }}>{icon} {label}</span>
                <span style={{ fontWeight: 700, fontSize: 13, color: theme.primary }}>{val}</span>
              </div>
            ))}
          </div>

          {/* Level progression */}
          <div style={{ background: '#fff', borderRadius: 20, padding: '22px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#1C2B2B', marginBottom: 14 }}>🚀 Escalafón de intercambiadores</div>
            {LEVELS.map((l, i) => {
              const userLevel = getLevel(myPoints, myAvgRating, myRatings.length);
              const achieved = LEVELS.indexOf(userLevel) >= i;
              const isCurrent = userLevel.key === l.key;
              return (
                <div key={l.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, marginBottom: 6, background: isCurrent ? `${theme.primary}15` : achieved ? '#F8FFF8' : '#FAFAFA', border: isCurrent ? `2px solid ${theme.primary}` : `1px solid ${achieved ? '#E8F5E9' : '#F0F0F0'}` }}>
                  <span style={{ fontSize: 22 }}>{l.medal}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: achieved ? theme.primary : '#999' }}>{l.name}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>{l.min}+ pts{l.minRating > 0 ? ` · ★${l.minRating}+` : ''}</div>
                  </div>
                  {isCurrent && <span style={{ fontSize: 10, background: theme.primary, color: '#fff', padding: '2px 8px', borderRadius: 100, fontWeight: 700 }}>Tú</span>}
                  {achieved && !isCurrent && <span style={{ fontSize: 16 }}>✅</span>}
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
            const r = u.ratings || [];
            const avg = r.length ? r.reduce((s, x) => s + x.stars, 0) / r.length : null;
            const lvl = getLevel(u.points || 0, avg, r.length);
            return (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 14px', borderRadius: 14, marginBottom: 6, background: isMe ? `${theme.primary}10` : '#FAFAFA', border: isMe ? `1.5px solid ${theme.primary}40` : '1.5px solid transparent' }}>
                <div style={{ width: 28, textAlign: 'center', fontWeight: 800, fontSize: 15, color: i < 3 ? ['#FFC107','#9E9E9E','#CD7F32'][i] : '#CCC' }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </div>
                <TAvatar name={u.displayName || 'U'} color={u.avatarColor} size={38} photo={u.photo} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: isMe ? 700 : 600, fontSize: 13, color: '#1C2B2B' }}>
                    {u.displayName} {isMe && <span style={{ fontSize: 11, color: theme.primary }}>← Tú</span>}
                  </div>
                  <StarRating rating={avg} count={r.length} />
                </div>
                <div style={{ textAlign: 'center', minWidth: 44 }}>
                  <div style={{ fontSize: 22 }}>{lvl.medal}</div>
                  <div style={{ fontSize: 9, color: '#AAA', lineHeight: 1.2 }}>{lvl.name.split(' ').slice(-1)[0]}</div>
                </div>
                <div style={{ textAlign: 'right', minWidth: 55 }}>
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
