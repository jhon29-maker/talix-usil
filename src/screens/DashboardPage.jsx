import { useState, useEffect } from 'react';
import { DB } from '../services/db';
import { ItemsService } from '../services/items';
import { TTopBar, TAvatar, categoryEmoji } from '../components/ui';

const CO2_CAT = { Libros: 2.4, Tecnología: 12.5, Ropa: 5.0, Accesorios: 3.5 };
const MEDALS = ['🥇', '🥈', '🥉'];

export default function DashboardPage({ currentUser, theme }) {
  const [allUsers, setAllUsers] = useState([]);
  const [allItems, setAllItems] = useState([]);

  useEffect(() => {
    setAllUsers(DB.get('users') || []);
    const unsub = ItemsService.getAll(items => setAllItems(items));
    return unsub;
  }, []);

  const totalCO2 = allUsers.reduce((s, u) => s + (u.co2 || 0), currentUser?.co2 || 0);
  const totalSwaps = allUsers.reduce((s, u) => s + (u.swaps || 0), currentUser?.swaps || 0);
  const mySwaps = currentUser?.swaps || 5;
  const myCO2 = currentUser?.co2 || 12.5;
  const sortedBySwaps = [...allUsers].sort((a, b) => (b.swaps || 0) - (a.swaps || 0)).slice(0, 7);

  return (
    <div>
      <TTopBar title="Impacto Ambiental" subtitle="Tu contribución a la sostenibilidad USIL" theme={theme} />
      <div style={{ padding: '24px 32px' }}>
        {/* Personal hero */}
        <div style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.primary}CC)`, borderRadius: 24, padding: '28px 32px', marginBottom: 24, color: '#fff', display: 'flex', alignItems: 'center', gap: 32 }}>
          <div>
            <div style={{ fontSize: 13, opacity: 0.8, fontWeight: 500, marginBottom: 4 }}>MI IMPACTO PERSONAL</div>
            <div style={{ fontWeight: 800, fontSize: 42, letterSpacing: '-2px' }}>{myCO2} kg</div>
            <div style={{ fontSize: 14, opacity: 0.85 }}>de CO₂ ahorrado · {mySwaps} trueques</div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'center' }}>
            <div style={{ fontSize: 60 }}>🌳</div>
            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>≈ {(myCO2 / 21).toFixed(1)} árboles/año</div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
          {[
            { icon: '♻️', val: totalSwaps || allItems.length, label: 'Trueques USIL' },
            { icon: '🌿', val: `${(totalCO2 || myCO2 * 4).toFixed(0)}kg`, label: 'CO₂ ahorrado total', color: '#2E7D32' },
            { icon: '👥', val: Math.max(allUsers.length, 1), label: 'Usuarios activos' },
            { icon: '📦', val: allItems.length, label: 'Artículos publicados', color: '#E65100' },
          ].map((s, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 20, padding: '20px 22px', border: '1px solid #EEE', flex: 1 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontWeight: 800, fontSize: 30, color: s.color || theme.primary, letterSpacing: '-1px' }}>{s.val}</div>
              <div style={{ fontWeight: 600, fontSize: 13, color: '#1C2B2B', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Ranking */}
        <div style={{ background: '#fff', borderRadius: 24, overflow: 'hidden', border: '1px solid #EEE', marginBottom: 24 }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #EEE' }}>
            <div style={{ fontWeight: 700, fontSize: 17, color: '#1C2B2B' }}>🏆 Ranking de Sostenibilidad</div>
            <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>Usuarios con mayor impacto positivo · USIL</div>
          </div>
          {sortedBySwaps.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#AAA', fontSize: 13 }}>Sé el primero en hacer trueques y aparecer aquí 🌿</div>
          ) : sortedBySwaps.map((u, i) => {
            const pct = (u.swaps || 0) / Math.max(sortedBySwaps[0]?.swaps || 1, 1) * 100;
            const isMe = u.id === currentUser?.id;
            return (
              <div key={u.id} style={{ padding: '16px 24px', borderBottom: i < sortedBySwaps.length - 1 ? '1px solid #F5F5F5' : 'none', display: 'flex', alignItems: 'center', gap: 14, background: isMe ? `${theme.primary}08` : '#fff' }}>
                <div style={{ width: 32, textAlign: 'center', fontSize: i < 3 ? 22 : 14, fontWeight: 700, color: i < 3 ? 'inherit' : '#CCC' }}>{i < 3 ? MEDALS[i] : `#${i + 1}`}</div>
                <TAvatar name={u.displayName || 'U'} color={u.avatarColor} size={40} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: '#1C2B2B' }}>{u.displayName}</span>
                    {isMe && <span style={{ background: theme.primary, color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100 }}>TÚ</span>}
                  </div>
                  <div style={{ fontSize: 12, color: '#888' }}>{u.faculty || 'USIL'} · {u.swaps || 0} trueques</div>
                  <div style={{ marginTop: 6, height: 6, background: '#F0F0F0', borderRadius: 100 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: i === 0 ? '#F5A623' : theme.primary, borderRadius: 100 }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: theme.primary }}>{((u.swaps || 0) * 2.4).toFixed(1)}kg</div>
                  <div style={{ fontSize: 11, color: '#AAA' }}>CO₂ ahorrado</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CO2 by category */}
        <div style={{ background: '#fff', borderRadius: 24, padding: 24, border: '1px solid #EEE' }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#1C2B2B', marginBottom: 16 }}>CO₂ estimado ahorrado por categoría</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {Object.entries(CO2_CAT).map(([cat, val]) => (
              <div key={cat} style={{ flex: 1, minWidth: 120, background: '#F4F6F0', borderRadius: 16, padding: '16px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 28 }}>{categoryEmoji(cat)}</div>
                <div style={{ fontWeight: 800, fontSize: 20, color: theme.primary, marginTop: 4 }}>{val} kg</div>
                <div style={{ fontSize: 12, color: '#666' }}>{cat}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
