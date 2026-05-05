import { THEMES } from '../config/themes';

export default function TweaksPanel({ tweaks, setTweaks, visible }) {
  if (!visible) return null;
  const theme = THEMES[tweaks.theme] || THEMES.azul;
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, background: '#fff', borderRadius: 20, padding: 24, width: 260, boxShadow: '0 8px 40px rgba(0,0,0,0.18)', border: '1px solid #EEE', fontFamily: 'Poppins, sans-serif' }}>
      <div style={{ fontWeight: 700, fontSize: 15, color: '#1C2B2B', marginBottom: 18 }}>🎨 Tweaks</div>
      <div style={{ marginBottom: 18 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: '#999', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Color del tema</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {Object.entries(THEMES).map(([key, t]) => (
            <button key={key} onClick={() => setTweaks(tw => ({ ...tw, theme: key }))} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', border: `2px solid ${tweaks.theme === key ? t.primary : '#EEE'}`, borderRadius: 12, background: tweaks.theme === key ? `${t.primary}10` : '#FAFAFA', cursor: 'pointer', fontFamily: 'Poppins', fontWeight: 600, fontSize: 13, color: tweaks.theme === key ? t.primary : '#666', transition: 'all 0.15s' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: t.primary }} />{t.name}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label style={{ fontSize: 11, fontWeight: 600, color: '#999', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Densidad</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {['compacto', 'normal', 'espacioso'].map(d => (
            <button key={d} onClick={() => setTweaks(tw => ({ ...tw, density: d }))} style={{ flex: 1, padding: '8px 4px', border: `2px solid ${tweaks.density === d ? theme.primary : '#EEE'}`, borderRadius: 10, background: tweaks.density === d ? `${theme.primary}12` : '#FAFAFA', cursor: 'pointer', fontFamily: 'Poppins', fontWeight: 600, fontSize: 11, color: tweaks.density === d ? theme.primary : '#888', transition: 'all 0.15s', textTransform: 'capitalize' }}>{d}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
