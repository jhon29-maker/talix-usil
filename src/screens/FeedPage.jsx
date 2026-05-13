import { useState, useEffect } from 'react';
import { ItemsService } from '../services/items';
import { TTopBar, TButton, TItemCard, NotificationBell, categoryEmoji } from '../components/ui';
import EcoSpotsModal from './EcoSpotsModal';

const CATS = ['Todos', 'Libros', 'Tecnología', 'Ropa', 'Accesorios'];

export default function FeedPage({ setPage, setSelectedItem, setPublicUser, currentUser, theme, showToast }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('Todos');
  const [loading, setLoading] = useState(true);
  const [showEcoSpots, setShowEcoSpots] = useState(false);

  useEffect(() => {
    const unsub = ItemsService.getAll(data => { setItems(data); setLoading(false); });
    return unsub;
  }, []);

  const filtered = items.filter(i =>
    (cat === 'Todos' || i.category === cat) &&
    (i.title?.toLowerCase().includes(search.toLowerCase()) || i.category?.toLowerCase().includes(search.toLowerCase()) || i.description?.toLowerCase().includes(search.toLowerCase()))
  );

  const totalCO2 = items.reduce((s, i) => s + (i.co2 || 0), 0).toFixed(1);

  return (
    <div>
      {showEcoSpots && <EcoSpotsModal onClose={() => setShowEcoSpots(false)} theme={theme} />}
      <TTopBar
        title="Explorar Trueques"
        subtitle={`${items.length} artículos disponibles`}
        theme={theme}
        rightEl={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setShowEcoSpots(true)} style={{ background: '#FFF3E0', border: 'none', padding: '7px 14px', borderRadius: 100, cursor: 'pointer', fontFamily: 'Poppins', fontWeight: 600, fontSize: 12, color: '#E65100' }}>📍 Eco-Spots</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#E8F5E9', padding: '7px 14px', borderRadius: 100 }}>
              <span>🌿</span><span style={{ fontSize: 13, fontWeight: 600, color: '#2E7D32' }}>-{totalCO2}kg CO₂</span>
            </div>
            <NotificationBell userId={currentUser?.id} theme={theme} />
          </div>
        }
      />
      {/* Auto-scrolling carousel */}
      {items.length > 0 && (
        <div style={{ overflow: 'hidden', borderBottom: '1px solid #EEF2EE', background: '#fff', paddingBottom: 0 }}>
          <style>{`
            @keyframes taliScroll {
              0%   { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
          `}</style>
          <div style={{ display: 'flex', gap: 0, animation: 'taliScroll 40s linear infinite', width: 'max-content' }}>
            {[...items, ...items].map((item, idx) => (
              <div
                key={`${item.id}-${idx}`}
                onClick={() => { setSelectedItem(item); setPage('detail'); }}
                style={{ width: 140, flexShrink: 0, cursor: 'pointer', padding: '12px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, borderRight: '1px solid #F0F4F0', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F8FFF8'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ width: 72, height: 72, borderRadius: 14, background: item.bgColor || '#F4F6F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, overflow: 'hidden', flexShrink: 0 }}>
                  {item.photo
                    ? <img src={item.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : categoryEmoji(item.category)
                  }
                </div>
                <div style={{ textAlign: 'center', width: '100%' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#1C2B2B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                  <div style={{ fontSize: 10, color: theme.primary, marginTop: 2, fontWeight: 600 }}>{item.category}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: '24px 32px' }}>
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar artículos, libros, tecnología..."
            style={{ width: '100%', padding: '14px 16px 14px 46px', border: '1.5px solid #E8EDE8', borderRadius: 16, fontSize: 14, fontFamily: 'Poppins', outline: 'none', boxSizing: 'border-box', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
            onFocus={e => e.target.style.borderColor = theme.primary}
            onBlur={e => e.target.style.borderColor = '#E8EDE8'}
          />
        </div>

        {/* Category filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {CATS.map(c => (
            <button key={c} onClick={() => setCat(c)} style={{ padding: '8px 18px', borderRadius: 100, border: 'none', cursor: 'pointer', background: cat === c ? theme.primary : '#fff', color: cat === c ? '#fff' : '#555', fontFamily: 'Poppins', fontWeight: 600, fontSize: 13, boxShadow: cat === c ? `0 3px 12px ${theme.primary}40` : '0 1px 4px rgba(0,0,0,0.08)', transition: 'all 0.15s' }}>
              {c}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 20 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ height: 300, background: '#fff', borderRadius: 20, animation: 'pulse 1.5s ease-in-out infinite', border: '1px solid #EEE' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>No se encontraron artículos</div>
            <div style={{ fontSize: 14, marginTop: 4 }}>Intenta con otras palabras o sé el primero en publicar</div>
            <TButton onClick={() => setPage('post')} theme={theme} style={{ marginTop: 20 }}>+ Publicar artículo</TButton>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 20 }}>
            {filtered.map(item => (
              <TItemCard
                key={item.id}
                item={item}
                theme={theme}
                currentUserId={currentUser?.id}
                onClick={() => { setSelectedItem(item); setPage('detail'); }}
                onUserClick={uid => { setPublicUser(uid); setPage('publicprofile'); }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
