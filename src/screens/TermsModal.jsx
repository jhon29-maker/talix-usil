import { useState, useRef } from 'react';

const SECTIONS = [
  { title: 'Acceso y Autenticidad Estudiantil', text: 'Para formar parte de TALIX es indispensable ser estudiante vigente de la comunidad universitaria USIL. El acceso se valida mediante correo institucional o Gmail. Al registrarte, te comprometes a mantener una identidad real y transparente.' },
  { title: 'Naturaleza del Intercambio', text: 'TALIX funciona bajo economía circular pura — el dinero no tiene lugar. Queda prohibida la compra, venta o transacción monetaria. Cada usuario debe describir con honestidad el estado real de sus pertenencias.' },
  { title: 'Seguridad en Eco-Spots', text: 'Todos los intercambios físicos deben coordinarse en Eco-Spots del campus: Biblioteca, Cafetería, Terraza o Edificio F. TALIX actúa como puente digital; el encuentro es responsabilidad de los estudiantes.' },
  { title: 'Privacidad y Datos Personales', text: 'Recopilamos únicamente los datos necesarios para el funcionamiento del servicio (nombre, correo y facultad). Estos datos están protegidos y solo se comparten con la contraparte al iniciar una negociación formal. No vendemos ni compartimos datos con terceros fuera del entorno USIL. Tienes derecho a solicitar la eliminación de tu cuenta y datos en cualquier momento.' },
  { title: 'Consentimiento de Uso de Datos', text: 'Al registrarte, otorgas consentimiento expreso para que TALIX almacene y procese tu información con fines de funcionamiento de la plataforma, generación de estadísticas de sostenibilidad (anonimizadas), y comunicaciones relacionadas al servicio. Puedes revocar este consentimiento eliminando tu cuenta.' },
  { title: 'Sostenibilidad y Compromiso Ambiental', text: 'Al participar en TALIX, contribuyes activamente a reducir residuos y consumo. Cada trueque disminuye la huella de carbono de nuestra comunidad universitaria.' },
  { title: 'Conducta y Sanciones', text: 'Rechazamos contenido que promueva violencia o discriminación. El incumplimiento de normas resultará en baja inmediata de la comunidad TALIX para proteger la integridad del ecosistema.' },
];

export default function TermsModal({ onAccept }) {
  const [scrolled, setScrolled] = useState(false);
  const [checked, setChecked] = useState(false);
  const [checkedData, setCheckedData] = useState(false);
  const bodyRef = useRef(null);

  const handleScroll = () => {
    const el = bodyRef.current;
    if (el && el.scrollTop + el.clientHeight >= el.scrollHeight - 40) setScrolled(true);
  };

  const canAccept = checked && checkedData;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 600, maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        <div style={{ padding: '28px 32px 20px', borderBottom: '1px solid #EEE' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <span style={{ fontSize: 28 }}>♻️</span>
            <span style={{ fontWeight: 800, fontSize: 18, color: '#1C2B2B' }}>CONTRATO DE COMUNIDAD TALIX</span>
          </div>
          <div style={{ fontSize: 13, color: '#888' }}>Lee el contrato completo antes de unirte. Tu privacidad importa.</div>
        </div>
        <div ref={bodyRef} onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
          {SECTIONS.map((s, i) => (
            <div key={i} style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1C2B2B', marginBottom: 6 }}>{i + 1}. {s.title}</div>
              <div style={{ fontSize: 13, color: '#555', lineHeight: 1.75 }}>{s.text}</div>
            </div>
          ))}
          {!scrolled && (
            <div style={{ textAlign: 'center', padding: '8px 0', color: '#BBB', fontSize: 12 }}>↓ Desplázate para continuar</div>
          )}
        </div>
        <div style={{ padding: '20px 32px 24px', borderTop: '1px solid #EEE', background: '#FAFAFA' }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', marginBottom: 12 }}>
            <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} style={{ marginTop: 2, width: 16, height: 16, accentColor: '#1A7A50', cursor: 'pointer', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>
              He leído y acepto el Contrato de Comunidad, los Términos de Uso y la Política de Privacidad de TALIX · USIL.
            </span>
          </label>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', marginBottom: 18 }}>
            <input type="checkbox" checked={checkedData} onChange={e => setCheckedData(e.target.checked)} style={{ marginTop: 2, width: 16, height: 16, accentColor: '#1A7A50', cursor: 'pointer', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>
              Consiento el tratamiento de mis datos personales (nombre, correo, facultad) para el funcionamiento de la plataforma, conforme a la Política de Privacidad.
            </span>
          </label>
          <button
            onClick={() => canAccept && onAccept()}
            disabled={!canAccept}
            style={{ width: '100%', padding: 14, borderRadius: 100, border: 'none', background: canAccept ? '#1A7A50' : '#C8D8C8', color: '#fff', fontFamily: 'Poppins', fontWeight: 700, fontSize: 15, cursor: canAccept ? 'pointer' : 'not-allowed', transition: 'all 0.2s', boxShadow: canAccept ? '0 4px 16px rgba(26,122,80,0.35)' : 'none' }}
          >
            {canAccept ? 'ACEPTAR Y ENTRAR A TALIX ✓' : 'Acepta los términos para continuar'}
          </button>
        </div>
      </div>
    </div>
  );
}
