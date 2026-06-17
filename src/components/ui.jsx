import { useState, useEffect } from 'react';
import { ItemsService } from '../services/items';
import { NotificationsService } from '../services/notifications';
import useIsMobile from '../hooks/useIsMobile';

export function categoryEmoji(cat) {
  return { Libros: '📚', Tecnología: '💻', Ropa: '👕', Accesorios: '🎒' }[cat] || '📦';
}

export function TAvatar({ name, color, size = 36, photo }) {
  if (photo) return (
    <img src={photo} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  );
  const initials = (name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color || '#1A7A50', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: size * 0.36, flexShrink: 0, fontFamily: 'Poppins, sans-serif', letterSpacing: '-0.5px' }}>
      {initials}
    </div>
  );
}

export function TCategoryBadge({ category }) {
  const map = { Libros: { bg: '#E8F5E9', color: '#2E7D32' }, Tecnología: { bg: '#E3F2FD', color: '#1565C0' }, Ropa: { bg: '#FFF3E0', color: '#E65100' }, Accesorios: { bg: '#ECEFF1', color: '#37474F' } };
  const s = map[category] || { bg: '#F5F5F5', color: '#555' };
  return <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 600 }}>{category}</span>;
}

export function TConditionDot({ condition }) {
  const map = { 'Como nuevo': '#4CAF50', 'Buen estado': '#8BC34A', 'Regular': '#FFC107' };
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#666' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: map[condition] || '#ccc', display: 'inline-block' }} />
      {condition}
    </span>
  );
}

export function TItemCard({ item, onClick, onUserClick, theme, currentUserId }) {
  const [liked, setLiked] = useState((item.likes || []).includes(currentUserId));
  const likeCount = (item.likes || []).length;

  const handleLike = (e) => {
    e.stopPropagation();
    setLiked(l => !l);
    ItemsService.toggleLike(item.id, currentUserId);
  };

  return (
    <div
      onClick={onClick}
      style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', cursor: 'pointer', transition: 'transform 0.18s, box-shadow 0.18s', border: '1px solid rgba(0,0,0,0.05)' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)'; }}
    >
      <div style={{ height: 148, background: item.bgColor || '#F4F6F0', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        {item.photo
          ? <img src={item.photo} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: 52 }}>{categoryEmoji(item.category)}</span>
        }
        <button onClick={handleLike} style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(255,255,255,0.92)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, gap: 2 }}>
          {liked ? '❤️' : '🤍'} {likeCount > 0 && <span style={{ fontSize: 10, color: '#888' }}>{likeCount}</span>}
        </button>
        <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(255,255,255,0.92)', borderRadius: 100, padding: '2px 8px', fontSize: 11, fontWeight: 600, color: '#1A7A50' }}>🌿 -{item.co2}kg CO₂</div>
      </div>
      <div style={{ padding: '12px 14px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <TCategoryBadge category={item.category} />
          <TConditionDot condition={item.condition} />
        </div>
        <div style={{ fontWeight: 600, fontSize: 13.5, color: '#1C2B2B', marginBottom: 4, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.title}</div>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>Quiere: <span style={{ color: '#555', fontStyle: 'italic' }}>{item.want}</span></div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div onClick={e => { e.stopPropagation(); onUserClick && onUserClick(item.userId); }} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <TAvatar name={item.user} color={item.avatarColor} size={24} />
            <span style={{ fontSize: 12, color: '#666' }}>{item.user}</span>
          </div>
          <span style={{ fontSize: 11, color: '#aaa' }}>{item.posted || 'reciente'}</span>
        </div>
      </div>
    </div>
  );
}

export function TTopBar({ title, subtitle, theme, rightEl }) {
  const isMobile = useIsMobile();
  return (
    <div style={{ minHeight: isMobile ? 58 : 68, background: '#fff', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: isMobile ? '8px 16px' : '0 32px', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: isMobile ? 16 : 18, color: '#1C2B2B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        {subtitle && <div style={{ fontSize: isMobile ? 11 : 12, color: '#999', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtitle}</div>}
      </div>
      {rightEl && <div style={{ flexShrink: 0 }}>{rightEl}</div>}
    </div>
  );
}

export function TInput({ label, type = 'text', placeholder, value, onChange, icon, required, autoComplete }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 6 }}>{label}{required && <span style={{ color: '#E53935' }}> *</span>}</label>}
      <div style={{ position: 'relative' }}>
        {icon && <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>{icon}</span>}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          autoComplete={autoComplete}
          style={{ width: '100%', padding: icon ? '12px 16px 12px 42px' : '12px 16px', border: '1.5px solid #E8EDE8', borderRadius: 12, fontSize: 14, fontFamily: 'Poppins, sans-serif', outline: 'none', boxSizing: 'border-box', background: '#FAFBFA', color: '#1C2B2B', transition: 'border-color 0.15s' }}
          onFocus={e => e.target.style.borderColor = theme?.primary || '#1A7A50'}
          onBlur={e => e.target.style.borderColor = '#E8EDE8'}
        />
      </div>
    </div>
  );
}

export function TButton({ children, onClick, variant = 'primary', theme, style: extra, disabled, type = 'button' }) {
  const styles = {
    primary: { background: theme?.primary || '#1A7A50', color: '#fff' },
    accent: { background: theme?.accent || '#F5A623', color: '#fff' },
    outline: { background: 'transparent', color: theme?.primary || '#1A7A50', border: `2px solid ${theme?.primary || '#1A7A50'}` },
    ghost: { background: 'rgba(0,0,0,0.05)', color: '#444' },
    danger: { background: '#FFEBEE', color: '#E53935', border: '1px solid #FFCDD2' },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{ padding: '12px 24px', borderRadius: 100, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: 14, transition: 'opacity 0.15s, transform 0.15s', opacity: disabled ? 0.5 : 1, ...styles[variant], ...extra }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'scale(1.02)'; } }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)'; }}
    >
      {children}
    </button>
  );
}

export function TModal({ title, onClose, children, width = 480 }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backdropFilter: 'blur(3px)' }}>
      <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: width, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
        <div style={{ padding: '22px 28px 16px', borderBottom: '1px solid #EEE', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 17, color: '#1C2B2B' }}>{title}</div>
          <button onClick={onClose} style={{ background: '#F4F6F0', border: 'none', width: 34, height: 34, borderRadius: '50%', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', padding: '20px 28px 24px' }}>{children}</div>
      </div>
    </div>
  );
}

export function TToast({ message, type = 'success', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  const colors = {
    success: { bg: '#E8F5E9', border: '#4CAF50', color: '#2E7D32', icon: '✅' },
    error: { bg: '#FFEBEE', border: '#E53935', color: '#C62828', icon: '❌' },
    info: { bg: '#E3F2FD', border: '#1565C0', color: '#1565C0', icon: 'ℹ️' },
  };
  const c = colors[type] || colors.success;
  return (
    <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', background: c.bg, border: `1.5px solid ${c.border}`, borderRadius: 16, padding: '12px 20px', zIndex: 9000, display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', fontFamily: 'Poppins', minWidth: 280, maxWidth: 400 }}>
      <span style={{ fontSize: 18 }}>{c.icon}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: c.color }}>{message}</span>
    </div>
  );
}

export function NotificationBell({ userId, theme }) {
  const [notifs, setNotifs] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;
    return NotificationsService.subscribe(userId, setNotifs);
  }, [userId]);

  const unread = notifs.filter(n => !n.read).length;

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => { setOpen(!open); if (!open) NotificationsService.markRead(userId); }}
        style={{ background: '#F4F6F0', border: 'none', width: 40, height: 40, borderRadius: '50%', cursor: 'pointer', fontSize: 18, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        🔔
        {unread > 0 && <span style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, background: '#E53935', borderRadius: '50%', color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>{unread}</span>}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 48, right: 0, width: 320, background: '#fff', borderRadius: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', border: '1px solid #EEE', zIndex: 200, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #EEE', fontWeight: 700, fontSize: 14, color: '#1C2B2B' }}>Notificaciones</div>
          {notifs.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#AAA', fontSize: 13 }}>Sin notificaciones aún</div>
          ) : notifs.slice(0, 8).map((n, i) => (
            <div key={n.id || i} style={{ padding: '12px 18px', borderBottom: '1px solid #F5F5F5', display: 'flex', gap: 10, alignItems: 'flex-start', background: !n.read ? `${theme.primary}06` : '#fff' }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{n.icon || '🔔'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#333', lineHeight: 1.4 }}>{n.text}</div>
                <div style={{ fontSize: 11, color: '#AAA', marginTop: 2 }}>{n.time || 'reciente'}</div>
              </div>
              {!n.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: theme.primary, flexShrink: 0, marginTop: 4 }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
