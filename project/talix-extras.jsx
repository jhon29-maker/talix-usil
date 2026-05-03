// ============================================================
// TALIX — Terms Modal + Public Profile + Improvements
// ============================================================

// ── TERMS MODAL ──────────────────────────────────────────────
function TermsModal({ onAccept }) {
  const [scrolled, setScrolled] = React.useState(false);
  const [checked, setChecked] = React.useState(false);
  const bodyRef = React.useRef(null);

  const handleScroll = () => {
    const el = bodyRef.current;
    if (el && el.scrollTop + el.clientHeight >= el.scrollHeight - 40) setScrolled(true);
  };

  const sections = [
    {
      title: "Acceso y Autenticidad Estudiantil",
      text: "Para formar parte de TALIX, es indispensable ser un estudiante vigente de la comunidad universitaria. El acceso se valida exclusivamente mediante el correo institucional, lo que garantiza que cada intercambio ocurra dentro de un entorno seguro y conocido. Al registrarte, te comprometes a mantener una identidad real y transparente, entendiendo que tu perfil es tu carta de presentación ante tus compañeros."
    },
    {
      title: "Naturaleza del Intercambio Colaborativo",
      text: "TALIX funciona bajo un modelo de economía circular pura donde el dinero no tiene lugar. Queda estrictamente prohibida la compra, venta o cualquier transacción monetaria dentro de la plataforma. El valor del intercambio reside en la utilidad del objeto y la ayuda mutua; por ello, cada usuario debe describir con honestidad el estado real de sus pertenencias para evitar malentendidos y fortalecer la confianza en la red."
    },
    {
      title: "Protocolo de Seguridad en Eco-Spots",
      text: "La seguridad es nuestra prioridad compartida. Por esta razón, todos los intercambios físicos deben coordinarse preferentemente en los Eco-Spots establecidos dentro del campus, tales como la Terraza, Biblioteca, Comedor o Edificio F. TALIX actúa como el puente digital de contacto, pero la culminación del trueque es responsabilidad de los estudiantes, a quienes se les recomienda realizar los encuentros en horarios de alta concurrencia académica."
    },
    {
      title: "Compromiso Ético y de Privacidad",
      text: "Nuestra plataforma rechaza cualquier contenido que promueva la violencia, la discriminación o que infrinja las normas de ética universitaria. Los datos personales están protegidos y solo se comparten con la contraparte una vez que ambas personas aceptan iniciar una negociación formal. El incumplimiento de estas normas de convivencia o cualquier intento de fraude resultará en la baja inmediata de la comunidad para proteger la integridad del ecosistema TALIX."
    },
    {
      title: "Sostenibilidad y Responsabilidad Ambiental",
      text: "Al participar en TALIX, te unes activamente a un movimiento de reducción de residuos y consumo responsable. Cada trueque realizado contribuye a disminuir la huella de carbono de nuestra comunidad universitaria. Nos comprometemos a medir y comunicar transparentemente el impacto ambiental colectivo de la plataforma."
    },
    {
      title: "Política de Datos y Cookies",
      text: "TALIX recopila únicamente los datos necesarios para el funcionamiento de la plataforma: nombre, correo institucional, facultad y los artículos publicados. No vendemos ni compartimos datos con terceros fuera del entorno USIL. El uso de la plataforma implica el consentimiento para el tratamiento de estos datos con fines exclusivamente académicos y de mejora del servicio."
    }
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: '#fff', borderRadius: 24, width: '100%', maxWidth: 600,
        maxHeight: '88vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 80px rgba(0,0,0,0.25)', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ padding: '28px 32px 20px', borderBottom: '1px solid #EEE' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <span style={{ fontSize: 28 }}>♻️</span>
            <span style={{ fontWeight: 800, fontSize: 20, color: '#1C2B2B', letterSpacing: '-0.5px' }}>
              CONTRATO DE COMUNIDAD Y CONFIANZA TALIX
            </span>
          </div>
          <div style={{ fontSize: 13, color: '#888' }}>
            Lee el contrato completo antes de unirte a la comunidad USIL.
          </div>
        </div>

        {/* Scrollable body */}
        <div ref={bodyRef} onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
          {sections.map((s, i) => (
            <div key={i} style={{ marginBottom: 22 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1C2B2B', marginBottom: 6 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: '#555', lineHeight: 1.75 }}
                dangerouslySetInnerHTML={{ __html: s.text.replace(/Eco-Spots/g, '<strong>Eco-Spots</strong>').replace(/debe describir con honestidad el\nestado real/g, '<strong>debe describir con honestidad el estado real</strong>') }}
              />
            </div>
          ))}
          {!scrolled && (
            <div style={{ textAlign: 'center', padding: '12px 0', color: '#BBB', fontSize: 12 }}>
              ↓ Desplázate para continuar
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '20px 32px 24px', borderTop: '1px solid #EEE', background: '#FAFAFA' }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', marginBottom: 16 }}>
            <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)}
              style={{ marginTop: 2, width: 16, height: 16, accentColor: '#1A7A50', cursor: 'pointer', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>
              He leído y acepto el Contrato de Comunidad, la Política de Privacidad y los Términos de Uso de TALIX · USIL.
            </span>
          </label>
          <button onClick={() => checked && onAccept()} disabled={!checked} style={{
            width: '100%', padding: '14px', borderRadius: 100, border: 'none',
            background: checked ? '#1A7A50' : '#C8D8C8', color: '#fff',
            fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 15,
            cursor: checked ? 'pointer' : 'not-allowed', transition: 'all 0.2s',
            boxShadow: checked ? '0 4px 16px rgba(26,122,80,0.35)' : 'none'
          }}>
            {checked ? 'ACEPTAR Y ENTRAR A TALIX ✓' : 'Acepta los términos para continuar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PUBLIC USER PROFILE ──────────────────────────────────────
function PublicProfilePage({ userId, setPage, theme }) {
  const user = TALIX_USERS.find(u => u.id === userId) || TALIX_USERS[1];
  const userItems = TALIX_ITEMS.filter(i => i.userId === user.id);
  const medals = ['🥇', '🥈', '🥉'];
  const sorted = [...TALIX_USERS].sort((a, b) => b.co2 - a.co2);
  const rank = sorted.findIndex(u => u.id === user.id) + 1;

  return (
    <div>
      <TTopBar title="Perfil de usuario" theme={theme}
        rightEl={
          <button onClick={() => setPage('feed')} style={{
            background: '#F4F6F0', border: 'none', padding: '8px 18px', borderRadius: 100,
            cursor: 'pointer', fontFamily: 'Poppins', fontSize: 13, fontWeight: 600, color: '#555'
          }}>← Volver al feed</button>
        }
      />
      <div style={{ padding: '32px', maxWidth: 900 }}>
        {/* Profile hero */}
        <div style={{ background: '#fff', borderRadius: 24, overflow: 'hidden', border: '1px solid #EEE', marginBottom: 24 }}>
          <div style={{ height: 120, background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})`, position: 'relative' }}>
            <div style={{ position: 'absolute', bottom: -36, left: 32 }}>
              <TAvatar name={user.name} color={user.avatarColor} size={72} />
            </div>
          </div>
          <div style={{ padding: '44px 32px 28px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{ fontWeight: 800, fontSize: 22, color: '#1C2B2B' }}>{user.name}</span>
                <span style={{ background: '#E8F5E9', color: '#2E7D32', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100 }}>✓ USIL Verificado</span>
                {rank <= 3 && <span style={{ fontSize: 20 }}>{medals[rank - 1]}</span>}
              </div>
              <div style={{ fontSize: 14, color: '#888' }}>{user.faculty} · Miembro TALIX</div>
            </div>
            <TButton onClick={() => setPage('chat')} theme={theme} style={{ padding: '11px 24px' }}>
              💬 Enviar mensaje
            </TButton>
          </div>
          {/* Stats row */}
          <div style={{ display: 'flex', borderTop: '1px solid #EEE' }}>
            {[
              { val: user.swaps, label: 'Trueques' },
              { val: `${user.co2}kg`, label: 'CO₂ ahorrado' },
              { val: `#${rank}`, label: 'Ranking' },
              { val: userItems.length || user.items, label: 'Artículos' },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, padding: '18px 0', textAlign: 'center', borderRight: i < 3 ? '1px solid #EEE' : 'none' }}>
                <div style={{ fontWeight: 800, fontSize: 22, color: theme.primary }}>{s.val}</div>
                <div style={{ fontSize: 12, color: '#999' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Items */}
        <div style={{ fontWeight: 700, fontSize: 17, color: '#1C2B2B', marginBottom: 16 }}>
          Artículos disponibles para trueque
        </div>
        {userItems.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
            {userItems.map(item => (
              <TItemCard key={item.id} item={item} theme={theme} onClick={() => {}} />
            ))}
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 20, padding: '40px', textAlign: 'center', border: '1px solid #EEE' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📦</div>
            <div style={{ color: '#999', fontSize: 14 }}>Este usuario aún no tiene artículos publicados</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── NOTIFICATION BELL ────────────────────────────────────────
function NotificationBell({ theme }) {
  const [open, setOpen] = React.useState(false);
  const notifs = [
    { id: 1, icon: '🔄', text: 'Ana M. aceptó tu propuesta de trueque', time: 'hace 5m', unread: true },
    { id: 2, icon: '💬', text: 'Carlos R. te envió un mensaje', time: 'hace 1h', unread: true },
    { id: 3, icon: '✅', text: 'Trueque completado: Cálculo Larson', time: 'hace 2h', unread: false },
    { id: 4, icon: '🌿', text: '¡Subiste al puesto #1 del ranking!', time: 'ayer', unread: false },
  ];
  const unread = notifs.filter(n => n.unread).length;

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={{
        background: '#F4F6F0', border: 'none', width: 40, height: 40, borderRadius: '50%',
        cursor: 'pointer', fontSize: 18, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2, width: 16, height: 16,
            background: '#E53935', borderRadius: '50%', color: '#fff',
            fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #fff'
          }}>{unread}</span>
        )}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 48, right: 0, width: 320, background: '#fff',
          borderRadius: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', border: '1px solid #EEE', zIndex: 200, overflow: 'hidden'
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #EEE', fontWeight: 700, fontSize: 14, color: '#1C2B2B' }}>
            Notificaciones
          </div>
          {notifs.map(n => (
            <div key={n.id} style={{
              padding: '12px 20px', borderBottom: '1px solid #F5F5F5', display: 'flex', gap: 12, alignItems: 'flex-start',
              background: n.unread ? `${theme.primary}06` : '#fff', cursor: 'pointer'
            }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{n.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: '#333', lineHeight: 1.4 }}>{n.text}</div>
                <div style={{ fontSize: 11, color: '#AAA', marginTop: 3 }}>{n.time}</div>
              </div>
              {n.unread && <div style={{ width: 8, height: 8, borderRadius: '50%', background: theme.primary, flexShrink: 0, marginTop: 4 }} />}
            </div>
          ))}
          <div style={{ padding: '12px', textAlign: 'center' }}>
            <span style={{ fontSize: 12, color: theme.primary, fontWeight: 600, cursor: 'pointer' }}>Ver todas</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ECO SPOTS MAP ────────────────────────────────────────────
function EcoSpotsModal({ onClose, theme }) {
  const spots = [
    { name: 'Biblioteca Central', icon: '📚', desc: 'Piso 1, zona de estudio silencioso. Lun–Vie 8am–8pm', busy: 'Alta' },
    { name: 'Terraza USIL', icon: '🌿', desc: 'Azotea Edificio A. Espacio abierto y seguro', busy: 'Media' },
    { name: 'Comedor Principal', icon: '🍽️', desc: 'Horario almuerzo 12–2pm ideal para encuentros', busy: 'Alta' },
    { name: 'Edificio F – Lobby', icon: '🏢', desc: 'Lobby principal, cámaras de seguridad 24h', busy: 'Baja' },
    { name: 'Patio Central', icon: '☀️', desc: 'Área verde central. Ideal horario de recreo', busy: 'Media' },
  ];
  const busyColor = { 'Alta': '#E53935', 'Media': '#F5A623', 'Baja': '#4CAF50' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 500, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '24px 28px 16px', borderBottom: '1px solid #EEE', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: '#1C2B2B' }}>📍 Eco-Spots USIL</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Lugares seguros para realizar tus trueques</div>
          </div>
          <button onClick={onClose} style={{ background: '#F4F6F0', border: 'none', width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        <div style={{ padding: '16px 28px 24px' }}>
          {spots.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: i < spots.length - 1 ? '1px solid #F5F5F5' : 'none', alignItems: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: '#F4F6F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{s.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1C2B2B' }}>{s.name}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{s.desc}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: busyColor[s.busy] }}>● {s.busy}</div>
                <div style={{ fontSize: 10, color: '#BBB' }}>Concurrencia</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { TermsModal, PublicProfilePage, NotificationBell, EcoSpotsModal });
