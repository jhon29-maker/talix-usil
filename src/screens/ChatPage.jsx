import { useState, useEffect, useRef } from 'react';
import * as nsfwjs from 'nsfwjs';
import { DB } from '../services/db';
import { UsersService } from '../services/users';
import { ChatService } from '../services/chat';
import { ModerationService } from '../services/moderation';
import { FIREBASE_READY, db } from '../config/firebase';
import { collection, addDoc, doc, updateDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { TAvatar, TButton } from '../components/ui';
import TradeCompleteModal from './TradeCompleteModal';

const QUICK = ['¿Cuándo puedes?', '¿Dónde nos vemos?', '¡Me interesa! 🙌', '¿Está disponible aún?'];
const ECO_SPOTS = ['Biblioteca Central USIL', 'Cafetería Principal', 'Entrada Principal', 'Sala de Estudio B2', 'Patio Central', 'Terraza USIL', 'Edificio F – Lobby'];

// NSFW classifier — nsfwjs already in project dependencies
let _nsfwPromise = null;
function loadNsfwClassifier() {
  if (_nsfwPromise) return _nsfwPromise;
  _nsfwPromise = nsfwjs.load().catch(() => null);
  return _nsfwPromise;
}
async function checkImageNSFW(dataUrl) {
  try {
    const model = await Promise.race([loadNsfwClassifier(), new Promise(r => setTimeout(() => r(null), 12000))]);
    if (!model) return false;
    const img = new Image();
    img.src = dataUrl;
    await new Promise(r => { img.onload = r; img.onerror = r; });
    const preds = await model.classify(img);
    const porn = preds.find(p => p.className === 'Porn')?.probability || 0;
    const hentai = preds.find(p => p.className === 'Hentai')?.probability || 0;
    return (porn + hentai) > 0.5;
  } catch { return false; }
}

// Compress image to max 480px / JPEG 65% — keeps base64 under ~50 KB so it fits in a Firestore doc
function compressImage(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 480;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.65));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// Handle both Firestore Timestamps and ISO strings
function parseTs(ts) {
  if (!ts) return null;
  if (typeof ts.toDate === 'function') return ts.toDate();
  const d = new Date(ts);
  return isNaN(d.getTime()) ? null : d;
}

function fmtTime(ts) {
  const d = parseTs(ts);
  if (!d) return '';
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return 'ahora';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm';
  if (diff < 86400000) return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

function fmtMsgTime(ts) {
  const d = parseTs(ts);
  if (!d) return '';
  return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
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
  const [photoPreview, setPhotoPreview] = useState(null);
  const [sendingPhoto, setSendingPhoto] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportTab, setReportTab] = useState('estafa'); // 'estafa' | 'evidencia'
  const [reportText, setReportText] = useState('');
  const [reportPhoto, setReportPhoto] = useState(null);
  const [sendingReport, setSendingReport] = useState(false);
  const [showMeetupProposalModal, setShowMeetupProposalModal] = useState(false);
  const [tradeAlertDismissed, setTradeAlertDismissed] = useState(new Set());
  const reportFileRef = useRef(null);
  const seenProposalRef = useRef({});
  const bottomRef = useRef(null);
  const msgsContainerRef = useRef(null);
  const isAtBottomRef = useRef(true);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const activeConvRef = useRef(null);
  const allUsersRef = useRef([]);

  useEffect(() => { activeConvRef.current = activeConv; }, [activeConv]);
  useEffect(() => { allUsersRef.current = allUsersList; }, [allUsersList]);

  useEffect(() => {
    return UsersService.subscribe(setAllUsersList);
  }, []);

  // Pre-load NSFW model in background so it's ready when user picks a photo
  useEffect(() => { loadNsfwClassifier(); }, []);

  useEffect(() => {
    if (!currentUser) return;
    return ChatService.getConversations(currentUser.id, currentUser.email, currentUser.displayName, (sorted) => {
      // Use functional update so we can merge with previous state (never lose known-good names)
      setConvos(prev => sorted.map(conv => {
        const existing = prev.find(c => c.id === conv.id);
        // Merge: keep any names already known (prev state), overlay with Firestore data
        const names = { ...(existing?.participantNames || {}), ...(conv.participantNames || {}) };
        const otherId = (conv.participants || []).find(p => p !== currentUser.id);
        if (otherId && !names[otherId]) {
          const user = allUsersRef.current.find(u => u.id === otherId);
          if (user) {
            names[otherId] = user.displayName;
            names[currentUser.id] = currentUser.displayName;
            if (FIREBASE_READY) updateDoc(doc(db, 'conversations', conv.id), { participantNames: names }).catch(() => {});
          }
        }
        return Object.keys(names).length > 0 ? { ...conv, participantNames: names } : conv;
      }));
      if (!activeConvRef.current && sorted.length > 0) setActiveConv(sorted[0]);
    });
  }, [currentUser]);

  // Re-enrich conversations whenever allUsersList loads/updates
  useEffect(() => {
    if (!allUsersList.length || !currentUser) return;
    setConvos(prev => prev.map(conv => {
      const otherId = (conv.participants || []).find(p => p !== currentUser.id);
      if (!otherId || conv.participantNames?.[otherId]) return conv;
      const user = allUsersList.find(u => u.id === otherId);
      if (!user) return conv;
      const names = { ...(conv.participantNames || {}), [otherId]: user.displayName, [currentUser.id]: currentUser.displayName };
      if (FIREBASE_READY) updateDoc(doc(db, 'conversations', conv.id), { participantNames: names }).catch(() => {});
      return { ...conv, participantNames: names };
    }));
  }, [allUsersList, currentUser]);

  // Close proposal modal when switching conversations
  useEffect(() => { setShowMeetupProposalModal(false); }, [activeConv?.id]);

  // Show proposal modal when the other person proposes a meetup
  useEffect(() => {
    if (!currentUser || !activeConv) return;
    const convData = convos.find(c => c.id === activeConv.id) || activeConv;
    const proposal = convData.meetupProposal;
    if (!proposal || proposal.status !== 'pending' || proposal.proposedBy === currentUser.id) return;
    if (seenProposalRef.current[convData.id] === proposal.proposedAt) return;
    seenProposalRef.current[convData.id] = proposal.proposedAt;
    setShowMeetupProposalModal(true);
  }, [convos, activeConv?.id, currentUser]);

  // Proactively resolve names for convos that still show "..." by loading their messages
  const resolvedRef = useRef(new Set());
  useEffect(() => {
    if (!currentUser || !FIREBASE_READY) return;
    const unknowns = convos.filter(c => {
      if (resolvedRef.current.has(c.id)) return false;
      if (c.lastMsgFromId && c.lastMsgFromId !== currentUser.id && c.lastMsgFromName) return false;
      if (c.participantNames && Object.entries(c.participantNames).some(([k, v]) => k !== currentUser.id && v)) return false;
      return true;
    });
    if (!unknowns.length) return;
    unknowns.forEach(async conv => {
      resolvedRef.current.add(conv.id);
      try {
        const snap = await getDocs(collection(db, 'conversations', conv.id, 'messages'));
        const otherMsg = snap.docs.map(d => d.data()).find(m => m.fromId !== currentUser.id && m.fromId !== 'system' && m.fromName);
        if (!otherMsg) return;
        const updates = { lastMsgFromId: otherMsg.fromId, lastMsgFromName: otherMsg.fromName, [`participantNames.${otherMsg.fromId}`]: otherMsg.fromName };
        updateDoc(doc(db, 'conversations', conv.id), updates).catch(() => {});
        setConvos(prev => prev.map(c => c.id === conv.id ? { ...c, ...updates } : c));
      } catch (_) {}
    });
  }, [convos.length, currentUser]);

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
    ChatService.sendMessage(activeConv.id, currentUser, input, activeConv.participants || [currentUser.id], activeConv.itemTitle, null, activeConv.participantNames || null);
    setInput('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const sendPhoto = async () => {
    if (!photoPreview || !activeConv) return;
    setSendingPhoto(true);
    // AI content moderation — block intimate/NSFW images
    const nsfw = await checkImageNSFW(photoPreview);
    if (nsfw) {
      showToast('🚫 Imagen bloqueada: contenido inapropiado detectado por IA', 'error');
      setPhotoPreview(null);
      setSendingPhoto(false);
      return;
    }
    // Try Firebase Storage (6s timeout), fall back to inline base64 in Firestore
    let url = await ChatService.uploadPhoto(activeConv.id, photoPreview);
    if (!url) url = await compressImage(photoPreview);
    await ChatService.sendMessage(activeConv.id, currentUser, '', activeConv.participants || [currentUser.id], activeConv.itemTitle, url);
    setPhotoPreview(null);
    setSendingPhoto(false);
  };

  const submitReport = async () => {
    if (!reportText.trim() && !reportPhoto) { showToast('Agrega un comentario o foto', 'error'); return; }
    setSendingReport(true);
    try {
      let photoUrl = null;
      if (reportPhoto) photoUrl = await ChatService.uploadPhoto(activeConv?.id || 'reports', reportPhoto);
      const report = {
        type: reportTab,
        reporterId: currentUser?.id,
        reporterName: currentUser?.displayName,
        convId: activeConv?.id || null,
        otherUserId: (activeConv?.participants || []).find(p => p !== currentUser?.id),
        comment: reportText,
        photoUrl,
        createdAt: FIREBASE_READY ? serverTimestamp() : new Date().toISOString(),
        status: 'pendiente',
      };
      if (FIREBASE_READY) {
        await addDoc(collection(db, 'scam_reports'), report);
      } else {
        DB.push('scam_reports', report);
      }
      showToast(reportTab === 'estafa' ? '⚠️ Reporte enviado al administrador' : '📎 Evidencia enviada correctamente', 'success');
      setShowReport(false);
      setReportText(''); setReportPhoto(null);
    } catch (_) {
      showToast('Error al enviar. Intenta de nuevo.', 'error');
    }
    setSendingReport(false);
  };

  const getOtherName = (conv) => {
    if (!conv || !currentUser) return '...';
    const myName = currentUser.displayName;
    const myEmail = currentUser.email;
    // Returns true if the given ID belongs to the current user (checks ID, name, AND email across all known docs)
    const isMyId = (id) => {
      if (!id || id === 'system') return true;
      if (id === currentUser.id) return true;
      if (conv.participantNames?.[id] === myName) return true;
      const allUsers = [...allUsersList, ...(DB.get('users') || [])];
      const u = allUsers.find(x => x.id === id);
      return !!(u && (u.email === myEmail || u.displayName === myName));
    };
    // 1. Last message sender — only if it's not me
    if (conv.lastMsgFromName && !isMyId(conv.lastMsgFromId)) {
      return conv.lastMsgFromName;
    }
    // 2. participantNames by value — find first entry that isn't me
    if (conv.participantNames) {
      const other = Object.entries(conv.participantNames).find(([k, v]) => v && v !== myName && !isMyId(k));
      if (other) return other[1];
    }
    // 3. participants array — first ID that isn't mine
    const otherId = (conv.participants || []).find(p => !isMyId(p));
    if (otherId && conv.participantNames?.[otherId]) return conv.participantNames[otherId];
    // 4. Live users list (only if the found user is genuinely a different person)
    if (otherId) {
      const allUsers = [...allUsersList, ...(DB.get('users') || [])];
      const found = allUsers.find(u => u.id === otherId);
      if (found && found.email !== myEmail) return found.displayName;
    }
    // 5. Messages of active conversation as last resort
    if (activeConv?.id === conv.id && msgs.length > 0) {
      const m = msgs.find(x => x.fromName && !isMyId(x.fromId));
      if (m?.fromName) return m.fromName;
    }
    return '...';
  };

  const getOtherColor = (conv) => {
    const palette = { demo_ana: '#6DBE7E', demo_carlos: '#5B9BD5', demo_lucia: '#F5A623' };
    const myEmail = currentUser?.email;
    const myName = currentUser?.displayName;
    const allUsers = [...allUsersList, ...(DB.get('users') || [])];
    const otherId = (conv?.participants || []).find(p => {
      if (!p || p === currentUser?.id || p === 'demo_joel') return false;
      const name = conv?.participantNames?.[p];
      if (name && name === myName) return false;
      const u = allUsers.find(x => x.id === p);
      if (u && (u.email === myEmail || u.displayName === myName)) return false;
      return true;
    });
    if (palette[otherId]) return palette[otherId];
    const found = allUsers.find(u => u.id === otherId && u.email !== myEmail);
    return found?.avatarColor || '#6DBE7E';
  };

  const createNewChat = () => {
    if (!newChatTarget) { showToast('Selecciona un usuario de la lista', 'error'); return; }
    const target = newChatTarget;
    const convId = ChatService.getConversationId(currentUser.id, target.id);
    const participants = [currentUser.id, target.id];
    const topic = newChatTopic || 'Nuevo chat';

    // Navigate immediately without waiting for Firestore
    const newConv = {
      id: convId, participants, itemTitle: topic,
      participantNames: { [currentUser.id]: currentUser.displayName, [target.id]: target.displayName },
      lastMsg: '👋 ¡Hola! Quiero iniciar un trueque contigo.',
      lastTime: new Date().toISOString(), unread: 0,
    };
    setActiveConv(newConv);
    setShowNewChat(false);
    setNewChatUser(''); setNewChatTopic(''); setNewChatTarget(null);
    showToast('¡Conversación creada!', 'success');

    // Write to Firestore in background (include names so other side shows correct name)
    ChatService.sendMessage(convId, currentUser, '👋 ¡Hola! Quiero iniciar un trueque contigo.', participants, topic, null, { [currentUser.id]: currentUser.displayName, [target.id]: target.displayName });
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

  const handleAcceptMeetup = async () => {
    const convData = convos.find(c => c.id === activeConv?.id) || activeConv;
    const proposal = convData?.meetupProposal;
    if (!proposal) return;
    await ChatService.acceptMeetup(activeConv.id, proposal);
    setActiveConv(prev => prev ? { ...prev, meetup: { place: proposal.place, dateTime: proposal.dateTime }, meetupProposal: null } : prev);
    setShowMeetupProposalModal(false);
    showToast('¡Encuentro confirmado! ✅', 'success');
  };

  const handleChangeMeetup = () => {
    const convData = convos.find(c => c.id === activeConv?.id) || activeConv;
    const proposal = convData?.meetupProposal;
    if (proposal?.place) setMeetPlace(proposal.place);
    if (proposal?.dateTime) setMeetDate(proposal.dateTime);
    setShowMeetupProposalModal(false);
    setShowCoord(true);
  };

  const confirmMeetup = () => {
    if (!meetDate) { showToast('Selecciona fecha y hora', 'error'); return; }
    const selected = new Date(meetDate).getTime();
    const minAllowed = Date.now() + 30 * 60 * 1000;
    if (selected < minAllowed) {
      showToast('La hora debe ser al menos 30 minutos en el futuro ⏰', 'error');
      return;
    }
    ChatService.setMeetup(activeConv.id, meetPlace, meetDate, currentUser);
    setActiveConv(prev => prev ? { ...prev, meetupProposal: { place: meetPlace, dateTime: meetDate, proposedBy: currentUser.id, proposedByName: currentUser.displayName, status: 'pending', proposedAt: new Date().toISOString() } } : prev);
    showToast('¡Propuesta enviada! Tu compañero debe confirmar 📅', 'success');
    setShowCoord(false);
  };

  const clearMeetup = async () => {
    if (FIREBASE_READY) {
      try { await updateDoc(doc(db, 'conversations', activeConv.id), { meetup: null, meetupProposal: null }); } catch(_) {}
    }
    const all = DB.get('conversations') || [];
    const idx = all.findIndex(c => c.id === activeConv.id);
    if (idx >= 0) { all[idx] = { ...all[idx], meetup: null, meetupProposal: null }; DB.set('conversations', all); }
    setActiveConv(prev => prev ? { ...prev, meetup: null, meetupProposal: null } : prev);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Meetup proposal modal */}
      {showMeetupProposalModal && (() => {
        const convData = convos.find(c => c.id === activeConv?.id) || activeConv;
        const proposal = convData?.meetupProposal;
        if (!proposal) return null;
        let dateLabel = proposal.dateTime;
        try { dateLabel = new Date(proposal.dateTime).toLocaleString('es', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }); } catch(_) {}
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 8000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: 24, width: 420, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.3)' }}>
              <div style={{ background: 'linear-gradient(135deg, #E8F5E9, #F1F8E9)', padding: '28px 24px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 52, marginBottom: 8 }}>📅</div>
                <div style={{ fontWeight: 700, fontSize: 18, color: '#1C2B2B', marginBottom: 4 }}>Nueva propuesta de encuentro</div>
                <div style={{ fontSize: 13, color: '#555' }}><strong>{proposal.proposedByName}</strong> quiere coordinar contigo</div>
              </div>
              <div style={{ padding: '20px 24px 24px' }}>
                <div style={{ background: '#F5FAF5', border: '1.5px solid #C8E6C9', borderRadius: 16, padding: '16px 18px', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <span style={{ fontSize: 22 }}>📍</span>
                    <div>
                      <div style={{ fontSize: 10, color: '#888', fontWeight: 700, letterSpacing: 0.5, marginBottom: 2 }}>LUGAR</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#1C2B2B' }}>{proposal.place}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 22 }}>🕐</span>
                    <div>
                      <div style={{ fontSize: 10, color: '#888', fontWeight: 700, letterSpacing: 0.5, marginBottom: 2 }}>FECHA Y HORA</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#1C2B2B' }}>{dateLabel}</div>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={handleAcceptMeetup}
                    style={{ flex: 1, padding: '13px 16px', borderRadius: 100, border: 'none', background: theme.primary, color: '#fff', fontFamily: 'Poppins', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
                  >✅ Aceptar coordinación</button>
                  <button
                    onClick={handleChangeMeetup}
                    style={{ flex: 1, padding: '13px 16px', borderRadius: 100, border: `2px solid ${theme.primary}`, background: '#fff', color: theme.primary, fontFamily: 'Poppins', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
                  >📅 Cambiar fecha</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {showTradeComplete && activeConv && (
        <TradeCompleteModal
          conv={activeConv}
          currentUser={currentUser}
          theme={theme}
          showToast={showToast}
          onClose={() => { setShowTradeComplete(false); showToast('¡Trueque completado! +10 puntos 🏆', 'success'); }}
        />
      )}
      {/* Report modal */}
      {showReport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 7000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 24, width: 440, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid #EEE', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#1C2B2B' }}>⚠️ Reportar</div>
              <button onClick={() => { setShowReport(false); setReportText(''); setReportPhoto(null); }} style={{ background: '#F4F6F0', border: 'none', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 15 }}>✕</button>
            </div>
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #EEE' }}>
              {[['estafa', '🚨 Reportar estafa'], ['evidencia', '📎 Subir evidencia']].map(([tab, label]) => (
                <button key={tab} onClick={() => setReportTab(tab)} style={{ flex: 1, padding: '12px', border: 'none', background: 'none', fontFamily: 'Poppins', fontWeight: 600, fontSize: 13, cursor: 'pointer', color: reportTab === tab ? theme.primary : '#888', borderBottom: reportTab === tab ? `2px solid ${theme.primary}` : '2px solid transparent' }}>{label}</button>
              ))}
            </div>
            <div style={{ padding: '18px 24px 24px' }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
                {reportTab === 'estafa' ? 'Describe la situación sospechosa. El administrador revisará el reporte.' : 'Sube evidencia del intercambio (foto del artículo, captura, etc.).'}
              </div>
              <textarea
                value={reportText}
                onChange={e => setReportText(e.target.value)}
                placeholder={reportTab === 'estafa' ? 'Describe qué pasó...' : 'Comentario sobre la evidencia (opcional)...'}
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #EEE', borderRadius: 12, fontFamily: 'Poppins', fontSize: 13, outline: 'none', boxSizing: 'border-box', minHeight: 90, resize: 'vertical', marginBottom: 12 }}
              />
              <input ref={reportFileRef} type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = ev => setReportPhoto(ev.target.result); r.readAsDataURL(f); e.target.value = ''; }} style={{ display: 'none' }} />
              {reportPhoto
                ? <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <img src={reportPhoto} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 10 }} />
                    <button onClick={() => setReportPhoto(null)} style={{ fontSize: 12, color: '#E57373', background: 'none', border: 'none', cursor: 'pointer' }}>Quitar foto</button>
                  </div>
                : <button onClick={() => reportFileRef.current?.click()} style={{ width: '100%', padding: '10px', border: '1.5px dashed #DDD', borderRadius: 12, background: '#FAFAFA', fontFamily: 'Poppins', fontSize: 13, color: '#888', cursor: 'pointer', marginBottom: 14 }}>📷 Adjuntar foto</button>
              }
              <button onClick={submitReport} disabled={sendingReport} style={{ width: '100%', padding: '13px', borderRadius: 100, border: 'none', background: reportTab === 'estafa' ? '#E53935' : theme.primary, color: '#fff', fontFamily: 'Poppins', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                {sendingReport ? 'Enviando...' : reportTab === 'estafa' ? '🚨 Enviar reporte' : '📎 Enviar evidencia'}
              </button>
            </div>
          </div>
        </div>
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
                onClick={() => { setActiveConv(c); setShowCoord(false); ChatService.resetUnread(c.id, currentUser?.id); }}
                style={{ padding: '13px 16px', borderBottom: '1px solid #F5F5F5', cursor: 'pointer', background: isActive ? theme.primary + '0D' : '#fff', display: 'flex', alignItems: 'center', gap: 10, borderLeft: isActive ? '3px solid ' + theme.primary : '3px solid transparent', transition: 'background 0.12s', position: 'relative' }}
                onMouseEnter={e => { const btn = e.currentTarget.querySelector('.del-btn'); if (btn) btn.style.display = 'flex'; }}
                onMouseLeave={e => { const btn = e.currentTarget.querySelector('.del-btn'); if (btn) btn.style.display = 'none'; }}
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
                {(c.unreadCounts?.[currentUser?.id] || 0) > 0 && (
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: theme.primary, color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{c.unreadCounts[currentUser.id]}</div>
                )}
                <button
                  className="del-btn"
                  onClick={e => { e.stopPropagation(); ChatService.deleteConversation(c.id, currentUser.id); if (activeConv?.id === c.id) setActiveConv(null); }}
                  style={{ display: 'none', position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 26, height: 26, borderRadius: '50%', background: '#FFEBEE', border: 'none', color: '#E53935', fontSize: 13, cursor: 'pointer', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                  title="Eliminar chat"
                >🗑</button>
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
          {/* Header + Coordination panel — share liveConv data */}
          {(() => {
            const liveConv = convos.find(c => c.id === activeConv.id) || activeConv;
            const myPendingProposal = liveConv.meetupProposal?.status === 'pending' && liveConv.meetupProposal?.proposedBy === currentUser?.id ? liveConv.meetupProposal : null;
            return (
              <>
                <div style={{ padding: '14px 22px', background: '#fff', borderBottom: '1px solid #EEE', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                  <div style={{ position: 'relative' }}>
                    <TAvatar name={getOtherName(activeConv)} color={getOtherColor(activeConv)} size={42} />
                    <div style={{ position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: '50%', background: '#4CAF50', border: '2px solid #fff' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#1C2B2B' }}>{getOtherName(activeConv)} <span style={{ fontSize: 11, color: '#4CAF50', fontWeight: 600 }}>✓ USIL</span></div>
                    {activeConv.itemTitle && <div style={{ fontSize: 12, color: '#888' }}>📦 {activeConv.itemTitle}</div>}
                  </div>
                  {liveConv.meetup && (
                    <div style={{ background: '#E8F5E9', padding: '6px 12px', borderRadius: 100, fontSize: 12, fontWeight: 600, color: '#2E7D32' }}>
                      📅 {new Date(liveConv.meetup.dateTime).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </div>
                  )}
                  {myPendingProposal && !liveConv.meetup && (
                    <div style={{ background: '#FFF3E0', padding: '6px 12px', borderRadius: 100, fontSize: 12, fontWeight: 600, color: '#E65100' }}>
                      ⏳ Esperando respuesta...
                    </div>
                  )}
                  {liveConv.meetup && liveConv.status !== 'completado' && (
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
                  <button
                    onClick={() => setShowReport(true)}
                    style={{ background: '#FFEBEE', color: '#E53935', border: 'none', padding: '9px 16px', borderRadius: 100, cursor: 'pointer', fontFamily: 'Poppins', fontWeight: 600, fontSize: 12, flexShrink: 0 }}
                  >
                    ⚠️ Reportar
                  </button>
                </div>

                {/* Coordination panel */}
                {showCoord && (
                  <div style={{ background: '#fff', borderBottom: '1px solid #EEE', padding: '14px 22px', flexShrink: 0 }}>
                    {liveConv.meetup ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 26 }}>✅</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: '#2E7D32' }}>¡Encuentro confirmado por ambas partes!</div>
                          <div style={{ fontSize: 13, color: '#555' }}>
                            {liveConv.meetup.place} · {liveConv.meetup.dateTime ? new Date(liveConv.meetup.dateTime).toLocaleString('es', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                          </div>
                        </div>
                        <button onClick={clearMeetup} style={{ marginLeft: 'auto', background: '#F4F6F0', border: 'none', padding: '7px 14px', borderRadius: 100, cursor: 'pointer', fontFamily: 'Poppins', fontSize: 12, color: '#888' }}>Cambiar</button>
                      </div>
                    ) : myPendingProposal ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 26 }}>⏳</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: '#E65100' }}>Propuesta enviada — esperando respuesta de tu compañero</div>
                          <div style={{ fontSize: 13, color: '#555' }}>
                            {myPendingProposal.place} · {myPendingProposal.dateTime ? new Date(myPendingProposal.dateTime).toLocaleString('es', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                          </div>
                        </div>
                        <button onClick={clearMeetup} style={{ marginLeft: 'auto', background: '#F4F6F0', border: 'none', padding: '7px 14px', borderRadius: 100, cursor: 'pointer', fontFamily: 'Poppins', fontSize: 12, color: '#888' }}>Cancelar</button>
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
                          <input type="datetime-local" value={meetDate} onChange={e => setMeetDate(e.target.value)}
                            min={(() => { const d = new Date(Date.now() + 30*60*1000); return new Date(d - d.getTimezoneOffset()*60000).toISOString().slice(0,16); })()}
                            style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #EEE', borderRadius: 10, fontFamily: 'Poppins', fontSize: 13, background: '#FAFBFA', outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                        <TButton onClick={confirmMeetup} theme={theme} style={{ padding: '10px 16px', whiteSpace: 'nowrap', flexShrink: 0 }}>Proponer 📤</TButton>
                      </div>
                    )}
                  </div>
                )}
              </>
            );
          })()}

          {/* Safety banner */}
          <div style={{ background: '#FFF8E1', borderBottom: '1px solid #FFE082', padding: '7px 22px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 14 }}>🔒</span>
            <span style={{ fontSize: 11, color: '#795548', fontWeight: 500 }}>Por tu seguridad, <strong>no compartas números de teléfono</strong> ni coordines fuera de TALIX. Todos los intercambios deben realizarse en los Eco-Spots del campus.</span>
          </div>

          {/* Trade confirm alert banner — dismissed when trade is done or user responds */}
          {msgs.some(m => m.isTradeConfirm && m.requesterId !== currentUser?.id)
            && !tradeAlertDismissed.has(activeConv?.id)
            && (convos.find(c => c.id === activeConv?.id) || activeConv)?.status !== 'completado'
            && (
            <div style={{ margin: '10px 16px 0', background: 'linear-gradient(135deg, #FFFDE7, #FFF8E1)', border: '2px solid #FFD54F', borderRadius: 18, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 4px 16px rgba(255,193,7,0.25)', flexShrink: 0 }}>
              <div style={{ fontSize: 32, flexShrink: 0 }}>🤝</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#5D4037', marginBottom: 2 }}>¡Tu compañero confirmó el trueque!</div>
                <div style={{ fontSize: 12, color: '#795548' }}>¿El intercambio se realizó correctamente?</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button onClick={() => { setShowTradeComplete(true); setTradeAlertDismissed(prev => new Set([...prev, activeConv.id])); }} style={{ padding: '9px 16px', background: '#2E7D32', color: '#fff', border: 'none', borderRadius: 100, fontFamily: 'Poppins', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>✅ Confirmar</button>
                <button onClick={() => { setReportTab('estafa'); setShowReport(true); setTradeAlertDismissed(prev => new Set([...prev, activeConv.id])); }} style={{ padding: '9px 16px', background: '#E53935', color: '#fff', border: 'none', borderRadius: 100, fontFamily: 'Poppins', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>🚨 Reportar</button>
                <button onClick={() => setTradeAlertDismissed(prev => new Set([...prev, activeConv.id]))} style={{ padding: '9px 12px', background: '#EEE', color: '#888', border: 'none', borderRadius: 100, fontFamily: 'Poppins', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>✕</button>
              </div>
            </div>
          )}

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
            {(() => {
              // Find index of last trade-confirm message for this user (only show action buttons on most recent)
              const lastTradeConfirmIdx = msgs.reduce((last, m, i) =>
                m.isTradeConfirm && m.requesterId !== currentUser?.id ? i : last, -1);
              return msgs.map((m, i) => {
              const isMe = m.fromId === currentUser?.id ||
                           m.fromId === 'demo_joel' ||
                           (m.fromName === currentUser?.displayName && m.fromId !== 'system');
              const isSystem = m.isSystem || m.fromId === 'system';
              if (isSystem) {
                // Trade confirmation request — show action buttons only on the most recent one
                if (m.isTradeConfirm && m.requesterId !== currentUser?.id) {
                  const isLatest = i === lastTradeConfirmIdx && !tradeAlertDismissed.has(activeConv?.id);
                  return (
                    <div key={m.id || i} style={{ textAlign: 'center', padding: '8px 0' }}>
                      <div style={{ display: 'inline-block', background: '#FFF8E1', border: '1.5px solid #FFE082', borderRadius: 18, padding: '14px 20px', maxWidth: 320 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#795548', marginBottom: isLatest ? 10 : 0 }}>{m.text}</div>
                        {isLatest && (
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                            <button onClick={() => { setShowTradeComplete(true); setTradeAlertDismissed(prev => new Set([...prev, activeConv.id])); }} style={{ padding: '8px 16px', background: '#2E7D32', color: '#fff', border: 'none', borderRadius: 100, fontFamily: 'Poppins', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>✅ Confirmar trueque</button>
                            <button onClick={() => { setReportTab('estafa'); setShowReport(true); setTradeAlertDismissed(prev => new Set([...prev, activeConv.id])); }} style={{ padding: '8px 16px', background: '#E53935', color: '#fff', border: 'none', borderRadius: 100, fontFamily: 'Poppins', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>🚨 Reportar</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={m.id || i} style={{ textAlign: 'center', padding: '4px 0' }}>
                    <span style={{ background: '#E8F5E9', color: '#2E7D32', fontSize: 12, fontWeight: 600, padding: '6px 16px', borderRadius: 100, display: 'inline-block' }}>{m.text}</span>
                  </div>
                );
              }
              return (
                <div key={m.id || i} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 8 }}>
                  {!isMe && <TAvatar name={m.fromName || 'U'} color={m.fromColor || '#6DBE7E'} size={28} />}
                  <div style={{ maxWidth: '66%' }}>
                    {!isMe && <div style={{ fontSize: 11, color: '#AAA', marginBottom: 3, paddingLeft: 4 }}>{m.fromName}</div>}
                    <div style={{ padding: m.imageUrl ? 4 : '10px 15px', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: isMe ? theme.primary : '#fff', color: isMe ? '#fff' : '#1C2B2B', fontSize: 14, lineHeight: 1.55, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                      {m.imageUrl && <img src={m.imageUrl} alt="foto" style={{ display: 'block', maxWidth: 220, maxHeight: 220, borderRadius: 14, objectFit: 'cover' }} />}
                      {m.text && <div style={{ padding: m.imageUrl ? '6px 12px 4px' : 0 }}>{m.text}</div>}
                      <div style={{ fontSize: 10, opacity: 0.55, marginTop: 3, textAlign: 'right', padding: m.imageUrl ? '0 8px 4px' : 0 }}>
                        {fmtMsgTime(m.createdAt)}{isMe && ' ✓✓'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            });
            })()}
            <div ref={bottomRef} style={{ height: 1 }} />
          </div>

          {blockedMsg && (
            <div style={{ margin: '0 22px 4px', background: '#FFEBEE', border: '1px solid #FFCDD2', borderRadius: 10, padding: '8px 14px', fontSize: 12, color: '#C62828', flexShrink: 0 }}>
              {blockedMsg}
            </div>
          )}

          {/* Photo preview */}
          {photoPreview && (
            <div style={{ margin: '0 22px 6px', background: '#fff', border: '1.5px solid #EEE', borderRadius: 16, padding: 10, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <img src={photoPreview} alt="preview" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 10 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>📷 Foto lista para enviar</div>
                <button onClick={() => setPhotoPreview(null)} style={{ fontSize: 11, color: '#E57373', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Cancelar</button>
              </div>
              <button onClick={sendPhoto} disabled={sendingPhoto} style={{ background: theme.primary, border: 'none', borderRadius: 100, padding: '9px 18px', color: '#fff', fontFamily: 'Poppins', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                {sendingPhoto ? 'Verificando...' : 'Enviar foto'}
              </button>
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
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
            <button onClick={() => fileInputRef.current?.click()} title="Enviar foto" style={{ width: 44, height: 44, borderRadius: '50%', background: '#F0F4F0', border: 'none', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>📷</button>
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
