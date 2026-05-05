import { useState } from 'react';

const ADMIN_EMAIL = 'admin@talix.usil.edu.pe';
const ADMIN_PASSWORD = 'admin2025';

export default function AdminLoginPage({ onAdminLogin, onBack }) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = () => {
    setError('');
    if (email === ADMIN_EMAIL && pass === ADMIN_PASSWORD) {
      setLoading(true);
      setTimeout(() => { setLoading(false); onAdminLogin(); }, 900);
    } else {
      setError('Credenciales incorrectas.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0F1923', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Poppins, sans-serif' }}>
      <div style={{ width: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontWeight: 800, fontSize: 36, color: '#fff', letterSpacing: '-1px' }}>TALIX <span style={{ color: '#F5A623' }}>Admin</span></div>
          <div style={{ fontSize: 13, color: '#444', marginTop: 6 }}>Panel de control · Universidad San Ignacio de Loyola</div>
        </div>
        <div style={{ background: '#1A2332', borderRadius: 24, padding: '32px 36px', border: '1px solid #2A3444' }}>
          <div style={{ fontWeight: 700, fontSize: 18, color: '#fff', marginBottom: 20 }}>🔐 Acceso Administrador</div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Correo admin</label>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@talix.usil.edu.pe"
              type="email"
              style={{ width: '100%', padding: '12px 16px', background: '#0F1923', border: '1.5px solid #2A3444', borderRadius: 12, color: '#fff', fontFamily: 'Poppins', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = '#F5A623'}
              onBlur={e => e.target.style.borderColor = '#2A3444'}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contraseña</label>
            <input
              value={pass}
              onChange={e => setPass(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handle()}
              placeholder="••••••••"
              type="password"
              style={{ width: '100%', padding: '12px 16px', background: '#0F1923', border: '1.5px solid #2A3444', borderRadius: 12, color: '#fff', fontFamily: 'Poppins', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = '#F5A623'}
              onBlur={e => e.target.style.borderColor = '#2A3444'}
            />
          </div>
          {error && (
            <div style={{ background: '#2D1515', border: '1px solid #5C2020', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#FF7070' }}>
              ⚠️ {error}
            </div>
          )}
          <button
            onClick={handle}
            disabled={loading}
            style={{ width: '100%', padding: 13, borderRadius: 100, border: 'none', background: '#F5A623', color: '#1C2B2B', fontFamily: 'Poppins', fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? '⏳ Verificando...' : 'Ingresar al panel'}
          </button>
          <div style={{ textAlign: 'center', marginTop: 18 }}>
            <span onClick={onBack} style={{ fontSize: 13, color: '#555', cursor: 'pointer' }}
              onMouseEnter={e => e.target.style.color = '#888'}
              onMouseLeave={e => e.target.style.color = '#555'}
            >
              ← Volver al acceso de alumnos
            </span>
          </div>
          <div style={{ marginTop: 22, padding: '12px', background: '#0F1923', borderRadius: 12, border: '1px dashed #2A3444' }}>
            <div style={{ fontSize: 11, color: '#333', marginBottom: 3, fontWeight: 600 }}>CREDENCIALES DE DEMO</div>
            <div style={{ fontSize: 12, color: '#445', fontFamily: 'monospace' }}>admin@talix.usil.edu.pe</div>
            <div style={{ fontSize: 12, color: '#445', fontFamily: 'monospace' }}>admin2025</div>
          </div>
        </div>
      </div>
    </div>
  );
}
