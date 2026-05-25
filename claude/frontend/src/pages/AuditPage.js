import { useState, useEffect } from 'react';
import { getAuditLog } from '../api';

const S = {
  page: { padding: 32 },
  title: { fontSize: 20, fontWeight: 600, marginBottom: 4 },
  sub: { fontSize: 12, color: 'var(--text-dim)', marginBottom: 24 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: {
    padding: '10px 12px', textAlign: 'left', fontWeight: 500,
    color: 'var(--text-dim)', fontSize: 10, letterSpacing: '0.05em',
    borderBottom: '1px solid var(--border)',
  },
  td: { padding: '10px 12px', borderBottom: '1px solid var(--border)', verticalAlign: 'top' },
  actionBadge: (action) => {
    const colors = {
      approved: 'var(--green)', rejected: 'var(--red)', flagged: 'var(--blue)',
      created: 'var(--text-muted)', ingestion_completed: 'var(--scope3)',
      ingestion_started: 'var(--text-dim)', locked: 'var(--scope1)',
    };
    const c = colors[action] || 'var(--text-muted)';
    return {
      display: 'inline-block', fontSize: 10, fontWeight: 600, color: c,
      background: `${c}22`, padding: '2px 8px', borderRadius: 10,
    };
  },
  pre: {
    fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)',
    background: 'var(--surface-2)', padding: '4px 8px', borderRadius: 3,
    maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
};

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAuditLog().then(r => setLogs(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div style={S.page}>
      <div style={S.title}>Audit Log</div>
      <div style={S.sub}>Immutable record of all actions. Last 100 entries.</div>
      {loading ? (
        <div style={{ color: 'var(--text-muted)' }}>Loading...</div>
      ) : (
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>TIMESTAMP</th>
              <th style={S.th}>ACTOR</th>
              <th style={S.th}>ACTION</th>
              <th style={S.th}>TARGET</th>
              <th style={S.th}>NOTE</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id}>
                <td style={{ ...S.td, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td style={S.td}>{log.actor_username || '—'}</td>
                <td style={S.td}><span style={S.actionBadge(log.action)}>{log.action}</span></td>
                <td style={{ ...S.td, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                  {log.target_model} #{log.target_id}
                </td>
                <td style={S.td}>{log.note || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
