import { useState } from 'react';
import { Auth } from '../services/auth';
import { TInput, TButton } from '../components/ui';
import { FACULTIES } from '../data/mockData';
import useIsMobile from '../hooks/useIsMobile';

export default function LoginPage({ onLogin, onAdminAccess, theme }) {
  const isMobile = useIsMobile();
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [name, setName] = useState('');
  const [faculty, setFaculty] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const [registered, setRegistered] = useState(false);

  const handle = async () => {
    setError('');
    if (!email || !pass) { setError('Completa todos los campos.'); return; }
    setLoading(true);
    try {
      if (tab === 'register') {
        if (!name) { setError('Ingresa tu nombre completo.'); setLoading(false); return; }
        if (!termsChecked) { setError('Debes aceptar los Términos y la Política de Privacidad para continuar.'); setLoading(false); return; }
        await Auth.register(email, pass, name, faculty || 'No especificada');
        setRegistered(true);
        setLoading(false);
        return;
      } else {
        await Auth.login(email, pass);
      }
      onLogin();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === 'Enter') handle(); };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: isMobile ? 'column' : 'row', background: '#F4F6F0', fontFamily: 'Poppins, sans-serif' }}>
      {/* Left panel — full hero on desktop, compact banner on mobile */}
      {isMobile ? (
        <div style={{ background: theme.primary, color: '#fff', padding: '28px 24px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ position: 'absolute', borderRadius: '50%', border: `2px solid rgba(255,255,255,${0.05 + i * 0.05})`, width: 160 + i * 120, height: 160 + i * 120, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
          ))}
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 40, marginBottom: 4 }}>♻️</div>
            <div style={{ fontWeight: 800, fontSize: 30, letterSpacing: '-1px' }}>TALIX</div>
            <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.5, marginTop: 4 }}>
              Trueque universitario sostenible · USIL
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, background: theme.primary, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, position: 'relative', overflow: 'hidden' }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ position: 'absolute', borderRadius: '50%', border: `2px solid rgba(255,255,255,${0.04 + i * 0.04})`, width: 200 + i * 160, height: 200 + i * 160, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
          ))}
          <div style={{ position: 'relative', textAlign: 'center', color: '#fff' }}>
            <div style={{ fontSize: 72, marginBottom: 16 }}>♻️</div>
            <div style={{ fontWeight: 800, fontSize: 48, letterSpacing: '-2px', marginBottom: 8 }}>TALIX</div>
            <div style={{ fontSize: 17, opacity: 0.85, maxWidth: 320, lineHeight: 1.6, fontWeight: 500 }}>
              Trueque universitario sostenible para la comunidad USIL
            </div>
            <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                ['🌿', 'Reduce tu huella de carbono'],
                ['📚', 'Da segunda vida a tus cosas'],
                ['🤝', 'Conecta con compañeros USIL'],
                ['📍', 'Coordina en Eco-Spots del campus'],
              ].map(([icon, text]) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.12)', padding: '12px 20px', borderRadius: 14 }}>
                  <span style={{ fontSize: 20 }}>{icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Right panel */}
      <div style={{ width: isMobile ? '100%' : 500, flex: isMobile ? 1 : 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '28px 22px 40px' : '48px 56px', background: '#fff', overflowY: 'auto', boxSizing: 'border-box' }}>
        {registered ? (
          <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
            <div style={{ fontSize: 72, marginBottom: 16 }}>🎉</div>
            <div style={{ fontWeight: 800, fontSize: 24, color: '#1C2B2B', marginBottom: 10 }}>¡Bienvenido a TALIX!</div>
            <div style={{ color: '#555', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
              Te hemos enviado un correo a <strong>{email}</strong> para verificar tu cuenta.<br />
              Revisa tu bandeja de entrada (y también spam).
            </div>
            <div style={{ background: '#F0F4FA', borderRadius: 16, padding: '20px 24px', marginBottom: 24, textAlign: 'left' }}>
              {[['♻️', 'Publica tus primeros artículos'], ['🤝', 'Conecta con compañeros USIL'], ['📍', 'Coordina trueques en Eco-Spots'], ['🌿', 'Reduce tu huella de carbono']].map(([icon, text]) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, fontSize: 13, color: '#444' }}>
                  <span style={{ fontSize: 18 }}>{icon}</span> {text}
                </div>
              ))}
            </div>
            <button onClick={onLogin} style={{ width: '100%', padding: '14px', background: theme.primary, color: '#fff', border: 'none', borderRadius: 14, fontFamily: 'Poppins', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
              Entrar a TALIX →
            </button>
          </div>
        ) : (
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div style={{ fontWeight: 800, fontSize: 26, color: '#1C2B2B', marginBottom: 6 }}>
            {tab === 'login' ? 'Bienvenido 👋' : 'Únete a TALIX 🎉'}
          </div>
          <div style={{ color: '#888', fontSize: 13, marginBottom: 24 }}>
            {tab === 'login' ? 'Ingresa con tu correo USIL o Gmail' : 'Crea tu cuenta universitaria'}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', background: '#F4F6F0', borderRadius: 12, padding: 4, marginBottom: 22 }}>
            {['login', 'register'].map(t => (
              <button key={t} onClick={() => { setTab(t); setError(''); setTermsChecked(false); }} style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'Poppins', fontWeight: 600, fontSize: 13, background: tab === t ? '#fff' : 'transparent', color: tab === t ? theme.primary : '#999', boxShadow: tab === t ? '0 1px 6px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}>
                {t === 'login' ? 'Iniciar sesión' : 'Registrarse'}
              </button>
            ))}
          </div>

          {tab === 'register' && (
            <>
              <TInput label="Nombre completo" placeholder="Ej: Joel Santiago Ferrer" icon="👤" value={name} onChange={e => setName(e.target.value)} required theme={theme} autoComplete="name" />
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 6 }}>Facultad <span style={{ color: '#E53935' }}>*</span></label>
                <select value={faculty} onChange={e => setFaculty(e.target.value)} style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #E8EDE8', borderRadius: 12, fontSize: 14, fontFamily: 'Poppins', outline: 'none', boxSizing: 'border-box', background: '#FAFBFA', color: faculty ? '#1C2B2B' : '#999' }}>
                  <option value="">Selecciona tu facultad...</option>
                  {FACULTIES.map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
            </>
          )}

          <TInput label="Correo electrónico" type="email" placeholder="tu.nombre@usil.edu.pe" icon="✉️" value={email} onChange={e => setEmail(e.target.value)} required theme={theme} autoComplete="email" />

          {/* Password with show/hide */}
          <div style={{ marginBottom: 4 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 6 }}>Contraseña <span style={{ color: '#E53935' }}>*</span></label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>🔒</span>
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                value={pass}
                onChange={e => setPass(e.target.value)}
                onKeyDown={handleKey}
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                style={{ width: '100%', padding: '12px 44px 12px 42px', border: '1.5px solid #E8EDE8', borderRadius: 12, fontSize: 14, fontFamily: 'Poppins, sans-serif', outline: 'none', boxSizing: 'border-box', background: '#FAFBFA', color: '#1C2B2B' }}
                onFocus={e => e.target.style.borderColor = theme.primary}
                onBlur={e => e.target.style.borderColor = '#E8EDE8'}
              />
              <button type="button" onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {tab === 'login' && (
            <div style={{ textAlign: 'right', marginBottom: 16, marginTop: 6 }}>
              <span style={{ fontSize: 12, color: theme.primary, cursor: 'pointer', fontWeight: 500 }}>¿Olvidaste tu contraseña?</span>
            </div>
          )}

          {error && (
            <div style={{ background: '#FFEBEE', border: '1px solid #FFCDD2', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#C62828' }}>
              ⚠️ {error}
            </div>
          )}

          {tab === 'register' && (
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: termsChecked ? '#F0FBF4' : '#F0F4FA', border: `1.5px solid ${termsChecked ? '#6DBE7E' : '#E0E6E0'}`, borderRadius: 12, padding: '12px 14px', marginBottom: 14, cursor: 'pointer', transition: 'all 0.2s' }}>
              <input
                type="checkbox"
                checked={termsChecked}
                onChange={e => setTermsChecked(e.target.checked)}
                style={{ marginTop: 2, accentColor: theme.primary, width: 16, height: 16, flexShrink: 0 }}
              />
              <span style={{ fontSize: 12, color: '#444', lineHeight: 1.6 }}>
                He leído y acepto el{' '}
                <span style={{ color: theme.primary, fontWeight: 600 }}>Contrato de Comunidad</span>
                {' '}y la{' '}
                <span style={{ color: theme.primary, fontWeight: 600 }}>Política de Privacidad</span>
                {' '}de TALIX, incluyendo el tratamiento de mis datos personales con fines de funcionamiento de la plataforma.
                {termsChecked && <span style={{ color: '#2E7D32', fontWeight: 600 }}> ✓ Aceptado</span>}
              </span>
            </label>
          )}

          <TButton onClick={handle} theme={theme} style={{ width: '100%', opacity: (tab === 'register' && !termsChecked) ? 0.5 : 1 }} disabled={loading || (tab === 'register' && !termsChecked)} type="button">
            {loading ? '⏳ Procesando...' : tab === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </TButton>

          {/* Admin access */}
          <div style={{ marginTop: 20, padding: '14px 18px', background: '#F4F6F0', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#555' }}>¿Eres administrador?</div>
              <div style={{ fontSize: 11, color: '#AAA' }}>Panel de control TALIX</div>
            </div>
            <button onClick={onAdminAccess} style={{ padding: '8px 16px', background: '#1C2B2B', border: 'none', borderRadius: 100, color: '#F5A623', fontFamily: 'Poppins', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
              🔐 Admin
            </button>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
