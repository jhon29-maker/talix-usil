import { AdminService } from './admin';

export const PDFReportService = {
  generateAdminReport: () => {
    const stats = AdminService.getStats();
    const now = new Date().toLocaleDateString('es', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Reporte TALIX — ${now}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Poppins, sans-serif; color: #1C2B2B; background: #fff; padding: 40px; }
  .header { display:flex; align-items:center; justify-content:space-between; border-bottom: 3px solid #1B4FBE; padding-bottom: 24px; margin-bottom: 32px; }
  .logo { font-size: 32px; font-weight: 800; color: #1B4FBE; letter-spacing: -1px; }
  .logo span { color: #F5A623; }
  h2 { font-size: 18px; font-weight: 700; color: #1B4FBE; margin: 28px 0 14px; border-left: 4px solid #1B4FBE; padding-left: 12px; }
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
  .stat-card { background: #F0F4FA; border-radius: 16px; padding: 20px; text-align: center; }
  .stat-val { font-size: 28px; font-weight: 800; color: #1B4FBE; }
  .stat-label { font-size: 12px; color: #888; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 28px; }
  th { background: #1B4FBE; color: #fff; padding: 10px 14px; text-align: left; font-weight: 600; }
  td { padding: 10px 14px; border-bottom: 1px solid #EEE; }
  tr:nth-child(even) td { background: #F8F9FF; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 100px; font-size: 11px; font-weight: 600; }
  .badge-activo { background: #E8F5E9; color: #2E7D32; }
  .badge-baneado { background: #FFEBEE; color: #E53935; }
  .co2-banner { background: linear-gradient(135deg, #1A7A50, #2E7D32); color: #fff; border-radius: 20px; padding: 28px 32px; margin-bottom: 28px; display: flex; align-items: center; justify-content: space-between; }
  .co2-val { font-size: 48px; font-weight: 800; }
  .footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #EEE; display: flex; justify-content: space-between; font-size: 12px; color: #AAA; }
  .section-info { background: #F8F9FF; border-radius: 14px; padding: 16px 20px; margin-bottom: 20px; font-size: 13px; color: #555; line-height: 1.7; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">TALIX <span>USIL</span></div>
      <div style="font-size:13px;color:#888;margin-top:4px;">Plataforma de Trueque Universitario Sostenible</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:16px;font-weight:700;color:#1C2B2B;">REPORTE ADMINISTRATIVO</div>
      <div style="font-size:13px;color:#888;">Generado: ${now}</div>
    </div>
  </div>

  <div class="co2-banner">
    <div>
      <div style="font-size:12px;opacity:0.7;font-weight:600;letter-spacing:1px;margin-bottom:6px;">IMPACTO AMBIENTAL TOTAL</div>
      <div class="co2-val">${stats.totalCO2} kg</div>
      <div style="font-size:14px;opacity:0.85;margin-top:4px;">de CO₂ ahorrado por la comunidad USIL</div>
      <div style="font-size:12px;opacity:0.7;margin-top:8px;">≈ ${(parseFloat(stats.totalCO2) / 21).toFixed(1)} árboles/año · ${(parseFloat(stats.totalCO2) * 4).toFixed(0)} km no recorridos</div>
    </div>
    <div style="font-size:72px;">🌍</div>
  </div>

  <h2>📊 Resumen General</h2>
  <div class="stats-grid">
    <div class="stat-card"><div style="font-size:28px;margin-bottom:8px;">👥</div><div class="stat-val">${stats.users.length}</div><div class="stat-label">Usuarios registrados</div></div>
    <div class="stat-card"><div style="font-size:28px;margin-bottom:8px;">🔄</div><div class="stat-val">${stats.totalSwaps}</div><div class="stat-label">Trueques completados</div></div>
    <div class="stat-card"><div style="font-size:28px;margin-bottom:8px;">📦</div><div class="stat-val">${stats.items.length}</div><div class="stat-label">Artículos publicados</div></div>
    <div class="stat-card"><div style="font-size:28px;margin-bottom:8px;">💬</div><div class="stat-val">${stats.convos.length}</div><div class="stat-label">Conversaciones activas</div></div>
  </div>

  <h2>👥 Usuarios Registrados (${stats.users.length})</h2>
  <div class="section-info">Lista completa de usuarios registrados en la plataforma TALIX.</div>
  <table>
    <thead><tr><th>#</th><th>Nombre</th><th>Correo</th><th>Facultad</th><th>Trueques</th><th>CO₂ ahorrado</th><th>Estado</th></tr></thead>
    <tbody>
      ${stats.users.map((u, i) => `
        <tr>
          <td>${i + 1}</td>
          <td><strong>${u.displayName || '—'}</strong></td>
          <td style="font-family:monospace;font-size:12px;">${u.email || '—'}</td>
          <td>${u.faculty || '—'}</td>
          <td><strong style="color:#1B4FBE;">${u.swaps || 0}</strong></td>
          <td><strong style="color:#2E7D32;">${((u.swaps || 0) * 2.4).toFixed(1)} kg</strong></td>
          <td><span class="badge badge-${u.status || 'activo'}">${u.status || 'activo'}</span></td>
        </tr>
      `).join('')}
      ${stats.users.length === 0 ? '<tr><td colspan="7" style="text-align:center;color:#AAA;padding:24px;">Sin usuarios registrados aún</td></tr>' : ''}
    </tbody>
  </table>

  <h2>📦 Artículos Publicados (${stats.items.length})</h2>
  <table>
    <thead><tr><th>#</th><th>Título</th><th>Categoría</th><th>Estado</th><th>Publicado por</th><th>CO₂ estimado</th><th>Propuestas</th></tr></thead>
    <tbody>
      ${stats.items.map((item, i) => `
        <tr>
          <td>${i + 1}</td>
          <td><strong>${item.title || '—'}</strong></td>
          <td>${item.category || '—'}</td>
          <td>${item.condition || '—'}</td>
          <td>${item.user || '—'}</td>
          <td><strong style="color:#2E7D32;">${item.co2 || 0} kg</strong></td>
          <td>${(item.proposals || []).length}</td>
        </tr>
      `).join('')}
      ${stats.items.length === 0 ? '<tr><td colspan="7" style="text-align:center;color:#AAA;padding:24px;">Sin artículos aún</td></tr>' : ''}
    </tbody>
  </table>

  <h2>📧 Correos Registrados</h2>
  <div class="section-info" style="font-family:monospace;font-size:12px;word-break:break-all;">
    ${AdminService.getEmailList().join(' · ') || 'Sin correos registrados aún'}
  </div>

  <h2>🎓 Distribución por Facultad</h2>
  <table>
    <thead><tr><th>Facultad</th><th>Usuarios</th><th>% del total</th></tr></thead>
    <tbody>
      ${Object.entries(
        stats.users.reduce((acc, u) => {
          const f = u.faculty || 'No especificada';
          acc[f] = (acc[f] || 0) + 1;
          return acc;
        }, {})
      ).sort((a, b) => b[1] - a[1]).map(([f, count]) => `
        <tr><td>${f}</td><td><strong>${count}</strong></td><td>${stats.users.length ? ((count / stats.users.length) * 100).toFixed(1) : '0'}%</td></tr>
      `).join('')}
      ${stats.users.length === 0 ? '<tr><td colspan="3" style="text-align:center;color:#AAA;">Sin datos</td></tr>' : ''}
    </tbody>
  </table>

  <div class="footer">
    <div>TALIX · Plataforma de Trueque Universitario · Universidad San Ignacio de Loyola</div>
    <div>Reporte generado automáticamente · ${now}</div>
  </div>
</body>
</html>`;
  },

  openPDF: () => {
    const html = PDFReportService.generateAdminReport();
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 800);
    }
  },
};
