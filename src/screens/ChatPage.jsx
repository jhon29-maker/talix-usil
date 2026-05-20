import { useState, useEffect, useRef } from 'react';
import { DB } from '../services/db';
import { UsersService } from '../services/users';
import { ChatService } from '../services/chat';
import { ModerationService } from '../services/moderation';
import { TAvatar, TButton } from '../components/ui';
import TradeCompleteModal from './TradeCompleteModal';

const QUICK = ['¿Cuándo puedes?', '¿Dónde nos vemos?', '¡Me interesa! 🙌', '¿Está disponible aún?'];
const ECO_SPOTS = ['Biblioteca Central USIL', 'Cafetería Principal', 'Entrada Principal', 'Sala de Estudio B2', 'Patio Central', 'Terraza USIL', 'Edificio F – Lobby'];

function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso), now = new Date(), diff = now - d;
  if (diff < 60000) return 'ahora';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm';
  if (diff < 86400000) return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

export default function ChatPage({ currentUser, theme, showToast }) {
  const [convos, setConvos] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [showCoord, setShowCoord] = useState(false);
  const [meetPlace, setMeetPlace] = useState('Biblioteca Central USIL');
  const [meetDate, setMeetDate] = useState('');
  const [search, setSearch] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatUser, setNewChatUser] = useState('');
  const [newChatTarget, setNewChatTarget] = useState(null); // full user object
  const [allUsersList, setAllUsersList] = useState([]);
  const [newChatTopic, setNewChatTopic] = useState('');
  const [blockedMsg, setBlockedMsg] = useState('');
  const [showTradeComplete, setShowTradeComplete] = useState(false);
  const bottomRef = useRef(null);
  const msgsContainerRef = useRef(null);
  const isAtBottomRef = useRef(true);
  const inputRef = useRef(null);
  const activeConvRef = useRef(null);

  useEffect(() => { activeConvRef.current = activeConv; }, [activeConv]);

  useEffect(() => {
    return UsersService.subscribe(setAllUsersList);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    return ChatService.getConversations(currentUser.id, (sorted) => {
      setConvos(sorted);
      if (!activeConvRef.current && sorted.length > 0) setActiveConv(sorted[0]);
    });
  }, [currentUser]);

  useEffect(() => {
    if (!activeConv) return;
    return ChatService.getMessages(activeConv.id, setMsgs);
  }, [activeConv?.id]);

  // Scroll to bottom only when user is already near bottom (or on new conv load)
  useEffect(() => {
    const el = msgsContainerRef.current;
    if (!el) return;
    if (isAtBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [msgs]);

  // Always scroll to bottom when switching conversations
  useEffect(() => {
    const el = msgsContainerRef.current;
    if (el) setTimeout(() => { el.scrollTop = el.scrollHeight; }, 50);
  }, [activeConv?.id]);

  const send = () => {
    if (!input.trim() || !activeConv) return;
    const mod = ModerationService.checkText(input);
    if (!mod.ok) {
      setBlockedMsg('Tu mensaje contiene lenguaje inapropiado y no puede ser enviado. 🚫');
      setTimeout(() => setBlockedMsg(''), 3500);
      return;
    }
    ChatService.sendMessage(activeConv.id, currentUser, input, activeConv.participants || [currentUser.id], activeConv.itemTitle);
    setInput('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const getOtherName = (conv) => {
    if (!conv || !currentUser) return 'Usuario';
    if (conv.participantNames) {
      const otherId = Object.keys(conv.participantNames).find(k => k !== currentUser.id && k !== 'demo_joel');
      if (otherId) return conv.participantNames[otherId];
    }
    const allUsers = DB.get('users') || [];
    const otherId = (conv.participants || []).find(p => p !== currentUser.id);
    return allUsers.find(u => u.id === otherId)?.displayName || 'Usuario TALIX';
  };

  const getOtherColor = (conv) => {
    const palette = { demo_ana: '#6DBE7E', demo_carlos: '#5B9BD5', demo_lucia: '#F5A623' };
    const otherId = (conv?.participants || []).find(p => p !== currentUser?.id && p !== 'demo_joel');
    if (palette[otherId]) return palette[otherId];
    const allUsers = DB.get('users') || [];
    return allUsers.find(u => u.id === otherId)?.avatarColor || '#6DBE7E';
  };

  const createNewChat = async () => {
    if (!newChatUser.trim()) return;
    const target = newChatTarget;
    if (!target) { showToast('Selecciona un usuario de la lista', 'error'); return; }
    const convId = ChatService.getConversationId(currentUser.id, target.id);
    const participants = [currentUser.id, target.id];
    // Send a first system message to create the conversation in Firestore
    await ChatService.sendMessage(convId, currentUser, '👋 ¡Hola! Quiero iniciar un trueque contigo.', participants, newChatTopic || 'Nuevo chat');
    setShowNewChat(false);
    setNewChatUser(''); setNewChatTopic(''); setNewChatTarget(null);
    showToast('¡Conversación creada!', 'success');
  };

  const filteredUsers = newChatUser.length >= 2
    ? allUsersList.filter(u =>
        u.id !== currentUser?.id &&
        ((u.displayName || '').toLowerCase().includes(newChatUser.toLowerCase()) ||
         (u.email || '').toLowerCase().includes(newChatUser.toLowerCase()))
      )
    : [];

  const filteredConvos = convos.filter(c =>
    getOtherName(c).toLowerCase().includes(search.toLowerCase()) ||
    (c.itemTitle || '').toLowerCase().includes(search.toLowerCase())
  );

  const confirmMeetup = () => {
    if (!meetDate) { showToast('Selecciona fecha y hora', 'error'); return; }
    ChatService.setMeetup(activeConv.id, meetPlace, meetDate);
    const all = DB.get('conversations') || [];
    const idx = all.findIndex(c => c.id === activeConv.id);
    if (idx >= 0) { all[idx] = { ...all[idx], meetup: { place: meetPlace, dateTime: meetDate } }; DB.set('conversations', all); setActiveConv({ ...activeConv, meetup: { place: meetPlace, dateTime: meetDate } }); }
    showToast('¡Encuentro coordinado! 📅', 'success');
    setShowCoord(false);
  };

  const clearMeetup = () => {
    const all = DB.get('conversations') || [];
    const idx = all.findIndex(c => c.id === activeConv.id);
    if (idx >= 0) { all[idx] = { ...all[idx], meetup: null }; DB.set('conversations', all); setActiveConv({ ...activeConv, meetup: null }); }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {showTradeComplete && activeConv && (
        <TradeCompleteModal
          conv={activeConv}
          currentUser={currentUser}
          theme={theme}
          showToast={showToast}
          onClose={() => { setShowTradeComplete(false); showToast('¡Trueque completado! +10 puntos 🏆', 'success'); }}
        />
      )}
      {/* New chat modal */}
      {showNewChat && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 6000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 24, width: 420, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '22px 24px 16px', borderBottom: '1px solid #EEE', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 17, color: '#1C2B2B' }}>💬 Nuevo mensaje</div>
              <button onClick={() => setShowNewChat(false)} style={{ background: '#F4F6F0', border: 'none', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 15 }}>✕</button>
            </div>
            <div style={{ padding: '18px 24px 24px' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 6 }}>BUSCAR USUARIO USIL</label>
              {newChatTarget ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: `${theme.primary}12`, border: `1.5px solid ${theme.primary}`, borderRadius: 12, marginBottom: 10 }}>
                  <TAvatar name={newChatTarget.displayName} color={newChatTarget.avatarColor} size={32} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1C2B2B' }}>{newChatTarget.displayName}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>{newChatTarget.email}</div>
                  </div>
                  <button onClick={() => { setNewChatTarget(null); setNewChatUser(''); }} style={{ background: '#EEE', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: 12 }}>✕</button>
                </div>
              ) : (
                <>
                  <input
                    value={newChatUser}
                    onChange={e => { setNewChatUser(e.target.value); setNewChatTarget(null); }}
                    placeholder="Escribe nombre o correo..."
                    style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #EEE', borderRadius: 12, fontFamily: 'Poppins', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
                    onFocus={e => e.target.style.borderColor = theme.primary}
                    onBlur={e => e.target.style.borderColor = '#EEE'}
                    autoFocus
                  />
                  {newChatUser.length >= 2 && (
                    <div style={{ background: '#F9F9F9', borderRadius: 12, overflow: 'hidden', marginBottom: 12, maxHeight: 180, overflowY: 'auto', border: '1px solid #EEE' }}>
                      {filteredUsers.length === 0
                        ? <div style={{ padding: '14px', textAlign: 'center', color: '#AAA', fontSize: 13 }}>No encontrado. Verifica el nombre o correo.</div>
                        : filteredUsers.map(u => (
                          <div key={u.id} onClick={() => { setNewChatTarget(u); setNewChatUser(u.displayName); }}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', cursor: 'pointer', borderBottom: '1px solid #EEE' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#F0F4FA'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <TAvatar name={u.displayName} color={u.avatarColor} size={32} />
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#1C2B2B' }}>{u.displayName}</div>
                              <div style={{ fontSize: 11, color: '#888' }}>{u.email} · {u.faculty?.split(' ')[0]}</div>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  )}
                </>
              )}
              <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 6 }}>ARTÍCULO O MOTIVO (opcional)</label>
              <input
                value={newChatTopic}
                onChange={e => setNewChatTopic(e.target.value)}
                placeholder="Ej: Mouse Logitech, Cálculo Larson..."
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #EEE', borderRadius: 12, fontFamily: 'Poppins', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 16 }}
                onFocus={e => e.target.style.borderColor = theme.primary}
                onBlur={e => e.target.style.borderColor = '#EEE'}
              />
              <button
                onClick={createNewChat}
                disabled={!newChatTarget}
                style={{ width: '100%', padding: '13px', borderRadius: 100, border: 'none', background: newChatTarget ? theme.primary : '#DDD', color: '#fff', fontFamily: 'Poppins', fontWeight: 700, fontSize: 14, cursor: newChatTarget ? 'pointer' : 'default' }}
              >
                Iniciar conversación →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conversations sidebar */}
      <div style={{ width: 300, borderRight: '1px solid #EEE', background: '#fff', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #EEE' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1C2B2B' }}>Mensajes</div>
            <button onClick={() => setShowNewChat(true)} style={{ background: theme.primary, border: 'none', borderRadius: 100, padding: '7px 14px', cursor: 'pointer', fontFamily: 'Poppins', fontWeight: 600, fontSize: 12, color: '#fff' }}>✏️ Nuevo</button>
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar..."
            style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #EEE', borderRadius: 10, fontFamily: 'Poppins', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#F9F9F9' }}
            onFocus={e => e.target.style.borderColor = theme.primary}
            onBlur={e => e.target.style.borderColor = '#EEE'}
          />
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredConvos.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: '#AAA' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>💬</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Sin conversaciones</div>
              <button onClick={() => setShowNewChat(true)} style={{ marginTop: 12, background: theme.primary, border: 'none', borderRadius: 100, padding: '9px 20px', cursor: 'pointer', fontFamily: 'Poppins', fontWeight: 600, fontSize: 12, color: '#fff' }}>+ Nuevo chat</button>
            </div>
          ) : filteredConvos.map(c => {
            const isActive = activeConv?.id === c.id;
            return (
              <div
                key={c.id}
                onClick={() => { setActiveConv(c); setShowCoord(false); }}
                style={{ padding: '13px 16px', borderBottom: '1px solid #F5F5F5', cursor: 'pointer', background: isActive ? theme.primary + '0D' : '#fff', display: 'flex', alignItems: 'center', gap: 10, borderLeft: isActive ? '3px solid ' + theme.primary : '3px solid transparent', transition: 'background 0.12s' }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <TAvatar name={getOtherName(c)} color={getOtherColor(c)} size={40} />
                  <div style={{ position: 'absolute', bottom: 1, right: 1, width: 9, height: 9, borderRadius: '50%', background: '#4CAF50', border: '2px solid #fff' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontWeight: isActive ? 700 : 600, fontSize: 13, color: '#1C2B2B' }}>{getOtherName(c)}</span>
                    <span style={{ fontSize: 10, color: '#CCC' }}>{fmtTime(c.lastTime)}</span>
                  </div>
                  {c.itemTitle && <div style={{ fontSize: 10, color: theme.primary + '99', marginBottom: 2 }}>📦 {c.itemTitle}</div>}
                  <div style={{ fontSize: 12, color: (c.unread || 0) > 0 ? '#1C2B2B' : '#AAA', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: (c.unread || 0) > 0 ? 600 : 400 }}>
                    {c.lastMsg || 'Sin mensajes aún'}
                  </div>
                </div>
                {(c.unread || 0) > 0 && (
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: theme.primary, color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{c.unread}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat window */}
      {!activeConv ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAF8' }}>
          <div style={{ textAlign: 'center', color: '#AAA' }}>
            <div style={{ fontSize: 64, marginBottom: 14 }}>💬</div>
            <div style={{ fontSize: 17, fontWeight: 600, color: '#888', marginBottom: 6 }}>Selecciona una conversación</div>
            <button onClick={() => setShowNewChat(true)} style={{ background: theme.primary, border: 'none', borderRadius: 100, padding: '12px 28px', cursor: 'pointer', fontFamily: 'Poppins', fontWeight: 700, fontSize: 14, color: '#fff' }}>✏️ Nuevo mensaje</button>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#F9FAF8', minWidth: 0 }}>
          {/* Header */}
          <div style={{ padding: '14px 22px', background: '#fff', borderBottom: '1px solid #EEE', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <TAvatar name={getOtherName(activeConv)} color={getOtherColor(activeConv)} size={42} />
              <div style={{ position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: '50%', background: '#4CAF50', border: '2px solid #fff' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#1C2B2B' }}>{getOtherName(activeConv)} <span style={{ fontSize: 11, color: '#4CAF50', fontWeight: 600 }}>✓ USIL</span></div>
              {activeConv.itemTitle && <div style={{ fontSize: 12, color: '#888' }}>📦 {activeConv.itemTitle}</div>}
            </div>
            {activeConv.meetup && (
              <div style={{ background: '#E8F5E9', padding: '6px 12px', borderRadius: 100, fontSize: 12, fontWeight: 600, color: '#2E7D32' }}>
                📅 {new Date(activeConv.meetup.dateTime).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })}
              </div>
            )}
            {activeConv.meetup && (
              <button
                onClick={() => setShowTradeComplete(true)}
                style={{ background: '#E8F5E9', color: '#2E7D32', border: 'none', padding: '9px 16px', borderRadius: 100, cursor: 'pointer', fontFamily: 'Poppins', fontWeight: 600, fontSize: 12, flexShrink: 0 }}
              >
                ✅ Completar trueque
              </button>
            )}
            <button
              onClick={() => setShowCoord(!showCoord)}
              style={{ background: showCoord ? theme.primary : '#F4F6F0', color: showCoord ? '#fff' : '#555', border: 'none', padding: '9px 16px', borderRadius: 100, cursor: 'pointer', fontFamily: 'Poppins', fontWeight: 600, fontSize: 12, transition: 'all 0.2s', flexShrink: 0 }}
            >
              📅 Coordinar
            </button>
          </div>

          {/* Coordination panel */}
          {showCoord && (
            <div style={{ background: '#fff', borderBottom: '1px solid #EEE', padding: '14px 22px', flexShrink: 0 }}>
              {activeConv.meetup ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 26 }}>✅</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#2E7D32' }}>¡Encuentro coordinado!</div>
                    <div style={{ fontSize: 13, color: '#555' }}>
                      {activeConv.meetup.place} · {activeConv.meetup.dateTime ? new Date(activeConv.meetup.dateTime).toLocaleString('es', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                  </div>
                  <button onClick={clearMeetup} style={{ marginLeft: 'auto', background: '#F4F6F0', border: 'none', padding: '7px 14px', borderRadius: 100, cursor: 'pointer', fontFamily: 'Poppins', fontSize: 12, color: '#888' }}>Cambiar</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#666', display: 'block', marginBottom: 5 }}>📍 Eco-Spot</label>
                    <select value={meetPlace} onChange={e => setMeetPlace(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #EEE', borderRadius: 10, fontFamily: 'Poppins', fontSize: 13, background: '#FAFBFA', outline: 'none' }}>
                      {ECO_SPOTS.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#666', display: 'block', marginBottom: 5 }}>📅 Fecha y hora</label>
                    <input type="datetime-local" value={meetDate} onChange={e => setMeetDate(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #EEE', borderRadius: 10, fontFamily: 'Poppins', fontSize: 13, background: '#FAFBFA', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <TButton onClick={confirmMeetup} theme={theme} style={{ padding: '10px 16px', whiteSpace: 'nowrap', flexShrink: 0 }}>Confirmar 📤</TButton>
                </div>
              )}
            </div>
          )}

          {/* Safety banner */}
          <div style={{ background: '#FFF8E1', borderBottom: '1px solid #FFE082', padding: '7px 22px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 14 }}>🔒</span>
            <span style={{ fontSize: 11, color: '#795548', fontWeight: 500 }}>Por tu seguridad, <strong>no compartas números de teléfono</strong> ni coordines fuera de TALIX. Todos los intercambios deben realizarse en los Eco-Spots del campus.</span>
          </div>

          {/* Messages */}
          <div
            ref={msgsContainerRef}
            onScroll={e => {
              const el = e.currentTarget;
              isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
            }}
            style={{ flex: 1, overflowY: 'auto', padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            {msgs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#CCC' }}>
                <div style={{ fontSize: 44, marginBottom: 10 }}>👋</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#AAA' }}>Inicia la conversación con {getOtherName(activeConv)}</div>
              </div>
            )}
            {msgs.map((m, i) => {
              const isMe = m.fromId === currentUser?.id || m.fromId === 'demo_joel';
              const isSystem = m.isSystem || m.fromId === 'system';
              if (isSystem) return (
                <div key={m.id || i} style={{ textAlign: 'center', padding: '4px 0' }}>
                  <span style={{ background: '#E8F5E9', color: '#2E7D32', fontSize: 12, fontWeight: 600, padding: '6px 16px', borderRadius: 100, display: 'inline-block' }}>{m.text}</span>
                </div>
              );
              return (
                <div key={m.id || i} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 8 }}>
                  {!isMe && <TAvatar name={m.fromName || 'U'} color={m.fromColor || '#6DBE7E'} size={28} />}
                  <div style={{ maxWidth: '66%' }}>
                    {!isMe && <div style={{ fontSize: 11, color: '#AAA', marginBottom: 3, paddingLeft: 4 }}>{m.fromName}</div>}
                    <div style={{ padding: '10px 15px', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: isMe ? theme.primary : '#fff', color: isMe ? '#fff' : '#1C2B2B', fontSize: 14, lineHeight: 1.55, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                      {m.text}
                      <div style={{ fontSize: 10, opacity: 0.55, marginTop: 3, textAlign: 'right' }}>
                        {m.createdAt ? new Date(m.createdAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : ''}
                        {isMe && ' ✓✓'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} style={{ height: 1 }} />
          </div>

          {blockedMsg && (
            <div style={{ margin: '0 22px 4px', background: '#FFEBEE', border: '1px solid #FFCDD2', borderRadius: 10, padding: '8px 14px', fontSize: 12, color: '#C62828', flexShrink: 0 }}>
              {blockedMsg}
            </div>
          )}

          {/* Quick replies */}
          <div style={{ padding: '8px 22px 4px', background: '#F9FAF8', display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
            {QUICK.map(q => (
              <button key={q} onClick={() => { setInput(q); inputRef.current?.focus(); }} style={{ padding: '5px 12px', background: '#fff', border: '1px solid ' + theme.primary + '40', borderRadius: 100, cursor: 'pointer', fontFamily: 'Poppins', fontSize: 12, color: theme.primary, fontWeight: 500 }}>{q}</button>
            ))}
          </div>

          {/* Input */}
          <div style={{ padding: '10px 22px 16px', background: '#F9FAF8', display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Escribe un mensaje..."
              style={{ flex: 1, padding: '12px 18px', border: '1.5px solid #EEE', borderRadius: 100, fontFamily: 'Poppins', fontSize: 14, outline: 'none', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
              onFocus={e => e.target.style.borderColor = theme.primary}
              onBlur={e => e.target.style.borderColor = '#EEE'}
            />
            <button onClick={send} disabled={!input.trim()} style={{ width: 44, height: 44, borderRadius: '50%', background: input.trim() ? theme.primary : '#DDD', border: 'none', color: '#fff', fontSize: 18, cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s', flexShrink: 0 }}>↑</button>
          </div>
        </div>
      )}
    </div>
  );
}
