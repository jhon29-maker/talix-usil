import { useState, useRef } from 'react';
import { ItemsService } from '../services/items';
import { TTopBar, TInput, TButton } from '../components/ui';

const CO2_EST = { Libros: 2.4, Tecnología: 12.5, Ropa: 5.0, Accesorios: 3.5 };

export default function PostPage({ setPage, currentUser, theme, showToast }) {
  const [form, setForm] = useState({ title: '', cat: 'Libros', condition: 'Buen estado', want: '', desc: '' });
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);
  const co2Est = CO2_EST[form.cat] || 3;
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleFile = e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('La imagen debe pesar menos de 5MB', 'error'); return; }
    const reader = new FileReader();
    reader.onload = ev => setPhoto(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!form.title || !form.desc || !form.want) { showToast('Completa todos los campos obligatorios', 'error'); return; }
    setLoading(true);
    try {
      ItemsService.publish({ ...form, category: form.cat, photo }, currentUser);
      showToast('¡Artículo publicado exitosamente! 🎉', 'success');
      setTimeout(() => setPage('feed'), 1200);
    } catch (e) {
      showToast('Error al publicar: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <TTopBar title="Publicar artículo" subtitle="Da segunda vida a tus cosas" theme={theme} />
      <div style={{ padding: '32px', maxWidth: 760 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
          {/* Left: photo + category + condition */}
          <div>
            <div
              onClick={() => fileRef.current?.click()}
              style={{ height: 220, border: `2px dashed ${photo ? theme.primary : '#C8D8C8'}`, borderRadius: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F4F6F0', cursor: 'pointer', overflow: 'hidden', position: 'relative', transition: 'border-color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = theme.primary}
              onMouseLeave={e => { if (!photo) e.currentTarget.style.borderColor = '#C8D8C8'; }}
            >
              {photo ? (
                <>
                  <img src={photo} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0'}
                  >
                    <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>📷 Cambiar foto</span>
                  </div>
                </>
              ) : (
                <>
                  <span style={{ fontSize: 44, marginBottom: 8 }}>📷</span>
                  <span style={{ fontSize: 13, color: '#888', fontWeight: 600 }}>Subir foto del artículo</span>
                  <span style={{ fontSize: 11, color: '#BBB', marginTop: 4 }}>JPG, PNG — máx. 5MB</span>
                  <span style={{ fontSize: 12, color: theme.primary, marginTop: 8, fontWeight: 600 }}>Clic para seleccionar</span>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
            {photo && (
              <button onClick={() => setPhoto(null)} style={{ width: '100%', marginTop: 8, padding: '8px', background: '#FFEBEE', border: '1px solid #FFCDD2', borderRadius: 10, color: '#E53935', fontFamily: 'Poppins', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: 12 }}>
                🗑️ Quitar foto
              </button>
            )}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 6 }}>Categoría <span style={{ color: '#E53935' }}>*</span></label>
              <select value={form.cat} onChange={set('cat')} style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E8EDE8', borderRadius: 12, fontFamily: 'Poppins', fontSize: 14, background: '#FAFBFA', outline: 'none', boxSizing: 'border-box' }}>
                {['Libros', 'Tecnología', 'Ropa', 'Accesorios'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 6 }}>Estado <span style={{ color: '#E53935' }}>*</span></label>
              <select value={form.condition} onChange={set('condition')} style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E8EDE8', borderRadius: 12, fontFamily: 'Poppins', fontSize: 14, background: '#FAFBFA', outline: 'none', boxSizing: 'border-box' }}>
                {['Como nuevo', 'Buen estado', 'Regular'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Right: title + desc + want */}
          <div>
            <TInput label="Título del artículo" placeholder="Ej: Cálculo Larson 9na edición" value={form.title} onChange={set('title')} required theme={theme} />
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 6 }}>Descripción <span style={{ color: '#E53935' }}>*</span></label>
              <textarea
                value={form.desc}
                onChange={set('desc')}
                placeholder="Describe el estado, detalles relevantes, tiempo de uso..."
                rows={5}
                style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #E8EDE8', borderRadius: 12, fontFamily: 'Poppins', fontSize: 14, background: '#FAFBFA', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = theme.primary}
                onBlur={e => e.target.style.borderColor = '#E8EDE8'}
              />
            </div>
            <TInput label="¿Qué aceptas a cambio?" placeholder="Ej: Física 1, audífonos, ropa talla M" value={form.want} onChange={set('want')} icon="🔄" required theme={theme} />
            <div style={{ background: `${theme.primary}12`, borderRadius: 16, padding: '16px 20px', marginTop: 8 }}>
              <div style={{ fontWeight: 700, color: theme.primary, fontSize: 15 }}>🌿 Impacto estimado: -{co2Est}kg CO₂</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>vs. comprar nuevo de {form.cat.toLowerCase()}</div>
            </div>
          </div>
        </div>

        {!photo && (
          <div style={{ background: '#FFF8E1', border: '1px solid #FFE082', borderRadius: 12, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#F57F17' }}>
            💡 Los artículos con foto reciben 3× más propuestas
          </div>
        )}
        <TButton
          onClick={handleSubmit}
          theme={theme}
          style={{ padding: '14px 40px', fontSize: 15 }}
          disabled={loading || !form.title || !form.desc || !form.want}
        >
          {loading ? '⏳ Publicando...' : 'Publicar artículo'}
        </TButton>
      </div>
    </div>
  );
}
