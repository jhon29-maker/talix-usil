const SPOTS = [
  { name: 'Biblioteca Central', icon: '📚', desc: 'Piso 1, zona de estudio. Lun–Vie 8am–8pm', busy: 'Alta' },
  { name: 'Terraza USIL', icon: '🌿', desc: 'Azotea Edificio A. Espacio abierto y seguro', busy: 'Media' },
  { name: 'Comedor Principal', icon: '🍽️', desc: 'Horario almuerzo 12–2pm ideal para encuentros', busy: 'Alta' },
  { name: 'Edificio F – Lobby', icon: '🏢', desc: 'Lobby principal, cámaras 24h', busy: 'Baja' },
  { name: 'Patio Central', icon: '☀️', desc: 'Área verde central. Horario de recreo', busy: 'Media' },
];

const BUSY_COLOR = { Alta: '#E53935', Media: '#F5A623', Baja: '#4CAF50' };

export default function EcoSpotsModal({ onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 500, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '24px 28px 16px', borderBottom: '1px solid #EEE', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: '#1C2B2B' }}>📍 Eco-Spots USIL</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Lugares seguros para tus trueques</div>
          </div>
          <button onClick={onClose} style={{ background: '#F4F6F0', border: 'none', width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        <div style={{ padding: '16px 28px 24px' }}>
          {SPOTS.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: i < SPOTS.length - 1 ? '1px solid #F5F5F5' : 'none', alignItems: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: '#F4F6F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{s.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1C2B2B' }}>{s.name}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{s.desc}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: BUSY_COLOR[s.busy] }}>● {s.busy}</div>
                <div style={{ fontSize: 10, color: '#BBB' }}>Concurrencia</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
