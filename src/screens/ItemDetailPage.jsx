import { useState, useEffect } from 'react';
import { ItemsService } from '../services/items';
import { ChatService } from '../services/chat';
import { TTopBar, TAvatar, TButton, TCategoryBadge, TConditionDot, categoryEmoji } from '../components/ui';

export default function ItemDetailPage({ item, setPage, setPublicUser, currentUser, theme, showToast }) {
  const [proposed, setProposed] = useState(false);
  const [offer, setOffer] = useState('');
  const [myItems, setMyItems] = useState([]);

  useEffect(() => {
    if (currentUser) setMyItems(ItemsService.getUserItems(currentUser.id));
  }, [currentUser]);

  if (!item) return null;

  const handlePropose = () => {
    if (!offer) { showToast('Selecciona qué ofreces a cambio', 'error'); return; }
    ItemsService.sendProposal(item.id, currentUser, offer);
    setProposed(true);
    showToast('¡Propuesta enviada! Espera la respuesta de ' + item.user, 'success');
  };

  const handleChat = () => {
    const convId = ChatService.getConversationId(currentUser.id, item.userId);
    ChatService.sendMessage(convId, currentUser, `Hola ${item.user}, vi tu artículo "${item.title}" y me interesa. ¿Podemos coordinar un trueque?`, [currentUser.id, item.userId], item.title);
    setPage('chat');
    showToast('Conversación iniciada con ' + item.user, 'success');
  };

  return (
    <div>
      <TTopBar
        title={item.title}
        subtitle={item.category}
        theme={theme}
        rightEl={<button onClick={() => setPage('feed')} style={{ background: '#F4F6F0', border: 'none', padding: '8px 16px', borderRadius: 100, cursor: 'pointer', fontFamily: 'Poppins', fontSize: 13, fontWeight: 600, color: '#555' }}>← Volver</button>}
      />
      <div style={{ padding: '32px', display: 'grid', gridTemplateColumns: '1fr 360px', gap: 32, maxWidth: 1100 }}>
        <div>
          <div style={{ height: 300, background: item.bgColor || '#F4F6F0', borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
            {item.photo ? <img src={item.photo} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 100 }}>{categoryEmoji(item.category)}</span>}
            <div style={{ position: 'absolute', bottom: 16, left: 16, background: 'rgba(255,255,255,0.92)', borderRadius: 100, padding: '6px 14px', fontWeight: 700, fontSize: 13, color: '#1A7A50' }}>🌿 Ahorras ~{item.co2}kg de CO₂</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #EEE' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <TCategoryBadge category={item.category} />
              <TConditionDot condition={item.condition} />
            </div>
            <h2 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 700, color: '#1C2B2B' }}>{item.title}</h2>
            <p style={{ margin: '0 0 16px', color: '#666', lineHeight: 1.7, fontSize: 14 }}>{item.description}</p>
            <div style={{ background: '#F4F6F0', borderRadius: 14, padding: '14px 18px' }}>
              <div style={{ fontSize: 12, color: '#888', fontWeight: 600, marginBottom: 4 }}>¿QUÉ BUSCA A CAMBIO?</div>
              <div style={{ fontSize: 14, color: '#333', fontWeight: 500 }}>🔄 {item.want}</div>
            </div>
            {(item.proposals || []).length > 0 && (
              <div style={{ marginTop: 16, background: '#FFF8E1', borderRadius: 14, padding: '14px 18px' }}>
                <div style={{ fontSize: 12, color: '#F57F17', fontWeight: 600, marginBottom: 8 }}>PROPUESTAS RECIBIDAS ({item.proposals.length})</div>
                {item.proposals.map((p, i) => (
                  <div key={i} style={{ fontSize: 13, color: '#555', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>🤝</span> <strong>{p.from}</strong>: {p.offer}
                    <span style={{ color: '#AAA', fontSize: 11 }}>— {new Date(p.date).toLocaleDateString('es')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          {/* Publisher card */}
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, marginBottom: 16, border: '1px solid #EEE' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#999', marginBottom: 12 }}>PUBLICADO POR</div>
            <div
              onClick={() => { setPublicUser(item.userId); setPage('publicprofile'); }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, cursor: 'pointer', padding: 8, borderRadius: 14, transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#F4F6F0'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <TAvatar name={item.user} color={item.avatarColor} size={48} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#1C2B2B' }}>{item.user} <span style={{ fontSize: 11, color: '#4CAF50', fontWeight: 600 }}>✓ USIL</span></div>
                <div style={{ fontSize: 12, color: '#888' }}>{item.faculty}</div>
                <div style={{ fontSize: 11, color: theme.primary, marginTop: 2, fontWeight: 500 }}>Ver perfil →</div>
              </div>
            </div>
            {currentUser?.id !== item.userId && (
              <TButton onClick={handleChat} theme={theme} style={{ width: '100%', padding: '11px 0', textAlign: 'center' }}>💬 Iniciar conversación</TButton>
            )}
          </div>

          {/* Proposal card */}
          {currentUser?.id !== item.userId && (
            <div style={{ background: proposed ? '#E8F5E9' : '#fff', borderRadius: 20, padding: 24, border: `2px solid ${proposed ? '#4CAF50' : theme.primary}`, transition: 'all 0.3s', marginBottom: 16 }}>
              {proposed ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#2E7D32', marginBottom: 4 }}>¡Propuesta enviada!</div>
                  <div style={{ fontSize: 13, color: '#555' }}>Espera a que {item.user} responda.</div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1C2B2B', marginBottom: 8 }}>🤝 Proponer trueque</div>
                  <div style={{ fontSize: 13, color: '#666', marginBottom: 14, lineHeight: 1.5 }}>Selecciona qué ofreces a cambio:</div>
                  <select
                    value={offer}
                    onChange={e => setOffer(e.target.value)}
                    style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E8EDE8', borderRadius: 12, fontFamily: 'Poppins', fontSize: 13, marginBottom: 12, background: '#FAFBFA', outline: 'none', boxSizing: 'border-box' }}
                  >
                    <option value="">Selecciona un artículo tuyo...</option>
                    {myItems.map(mi => <option key={mi.id} value={mi.title}>{categoryEmoji(mi.category)} {mi.title}</option>)}
                    <option value="Artículo sin publicar aún">Artículo sin publicar aún</option>
                  </select>
                  <TButton onClick={handlePropose} theme={theme} style={{ width: '100%', padding: '12px 0' }}>Enviar propuesta</TButton>
                </>
              )}
            </div>
          )}

          {/* Own item controls */}
          {currentUser?.id === item.userId && (
            <div style={{ background: '#FFF3E0', borderRadius: 20, padding: 20, marginBottom: 16, border: '1px solid #FFE0B2' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#E65100', marginBottom: 8 }}>⚙️ Este es tu artículo</div>
              <TButton
                onClick={() => { ItemsService.deleteItem(item.id); setPage('feed'); showToast('Artículo eliminado', 'success'); }}
                theme={theme}
                variant="danger"
                style={{ width: '100%', padding: '10px 0', fontSize: 13 }}
              >
                🗑️ Eliminar artículo
              </TButton>
            </div>
          )}

          {/* CO2 impact */}
          <div style={{ background: `linear-gradient(135deg, ${theme.primary}15, ${theme.accent}15)`, borderRadius: 20, padding: 20, border: `1px solid ${theme.primary}20` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: theme.primary, marginBottom: 8 }}>🌍 IMPACTO AMBIENTAL</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: theme.primary }}>{item.co2} kg</div>
            <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>de CO₂ ahorrado vs. comprar nuevo</div>
            <div style={{ fontSize: 11, color: '#999', marginTop: 8 }}>≈ {(item.co2 * 4).toFixed(0)} km no recorridos en auto 🚗</div>
          </div>
        </div>
      </div>
    </div>
  );
}
