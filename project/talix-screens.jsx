// ============================================================
// TALIX v3 — All Screens with real Firebase/localStorage data
// ============================================================

// ── LOGIN / REGISTER ──────────────────────────────────────────
function LoginPage({ onLogin, onAdminAccess, theme }) {
  const [tab, setTab] = React.useState('login');
  const [email, setEmail] = React.useState('');
  const [pass, setPass] = React.useState('');
  const [name, setName] = React.useState('');
  const [faculty, setFaculty] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handle = async () => {
    setError(''); if (!email||!pass) { setError('Completa todos los campos.'); return; }
    setLoading(true);
    try {
      if (tab==='register') {
        if (!name) { setError('Ingresa tu nombre completo.'); setLoading(false); return; }
        await Auth.register(email, pass, name, faculty||'No especificada');
      } else {
        await Auth.login(email, pass);
      }
      onLogin();
    } catch(e) { setError(e.message); } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', background:'#F4F6F0', fontFamily:'Poppins, sans-serif' }}>
      <div style={{ flex:1, background:theme.primary, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:60, position:'relative', overflow:'hidden' }}>
        {[...Array(4)].map((_,i)=><div key={i} style={{ position:'absolute', borderRadius:'50%', border:`2px solid rgba(255,255,255,${0.04+i*0.04})`, width:200+i*160, height:200+i*160, top:'50%', left:'50%', transform:'translate(-50%,-50%)' }} />)}
        <div style={{ position:'relative', textAlign:'center', color:'#fff' }}>
          <div style={{ fontSize:72, marginBottom:16 }}>♻️</div>
          <div style={{ fontWeight:800, fontSize:48, letterSpacing:'-2px', marginBottom:8 }}>TALIX</div>
          <div style={{ fontSize:17, opacity:0.85, maxWidth:320, lineHeight:1.6, fontWeight:500 }}>Trueque universitario sostenible para la comunidad USIL</div>
          <div style={{ marginTop:40, display:'flex', flexDirection:'column', gap:14 }}>
            {[['🌿','Reduce tu huella de carbono'],['📚','Da segunda vida a tus cosas'],['🤝','Conecta con compañeros USIL'],['📍','Coordina en Eco-Spots del campus']].map(([icon,text])=>(
              <div key={text} style={{ display:'flex', alignItems:'center', gap:12, background:'rgba(255,255,255,0.12)', padding:'12px 20px', borderRadius:14 }}>
                <span style={{ fontSize:20 }}>{icon}</span><span style={{ fontSize:14, fontWeight:500 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ width:500, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'48px 56px', background:'#fff', overflowY:'auto' }}>
        <div style={{ width:'100%', maxWidth:380 }}>
          <div style={{ fontWeight:800, fontSize:26, color:'#1C2B2B', marginBottom:6 }}>{tab==='login'?'Bienvenido 👋':'Únete a TALIX 🎉'}</div>
          <div style={{ color:'#888', fontSize:13, marginBottom:24 }}>{tab==='login'?'Ingresa con tu correo USIL o Gmail':'Crea tu cuenta universitaria'}</div>
          <div style={{ display:'flex', background:'#F4F6F0', borderRadius:12, padding:4, marginBottom:22 }}>
            {['login','register'].map(t=>(
              <button key={t} onClick={()=>{setTab(t);setError('');}} style={{ flex:1, padding:'9px 0', borderRadius:10, border:'none', cursor:'pointer', fontFamily:'Poppins', fontWeight:600, fontSize:13, background:tab===t?'#fff':'transparent', color:tab===t?theme.primary:'#999', boxShadow:tab===t?'0 1px 6px rgba(0,0,0,0.1)':'none', transition:'all 0.2s' }}>
                {t==='login'?'Iniciar sesión':'Registrarse'}
              </button>
            ))}
          </div>
          {tab==='register'&&<>
            <TInput label="Nombre completo" placeholder="Ej: Joel Santiago Ferrer" icon="👤" value={name} onChange={e=>setName(e.target.value)} required />
            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#444', marginBottom:6 }}>Facultad <span style={{color:'#E53935'}}>*</span></label>
              <select value={faculty} onChange={e=>setFaculty(e.target.value)} style={{ width:'100%', padding:'12px 16px', border:'1.5px solid #E8EDE8', borderRadius:12, fontSize:14, fontFamily:'Poppins', outline:'none', boxSizing:'border-box', background:'#FAFBFA' }}>
                <option value="">Selecciona tu facultad...</option>
                {['Ingeniería Industrial','Ingeniería de Sistemas','Diseño Gráfico','Administración','Comunicaciones','Economía','Psicología','Derecho','Arquitectura','Marketing','Nutrición','Otra'].map(f=><option key={f}>{f}</option>)}
              </select>
            </div>
          </>}
          <TInput label="Correo electrónico" type="email" placeholder="tu.nombre@usil.edu.pe" icon="✉️" value={email} onChange={e=>setEmail(e.target.value)} required />
          <TInput label="Contraseña" type="password" placeholder="Mínimo 6 caracteres" icon="🔒" value={pass} onChange={e=>setPass(e.target.value)} required />
          {error&&<div style={{ background:'#FFEBEE', border:'1px solid #FFCDD2', borderRadius:10, padding:'10px 14px', marginBottom:14, fontSize:13, color:'#C62828' }}>⚠️ {error}</div>}
          {tab==='login'&&<div style={{ textAlign:'right', marginTop:-8, marginBottom:16 }}><span style={{ fontSize:12, color:theme.primary, cursor:'pointer', fontWeight:500 }}>¿Olvidaste tu contraseña?</span></div>}
          <TButton onClick={handle} theme={theme} style={{ width:'100%' }} disabled={loading}>{loading?'⏳ Procesando...':tab==='login'?'Iniciar sesión':'Crear cuenta'}</TButton>
          <div style={{ marginTop:20, padding:'14px 18px', background:'#F4F6F0', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div><div style={{ fontSize:12, fontWeight:700, color:'#555' }}>¿Eres administrador?</div><div style={{ fontSize:11, color:'#AAA' }}>Panel de control TALIX</div></div>
            <button onClick={onAdminAccess} style={{ padding:'8px 16px', background:'#1C2B2B', border:'none', borderRadius:100, color:'#F5A623', fontFamily:'Poppins', fontWeight:700, fontSize:12, cursor:'pointer' }}>🔐 Admin</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── TERMS MODAL ───────────────────────────────────────────────
function TermsModal({ onAccept }) {
  const [scrolled, setScrolled] = React.useState(false);
  const [checked, setChecked] = React.useState(false);
  const bodyRef = React.useRef(null);
  const handleScroll = () => { const el=bodyRef.current; if(el&&el.scrollTop+el.clientHeight>=el.scrollHeight-40) setScrolled(true); };
  const sections = [
    { title:"Acceso y Autenticidad Estudiantil", text:"Para formar parte de TALIX es indispensable ser estudiante vigente de la comunidad universitaria USIL. El acceso se valida mediante correo institucional o Gmail. Al registrarte, te comprometes a mantener una identidad real y transparente." },
    { title:"Naturaleza del Intercambio", text:"TALIX funciona bajo economía circular pura — el dinero no tiene lugar. Queda prohibida la compra, venta o transacción monetaria. Cada usuario debe describir con honestidad el estado real de sus pertenencias." },
    { title:"Seguridad en Eco-Spots", text:"Todos los intercambios físicos deben coordinarse en Eco-Spots del campus: Biblioteca, Cafetería, Terraza o Edificio F. TALIX actúa como puente digital; el encuentro es responsabilidad de los estudiantes." },
    { title:"Privacidad y Datos", text:"Los datos personales están protegidos y solo se comparten con la contraparte al iniciar una negociación formal. No vendemos ni compartimos datos con terceros fuera del entorno USIL." },
    { title:"Sostenibilidad", text:"Al participar en TALIX, contribuyes activamente a reducir residuos y consumo. Cada trueque disminuye la huella de carbono de nuestra comunidad universitaria." },
    { title:"Conducta y Sanciones", text:"Rechazamos contenido que promueva violencia o discriminación. El incumplimiento de normas resultará en baja inmediata de la comunidad TALIX para proteger la integridad del ecosistema." },
  ];
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:10000, display:'flex', alignItems:'center', justifyContent:'center', padding:24, backdropFilter:'blur(4px)' }}>
      <div style={{ background:'#fff', borderRadius:24, width:'100%', maxWidth:600, maxHeight:'88vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 80px rgba(0,0,0,0.25)', overflow:'hidden' }}>
        <div style={{ padding:'28px 32px 20px', borderBottom:'1px solid #EEE' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:6 }}>
            <span style={{ fontSize:28 }}>♻️</span>
            <span style={{ fontWeight:800, fontSize:18, color:'#1C2B2B' }}>CONTRATO DE COMUNIDAD TALIX</span>
          </div>
          <div style={{ fontSize:13, color:'#888' }}>Lee el contrato completo antes de unirte.</div>
        </div>
        <div ref={bodyRef} onScroll={handleScroll} style={{ flex:1, overflowY:'auto', padding:'24px 32px' }}>
          {sections.map((s,i)=>(
            <div key={i} style={{ marginBottom:20 }}>
              <div style={{ fontWeight:700, fontSize:14, color:'#1C2B2B', marginBottom:6 }}>{i+1}. {s.title}</div>
              <div style={{ fontSize:13, color:'#555', lineHeight:1.75 }}>{s.text}</div>
            </div>
          ))}
          {!scrolled&&<div style={{ textAlign:'center', padding:'8px 0', color:'#BBB', fontSize:12 }}>↓ Desplázate para continuar</div>}
        </div>
        <div style={{ padding:'20px 32px 24px', borderTop:'1px solid #EEE', background:'#FAFAFA' }}>
          <label style={{ display:'flex', alignItems:'flex-start', gap:12, cursor:'pointer', marginBottom:16 }}>
            <input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)} style={{ marginTop:2, width:16, height:16, accentColor:'#1A7A50', cursor:'pointer', flexShrink:0 }} />
            <span style={{ fontSize:13, color:'#555', lineHeight:1.5 }}>He leído y acepto el Contrato de Comunidad, la Política de Privacidad y los Términos de Uso de TALIX · USIL.</span>
          </label>
          <button onClick={()=>checked&&onAccept()} disabled={!checked} style={{ width:'100%', padding:14, borderRadius:100, border:'none', background:checked?'#1A7A50':'#C8D8C8', color:'#fff', fontFamily:'Poppins', fontWeight:700, fontSize:15, cursor:checked?'pointer':'not-allowed', transition:'all 0.2s', boxShadow:checked?'0 4px 16px rgba(26,122,80,0.35)':'none' }}>
            {checked?'ACEPTAR Y ENTRAR A TALIX ✓':'Acepta los términos para continuar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── FEED PAGE ─────────────────────────────────────────────────
function FeedPage({ setPage, setSelectedItem, setPublicUser, currentUser, theme, showToast }) {
  const [items, setItems] = React.useState([]);
  const [search, setSearch] = React.useState('');
  const [cat, setCat] = React.useState('Todos');
  const [loading, setLoading] = React.useState(true);
  const [showEcoSpots, setShowEcoSpots] = React.useState(false);
  const CATS = ['Todos','Libros','Tecnología','Ropa','Accesorios'];

  React.useEffect(() => {
    const unsub = ItemsService.getAll(data => { setItems(data); setLoading(false); });
    return unsub;
  }, []);

  const filtered = items.filter(i =>
    (cat==='Todos'||i.category===cat) &&
    (i.title?.toLowerCase().includes(search.toLowerCase())||i.category?.toLowerCase().includes(search.toLowerCase())||i.description?.toLowerCase().includes(search.toLowerCase()))
  );
  const totalCO2 = items.reduce((s,i)=>s+(i.co2||0),0).toFixed(1);

  return (
    <div>
      {showEcoSpots&&<EcoSpotsModal onClose={()=>setShowEcoSpots(false)} theme={theme} />}
      <TTopBar title="Explorar Trueques" subtitle={`${items.length} artículos disponibles`} theme={theme}
        rightEl={
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button onClick={()=>setShowEcoSpots(true)} style={{ background:'#FFF3E0', border:'none', padding:'7px 14px', borderRadius:100, cursor:'pointer', fontFamily:'Poppins', fontWeight:600, fontSize:12, color:'#E65100' }}>📍 Eco-Spots</button>
            <div style={{ display:'flex', alignItems:'center', gap:8, background:'#E8F5E9', padding:'7px 14px', borderRadius:100 }}>
              <span>🌿</span><span style={{ fontSize:13, fontWeight:600, color:'#2E7D32' }}>-{totalCO2}kg CO₂</span>
            </div>
            <NotificationBell userId={currentUser?.id} theme={theme} />
          </div>
        }
      />
      <div style={{ padding:'24px 32px' }}>
        <div style={{ position:'relative', marginBottom:20 }}>
          <span style={{ position:'absolute', left:16, top:'50%', transform:'translateY(-50%)', fontSize:16 }}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar artículos, libros, tecnología..."
            style={{ width:'100%', padding:'14px 16px 14px 46px', border:'1.5px solid #E8EDE8', borderRadius:16, fontSize:14, fontFamily:'Poppins', outline:'none', boxSizing:'border-box', background:'#fff', boxShadow:'0 2px 8px rgba(0,0,0,0.05)' }}
            onFocus={e=>e.target.style.borderColor=theme.primary} onBlur={e=>e.target.style.borderColor='#E8EDE8'}
          />
        </div>
        <div style={{ display:'flex', gap:8, marginBottom:24, flexWrap:'wrap' }}>
          {CATS.map(c=>(
            <button key={c} onClick={()=>setCat(c)} style={{ padding:'8px 18px', borderRadius:100, border:'none', cursor:'pointer', background:cat===c?theme.primary:'#fff', color:cat===c?'#fff':'#555', fontFamily:'Poppins', fontWeight:600, fontSize:13, boxShadow:cat===c?`0 3px 12px ${theme.primary}40`:'0 1px 4px rgba(0,0,0,0.08)', transition:'all 0.15s' }}>{c}</button>
          ))}
        </div>
        {loading?(
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:20 }}>
            {[...Array(6)].map((_,i)=><div key={i} style={{ height:300, background:'#fff', borderRadius:20, animation:'pulse 1.5s ease-in-out infinite', border:'1px solid #EEE' }} />)}
          </div>
        ) : filtered.length===0?(
          <div style={{ textAlign:'center', padding:'60px 0', color:'#999' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🔍</div>
            <div style={{ fontWeight:600, fontSize:16 }}>No se encontraron artículos</div>
            <div style={{ fontSize:14, marginTop:4 }}>Intenta con otras palabras o sé el primero en publicar</div>
            <TButton onClick={()=>setPage('post')} theme={theme} style={{ marginTop:20 }}>+ Publicar artículo</TButton>
          </div>
        ):(
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:20 }}>
            {filtered.map(item=>(
              <TItemCard key={item.id} item={item} theme={theme} currentUserId={currentUser?.id}
                onClick={()=>{ setSelectedItem(item); setPage('detail'); }}
                onUserClick={uid=>{ setPublicUser(uid); setPage('publicprofile'); }}
              />
            ))}
          </div>
        )}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  );
}

// ── ITEM DETAIL ────────────────────────────────────────────────
function ItemDetailPage({ item, setPage, setPublicUser, currentUser, theme, showToast }) {
  const [proposed, setProposed] = React.useState(false);
  const [offer, setOffer] = React.useState('');
  const [myItems, setMyItems] = React.useState([]);
  React.useEffect(() => { if(currentUser) setMyItems(ItemsService.getUserItems(currentUser.id)); }, [currentUser]);
  if (!item) return null;

  const handlePropose = () => {
    if (!offer) { showToast('Selecciona qué ofreces a cambio','error'); return; }
    ItemsService.sendProposal(item.id, currentUser, offer);
    setProposed(true);
    showToast('¡Propuesta enviada! Espera la respuesta de '+item.user,'success');
  };

  const handleChat = () => {
    const convId = ChatService.getConversationId(currentUser.id, item.userId);
    ChatService.sendMessage(convId, currentUser, `Hola ${item.user}, vi tu artículo "${item.title}" y me interesa. ¿Podemos coordinar un trueque?`, [currentUser.id, item.userId], item.title);
    setPage('chat');
    showToast('Conversación iniciada con '+item.user,'success');
  };

  return (
    <div>
      <TTopBar title={item.title} subtitle={item.category} theme={theme}
        rightEl={<button onClick={()=>setPage('feed')} style={{ background:'#F4F6F0', border:'none', padding:'8px 16px', borderRadius:100, cursor:'pointer', fontFamily:'Poppins', fontSize:13, fontWeight:600, color:'#555' }}>← Volver</button>}
      />
      <div style={{ padding:'32px', display:'grid', gridTemplateColumns:'1fr 360px', gap:32, maxWidth:1100 }}>
        <div>
          <div style={{ height:300, background:item.bgColor||'#F4F6F0', borderRadius:24, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:24, position:'relative', overflow:'hidden' }}>
            {item.photo?<img src={item.photo} alt={item.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} />:<span style={{ fontSize:100 }}>{categoryEmoji(item.category)}</span>}
            <div style={{ position:'absolute', bottom:16, left:16, background:'rgba(255,255,255,0.92)', borderRadius:100, padding:'6px 14px', fontWeight:700, fontSize:13, color:'#1A7A50' }}>🌿 Ahorras ~{item.co2}kg de CO₂</div>
          </div>
          <div style={{ background:'#fff', borderRadius:20, padding:24, border:'1px solid #EEE' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}><TCategoryBadge category={item.category} /><TConditionDot condition={item.condition} /></div>
            <h2 style={{ margin:'0 0 12px', fontSize:22, fontWeight:700, color:'#1C2B2B' }}>{item.title}</h2>
            <p style={{ margin:'0 0 16px', color:'#666', lineHeight:1.7, fontSize:14 }}>{item.description}</p>
            <div style={{ background:'#F4F6F0', borderRadius:14, padding:'14px 18px' }}>
              <div style={{ fontSize:12, color:'#888', fontWeight:600, marginBottom:4 }}>¿QUÉ BUSCA A CAMBIO?</div>
              <div style={{ fontSize:14, color:'#333', fontWeight:500 }}>🔄 {item.want}</div>
            </div>
            {(item.proposals||[]).length>0&&(
              <div style={{ marginTop:16, background:'#FFF8E1', borderRadius:14, padding:'14px 18px' }}>
                <div style={{ fontSize:12, color:'#F57F17', fontWeight:600, marginBottom:8 }}>PROPUESTAS RECIBIDAS ({item.proposals.length})</div>
                {item.proposals.map((p,i)=>(
                  <div key={i} style={{ fontSize:13, color:'#555', marginBottom:6, display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:16 }}>🤝</span> <strong>{p.from}</strong>: {p.offer} <span style={{ color:'#AAA', fontSize:11 }}>— {new Date(p.date).toLocaleDateString('es')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div>
          <div style={{ background:'#fff', borderRadius:20, padding:24, marginBottom:16, border:'1px solid #EEE' }}>
            <div style={{ fontSize:12, fontWeight:600, color:'#999', marginBottom:12 }}>PUBLICADO POR</div>
            <div onClick={()=>{ setPublicUser(item.userId); setPage('publicprofile'); }} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16, cursor:'pointer', padding:8, borderRadius:14, transition:'background 0.15s' }}
              onMouseEnter={e=>e.currentTarget.style.background='#F4F6F0'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}
            >
              <TAvatar name={item.user} color={item.avatarColor} size={48} />
              <div>
                <div style={{ fontWeight:700, fontSize:15, color:'#1C2B2B' }}>{item.user} <span style={{ fontSize:11, color:'#4CAF50', fontWeight:600 }}>✓ USIL</span></div>
                <div style={{ fontSize:12, color:'#888' }}>{item.faculty}</div>
                <div style={{ fontSize:11, color:theme.primary, marginTop:2, fontWeight:500 }}>Ver perfil →</div>
              </div>
            </div>
            {currentUser?.id!==item.userId&&<TButton onClick={handleChat} theme={theme} style={{ width:'100%', padding:'11px 0', textAlign:'center' }}>💬 Iniciar conversación</TButton>}
          </div>
          {currentUser?.id!==item.userId&&(
            <div style={{ background:proposed?'#E8F5E9':'#fff', borderRadius:20, padding:24, border:`2px solid ${proposed?'#4CAF50':theme.primary}`, transition:'all 0.3s', marginBottom:16 }}>
              {proposed?(
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:40, marginBottom:8 }}>✅</div>
                  <div style={{ fontWeight:700, fontSize:16, color:'#2E7D32', marginBottom:4 }}>¡Propuesta enviada!</div>
                  <div style={{ fontSize:13, color:'#555' }}>Espera a que {item.user} responda.</div>
                </div>
              ):(
                <>
                  <div style={{ fontSize:13, fontWeight:700, color:'#1C2B2B', marginBottom:8 }}>🤝 Proponer trueque</div>
                  <div style={{ fontSize:13, color:'#666', marginBottom:14, lineHeight:1.5 }}>Selecciona qué ofreces a cambio:</div>
                  <select value={offer} onChange={e=>setOffer(e.target.value)} style={{ width:'100%', padding:'11px 14px', border:'1.5px solid #E8EDE8', borderRadius:12, fontFamily:'Poppins', fontSize:13, marginBottom:12, background:'#FAFBFA', outline:'none', boxSizing:'border-box' }}>
                    <option value="">Selecciona un artículo tuyo...</option>
                    {myItems.map(mi=><option key={mi.id} value={mi.title}>{categoryEmoji(mi.category)} {mi.title}</option>)}
                    <option value="Artículo sin publicar aún">Artículo sin publicar aún</option>
                  </select>
                  <TButton onClick={handlePropose} theme={theme} style={{ width:'100%', padding:'12px 0' }}>Enviar propuesta</TButton>
                </>
              )}
            </div>
          )}
          {currentUser?.id===item.userId&&(
            <div style={{ background:'#FFF3E0', borderRadius:20, padding:20, marginBottom:16, border:'1px solid #FFE0B2' }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#E65100', marginBottom:8 }}>⚙️ Este es tu artículo</div>
              <TButton onClick={()=>{ ItemsService.deleteItem(item.id); setPage('feed'); showToast('Artículo eliminado','success'); }} theme={theme} variant="danger" style={{ width:'100%', padding:'10px 0', fontSize:13 }}>🗑️ Eliminar artículo</TButton>
            </div>
          )}
          <div style={{ background:`linear-gradient(135deg, ${theme.primary}15, ${theme.accent}15)`, borderRadius:20, padding:20, border:`1px solid ${theme.primary}20` }}>
            <div style={{ fontSize:12, fontWeight:700, color:theme.primary, marginBottom:8 }}>🌍 IMPACTO AMBIENTAL</div>
            <div style={{ fontSize:28, fontWeight:800, color:theme.primary }}>{item.co2} kg</div>
            <div style={{ fontSize:13, color:'#666', marginTop:2 }}>de CO₂ ahorrado vs. comprar nuevo</div>
            <div style={{ fontSize:11, color:'#999', marginTop:8 }}>≈ {(item.co2*4).toFixed(0)} km no recorridos en auto 🚗</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── POST PAGE ──────────────────────────────────────────────────
function PostPage({ setPage, currentUser, theme, showToast }) {
  const [form, setForm] = React.useState({ title:'', cat:'Libros', condition:'Buen estado', want:'', desc:'' });
  const [photo, setPhoto] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const fileRef = React.useRef(null);
  const co2Est = { Libros:2.4, Tecnología:12.5, Ropa:5.0, Accesorios:3.5 }[form.cat]||3;
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));

  const handleFile = e => {
    const file = e.target.files[0]; if(!file) return;
    if(file.size>5*1024*1024) { showToast('La imagen debe pesar menos de 5MB','error'); return; }
    const reader = new FileReader();
    reader.onload = ev => setPhoto(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if(!form.title||!form.desc||!form.want) { showToast('Completa todos los campos obligatorios','error'); return; }
    setLoading(true);
    try {
      ItemsService.publish({ ...form, category:form.cat, photo }, currentUser);
      showToast('¡Artículo publicado exitosamente! 🎉','success');
      setTimeout(()=>setPage('feed'),1200);
    } catch(e) { showToast('Error al publicar: '+e.message,'error'); } finally { setLoading(false); }
  };

  return (
    <div>
      <TTopBar title="Publicar artículo" subtitle="Da segunda vida a tus cosas" theme={theme} />
      <div style={{ padding:'32px', maxWidth:760 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, marginBottom:24 }}>
          <div>
            <div onClick={()=>fileRef.current?.click()} style={{ height:220, border:`2px dashed ${photo?theme.primary:'#C8D8C8'}`, borderRadius:20, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#F4F6F0', cursor:'pointer', overflow:'hidden', position:'relative', transition:'border-color 0.2s' }}
              onMouseEnter={e=>e.currentTarget.style.borderColor=theme.primary}
              onMouseLeave={e=>{ if(!photo) e.currentTarget.style.borderColor='#C8D8C8'; }}
            >
              {photo?(
                <>
                  <img src={photo} alt="preview" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center', opacity:0, transition:'opacity 0.2s' }}
                    onMouseEnter={e=>e.currentTarget.style.opacity='1'} onMouseLeave={e=>e.currentTarget.style.opacity='0'}
                  ><span style={{ color:'#fff', fontWeight:600, fontSize:13 }}>📷 Cambiar foto</span></div>
                </>
              ):(
                <>
                  <span style={{ fontSize:44, marginBottom:8 }}>📷</span>
                  <span style={{ fontSize:13, color:'#888', fontWeight:600 }}>Subir foto del artículo</span>
                  <span style={{ fontSize:11, color:'#BBB', marginTop:4 }}>JPG, PNG — máx. 5MB</span>
                  <span style={{ fontSize:12, color:theme.primary, marginTop:8, fontWeight:600 }}>Clic para seleccionar</span>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display:'none' }} />
            {photo&&<button onClick={()=>setPhoto(null)} style={{ width:'100%', marginTop:8, padding:'8px', background:'#FFEBEE', border:'1px solid #FFCDD2', borderRadius:10, color:'#E53935', fontFamily:'Poppins', fontSize:12, fontWeight:600, cursor:'pointer', marginBottom:12 }}>🗑️ Quitar foto</button>}
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#444', marginBottom:6 }}>Categoría <span style={{color:'#E53935'}}>*</span></label>
              <select value={form.cat} onChange={set('cat')} style={{ width:'100%', padding:'12px 14px', border:'1.5px solid #E8EDE8', borderRadius:12, fontFamily:'Poppins', fontSize:14, background:'#FAFBFA', outline:'none', boxSizing:'border-box' }}>
                {['Libros','Tecnología','Ropa','Accesorios'].map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#444', marginBottom:6 }}>Estado <span style={{color:'#E53935'}}>*</span></label>
              <select value={form.condition} onChange={set('condition')} style={{ width:'100%', padding:'12px 14px', border:'1.5px solid #E8EDE8', borderRadius:12, fontFamily:'Poppins', fontSize:14, background:'#FAFBFA', outline:'none', boxSizing:'border-box' }}>
                {['Como nuevo','Buen estado','Regular'].map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <TInput label="Título del artículo" placeholder="Ej: Cálculo Larson 9na edición" value={form.title} onChange={set('title')} required />
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#444', marginBottom:6 }}>Descripción <span style={{color:'#E53935'}}>*</span></label>
              <textarea value={form.desc} onChange={set('desc')} placeholder="Describe el estado, detalles relevantes, tiempo de uso..." rows={5}
                style={{ width:'100%', padding:'12px 16px', border:'1.5px solid #E8EDE8', borderRadius:12, fontFamily:'Poppins', fontSize:14, background:'#FAFBFA', outline:'none', resize:'none', boxSizing:'border-box' }}
                onFocus={e=>e.target.style.borderColor=theme.primary} onBlur={e=>e.target.style.borderColor='#E8EDE8'}
              />
            </div>
            <TInput label="¿Qué aceptas a cambio?" placeholder="Ej: Física 1, audífonos, ropa talla M" value={form.want} onChange={set('want')} icon="🔄" required />
            <div style={{ background:`${theme.primary}12`, borderRadius:16, padding:'16px 20px', marginTop:8 }}>
              <div style={{ fontWeight:700, color:theme.primary, fontSize:15 }}>🌿 Impacto estimado: -{co2Est}kg CO₂</div>
              <div style={{ fontSize:12, color:'#666', marginTop:2 }}>vs. comprar nuevo de {form.cat.toLowerCase()}</div>
            </div>
          </div>
        </div>
        {!photo&&<div style={{ background:'#FFF8E1', border:'1px solid #FFE082', borderRadius:12, padding:'10px 16px', marginBottom:16, fontSize:13, color:'#F57F17' }}>💡 Los artículos con foto reciben 3× más propuestas</div>}
        <TButton onClick={handleSubmit} theme={theme} style={{ padding:'14px 40px', fontSize:15 }} disabled={loading||!form.title||!form.desc||!form.want}>
          {loading?'⏳ Publicando...':'Publicar artículo'}
        </TButton>
      </div>
    </div>
  );
}

// ── CHAT PAGE ──────────────────────────────────────────────────
function ChatPage({ currentUser, theme, showToast }) {
  const [convos, setConvos] = React.useState([]);
  const [activeConv, setActiveConv] = React.useState(null);
  const [msgs, setMsgs] = React.useState([]);
  const [input, setInput] = React.useState('');
  const [showCoord, setShowCoord] = React.useState(false);
  const [meetPlace, setMeetPlace] = React.useState('Biblioteca Central USIL');
  const [meetDate, setMeetDate] = React.useState('');
  const [meetDone, setMeetDone] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [showNewChat, setShowNewChat] = React.useState(false);
  const [newChatUser, setNewChatUser] = React.useState('');
  const [newChatTopic, setNewChatTopic] = React.useState('');
  const bottomRef = React.useRef(null);
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (!currentUser) return;
    return DB.subscribe('conversations', (all) => {
      const sorted = (all || []).sort((a,b) => new Date(b.lastTime||0) - new Date(a.lastTime||0));
      setConvos(sorted);
      if (!activeConv && sorted.length > 0) setActiveConv(sorted[0]);
    });
  }, [currentUser]);

  React.useEffect(() => {
    if (!activeConv) return;
    return ChatService.getMessages(activeConv.id, data => {
      setMsgs(data);
      setMeetDone(!!activeConv.meetup);
    });
  }, [activeConv?.id]);

  React.useEffect(() => {
    if (bottomRef.current) {
      const el = bottomRef.current.parentElement;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [msgs]);

  const send = () => {
    if (!input.trim() || !activeConv) return;
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
    const palette = { demo_ana:'#6DBE7E', demo_carlos:'#5B9BD5', demo_lucia:'#F5A623' };
    const otherId = (conv?.participants || []).find(p => p !== currentUser?.id && p !== 'demo_joel');
    if (palette[otherId]) return palette[otherId];
    const allUsers = DB.get('users') || [];
    return allUsers.find(u => u.id === otherId)?.avatarColor || '#6DBE7E';
  };

  const createNewChat = () => {
    if (!newChatUser.trim()) return;
    const newId = 'conv_' + Date.now();
    const newConv = {
      id: newId,
      participants: [currentUser.id, 'ext_' + Date.now()],
      participantNames: { [currentUser.id]: currentUser.displayName, target: newChatUser },
      itemTitle: newChatTopic || 'Nuevo chat',
      lastMsg: '',
      lastTime: new Date().toISOString(),
      unread: 0,
    };
    const all = DB.get('conversations') || [];
    all.unshift(newConv);
    DB.set('conversations', all);
    DB.set('msgs_' + newId, []);
    setActiveConv(newConv);
    setShowNewChat(false);
    setNewChatUser(''); setNewChatTopic('');
    showToast('¡Conversación creada!', 'success');
  };

  const allUsersList = DB.get('users') || [];
  const filteredUsers = allUsersList.filter(u =>
    u.id !== currentUser?.id &&
    (u.displayName || '').toLowerCase().includes(newChatUser.toLowerCase())
  );

  const filteredConvos = convos.filter(c =>
    getOtherName(c).toLowerCase().includes(search.toLowerCase()) ||
    (c.itemTitle || '').toLowerCase().includes(search.toLowerCase())
  );

  const fmtTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso), now = new Date(), diff = now - d;
    if (diff < 60000) return 'ahora';
    if (diff < 3600000) return Math.floor(diff/60000) + 'm';
    if (diff < 86400000) return d.toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'});
    return d.toLocaleDateString('es',{day:'numeric',month:'short'});
  };

  const QUICK = ['¿Cuándo puedes?','¿Dónde nos vemos?','¡Me interesa! 🙌','¿Está disponible aún?'];

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>
      {/* New Chat Modal */}
      {showNewChat && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:6000, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:24, width:420, overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding:'22px 24px 16px', borderBottom:'1px solid #EEE', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontWeight:700, fontSize:17, color:'#1C2B2B' }}>💬 Nuevo mensaje</div>
              <button onClick={()=>setShowNewChat(false)} style={{ background:'#F4F6F0', border:'none', width:32, height:32, borderRadius:'50%', cursor:'pointer', fontSize:15 }}>✕</button>
            </div>
            <div style={{ padding:'18px 24px 24px' }}>
              <label style={{ fontSize:12, fontWeight:600, color:'#888', display:'block', marginBottom:6 }}>BUSCAR USUARIO USIL</label>
              <input value={newChatUser} onChange={e=>setNewChatUser(e.target.value)} placeholder="Nombre del compañero..."
                style={{ width:'100%', padding:'11px 14px', border:'1.5px solid #EEE', borderRadius:12, fontFamily:'Poppins', fontSize:14, outline:'none', boxSizing:'border-box', marginBottom:10 }}
                onFocus={e=>e.target.style.borderColor=theme.primary} onBlur={e=>e.target.style.borderColor='#EEE'}
              />
              {newChatUser && (
                <div style={{ background:'#F9F9F9', borderRadius:12, overflow:'hidden', marginBottom:12, maxHeight:160, overflowY:'auto', border:'1px solid #EEE' }}>
                  {filteredUsers.length === 0
                    ? <div style={{ padding:'14px', textAlign:'center', color:'#AAA', fontSize:13 }}>No encontrado — se creará el chat igual</div>
                    : filteredUsers.map(u => (
                      <div key={u.id} onClick={()=>setNewChatUser(u.displayName)} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px', cursor:'pointer', borderBottom:'1px solid #EEE' }}
                        onMouseEnter={e=>e.currentTarget.style.background='#F0F4FA'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                      >
                        <TAvatar name={u.displayName} color={u.avatarColor} size={32} />
                        <div>
                          <div style={{ fontSize:13, fontWeight:600, color:'#1C2B2B' }}>{u.displayName}</div>
                          <div style={{ fontSize:11, color:'#AAA' }}>{u.faculty}</div>
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}
              <label style={{ fontSize:12, fontWeight:600, color:'#888', display:'block', marginBottom:6 }}>ARTÍCULO O MOTIVO (opcional)</label>
              <input value={newChatTopic} onChange={e=>setNewChatTopic(e.target.value)} placeholder="Ej: Mouse Logitech, Cálculo Larson..."
                style={{ width:'100%', padding:'11px 14px', border:'1.5px solid #EEE', borderRadius:12, fontFamily:'Poppins', fontSize:14, outline:'none', boxSizing:'border-box', marginBottom:16 }}
                onFocus={e=>e.target.style.borderColor=theme.primary} onBlur={e=>e.target.style.borderColor='#EEE'}
              />
              <button onClick={createNewChat} disabled={!newChatUser.trim()} style={{ width:'100%', padding:'13px', borderRadius:100, border:'none', background:newChatUser.trim()?theme.primary:'#DDD', color:'#fff', fontFamily:'Poppins', fontWeight:700, fontSize:14, cursor:newChatUser.trim()?'pointer':'default' }}>
                Iniciar conversación →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar conversations */}
      <div style={{ width:300, borderRight:'1px solid #EEE', background:'#fff', display:'flex', flexDirection:'column', flexShrink:0 }}>
        <div style={{ padding:'16px 16px 12px', borderBottom:'1px solid #EEE' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <div style={{ fontWeight:700, fontSize:16, color:'#1C2B2B' }}>Mensajes</div>
            <button onClick={()=>setShowNewChat(true)} style={{ background:theme.primary, border:'none', borderRadius:100, padding:'7px 14px', cursor:'pointer', fontFamily:'Poppins', fontWeight:600, fontSize:12, color:'#fff' }}>✏️ Nuevo</button>
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar..." style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #EEE', borderRadius:10, fontFamily:'Poppins', fontSize:13, outline:'none', boxSizing:'border-box', background:'#F9F9F9' }}
            onFocus={e=>e.target.style.borderColor=theme.primary} onBlur={e=>e.target.style.borderColor='#EEE'}
          />
        </div>
        <div style={{ flex:1, overflowY:'auto' }}>
          {filteredConvos.length === 0 ? (
            <div style={{ padding:'32px 20px', textAlign:'center', color:'#AAA' }}>
              <div style={{ fontSize:40, marginBottom:8 }}>💬</div>
              <div style={{ fontSize:13, fontWeight:600 }}>Sin conversaciones</div>
              <button onClick={()=>setShowNewChat(true)} style={{ marginTop:12, background:theme.primary, border:'none', borderRadius:100, padding:'9px 20px', cursor:'pointer', fontFamily:'Poppins', fontWeight:600, fontSize:12, color:'#fff' }}>+ Nuevo chat</button>
            </div>
          ) : filteredConvos.map(c => {
            const isActive = activeConv?.id === c.id;
            return (
              <div key={c.id} onClick={()=>{ setActiveConv(c); setShowCoord(false); }} style={{ padding:'13px 16px', borderBottom:'1px solid #F5F5F5', cursor:'pointer', background:isActive?theme.primary+'0D':'#fff', display:'flex', alignItems:'center', gap:10, borderLeft:isActive?'3px solid '+theme.primary:'3px solid transparent', transition:'background 0.12s' }}>
                <div style={{ position:'relative', flexShrink:0 }}>
                  <TAvatar name={getOtherName(c)} color={getOtherColor(c)} size={40} />
                  <div style={{ position:'absolute', bottom:1, right:1, width:9, height:9, borderRadius:'50%', background:'#4CAF50', border:'2px solid #fff' }} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                    <span style={{ fontWeight:isActive?700:600, fontSize:13, color:'#1C2B2B' }}>{getOtherName(c)}</span>
                    <span style={{ fontSize:10, color:'#CCC' }}>{fmtTime(c.lastTime)}</span>
                  </div>
                  {c.itemTitle && <div style={{ fontSize:10, color:theme.primary+'99', marginBottom:2 }}>📦 {c.itemTitle}</div>}
                  <div style={{ fontSize:12, color:(c.unread||0)>0?'#1C2B2B':'#AAA', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', fontWeight:(c.unread||0)>0?600:400 }}>{c.lastMsg||'Sin mensajes aún'}</div>
                </div>
                {(c.unread||0)>0 && <div style={{ width:18, height:18, borderRadius:'50%', background:theme.primary, color:'#fff', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{c.unread}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat window */}
      {!activeConv ? (
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', background:'#F9FAF8' }}>
          <div style={{ textAlign:'center', color:'#AAA' }}>
            <div style={{ fontSize:64, marginBottom:14 }}>💬</div>
            <div style={{ fontSize:17, fontWeight:600, color:'#888', marginBottom:6 }}>Selecciona una conversación</div>
            <button onClick={()=>setShowNewChat(true)} style={{ background:theme.primary, border:'none', borderRadius:100, padding:'12px 28px', cursor:'pointer', fontFamily:'Poppins', fontWeight:700, fontSize:14, color:'#fff' }}>✏️ Nuevo mensaje</button>
          </div>
        </div>
      ) : (
        <div style={{ flex:1, display:'flex', flexDirection:'column', background:'#F9FAF8', minWidth:0 }}>
          {/* Header */}
          <div style={{ padding:'14px 22px', background:'#fff', borderBottom:'1px solid #EEE', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
            <div style={{ position:'relative' }}>
              <TAvatar name={getOtherName(activeConv)} color={getOtherColor(activeConv)} size={42} />
              <div style={{ position:'absolute', bottom:1, right:1, width:10, height:10, borderRadius:'50%', background:'#4CAF50', border:'2px solid #fff' }} />
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:15, color:'#1C2B2B' }}>{getOtherName(activeConv)} <span style={{ fontSize:11, color:'#4CAF50', fontWeight:600 }}>✓ USIL</span></div>
              {activeConv.itemTitle && <div style={{ fontSize:12, color:'#888' }}>📦 {activeConv.itemTitle}</div>}
            </div>
            {activeConv.meetup && (
              <div style={{ background:'#E8F5E9', padding:'6px 12px', borderRadius:100, fontSize:12, fontWeight:600, color:'#2E7D32' }}>
                📅 {new Date(activeConv.meetup.dateTime).toLocaleDateString('es',{weekday:'short',day:'numeric',month:'short'})}
              </div>
            )}
            <button onClick={()=>setShowCoord(!showCoord)} style={{ background:showCoord?theme.primary:'#F4F6F0', color:showCoord?'#fff':'#555', border:'none', padding:'9px 16px', borderRadius:100, cursor:'pointer', fontFamily:'Poppins', fontWeight:600, fontSize:12, transition:'all 0.2s', flexShrink:0 }}>
              📅 Coordinar
            </button>
          </div>

          {/* Coord panel */}
          {showCoord && (
            <div style={{ background:'#fff', borderBottom:'1px solid #EEE', padding:'14px 22px', flexShrink:0 }}>
              {meetDone || activeConv.meetup ? (
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <span style={{ fontSize:26 }}>✅</span>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14, color:'#2E7D32' }}>¡Encuentro coordinado!</div>
                    <div style={{ fontSize:13, color:'#555' }}>{activeConv.meetup?.place} · {activeConv.meetup?.dateTime ? new Date(activeConv.meetup.dateTime).toLocaleString('es',{weekday:'long',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : ''}</div>
                  </div>
                  <button onClick={()=>{ const all=DB.get('conversations')||[]; const idx=all.findIndex(c=>c.id===activeConv.id); if(idx>=0){all[idx]={...all[idx],meetup:null};DB.set('conversations',all);setActiveConv({...activeConv,meetup:null});} setMeetDone(false); }} style={{ marginLeft:'auto', background:'#F4F6F0', border:'none', padding:'7px 14px', borderRadius:100, cursor:'pointer', fontFamily:'Poppins', fontSize:12, color:'#888' }}>Cambiar</button>
                </div>
              ) : (
                <div style={{ display:'flex', gap:12, alignItems:'flex-end', flexWrap:'wrap' }}>
                  <div style={{ flex:1, minWidth:140 }}>
                    <label style={{ fontSize:12, fontWeight:600, color:'#666', display:'block', marginBottom:5 }}>📍 Eco-Spot</label>
                    <select value={meetPlace} onChange={e=>setMeetPlace(e.target.value)} style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #EEE', borderRadius:10, fontFamily:'Poppins', fontSize:13, background:'#FAFBFA', outline:'none' }}>
                      {['Biblioteca Central USIL','Cafetería Principal','Entrada Principal','Sala de Estudio B2','Patio Central','Terraza USIL','Edificio F – Lobby'].map(p=><option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div style={{ flex:1, minWidth:140 }}>
                    <label style={{ fontSize:12, fontWeight:600, color:'#666', display:'block', marginBottom:5 }}>📅 Fecha y hora</label>
                    <input type="datetime-local" value={meetDate} onChange={e=>setMeetDate(e.target.value)} style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #EEE', borderRadius:10, fontFamily:'Poppins', fontSize:13, background:'#FAFBFA', outline:'none', boxSizing:'border-box' }} />
                  </div>
                  <TButton onClick={()=>{ if(!meetDate){showToast('Selecciona fecha y hora','error');return;} ChatService.setMeetup(activeConv.id, meetPlace, meetDate); const all=DB.get('conversations')||[]; const idx=all.findIndex(c=>c.id===activeConv.id); if(idx>=0){all[idx]={...all[idx],meetup:{place:meetPlace,dateTime:meetDate}};DB.set('conversations',all);setActiveConv({...activeConv,meetup:{place:meetPlace,dateTime:meetDate}});} setMeetDone(true); showToast('¡Encuentro coordinado! 📅','success'); setShowCoord(false); }} theme={theme} style={{ padding:'10px 16px', whiteSpace:'nowrap', flexShrink:0 }}>
                    Confirmar 📤
                  </TButton>
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          <div style={{ flex:1, overflowY:'auto', padding:'16px 22px', display:'flex', flexDirection:'column', gap:10 }}>
            {msgs.length === 0 && (
              <div style={{ textAlign:'center', padding:'48px 0', color:'#CCC' }}>
                <div style={{ fontSize:44, marginBottom:10 }}>👋</div>
                <div style={{ fontSize:14, fontWeight:500, color:'#AAA' }}>Inicia la conversación con {getOtherName(activeConv)}</div>
              </div>
            )}
            {msgs.map((m, i) => {
              const isMe = m.fromId === currentUser?.id || m.fromId === 'demo_joel';
              const isSystem = m.isSystem || m.fromId === 'system';
              if (isSystem) return (
                <div key={m.id||i} style={{ textAlign:'center', padding:'4px 0' }}>
                  <span style={{ background:'#E8F5E9', color:'#2E7D32', fontSize:12, fontWeight:600, padding:'6px 16px', borderRadius:100, display:'inline-block' }}>{m.text}</span>
                </div>
              );
              return (
                <div key={m.id||i} style={{ display:'flex', justifyContent:isMe?'flex-end':'flex-start', alignItems:'flex-end', gap:8 }}>
                  {!isMe && <TAvatar name={m.fromName||'U'} color={m.fromColor||'#6DBE7E'} size={28} />}
                  <div style={{ maxWidth:'66%' }}>
                    {!isMe && <div style={{ fontSize:11, color:'#AAA', marginBottom:3, paddingLeft:4 }}>{m.fromName}</div>}
                    <div style={{ padding:'10px 15px', borderRadius:isMe?'18px 18px 4px 18px':'18px 18px 18px 4px', background:isMe?theme.primary:'#fff', color:isMe?'#fff':'#1C2B2B', fontSize:14, lineHeight:1.55, boxShadow:'0 1px 4px rgba(0,0,0,0.07)' }}>
                      {m.text}
                      <div style={{ fontSize:10, opacity:0.55, marginTop:3, textAlign:'right' }}>
                        {m.createdAt ? new Date(m.createdAt).toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'}) : ''}
                        {isMe && ' ✓✓'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} style={{ height:1 }} />
          </div>

          {/* Quick replies */}
          <div style={{ padding:'8px 22px 4px', background:'#F9FAF8', display:'flex', gap:6, flexWrap:'wrap', flexShrink:0 }}>
            {QUICK.map(q => (
              <button key={q} onClick={()=>{ setInput(q); inputRef.current?.focus(); }} style={{ padding:'5px 12px', background:'#fff', border:'1px solid '+theme.primary+'40', borderRadius:100, cursor:'pointer', fontFamily:'Poppins', fontSize:12, color:theme.primary, fontWeight:500 }}>{q}</button>
            ))}
          </div>

          {/* Input */}
          <div style={{ padding:'10px 22px 16px', background:'#F9FAF8', display:'flex', gap:10, alignItems:'center', flexShrink:0 }}>
            <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()} placeholder="Escribe un mensaje..." style={{ flex:1, padding:'12px 18px', border:'1.5px solid #EEE', borderRadius:100, fontFamily:'Poppins', fontSize:14, outline:'none', background:'#fff', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}
              onFocus={e=>e.target.style.borderColor=theme.primary} onBlur={e=>e.target.style.borderColor='#EEE'}
            />
            <button onClick={send} disabled={!input.trim()} style={{ width:44, height:44, borderRadius:'50%', background:input.trim()?theme.primary:'#DDD', border:'none', color:'#fff', fontSize:18, cursor:input.trim()?'pointer':'default', display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.2s', flexShrink:0 }}>↑</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── DASHBOARD ──────────────────────────────────────────────────
function DashboardPage({ currentUser, theme }) {
  const [allUsers, setAllUsers] = React.useState([]);
  const [allItems, setAllItems] = React.useState([]);
  React.useEffect(() => {
    const u = DB.get('users')||[]; setAllUsers(u);
    const unsub = ItemsService.getAll(items=>setAllItems(items));
    return unsub;
  }, []);

  const totalCO2 = allUsers.reduce((s,u)=>s+(u.co2||0), currentUser?.co2||0);
  const totalSwaps = allUsers.reduce((s,u)=>s+(u.swaps||0), currentUser?.swaps||0);
  const mySwaps = currentUser?.swaps||5;
  const myCO2 = currentUser?.co2||12.5;
  const sortedBySwaps = [...allUsers].sort((a,b)=>(b.swaps||0)-(a.swaps||0)).slice(0,7);
  const medals=['🥇','🥈','🥉'];
  const CO2Cat={ Libros:2.4, Tecnología:12.5, Ropa:5.0, Accesorios:3.5 };

  return (
    <div>
      <TTopBar title="Impacto Ambiental" subtitle="Tu contribución a la sostenibilidad USIL" theme={theme} />
      <div style={{ padding:'24px 32px' }}>
        <div style={{ background:`linear-gradient(135deg, ${theme.primary}, ${theme.primary}CC)`, borderRadius:24, padding:'28px 32px', marginBottom:24, color:'#fff', display:'flex', alignItems:'center', gap:32 }}>
          <div>
            <div style={{ fontSize:13, opacity:0.8, fontWeight:500, marginBottom:4 }}>MI IMPACTO PERSONAL</div>
            <div style={{ fontWeight:800, fontSize:42, letterSpacing:'-2px' }}>{myCO2} kg</div>
            <div style={{ fontSize:14, opacity:0.85 }}>de CO₂ ahorrado · {mySwaps} trueques</div>
          </div>
          <div style={{ marginLeft:'auto', textAlign:'center' }}>
            <div style={{ fontSize:60 }}>🌳</div>
            <div style={{ fontSize:12, opacity:0.75, marginTop:4 }}>≈ {(myCO2/21).toFixed(1)} árboles/año</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:16, marginBottom:28 }}>
          {[
            { icon:'♻️', val:totalSwaps||allItems.length, label:'Trueques USIL' },
            { icon:'🌿', val:`${(totalCO2||myCO2*4).toFixed(0)}kg`, label:'CO₂ ahorrado total', color:'#2E7D32' },
            { icon:'👥', val:Math.max(allUsers.length,1), label:'Usuarios activos' },
            { icon:'📦', val:allItems.length, label:'Artículos publicados', color:'#E65100' },
          ].map((s,i)=>(
            <div key={i} style={{ background:'#fff', borderRadius:20, padding:'20px 22px', border:'1px solid #EEE', flex:1 }}>
              <div style={{ fontSize:28, marginBottom:8 }}>{s.icon}</div>
              <div style={{ fontWeight:800, fontSize:30, color:s.color||theme.primary, letterSpacing:'-1px' }}>{s.val}</div>
              <div style={{ fontWeight:600, fontSize:13, color:'#1C2B2B', marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{ background:'#fff', borderRadius:24, overflow:'hidden', border:'1px solid #EEE', marginBottom:24 }}>
          <div style={{ padding:'20px 24px', borderBottom:'1px solid #EEE' }}>
            <div style={{ fontWeight:700, fontSize:17, color:'#1C2B2B' }}>🏆 Ranking de Sostenibilidad</div>
            <div style={{ fontSize:12, color:'#999', marginTop:2 }}>Usuarios con mayor impacto positivo · USIL</div>
          </div>
          {sortedBySwaps.length===0?(
            <div style={{ padding:'32px', textAlign:'center', color:'#AAA', fontSize:13 }}>Sé el primero en hacer trueques y aparecer aquí 🌿</div>
          ):sortedBySwaps.map((u,i)=>{
            const pct = (u.swaps||0)/Math.max(sortedBySwaps[0]?.swaps||1,1)*100;
            const isMe = u.id===currentUser?.id;
            return (
              <div key={u.id} style={{ padding:'16px 24px', borderBottom:i<sortedBySwaps.length-1?'1px solid #F5F5F5':'none', display:'flex', alignItems:'center', gap:14, background:isMe?`${theme.primary}08`:'#fff' }}>
                <div style={{ width:32, textAlign:'center', fontSize:i<3?22:14, fontWeight:700, color:i<3?'inherit':'#CCC' }}>{i<3?medals[i]:`#${i+1}`}</div>
                <TAvatar name={u.displayName||'U'} color={u.avatarColor} size={40} />
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontWeight:600, fontSize:14, color:'#1C2B2B' }}>{u.displayName}</span>
                    {isMe&&<span style={{ background:theme.primary, color:'#fff', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:100 }}>TÚ</span>}
                  </div>
                  <div style={{ fontSize:12, color:'#888' }}>{u.faculty||'USIL'} · {u.swaps||0} trueques</div>
                  <div style={{ marginTop:6, height:6, background:'#F0F0F0', borderRadius:100 }}>
                    <div style={{ height:'100%', width:`${pct}%`, background:i===0?'#F5A623':theme.primary, borderRadius:100 }} />
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontWeight:700, fontSize:15, color:theme.primary }}>{((u.swaps||0)*2.4).toFixed(1)}kg</div>
                  <div style={{ fontSize:11, color:'#AAA' }}>CO₂ ahorrado</div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ background:'#fff', borderRadius:24, padding:24, border:'1px solid #EEE' }}>
          <div style={{ fontWeight:700, fontSize:16, color:'#1C2B2B', marginBottom:16 }}>CO₂ estimado ahorrado por categoría</div>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            {Object.entries(CO2Cat).map(([cat,val])=>(
              <div key={cat} style={{ flex:1, minWidth:120, background:'#F4F6F0', borderRadius:16, padding:'16px 20px', textAlign:'center' }}>
                <div style={{ fontSize:28 }}>{categoryEmoji(cat)}</div>
                <div style={{ fontWeight:800, fontSize:20, color:theme.primary, marginTop:4 }}>{val} kg</div>
                <div style={{ fontSize:12, color:'#666' }}>{cat}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PROFILE PAGE ───────────────────────────────────────────────
function ProfilePage({ setPage, currentUser, theme, showToast }) {
  const [myItems, setMyItems] = React.useState([]);
  const [editMode, setEditMode] = React.useState(false);
  const [displayName, setDisplayName] = React.useState(currentUser?.displayName||'');
  const [avatarPhoto, setAvatarPhoto] = React.useState(null);
  const avatarRef = React.useRef(null);

  React.useEffect(() => {
    if(!currentUser) return;
    const unsub = ItemsService.getAll(items=>setMyItems(items.filter(i=>i.userId===currentUser.id)));
    return unsub;
  }, [currentUser]);

  const handleAvatarChange = e => {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => setAvatarPhoto(ev.target.result);
    reader.readAsDataURL(file);
  };

  const saveProfile = () => {
    const users = DB.get('users')||[];
    const idx = users.findIndex(u=>u.id===currentUser.id);
    if(idx>=0) {
      users[idx] = { ...users[idx], displayName, avatar:avatarPhoto||users[idx].avatar };
      DB.set('users', users);
      localStorage.setItem('talix_current_user', JSON.stringify(users[idx]));
    }
    setEditMode(false);
    showToast('¡Perfil actualizado!','success');
  };

  const historial = [
    { item:"Cálculo Larson", with:"Ana M.", date:"15 Abr", co2:2.4 },
    { item:"Auriculares Sony", with:"Carlos R.", date:"10 Abr", co2:8.0 },
  ];

  return (
    <div>
      <TTopBar title="Mi Perfil" subtitle="Tu actividad en TALIX" theme={theme}
        rightEl={
          <button onClick={()=>editMode?saveProfile():setEditMode(true)} style={{ background:editMode?theme.primary:'#F4F6F0', color:editMode?'#fff':'#555', border:'none', padding:'9px 18px', borderRadius:100, cursor:'pointer', fontFamily:'Poppins', fontWeight:600, fontSize:13, transition:'all 0.2s' }}>
            {editMode?'✓ Guardar cambios':'✏️ Editar perfil'}
          </button>
        }
      />
      <div style={{ padding:'32px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:24 }}>
          <div>
            <div style={{ background:'#fff', borderRadius:24, overflow:'hidden', border:'1px solid #EEE', marginBottom:16 }}>
              <div style={{ height:90, background:`linear-gradient(135deg, ${theme.primary}, ${theme.accent})` }} />
              <div style={{ padding:'0 24px 24px' }}>
                <div style={{ marginTop:-36, marginBottom:12, position:'relative', width:'fit-content' }}>
                  {avatarPhoto?<img src={avatarPhoto} alt="avatar" style={{ width:72, height:72, borderRadius:'50%', objectFit:'cover', border:'3px solid #fff' }} />:<TAvatar name={currentUser?.displayName||'U'} color={currentUser?.avatarColor} size={72} />}
                  {editMode&&<button onClick={()=>avatarRef.current?.click()} style={{ position:'absolute', bottom:0, right:0, width:24, height:24, borderRadius:'50%', background:theme.primary, border:'2px solid #fff', color:'#fff', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>📷</button>}
                  <input ref={avatarRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display:'none' }} />
                </div>
                {editMode?(
                  <input value={displayName} onChange={e=>setDisplayName(e.target.value)} style={{ fontWeight:700, fontSize:17, color:'#1C2B2B', border:'1.5px solid #EEE', borderRadius:8, padding:'6px 10px', fontFamily:'Poppins', width:'100%', boxSizing:'border-box', marginBottom:6 }} />
                ):(
                  <div style={{ fontWeight:700, fontSize:17, color:'#1C2B2B', display:'flex', alignItems:'center', gap:8 }}>
                    {currentUser?.displayName} <span style={{ background:'#E8F5E9', color:'#2E7D32', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:100 }}>✓ USIL</span>
                  </div>
                )}
                <div style={{ fontSize:13, color:'#888', marginBottom:12 }}>{currentUser?.faculty} · USIL</div>
                <div style={{ fontSize:12, color:'#AAA', marginBottom:4 }}>📧 {currentUser?.email}</div>
                <div style={{ fontSize:12, color:'#AAA', marginBottom:16 }}>📅 Miembro desde {currentUser?.joined}</div>
                <TButton onClick={()=>setPage('post')} theme={theme} style={{ width:'100%', padding:'10px 0', fontSize:13, textAlign:'center' }}>+ Publicar artículo</TButton>
              </div>
            </div>
            <div style={{ background:'#fff', borderRadius:24, padding:20, border:'1px solid #EEE' }}>
              <div style={{ fontWeight:700, fontSize:14, color:'#1C2B2B', marginBottom:14 }}>Estadísticas</div>
              {[
                { label:'Artículos publicados', val:myItems.length, icon:'📦' },
                { label:'Trueques completados', val:currentUser?.swaps||0, icon:'🔄' },
                { label:'CO₂ ahorrado', val:`${currentUser?.co2||0}kg`, icon:'🌿' },
              ].map(s=>(
                <div key={s.label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #F5F5F5' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}><span>{s.icon}</span><span style={{ fontSize:13, color:'#555' }}>{s.label}</span></div>
                  <span style={{ fontWeight:700, fontSize:14, color:theme.primary }}>{s.val}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:17, color:'#1C2B2B', marginBottom:14 }}>Mis artículos publicados ({myItems.length})</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:14, marginBottom:24 }}>
              {myItems.map(item=>(
                <TItemCard key={item.id} item={item} theme={theme} currentUserId={currentUser?.id} onClick={()=>{}} onUserClick={()=>{}} />
              ))}
              <div onClick={()=>setPage('post')} style={{ minHeight:240, border:'2px dashed #C8D8C8', borderRadius:20, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:'pointer', gap:8, transition:'all 0.15s' }}
                onMouseEnter={e=>{ e.currentTarget.style.borderColor=theme.primary; e.currentTarget.style.background=`${theme.primary}05`; }}
                onMouseLeave={e=>{ e.currentTarget.style.borderColor='#C8D8C8'; e.currentTarget.style.background='transparent'; }}
              >
                <span style={{ fontSize:36 }}>➕</span>
                <span style={{ fontSize:13, color:'#888', fontWeight:500 }}>Publicar artículo</span>
              </div>
            </div>
            <div style={{ background:'#fff', borderRadius:20, padding:20, border:'1px solid #EEE' }}>
              <div style={{ fontWeight:700, fontSize:15, color:'#1C2B2B', marginBottom:14 }}>Historial de trueques</div>
              {historial.map((h,i)=>(
                <div key={i} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 0', borderBottom:i<historial.length-1?'1px solid #F5F5F5':'none' }}>
                  <div style={{ width:40, height:40, borderRadius:12, background:'#E8F5E9', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🔄</div>
                  <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:600, color:'#1C2B2B' }}>{h.item}</div><div style={{ fontSize:12, color:'#888' }}>Con {h.with} · {h.date}</div></div>
                  <div style={{ textAlign:'right' }}><div style={{ fontSize:12, color:'#2E7D32', fontWeight:600 }}>-{h.co2}kg CO₂</div><div style={{ fontSize:11, color:'#AAA' }}>✅ Completado</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PUBLIC PROFILE ─────────────────────────────────────────────
function PublicProfilePage({ userId, setPage, currentUser, theme, showToast }) {
  const [user, setUser] = React.useState(null);
  const [items, setItems] = React.useState([]);
  React.useEffect(() => {
    const users = DB.get('users')||[];
    const found = users.find(u=>u.id===userId);
    setUser(found||null);
    const unsub = ItemsService.getAll(all=>setItems(all.filter(i=>i.userId===userId)));
    return unsub;
  }, [userId]);

  if(!user) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', color:'#AAA' }}><div style={{textAlign:'center'}}><div style={{fontSize:48}}>👤</div><div style={{marginTop:12}}>Usuario no encontrado</div></div></div>;

  const handleMessage = () => {
    const convId = ChatService.getConversationId(currentUser.id, user.id);
    ChatService.sendMessage(convId, currentUser, `Hola ${user.displayName}, me gustaría hacer un trueque contigo.`, [currentUser.id, user.id], 'General');
    setPage('chat');
    showToast('Conversación iniciada con '+user.displayName,'success');
  };

  return (
    <div>
      <TTopBar title="Perfil de usuario" theme={theme}
        rightEl={<button onClick={()=>setPage('feed')} style={{ background:'#F4F6F0', border:'none', padding:'8px 18px', borderRadius:100, cursor:'pointer', fontFamily:'Poppins', fontSize:13, fontWeight:600, color:'#555' }}>← Volver</button>}
      />
      <div style={{ padding:'32px', maxWidth:900 }}>
        <div style={{ background:'#fff', borderRadius:24, overflow:'hidden', border:'1px solid #EEE', marginBottom:24 }}>
          <div style={{ height:110, background:`linear-gradient(135deg, ${theme.primary}, ${theme.accent})` }} />
          <div style={{ padding:'0 32px 28px' }}>
            <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginTop:-36, marginBottom:12 }}>
              <TAvatar name={user.displayName||'U'} color={user.avatarColor} size={72} />
              {currentUser?.id!==user.id&&<TButton onClick={handleMessage} theme={theme} style={{ padding:'11px 24px' }}>💬 Enviar mensaje</TButton>}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
              <span style={{ fontWeight:800, fontSize:20, color:'#1C2B2B' }}>{user.displayName}</span>
              <span style={{ background:'#E8F5E9', color:'#2E7D32', fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:100 }}>✓ USIL Verificado</span>
            </div>
            <div style={{ fontSize:14, color:'#888', marginBottom:16 }}>{user.faculty} · USIL</div>
          </div>
          <div style={{ display:'flex', borderTop:'1px solid #EEE' }}>
            {[{val:user.swaps||0,label:'Trueques'},{val:`${user.co2||0}kg`,label:'CO₂ ahorrado'},{val:items.length,label:'Artículos'},{val:user.joined||'2025',label:'Miembro desde'}].map((s,i)=>(
              <div key={i} style={{ flex:1, padding:'18px 0', textAlign:'center', borderRight:i<3?'1px solid #EEE':'none' }}>
                <div style={{ fontWeight:800, fontSize:22, color:theme.primary }}>{s.val}</div>
                <div style={{ fontSize:12, color:'#999' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ fontWeight:700, fontSize:16, color:'#1C2B2B', marginBottom:14 }}>Artículos de {user.displayName}</div>
        {items.length===0?(
          <div style={{ background:'#fff', borderRadius:20, padding:'40px', textAlign:'center', border:'1px solid #EEE', color:'#AAA' }}>
            <div style={{ fontSize:40, marginBottom:8 }}>📦</div>
            <div style={{ fontSize:14 }}>Sin artículos publicados aún</div>
          </div>
        ):(
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:16 }}>
            {items.map(item=><TItemCard key={item.id} item={item} theme={theme} currentUserId={currentUser?.id} onClick={()=>{}} onUserClick={()=>{}} />)}
          </div>
        )}
      </div>
    </div>
  );
}

// ── ECO SPOTS MODAL ────────────────────────────────────────────
function EcoSpotsModal({ onClose, theme }) {
  const spots = [
    { name:'Biblioteca Central', icon:'📚', desc:'Piso 1, zona de estudio. Lun–Vie 8am–8pm', busy:'Alta' },
    { name:'Terraza USIL', icon:'🌿', desc:'Azotea Edificio A. Espacio abierto y seguro', busy:'Media' },
    { name:'Comedor Principal', icon:'🍽️', desc:'Horario almuerzo 12–2pm ideal para encuentros', busy:'Alta' },
    { name:'Edificio F – Lobby', icon:'🏢', desc:'Lobby principal, cámaras 24h', busy:'Baja' },
    { name:'Patio Central', icon:'☀️', desc:'Área verde central. Horario de recreo', busy:'Media' },
  ];
  const busyColor={ Alta:'#E53935', Media:'#F5A623', Baja:'#4CAF50' };
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:5000, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ background:'#fff', borderRadius:24, width:'100%', maxWidth:500, overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding:'24px 28px 16px', borderBottom:'1px solid #EEE', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div><div style={{ fontWeight:800, fontSize:18, color:'#1C2B2B' }}>📍 Eco-Spots USIL</div><div style={{ fontSize:12, color:'#888', marginTop:2 }}>Lugares seguros para tus trueques</div></div>
          <button onClick={onClose} style={{ background:'#F4F6F0', border:'none', width:36, height:36, borderRadius:'50%', cursor:'pointer', fontSize:16 }}>✕</button>
        </div>
        <div style={{ padding:'16px 28px 24px' }}>
          {spots.map((s,i)=>(
            <div key={i} style={{ display:'flex', gap:14, padding:'14px 0', borderBottom:i<spots.length-1?'1px solid #F5F5F5':'none', alignItems:'center' }}>
              <div style={{ width:44, height:44, borderRadius:14, background:'#F4F6F0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>{s.icon}</div>
              <div style={{ flex:1 }}><div style={{ fontWeight:600, fontSize:14, color:'#1C2B2B' }}>{s.name}</div><div style={{ fontSize:12, color:'#888', marginTop:2 }}>{s.desc}</div></div>
              <div style={{ textAlign:'right', flexShrink:0 }}><div style={{ fontSize:11, fontWeight:600, color:busyColor[s.busy] }}>● {s.busy}</div><div style={{ fontSize:10, color:'#BBB' }}>Concurrencia</div></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { LoginPage, TermsModal, FeedPage, ItemDetailPage, PostPage, ChatPage, DashboardPage, ProfilePage, PublicProfilePage, EcoSpotsModal });
