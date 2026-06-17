import { useState, useEffect } from 'react';
import { AdminService } from '../services/admin';
import { PDFReportService } from '../services/pdfReport';
import { categoryEmoji } from '../components/ui';
import { DB } from '../services/db';
import { UsersService } from '../services/users';
import { FIREBASE_READY, db, auth } from '../config/firebase';
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, query, where } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import useIsMobile from '../hooks/useIsMobile';

const STATUS_COLOR = { activo: '#4CAF50', inactivo: '#999', pendiente: '#F5A623', baneado: '#E53935' };
const STATUS_BG    = { activo: '#E8F5E9', inactivo: '#F5F5F5', pendiente: '#FFF3E0', baneado: '#FFEBEE' };

export default function AdminDashboard({ onLogout }) {
  const isMobile = useIsMobile();
  const [section, setSection] = useState('overview');
  const [stats, setStats] = useState({ users: [], items: [], convos: [], totalSwaps: 0, totalCO2: '0', activeUsers: 0, bannedUsers: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [banModal, setBanModal] = useState(null);
  const [banReason, setBanReason] = useState('');
  const [banIp, setBanIp] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null); // { userId, displayName }
  const [scamReportsState, setScamReportsState] = useState(DB.get('scam_reports') || []);
  const [replyModal, setReplyModal] = useState(null); // { report }
  const [replyMsg, setReplyMsg] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [replyDone, setReplyDone] = useState(false);
  const [detailModal, setDetailModal] = useState(null); // { report, evidenceMsgs: null }
  const [fullImg, setFullImg] = useState(null); // URL to show full-screen
  const [completedTrades, setCompletedTrades] = useState([]);
  const [tradeDetail, setTradeDetail] = useState(null); // { trade, evidenceMsgs: null }

  // Poll Firestore for scam reports every 3s
  useEffect(() => {
    if (!FIREBASE_READY) return;
    let stopped = false;
    const poll = async () => {
      if (stopped) return;
      // Admin login is hardcoded (no Firebase Auth) — sign in anonymously so Firestore rules pass
      if (!auth.currentUser) {
        try { await signInAnonymously(auth); } catch (_) {}
      }
      if (!auth.currentUser) {
        setScamReportsState(DB.get('scam_reports') || []);
        if (!stopped) setTimeout(poll, 3000);
        return;
      }
      try {
        const snap = await getDocs(collection(db, 'scam_reports'));
        const firestoreReports = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const local = DB.get('scam_reports') || [];
        // Merge: prefer Firestore entries, keep local-only entries by id
        const allById = {};
        [...local, ...firestoreReports].forEach(r => { if (r.id) allById[r.id] = r; });
        const getDateStr = r => { const d = r.date || r.createdAt; if (!d) return ''; if (typeof d === 'string') return d; if (d?.toDate) return d.toDate().toISOString(); return ''; };
        const merged = Object.values(allById).sort((a, b) => getDateStr(b) > getDateStr(a) ? 1 : getDateStr(b) < getDateStr(a) ? -1 : 0);
        DB.set('scam_reports', merged);
        setScamReportsState(merged);
      } catch (_) {
        setScamReportsState(DB.get('scam_reports') || []);
      }
      if (!stopped) setTimeout(poll, 3000);
    };
    poll();
    return () => { stopped = true; };
  }, []);

  // Poll Firestore for completed trades every 5s
  useEffect(() => {
    if (!FIREBASE_READY) return;
    let stopped = false;
    const poll = async () => {
      if (stopped) return;
      if (!auth.currentUser) {
        try { await signInAnonymously(auth); } catch (_) {}
      }
      if (!auth.currentUser) { if (!stopped) setTimeout(poll, 5000); return; }
      try {
        const snap = await getDocs(query(collection(db, 'conversations'), where('status', '==', 'completado')));
        if (!stopped) setCompletedTrades(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (_) {}
      if (!stopped) setTimeout(poll, 5000);
    };
    poll();
    return () => { stopped = true; };
  }, []);

  // Fetch evidence photos when trade detail modal opens
  useEffect(() => {
    if (!tradeDetail?.trade?.id || !FIREBASE_READY) return;
    let stopped = false;
    (async () => {
      try {
        if (!auth.currentUser) { try { await signInAnonymously(auth); } catch(_) {} }
        const snap = await getDocs(collection(db, 'conversations', tradeDetail.trade.id, 'messages'));
        if (stopped) return;
        const evidenceMsgs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .filter(m => m.evidencePhoto || m.imageUrl)
          .sort((a, b) => {
            const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
            const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
            return ta - tb;
          });
        setTradeDetail(prev => prev ? { ...prev, evidenceMsgs } : null);
      } catch (_) {}
    })();
    return () => { stopped = true; };
  }, [tradeDetail?.trade?.id]);

  useEffect(() => {
    // Subscribe to users in real-time (Firestore or localStorage)
    const unsub = UsersService.subscribe(users => {
      setStats(prev => {
        const base = AdminService.getStats();
        return {
          ...base,
          users,
          activeUsers: users.filter(u => u.status === 'activo' || !u.status).length,
          bannedUsers: users.filter(u => u.status === 'baneado').length,
          totalSwaps: users.reduce((s, u) => s + (u.swaps || 0), 0),
          totalCO2: users.reduce((s, u) => s + (u.co2 || 0), 0).toFixed(1),
        };
      });
    });
    // Still poll items/convos from localStorage every 2s
    const interval = setInterval(() => {
      setStats(prev => {
        const base = AdminService.getStats();
        return { ...prev, items: base.items, convos: base.convos };
      });
    }, 2000);
    return () => { unsub(); clearInterval(interval); };
  }, []);

  const scamReports = scamReportsState;

  const sendAdminReply = async () => {
    if (!replyMsg.trim() || !replyModal) return;
    setReplySending(true);
    try {
      const { convId, reporterName } = replyModal.report;
      if (convId && FIREBASE_READY) {
        await addDoc(collection(db, 'conversations', convId, 'messages'), {
          convId,
          fromId: 'system',
          fromName: 'TALIX Admin',
          fromColor: '#E53935',
          text: `🔔 Administrador TALIX: ${replyMsg.trim()}`,
          isSystem: true,
          isAdminMsg: true,
          read: false,
          createdAt: serverTimestamp(),
        });
      }
      setReplyDone(true);
      setReplyMsg('');
    } catch (_) {}
    setReplySending(false);
  };

  // Fetch trade evidence photos from conversation when detail modal opens
  useEffect(() => {
    if (!detailModal?.report?.convId || !FIREBASE_READY) return;
    let stopped = false;
    (async () => {
      try {
        if (!auth.currentUser) { try { await signInAnonymously(auth); } catch(_) {} }
        const snap = await getDocs(collection(db, 'conversations', detailModal.report.convId, 'messages'));
        if (stopped) return;
        const evidenceMsgs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .filter(m => m.evidencePhoto || m.imageUrl)
          .sort((a, b) => {
            const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
            const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
            return tb - ta;
          });
        setDetailModal(prev => prev ? { ...prev, evidenceMsgs } : null);
      } catch (_) {}
    })();
    return () => { stopped = true; };
  }, [detailModal?.report?.convId]);

  const resolveReport = async (report) => {
    if (FIREBASE_READY) {
      try { await updateDoc(doc(db, 'scam_reports', report.id), { status: 'resuelto' }); } catch(_) {}
    }
    const all = DB.get('scam_reports') || [];
    const idx = all.findIndex(r => r.id === report.id);
    if (idx >= 0) { all[idx] = { ...all[idx], status: 'resuelto' }; DB.set('scam_reports', all); }
    setScamReportsState(prev => prev.map(r => r.id === report.id ? { ...r, status: 'resuelto' } : r));
    setDetailModal(prev => prev ? { ...prev, report: { ...prev.report, status: 'resuelto' } } : null);
  };

  const emailRegistry = (DB.get('email_registry') || []);
  // Merge users + email_registry, deduplicate by email
  const allEmails = Object.values(
    [...stats.users, ...emailRegistry].reduce((acc, u) => {
      if (u.email && !acc[u.email]) acc[u.email] = u;
      return acc;
    }, {})
  );

  const navItems = [
    { key: 'overview', icon: '📊', label: 'Resumen' },
    { key: 'users',    icon: '👥', label: `Usuarios (${stats.users.length})` },
    { key: 'emails',   icon: '📧', label: `Correos (${allEmails.length})` },
    { key: 'items',    icon: '📦', label: `Artículos (${stats.items.length})` },
    { key: 'chat',     icon: '💬', label: `Chats (${stats.convos.length})` },
    { key: 'trades',   icon: '🔄', label: `Trueques (${completedTrades.length})` },
    { key: 'scams',    icon: '🚨', label: `Estafas (${scamReports.length})` },
    { key: 'reports',  icon: '📈', label: 'Reportes' },
  ];

  const filteredUsers = stats.users.filter(u =>
    (statusFilter === 'todos' || u.status === statusFilter) &&
    ((u.displayName || '').toLowerCase().includes(search.toLowerCase()) ||
     (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
     (u.faculty || '').toLowerCase().includes(search.toLowerCase()))
  );

  const exportEmails = (format = 'txt') => {
    let content, filename, type;
    if (format === 'csv') {
      const header = 'Nombre,Correo,Facultad,Fecha Registro\n';
      const rows = allEmails.map(u => `"${u.displayName || ''}","${u.email || ''}","${u.faculty || ''}","${u.registeredAt || u.createdAt || ''}"`).join('\n');
      content = header + rows; filename = 'talix-correos.csv'; type = 'text/csv';
    } else {
      content = allEmails.map(u => u.email).join('\n');
      filename = 'talix-correos.txt'; type = 'text/plain';
    }
    const blob = new Blob([content], { type });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  };

  const facultyBreakdown = stats.users.reduce((acc, u) => {
    const f = u.faculty || 'Otra'; acc[f] = (acc[f] || 0) + 1; return acc;
  }, {});
  const faculties = Object.entries(facultyBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const recentActivity = [
    ...stats.users.slice(-3).map(u => ({ icon: '👤', text: `${u.displayName || 'Usuario'} se registró`, time: u.createdAt ? new Date(u.createdAt).toLocaleDateString('es') : '' })),
    ...stats.items.slice(0, 3).map(i => ({ icon: '📦', text: `${i.user || 'Usuario'} publicó: ${i.title || 'Artículo'}`, time: i.createdAt ? new Date(i.createdAt).toLocaleDateString('es') : '' })),
    ...stats.convos.slice(0, 2).map(c => ({ icon: '💬', text: 'Nueva conversación iniciada', time: c.lastTime ? new Date(c.lastTime).toLocaleDateString('es') : '' })),
  ].slice(0, 8);

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Poppins, sans-serif', background: '#0F1923' }}>
      {/* Admin reply modal */}
      {replyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1A2332', borderRadius: 20, width: 'min(460px, 92vw)', maxHeight: '90vh', overflowY: 'auto', padding: 28, border: '1px solid rgba(229,57,53,0.3)' }}>
            {replyDone ? (
              <>
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <div style={{ fontSize: 52, marginBottom: 10 }}>✅</div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#fff', marginBottom: 6 }}>Mensaje enviado</div>
                  <div style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>El mensaje aparecerá en la conversación de <strong style={{ color: '#CCC' }}>{replyModal.report.reporterName}</strong>.</div>
                  <button onClick={() => { setReplyModal(null); setReplyDone(false); }} style={{ padding: '10px 28px', background: '#F5A623', border: 'none', borderRadius: 100, color: '#1C2B2B', fontFamily: 'Poppins', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Cerrar</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#fff', marginBottom: 4 }}>📨 Responder al usuario</div>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 18 }}>El mensaje aparecerá en el chat de <strong style={{ color: '#CCC' }}>{replyModal.report.reporterName}</strong> como mensaje del administrador.</div>
                <div style={{ background: '#0F1923', borderRadius: 12, padding: '12px 14px', marginBottom: 16, fontSize: 12, color: '#888', lineHeight: 1.6 }}>
                  <strong style={{ color: '#E57373' }}>Caso:</strong> {replyModal.report.description || replyModal.report.comment || 'Sin descripción'}<br />
                  <strong style={{ color: '#E57373' }}>Artículo:</strong> {replyModal.report.itemTitle || 'No especificado'}
                </div>
                <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Mensaje al usuario</label>
                <textarea
                  value={replyMsg}
                  onChange={e => setReplyMsg(e.target.value)}
                  placeholder="Ej: Hemos revisado tu reporte y estamos tomando medidas. El usuario será sancionado en 48 horas..."
                  rows={4}
                  style={{ width: '100%', padding: '10px 14px', background: '#0F1923', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', fontFamily: 'Poppins', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', marginBottom: 18 }}
                />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => { setReplyModal(null); setReplyMsg(''); }} style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#888', fontFamily: 'Poppins', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
                  <button onClick={sendAdminReply} disabled={replySending || !replyMsg.trim()} style={{ flex: 2, padding: '10px', background: replySending || !replyMsg.trim() ? '#333' : '#E53935', border: 'none', borderRadius: 10, color: '#fff', fontFamily: 'Poppins', fontWeight: 700, fontSize: 13, cursor: replySending || !replyMsg.trim() ? 'default' : 'pointer' }}>
                    {replySending ? 'Enviando...' : '📨 Enviar mensaje'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Full-image overlay */}
      {fullImg && (
        <div onClick={() => setFullImg(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
          <img src={fullImg} alt="evidencia" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12, objectFit: 'contain' }} />
          <button onClick={() => setFullImg(null)} style={{ position: 'absolute', top: 20, right: 24, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 40, height: 40, color: '#fff', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Report detail modal */}
      {detailModal && (() => {
        const r = detailModal.report;
        const reportText = r.description || r.comment || '';
        const reportPhoto = r.photo || r.photoUrl || null;
        const reportDate = r.date || (typeof r.createdAt === 'string' ? r.createdAt : r.createdAt?.toDate?.()?.toISOString?.() || '') || '';
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{ background: '#1A2332', borderRadius: 24, width: '100%', maxWidth: 600, maxHeight: '88vh', overflowY: 'auto', border: '1px solid rgba(229,57,53,0.3)' }}>
              {/* Header */}
              <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#1A2332', zIndex: 1 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#E57373' }}>🚨 Reporte de {r.reporterName}</div>
                  <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{reportDate ? new Date(reportDate).toLocaleString('es') : ''} · {r.itemTitle || 'Sin artículo'}</div>
                </div>
                <button onClick={() => setDetailModal(null)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: 34, height: 34, color: '#888', fontSize: 16, cursor: 'pointer' }}>✕</button>
              </div>

              <div style={{ padding: '20px 24px' }}>
                {/* Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                  <span style={{ background: r.status === 'resuelto' ? 'rgba(76,175,80,0.15)' : 'rgba(245,166,35,0.15)', color: r.status === 'resuelto' ? '#4CAF50' : '#F5A623', padding: '5px 14px', borderRadius: 100, fontSize: 12, fontWeight: 700 }}>
                    {r.status === 'resuelto' ? '✅ Resuelto' : '⏳ Pendiente'}
                  </span>
                  {r.status !== 'resuelto' && (
                    <button onClick={() => resolveReport(r)} style={{ padding: '6px 16px', background: 'rgba(76,175,80,0.15)', border: '1px solid rgba(76,175,80,0.3)', borderRadius: 100, color: '#4CAF50', fontFamily: 'Poppins', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>✅ Marcar como resuelto</button>
                  )}
                  <button onClick={() => { setDetailModal(null); setReplyModal({ report: r }); setReplyMsg(''); setReplyDone(false); }} style={{ padding: '6px 16px', background: 'rgba(229,57,53,0.12)', border: '1px solid rgba(229,57,53,0.25)', borderRadius: 100, color: '#E57373', fontFamily: 'Poppins', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>📨 Responder</button>
                </div>

                {/* Description */}
                {reportText ? (
                  <div style={{ background: '#0F1923', borderRadius: 12, padding: '14px 16px', marginBottom: 18, fontSize: 13, color: '#CCC', lineHeight: 1.6 }}>
                    <div style={{ fontSize: 11, color: '#555', marginBottom: 6, fontWeight: 600 }}>DESCRIPCIÓN DEL REPORTE</div>
                    "{reportText}"
                  </div>
                ) : <div style={{ color: '#555', fontSize: 13, marginBottom: 18 }}>Sin descripción.</div>}

                {/* Report photo */}
                {reportPhoto && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, color: '#555', fontWeight: 600, marginBottom: 8 }}>📷 FOTO DEL REPORTE</div>
                    <img
                      src={reportPhoto} alt="evidencia"
                      onClick={() => setFullImg(reportPhoto)}
                      style={{ maxWidth: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', cursor: 'zoom-in', display: 'block' }}
                    />
                    <div style={{ fontSize: 11, color: '#444', marginTop: 4 }}>Haz clic para ver a tamaño completo</div>
                  </div>
                )}

                {/* Evidence photos from trade confirmations */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: '#555', fontWeight: 600, marginBottom: 10 }}>📸 FOTOS DE CONFIRMACIÓN DEL TRUEQUE</div>
                  {!r.convId ? (
                    <div style={{ fontSize: 12, color: '#444' }}>Sin conversación asociada.</div>
                  ) : detailModal.evidenceMsgs === null ? (
                    <div style={{ fontSize: 12, color: '#555' }}>Cargando fotos...</div>
                  ) : detailModal.evidenceMsgs.length === 0 ? (
                    <div style={{ fontSize: 12, color: '#444' }}>No hay fotos de confirmación en esta conversación.</div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                      {detailModal.evidenceMsgs.map(m => {
                        const src = m.evidencePhoto || m.imageUrl;
                        return (
                          <div key={m.id} style={{ position: 'relative' }}>
                            <img
                              src={src} alt="foto"
                              onClick={() => setFullImg(src)}
                              style={{ width: 140, height: 100, objectFit: 'cover', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', cursor: 'zoom-in' }}
                            />
                            {m.fromName && <div style={{ fontSize: 10, color: '#666', marginTop: 3, textAlign: 'center' }}>{m.fromName}</div>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Trade detail modal */}
      {tradeDetail && (() => {
        const t = tradeDetail.trade;
        const completedAt = t.completedAt ? new Date(t.completedAt).toLocaleString('es') : '';
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{ background: '#1A2332', borderRadius: 24, width: '100%', maxWidth: 600, maxHeight: '88vh', overflowY: 'auto', border: '1px solid rgba(109,190,126,0.3)' }}>
              <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#1A2332', zIndex: 1 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#6DBE7E' }}>🔄 {t.itemTitle || 'Trueque completado'}</div>
                  <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{completedAt}</div>
                </div>
                <button onClick={() => setTradeDetail(null)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: 34, height: 34, color: '#888', fontSize: 16, cursor: 'pointer' }}>✕</button>
              </div>
              <div style={{ padding: '20px 24px' }}>
                <div style={{ fontSize: 11, color: '#555', fontWeight: 600, marginBottom: 14 }}>📸 FOTOS DE EVIDENCIA DEL TRUEQUE</div>
                {tradeDetail.evidenceMsgs === null ? (
                  <div style={{ fontSize: 13, color: '#555', padding: '20px 0' }}>Cargando fotos...</div>
                ) : tradeDetail.evidenceMsgs.length === 0 ? (
                  <div style={{ fontSize: 13, color: '#444', padding: '20px 0' }}>No hay fotos de evidencia en este trueque.</div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                    {tradeDetail.evidenceMsgs.map(m => {
                      const src = m.evidencePhoto || m.imageUrl;
                      return (
                        <div key={m.id} style={{ textAlign: 'center' }}>
                          <img
                            src={src} alt="evidencia"
                            onClick={() => setFullImg(src)}
                            style={{ width: 160, height: 110, objectFit: 'cover', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', cursor: 'zoom-in', display: 'block' }}
                          />
                          <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>{m.fromName || 'Usuario'}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Admin sidebar — desktop only */}
      {!isMobile && (
      <div style={{ width: 240, background: '#1A2332', display: 'flex', flexDirection: 'column', padding: '0 0 24px', height: '100vh', position: 'fixed', left: 0, top: 0 }}>
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontWeight: 800, fontSize: 22, color: '#fff' }}>TALIX</div>
          <div style={{ fontSize: 11, color: '#F5A623', fontWeight: 600, letterSpacing: '2px', marginTop: 2 }}>ADMINISTRADOR</div>
        </div>
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navItems.map(n => (
            <button key={n.key} onClick={() => setSection(n.key)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, border: 'none', background: section === n.key ? 'rgba(245,166,35,0.15)' : 'transparent', color: section === n.key ? '#F5A623' : 'rgba(255,255,255,0.5)', fontWeight: section === n.key ? 700 : 400, fontSize: 13, cursor: 'pointer', fontFamily: 'Poppins', textAlign: 'left', width: '100%', transition: 'all 0.15s' }}>
              <span style={{ fontSize: 16 }}>{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: 11, color: '#333', marginBottom: 8 }}>Última actualización: ahora</div>
          <button onClick={onLogout} style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#666', fontFamily: 'Poppins', fontSize: 13, cursor: 'pointer' }}>← Cerrar sesión admin</button>
        </div>
      </div>
      )}

      {/* Main content */}
      <div style={{ marginLeft: isMobile ? 0 : 240, flex: 1, overflowY: 'auto', height: '100dvh', width: isMobile ? '100%' : 'auto', minWidth: 0 }}>
        {/* Mobile admin header + horizontal nav */}
        {isMobile && (
          <div style={{ position: 'sticky', top: 0, zIndex: 60, background: '#1A2332', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontWeight: 800, fontSize: 18, color: '#fff' }}>TALIX</span>
                <span style={{ fontSize: 10, color: '#F5A623', fontWeight: 700, letterSpacing: '1.5px' }}>ADMIN</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => PDFReportService.openPDF()} style={{ background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.3)', padding: '7px 12px', borderRadius: 100, cursor: 'pointer', fontFamily: 'Poppins', fontWeight: 600, fontSize: 12, color: '#F5A623' }}>📄 PDF</button>
                <button onClick={onLogout} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', padding: '7px 12px', borderRadius: 100, color: '#888', fontFamily: 'Poppins', fontSize: 12, cursor: 'pointer' }}>Salir</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '0 12px 10px', WebkitOverflowScrolling: 'touch' }}>
              {navItems.map(n => (
                <button key={n.key} onClick={() => setSection(n.key)} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 13px', borderRadius: 100, border: 'none', background: section === n.key ? 'rgba(245,166,35,0.18)' : 'rgba(255,255,255,0.05)', color: section === n.key ? '#F5A623' : 'rgba(255,255,255,0.55)', fontWeight: section === n.key ? 700 : 500, fontSize: 12, cursor: 'pointer', fontFamily: 'Poppins', whiteSpace: 'nowrap' }}>
                  <span style={{ fontSize: 14 }}>{n.icon}</span>{n.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {/* Top bar — desktop only (mobile uses the sticky header above) */}
        {!isMobile && (
        <div style={{ padding: '20px 32px', background: '#1A2332', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: '#fff' }}>
              {navItems.find(n => n.key === section)?.icon} {navItems.find(n => n.key === section)?.label?.split(' (')[0]}
            </div>
            <div style={{ fontSize: 12, color: '#444', marginTop: 1 }}>Panel de control TALIX · USIL · Datos en tiempo real</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4CAF50', animation: 'blink 2s infinite' }} />
            <span style={{ fontSize: 12, color: '#4CAF50', fontWeight: 600 }}>EN VIVO</span>
            <button
              onClick={() => PDFReportService.openPDF()}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.3)', padding: '8px 16px', borderRadius: 100, cursor: 'pointer', fontFamily: 'Poppins', fontWeight: 600, fontSize: 12, color: '#F5A623', transition: 'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,166,35,0.25)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(245,166,35,0.15)'}
            >
              📄 Exportar PDF
            </button>
            <div style={{ background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.3)', padding: '6px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600, color: '#F5A623' }}>🔐 Admin USIL</div>
          </div>
        </div>
        )}

        <div style={{ padding: isMobile ? '16px 14px 32px' : '28px 32px' }}>
          {/* OVERVIEW */}
          {section === 'overview' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: isMobile ? 12 : 16, marginBottom: 24 }}>
                {[
                  { icon: '👥', val: stats.users.length, label: 'Usuarios registrados', sub: `${stats.activeUsers} activos`, color: '#5B9BD5' },
                  { icon: '🔄', val: stats.totalSwaps, label: 'Trueques totales', sub: 'Acumulado', color: '#6DBE7E' },
                  { icon: '📦', val: stats.items.length, label: 'Artículos activos', sub: 'En plataforma', color: '#F5A623' },
                  { icon: '🌿', val: `${stats.totalCO2}kg`, label: 'CO₂ ahorrado', sub: 'Impacto total', color: '#4CAF50' },
                ].map((s, i) => (
                  <div key={i} style={{ background: '#1A2332', borderRadius: 20, padding: '20px 22px', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ fontSize: 28, marginBottom: 10 }}>{s.icon}</div>
                    <div style={{ fontWeight: 800, fontSize: 30, color: s.color, letterSpacing: '-1px' }}>{s.val}</div>
                    <div style={{ fontSize: 13, color: '#CCC', fontWeight: 600, marginTop: 2 }}>{s.label}</div>
                    <div style={{ fontSize: 11, color: '#555', marginTop: 3 }}>{s.sub}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 14 : 20 }}>
                <div style={{ background: '#1A2332', borderRadius: 20, padding: 24, border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 18 }}>📊 Usuarios por facultad</div>
                  {faculties.length === 0
                    ? <div style={{ color: '#444', fontSize: 13 }}>Sin usuarios aún</div>
                    : faculties.map(([f, count], i) => {
                      const pct = (count / stats.users.length * 100).toFixed(0);
                      const colors = ['#5B9BD5', '#F5A623', '#6DBE7E', '#9C6BBE', '#4DB6AC', '#78909C'];
                      return (
                        <div key={f} style={{ marginBottom: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 12, color: '#888' }}>{f}</span>
                            <span style={{ fontSize: 12, color: colors[i % colors.length], fontWeight: 600 }}>{count} ({pct}%)</span>
                          </div>
                          <div style={{ height: 6, background: '#0F1923', borderRadius: 100 }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: colors[i % colors.length], borderRadius: 100 }} />
                          </div>
                        </div>
                      );
                    })
                  }
                </div>
                <div style={{ background: '#1A2332', borderRadius: 20, padding: 24, border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 18 }}>⚡ Actividad reciente</div>
                  {recentActivity.length === 0
                    ? <div style={{ color: '#444', fontSize: 13 }}>Sin actividad aún</div>
                    : recentActivity.map((a, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'flex-start' }}>
                        <span style={{ fontSize: 16, flexShrink: 0 }}>{a.icon}</span>
                        <div>
                          <div style={{ fontSize: 12, color: '#CCC', lineHeight: 1.4 }}>{a.text}</div>
                          <div style={{ fontSize: 11, color: '#444', marginTop: 2 }}>{a.time}</div>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
              <div style={{ background: '#1A2332', borderRadius: 20, padding: 24, border: '1px solid rgba(255,255,255,0.07)', marginTop: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 16 }}>📋 Estado de la plataforma</div>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Usuarios activos', val: stats.activeUsers, color: '#4CAF50' },
                    { label: 'Correos registrados', val: stats.users.length, color: '#5B9BD5' },
                    { label: 'Conversaciones abiertas', val: stats.convos.length, color: '#9C6BBE' },
                    { label: 'Artículos disponibles', val: stats.items.length, color: '#F5A623' },
                    { label: 'Pendientes de verificar', val: stats.users.filter(u => !u.verified).length, color: '#FF8A65' },
                  ].map((s, i) => (
                    <div key={i} style={{ background: '#0F1923', borderRadius: 14, padding: '14px 20px', flex: 1, minWidth: 120, textAlign: 'center' }}>
                      <div style={{ fontWeight: 800, fontSize: 24, color: s.color }}>{s.val}</div>
                      <div style={{ fontSize: 11, color: '#444', marginTop: 4 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* USERS */}
          {section === 'users' && (
            <div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15 }}>🔍</span>
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar por nombre, correo o facultad..."
                    style={{ width: '100%', padding: '10px 16px 10px 42px', background: '#1A2332', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontFamily: 'Poppins', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                {['todos', 'activo', 'inactivo', 'baneado'].map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)} style={{ padding: '9px 16px', borderRadius: 100, border: statusFilter !== s ? '1px solid rgba(255,255,255,0.1)' : 'none', cursor: 'pointer', background: statusFilter === s ? '#F5A623' : '#1A2332', color: statusFilter === s ? '#1C2B2B' : '#888', fontFamily: 'Poppins', fontWeight: 600, fontSize: 12, textTransform: 'capitalize' }}>{s}</button>
                ))}
                <button onClick={exportEmails} style={{ padding: '9px 18px', background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.3)', borderRadius: 100, color: '#F5A623', fontFamily: 'Poppins', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>📧 Exportar correos</button>
              </div>
              {/* Ban modal */}
              {banModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ background: '#1A2332', borderRadius: 20, width: 'min(420px, 92vw)', padding: 28, border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#fff', marginBottom: 6 }}>🚫 Banear usuario</div>
                    <div style={{ fontSize: 13, color: '#888', marginBottom: 18 }}>Usuario: <strong style={{ color: '#E57373' }}>{banModal.displayName}</strong></div>
                    <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Razón del baneo</label>
                    <input
                      value={banReason}
                      onChange={e => setBanReason(e.target.value)}
                      placeholder="Ej: Contenido inapropiado, múltiples incidencias..."
                      style={{ width: '100%', padding: '10px 14px', background: '#0F1923', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', fontFamily: 'Poppins', fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 14 }}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#E57373', marginBottom: 20 }}>
                      <input type="checkbox" checked={banIp} onChange={e => setBanIp(e.target.checked)} style={{ accentColor: '#E57373' }} />
                      También banear IP ({banModal.lastIp || 'IP no registrada'})
                    </label>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={() => { setBanModal(null); setBanReason(''); setBanIp(false); }} style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#888', fontFamily: 'Poppins', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
                      <button onClick={() => { AdminService.banUser(banModal.userId, banReason || 'Incumplimiento de normas', banIp); setStats(AdminService.getStats()); setBanModal(null); setBanReason(''); setBanIp(false); }} style={{ flex: 1, padding: '10px', background: 'rgba(229,57,53,0.2)', border: '1px solid rgba(229,57,53,0.4)', borderRadius: 10, color: '#E57373', fontFamily: 'Poppins', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Confirmar baneo</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Delete user confirmation modal */}
              {deleteModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ background: '#1A2332', borderRadius: 20, width: 'min(400px, 92vw)', padding: 28, border: '1px solid rgba(229,57,53,0.3)' }}>
                    <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 12 }}>⚠️</div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#fff', marginBottom: 8, textAlign: 'center' }}>Eliminar usuario permanentemente</div>
                    <div style={{ fontSize: 13, color: '#888', marginBottom: 20, textAlign: 'center', lineHeight: 1.6 }}>
                      ¿Seguro que quieres eliminar a <strong style={{ color: '#E57373' }}>{deleteModal.displayName}</strong>?<br />
                      Se borrarán sus artículos, mensajes y toda su actividad. <strong style={{ color: '#E57373' }}>Esta acción es irreversible.</strong>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={() => setDeleteModal(null)} style={{ flex: 1, padding: '11px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#888', fontFamily: 'Poppins', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
                      <button onClick={async () => { setDeleteModal(null); await AdminService.deleteUser(deleteModal.userId); setStats(AdminService.getStats()); }} style={{ flex: 1, padding: '11px', background: 'rgba(229,57,53,0.25)', border: '1px solid rgba(229,57,53,0.5)', borderRadius: 10, color: '#E57373', fontFamily: 'Poppins', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>🗑️ Eliminar todo</button>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ background: '#1A2332', borderRadius: 20, overflow: isMobile ? 'auto' : 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1.5fr 0.7fr 1.2fr 1fr 1.2fr', minWidth: isMobile ? 820 : 'auto', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', fontSize: 11, fontWeight: 600, color: '#444', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <span>Nombre</span><span>Correo</span><span>Contraseña</span><span>Facultad</span><span>Pts</span><span>IP</span><span>Estado</span><span>Acciones</span>
                </div>
                {filteredUsers.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#444', fontSize: 13 }}>No se encontraron usuarios</div>
                ) : filteredUsers.map((u, i) => (
                  <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1.5fr 0.7fr 1.2fr 1fr 1.2fr', minWidth: isMobile ? 820 : 'auto', padding: '14px 20px', borderBottom: i < filteredUsers.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: u.avatarColor || '#2A3444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                        {(u.displayName || 'U').split(' ').map(w => w[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{u.displayName || 'Usuario'}</div>
                        {u.status === 'baneado' && u.banReason && <div style={{ fontSize: 10, color: '#E57373' }}>🚫 {u.banReason}</div>}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: '#666', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
                    <div style={{ fontSize: 11, color: '#6DBE7E', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u._pwd || '••••••'}</div>
                    <div style={{ fontSize: 12, color: '#777' }}>{u.faculty || '—'}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#F5A623' }}>{u.points || u.swaps || 0}</div>
                    <div style={{ fontSize: 10, color: '#555', fontFamily: 'monospace' }}>{u.lastIp || '—'}</div>
                    <div>
                      <span style={{ background: STATUS_BG[u.status || 'activo'] || '#E8F5E9', color: STATUS_COLOR[u.status || 'activo'] || '#4CAF50', padding: '4px 10px', borderRadius: 100, fontSize: 11, fontWeight: 600 }}>
                        {u.status || 'activo'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {u.status !== 'baneado' ? (
                        <button onClick={() => setBanModal({ userId: u.id, displayName: u.displayName, lastIp: u.lastIp })} style={{ padding: '5px 8px', background: 'rgba(229,57,53,0.12)', border: '1px solid rgba(229,57,53,0.25)', borderRadius: 8, color: '#E57373', fontSize: 11, cursor: 'pointer', fontFamily: 'Poppins', fontWeight: 600 }}>Banear</button>
                      ) : (
                        <button onClick={() => { AdminService.unbanUser(u.id); setStats(AdminService.getStats()); }} style={{ padding: '5px 8px', background: 'rgba(76,175,80,0.12)', border: '1px solid rgba(76,175,80,0.25)', borderRadius: 8, color: '#4CAF50', fontSize: 11, cursor: 'pointer', fontFamily: 'Poppins', fontWeight: 600 }}>Desbanear</button>
                      )}
                      <button onClick={() => setDeleteModal({ userId: u.id, displayName: u.displayName })} style={{ padding: '5px 8px', background: 'rgba(180,0,0,0.18)', border: '1px solid rgba(180,0,0,0.4)', borderRadius: 8, color: '#FF5252', fontSize: 11, cursor: 'pointer', fontFamily: 'Poppins', fontWeight: 700 }}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
              {/* Email list */}
              <div style={{ background: '#1A2332', borderRadius: 20, padding: 20, marginTop: 16, border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>📧 Correos registrados ({stats.users.length})</div>
                  <button onClick={exportEmails} style={{ padding: '7px 16px', background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.3)', borderRadius: 100, color: '#F5A623', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins' }}>↓ Descargar .txt</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {stats.users.map(u => (
                    <span key={u.id} style={{ background: '#0F1923', border: '1px solid rgba(255,255,255,0.06)', padding: '5px 12px', borderRadius: 100, fontSize: 11, color: '#666', fontFamily: 'monospace' }}>{u.email}</span>
                  ))}
                  {stats.users.length === 0 && <span style={{ fontSize: 13, color: '#444' }}>Sin usuarios registrados aún</span>}
                </div>
              </div>
            </div>
          )}

          {/* EMAILS */}
          {section === 'emails' && (
            <div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#fff', flex: 1 }}>📧 Base de correos registrados ({allEmails.length})</div>
                <button onClick={() => exportEmails('csv')} style={{ padding: '9px 18px', background: 'rgba(109,190,126,0.15)', border: '1px solid rgba(109,190,126,0.3)', borderRadius: 100, color: '#6DBE7E', fontFamily: 'Poppins', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>⬇️ Exportar CSV</button>
                <button onClick={() => exportEmails('txt')} style={{ padding: '9px 18px', background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.3)', borderRadius: 100, color: '#F5A623', fontFamily: 'Poppins', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>⬇️ Exportar TXT</button>
              </div>
              <div style={{ background: '#1A2332', borderRadius: 20, overflow: isMobile ? 'auto' : 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 2.5fr 2fr 1.5fr', minWidth: isMobile ? 620 : 'auto', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', fontSize: 11, fontWeight: 600, color: '#444', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <span>Nombre</span><span>Correo</span><span>Facultad</span><span>Fecha registro</span>
                </div>
                {allEmails.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#444', fontSize: 13 }}>Sin correos registrados aún</div>
                ) : allEmails.map((u, i) => (
                  <div key={u.email} style={{ display: 'grid', gridTemplateColumns: '2fr 2.5fr 2fr 1.5fr', minWidth: isMobile ? 620 : 'auto', padding: '14px 20px', borderBottom: i < allEmails.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', alignItems: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#CCC' }}>{u.displayName || '—'}</div>
                    <div style={{ fontSize: 12, color: '#5B9BD5', fontFamily: 'monospace' }}>{u.email}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>{u.faculty || '—'}</div>
                    <div style={{ fontSize: 11, color: '#444' }}>{(u.registeredAt || u.createdAt) ? new Date(u.registeredAt || u.createdAt).toLocaleDateString('es') : '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ITEMS */}
          {section === 'items' && (
            <div style={{ background: '#1A2332', borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', fontWeight: 700, fontSize: 15, color: '#fff' }}>
                📦 Artículos en plataforma ({stats.items.length})
              </div>
              {stats.items.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#444', fontSize: 13 }}>Sin artículos publicados aún</div>
              ) : stats.items.map((item, i) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 14, flexWrap: isMobile ? 'wrap' : 'nowrap', padding: '14px 20px', borderBottom: i < stats.items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: item.bgColor || '#2A3444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, overflow: 'hidden' }}>
                    {item.photo ? <img src={item.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : categoryEmoji(item.category)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: '#555' }}>{item.user || 'Usuario'} · {item.faculty || ''} · {item.createdAt ? new Date(item.createdAt).toLocaleDateString('es') : ''}</div>
                  </div>
                  <span style={{ fontSize: 11, color: '#6DBE7E', fontWeight: 600, background: 'rgba(109,190,126,0.12)', padding: '4px 10px', borderRadius: 100, flexShrink: 0 }}>{item.category}</span>
                  <span style={{ fontSize: 12, color: '#F5A623', fontWeight: 700, flexShrink: 0 }}>-{item.co2}kg CO₂</span>
                  <span style={{ fontSize: 11, color: '#555', flexShrink: 0 }}>{(item.proposals || []).length} propuestas</span>
                  <button onClick={() => { AdminService.deleteItem(item.id); setStats(AdminService.getStats()); }} style={{ padding: '5px 12px', background: 'rgba(229,57,53,0.12)', border: '1px solid rgba(229,57,53,0.25)', borderRadius: 8, color: '#E57373', fontSize: 11, cursor: 'pointer', fontFamily: 'Poppins', fontWeight: 600, flexShrink: 0 }}>Retirar</button>
                </div>
              ))}
            </div>
          )}

          {/* CHATS */}
          {section === 'chat' && (
            <div style={{ background: '#1A2332', borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', fontWeight: 700, fontSize: 15, color: '#fff' }}>
                💬 Conversaciones activas ({stats.convos.length})
              </div>
              {stats.convos.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#444', fontSize: 13 }}>Sin conversaciones aún</div>
              ) : stats.convos.map((c, i) => (
                <div key={c.id} style={{ padding: '16px 20px', borderBottom: i < stats.convos.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 40, height: 40, background: '#0F1923', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>💬</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#CCC', fontWeight: 500 }}>{c.itemTitle || 'Conversación general'}</div>
                    <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{(c.lastMsg || '').slice(0, 60) || 'Sin mensajes'}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: '#F5A623', fontWeight: 600 }}>{c.unread || 0} sin leer</div>
                    <div style={{ fontSize: 11, color: '#444' }}>{c.lastTime ? new Date(c.lastTime).toLocaleDateString('es') : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* COMPLETED TRADES */}
          {section === 'trades' && (
            <div style={{ background: '#1A2332', borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', fontWeight: 700, fontSize: 15, color: '#fff' }}>
                🔄 Trueques completados ({completedTrades.length})
              </div>
              {completedTrades.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#444', fontSize: 13 }}>Sin trueques completados aún</div>
              ) : completedTrades.map((trade, i) => {
                const completedAt = trade.completedAt ? new Date(trade.completedAt).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
                const names = trade.participantNames ? Object.values(trade.participantNames).join(' ↔ ') : '';
                return (
                  <div key={trade.id} style={{ padding: '16px 20px', borderBottom: i < completedTrades.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 44, height: 44, background: 'rgba(109,190,126,0.12)', border: '1px solid rgba(109,190,126,0.25)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>✅</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{trade.itemTitle || 'Trueque sin título'}</div>
                      {names && <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{names}</div>}
                      <div style={{ fontSize: 11, color: '#444', marginTop: 2 }}>{completedAt}</div>
                    </div>
                    <button
                      onClick={() => setTradeDetail({ trade, evidenceMsgs: null })}
                      style={{ padding: '7px 16px', background: 'rgba(109,190,126,0.15)', border: '1px solid rgba(109,190,126,0.3)', borderRadius: 100, color: '#6DBE7E', fontFamily: 'Poppins', fontWeight: 600, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                    >
                      📸 Ver fotos
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* SCAM REPORTS */}
          {section === 'scams' && (
            <div style={{ background: '#1A2332', borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', fontWeight: 700, fontSize: 15, color: '#fff' }}>
                🚨 Reportes de estafa ({scamReports.length})
              </div>
              {scamReports.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#444', fontSize: 13 }}>Sin reportes de estafa</div>
              ) : scamReports.map((r, i) => {
                const reportText = r.description || r.comment || '';
                const reportPhoto = r.photo || r.photoUrl || null;
                const reportDate = r.date || (r.createdAt?.toDate ? r.createdAt.toDate().toISOString() : r.createdAt) || '';
                return (
                <div key={r.id} style={{ padding: '18px 20px', borderBottom: i < scamReports.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <div style={{ fontSize: 32, flexShrink: 0 }}>🚨</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#E57373' }}>Reporte de {r.reporterName}</div>
                        <div style={{ fontSize: 11, color: '#444' }}>{reportDate ? new Date(reportDate).toLocaleDateString('es') : ''}</div>
                      </div>
                      <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>📦 Artículo: {r.itemTitle || 'No especificado'}</div>
                      {reportText ? <div style={{ fontSize: 13, color: '#CCC', lineHeight: 1.5, marginBottom: 8 }}>"{reportText}"</div> : null}
                      {reportPhoto && (
                        <img
                          src={reportPhoto} alt="evidencia"
                          onClick={() => setFullImg(reportPhoto)}
                          style={{ maxWidth: 200, maxHeight: 130, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', display: 'block', marginBottom: 6, cursor: 'zoom-in' }}
                        />
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
                      <span style={{ background: r.status === 'resuelto' ? 'rgba(76,175,80,0.15)' : 'rgba(245,166,35,0.15)', color: r.status === 'resuelto' ? '#4CAF50' : '#F5A623', padding: '4px 10px', borderRadius: 100, fontSize: 11, fontWeight: 600 }}>
                        {r.status || 'pendiente'}
                      </span>
                      <button
                        onClick={() => setDetailModal({ report: r, evidenceMsgs: null })}
                        style={{ padding: '7px 14px', background: 'rgba(91,155,213,0.15)', border: '1px solid rgba(91,155,213,0.3)', borderRadius: 100, color: '#5B9BD5', fontFamily: 'Poppins', fontWeight: 600, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        🔍 Ver detalle
                      </button>
                      <button
                        onClick={() => { setReplyModal({ report: r }); setReplyMsg(''); setReplyDone(false); }}
                        style={{ padding: '7px 14px', background: 'rgba(229,57,53,0.15)', border: '1px solid rgba(229,57,53,0.3)', borderRadius: 100, color: '#E57373', fontFamily: 'Poppins', fontWeight: 600, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        📨 Responder
                      </button>
                    </div>
                  </div>
                </div>
              );})}
            </div>
          )}

          {/* REPORTS */}
          {section === 'reports' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 14 : 20, marginBottom: 20 }}>
                <div style={{ background: '#1A2332', borderRadius: 20, padding: 24, border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#fff', marginBottom: 20 }}>📦 Artículos por categoría</div>
                  {['Libros', 'Tecnología', 'Ropa', 'Accesorios'].map((cat, i) => {
                    const count = stats.items.filter(item => item.category === cat).length;
                    const pct = stats.items.length ? Math.round(count / stats.items.length * 100) : 0;
                    const colors = ['#6DBE7E', '#5B9BD5', '#F5A623', '#9C6BBE'];
                    return (
                      <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                        <span style={{ fontSize: 20, flexShrink: 0 }}>{categoryEmoji(cat)}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 12, color: '#888' }}>{cat}</span>
                            <span style={{ fontSize: 12, color: colors[i], fontWeight: 600 }}>{count}</span>
                          </div>
                          <div style={{ height: 6, background: '#0F1923', borderRadius: 100 }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: colors[i], borderRadius: 100 }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ background: '#1A2332', borderRadius: 20, padding: 24, border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#fff', marginBottom: 20 }}>🌿 Impacto ambiental acumulado</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ background: '#0F1923', borderRadius: 16, padding: '18px 20px', textAlign: 'center' }}>
                      <div style={{ fontSize: 36, marginBottom: 6 }}>🌍</div>
                      <div style={{ fontWeight: 800, fontSize: 28, color: '#4CAF50' }}>{stats.totalCO2} kg</div>
                      <div style={{ fontSize: 13, color: '#666' }}>CO₂ total ahorrado</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div style={{ background: '#0F1923', borderRadius: 14, padding: '14px', textAlign: 'center' }}>
                        <div style={{ fontWeight: 800, fontSize: 20, color: '#5B9BD5' }}>{(parseFloat(stats.totalCO2) / 21).toFixed(1)}</div>
                        <div style={{ fontSize: 11, color: '#555', marginTop: 3 }}>Árboles/año equiv.</div>
                      </div>
                      <div style={{ background: '#0F1923', borderRadius: 14, padding: '14px', textAlign: 'center' }}>
                        <div style={{ fontWeight: 800, fontSize: 20, color: '#F5A623' }}>{(parseFloat(stats.totalCO2) * 4).toFixed(0)}</div>
                        <div style={{ fontSize: 11, color: '#555', marginTop: 3 }}>Km no recorridos</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ background: '#1A2332', borderRadius: 20, padding: 24, border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#fff', marginBottom: 16 }}>📋 Resumen ejecutivo</div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5,1fr)', gap: isMobile ? 10 : 14 }}>
                  {[
                    { label: 'Total usuarios', val: stats.users.length, color: '#5B9BD5' },
                    { label: 'Total artículos', val: stats.items.length, color: '#F5A623' },
                    { label: 'Total chats', val: stats.convos.length, color: '#9C6BBE' },
                    { label: 'CO₂ ahorrado', val: `${stats.totalCO2}kg`, color: '#4CAF50' },
                    { label: 'Usuarios activos', val: stats.activeUsers, color: '#6DBE7E' },
                  ].map((s, i) => (
                    <div key={i} style={{ background: '#0F1923', borderRadius: 14, padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ fontWeight: 800, fontSize: 22, color: s.color }}>{s.val}</div>
                      <div style={{ fontSize: 11, color: '#444', marginTop: 4 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
