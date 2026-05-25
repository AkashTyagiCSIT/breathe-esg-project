import { useState, useEffect } from 'react';
import { getTenant } from '../api';

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: '▦' },
  { key: 'ingest', label: 'Ingest Data', icon: '↑' },
  { key: 'review', label: 'Review', icon: '◎' },
  { key: 'audit', label: 'Audit Log', icon: '≡' },
];

const S = {
  sidebar: {
    width: 220, background: 'var(--surface)', borderRight: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column', padding: '24px 0', flexShrink: 0,
    position: 'sticky', top: 0, height: '100vh',
  },
  logo: {
    padding: '0 20px 24px', borderBottom: '1px solid var(--border)', marginBottom: 16,
  },
  logoText: {
    fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600,
    color: 'var(--green)', letterSpacing: '0.08em',
  },
  logoSub: { fontSize: 10, color: 'var(--text-dim)', marginTop: 2 },
  navItem: (active) => ({
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px',
    cursor: 'pointer', fontSize: 13, fontWeight: active ? 500 : 400,
    color: active ? 'var(--text)' : 'var(--text-muted)',
    background: active ? 'var(--surface-2)' : 'transparent',
    borderLeft: `2px solid ${active ? 'var(--green)' : 'transparent'}`,
    transition: 'all 0.15s',
  }),
  icon: { fontSize: 14, width: 16, textAlign: 'center' },
  footer: {
    marginTop: 'auto', padding: '16px 20px', borderTop: '1px solid var(--border)',
  },
  tenant: { fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 },
  tenantName: { color: 'var(--text-muted)', fontWeight: 500 },
  logoutBtn: {
    background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)',
    padding: '6px 12px', borderRadius: 4, fontSize: 12, width: '100%', cursor: 'pointer',
  },
};

export default function Sidebar({ page, setPage, onLogout }) {
  const [tenant, setTenant] = useState(null);

  useEffect(() => {
    getTenant().then(r => setTenant(r.data)).catch(() => {});
  }, []);

  return (
    <div style={S.sidebar}>
      <div style={S.logo}>
        <div style={S.logoText}>BREATHE ESG</div>
        <div style={S.logoSub}>Emissions Intelligence</div>
      </div>
      <nav>
        {NAV.map(n => (
          <div key={n.key} style={S.navItem(page === n.key)} onClick={() => setPage(n.key)}>
            <span style={S.icon}>{n.icon}</span>
            {n.label}
          </div>
        ))}
      </nav>
      <div style={S.footer}>
        {tenant && (
          <div style={S.tenant}>
            Tenant: <span style={S.tenantName}>{tenant.name}</span>
          </div>
        )}
        <button style={S.logoutBtn} onClick={onLogout}>Sign out</button>
      </div>
    </div>
  );
}
