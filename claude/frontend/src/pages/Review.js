import { useState, useEffect } from 'react';
import { getRecords, reviewRecord, bulkReview } from '../api';

const S = {
  page: { padding: 32 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { fontSize: 20, fontWeight: 600, marginBottom: 4 },
  sub: { fontSize: 12, color: 'var(--text-dim)' },
  filters: {
    display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center',
  },
  select: {
    background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)',
    padding: '7px 12px', borderRadius: 4, fontSize: 12, outline: 'none',
  },
  bulkBar: {
    background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 4,
    padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, fontSize: 12,
  },
  bulkBtn: (color) => ({
    background: `${color}22`, border: `1px solid ${color}66`, color,
    padding: '5px 14px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer',
  }),
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: {
    padding: '10px 12px', textAlign: 'left', fontWeight: 500,
    color: 'var(--text-dim)', fontSize: 10, letterSpacing: '0.05em',
    borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
  },
  td: { padding: '10px 12px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' },
  scopeBadge: (scope) => {
    const colors = { 1: 'var(--scope1)', 2: 'var(--scope2)', 3: 'var(--scope3)' };
    return {
      display: 'inline-block', fontSize: 10, fontWeight: 600,
      color: colors[scope], padding: '1px 6px', borderRadius: 3,
    };
  },
  statusBadge: (status) => {
    const map = {
      pending: { bg: 'var(--amber-dim)', color: 'var(--amber)' },
      approved: { bg: 'var(--green-dim)', color: 'var(--green)' },
      flagged: { bg: 'var(--blue-dim)', color: 'var(--blue)' },
      rejected: { bg: 'var(--red-dim)', color: 'var(--red)' },
    };
    const c = map[status] || map.pending;
    return {
      background: c.bg, color: c.color,
      padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600,
    };
  },
  suspFlag: {
    background: 'var(--amber-dim)', color: 'var(--amber)',
    fontSize: 10, padding: '1px 6px', borderRadius: 3, marginLeft: 4,
  },
  actionBtn: (color) => ({
    background: 'none', border: `1px solid ${color}66`, color,
    padding: '3px 10px', borderRadius: 3, fontSize: 11, cursor: 'pointer', marginRight: 4,
  }),
  modal: {
    position: 'fixed', inset: 0, background: '#000a',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
  },
  modalBox: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 8, padding: 28, width: 480, maxWidth: '90vw',
  },
  modalTitle: { fontSize: 15, fontWeight: 600, marginBottom: 16 },
  rawField: { fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' },
  textarea: {
    width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)',
    color: 'var(--text)', padding: '8px 12px', borderRadius: 4, fontSize: 12,
    resize: 'vertical', minHeight: 60, outline: 'none', marginBottom: 12,
    fontFamily: 'var(--font-sans)',
  },
  modalBtns: { display: 'flex', gap: 8 },
  modalBtn: (color) => ({
    flex: 1, background: `${color}22`, border: `1px solid ${color}66`, color,
    padding: '8px', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer',
  }),
};

export default function Review() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ source: '', scope: '', status: '', suspicious: '' });
  const [selected, setSelected] = useState([]);
  const [modal, setModal] = useState(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    const params = {};
    if (filters.source) params.source = filters.source;
    if (filters.scope) params.scope = filters.scope;
    if (filters.status) params.status = filters.status;
    if (filters.suspicious) params.suspicious = filters.suspicious;
    getRecords(params).then(r => setRecords(r.data)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filters]);

  const toggleSelect = (id) => {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  };

  const selectAll = () => {
    if (selected.length === records.length) setSelected([]);
    else setSelected(records.filter(r => !r.is_locked).map(r => r.id));
  };

  const openModal = (record) => { setModal(record); setNote(''); };

  const doReview = async (status) => {
    if (!modal) return;
    setSaving(true);
    try {
      await reviewRecord(modal.id, { status, reviewer_note: note });
      setModal(null);
      load();
    } catch { } finally { setSaving(false); }
  };

  const doBulk = async (status) => {
    if (!selected.length) return;
    setSaving(true);
    try {
      await bulkReview({ ids: selected, status });
      setSelected([]);
      load();
    } catch { } finally { setSaving(false); }
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <div style={S.title}>Review Records</div>
          <div style={S.sub}>{records.length} records · {selected.length} selected</div>
        </div>
      </div>

      <div style={S.filters}>
        <select style={S.select} value={filters.source} onChange={e => setFilters(f => ({ ...f, source: e.target.value }))}>
          <option value="">All Sources</option>
          <option value="sap">SAP</option>
          <option value="utility">Utility</option>
          <option value="travel">Travel</option>
        </select>
        <select style={S.select} value={filters.scope} onChange={e => setFilters(f => ({ ...f, scope: e.target.value }))}>
          <option value="">All Scopes</option>
          <option value="1">Scope 1</option>
          <option value="2">Scope 2</option>
          <option value="3">Scope 3</option>
        </select>
        <select style={S.select} value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="flagged">Flagged</option>
          <option value="rejected">Rejected</option>
        </select>
        <select style={S.select} value={filters.suspicious} onChange={e => setFilters(f => ({ ...f, suspicious: e.target.value }))}>
          <option value="">All Records</option>
          <option value="true">Suspicious Only</option>
        </select>
      </div>

      {selected.length > 0 && (
        <div style={S.bulkBar}>
          <span style={{ color: 'var(--text-muted)' }}>{selected.length} selected</span>
          <button style={S.bulkBtn('var(--green)')} onClick={() => doBulk('approved')} disabled={saving}>Approve All</button>
          <button style={S.bulkBtn('var(--blue)')} onClick={() => doBulk('flagged')} disabled={saving}>Flag All</button>
          <button style={S.bulkBtn('var(--red)')} onClick={() => doBulk('rejected')} disabled={saving}>Reject All</button>
          <button style={{ ...S.bulkBtn('var(--text-muted)'), marginLeft: 'auto' }} onClick={() => setSelected([])}>Clear</button>
        </div>
      )}

      <div style={S.tableWrap}>
        {loading ? (
          <div style={{ padding: 24, color: 'var(--text-muted)' }}>Loading...</div>
        ) : records.length === 0 ? (
          <div style={{ padding: 24, color: 'var(--text-dim)' }}>No records match your filters. Upload data first.</div>
        ) : (
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}><input type="checkbox" checked={selected.length === records.filter(r => !r.is_locked).length && records.length > 0} onChange={selectAll} /></th>
                <th style={S.th}>DATE</th>
                <th style={S.th}>SCOPE</th>
                <th style={S.th}>CATEGORY</th>
                <th style={S.th}>DESCRIPTION</th>
                <th style={S.th}>RAW</th>
                <th style={S.th}>kgCO₂e</th>
                <th style={S.th}>STATUS</th>
                <th style={S.th}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id} style={{ background: selected.includes(r.id) ? 'var(--surface-2)' : 'transparent' }}>
                  <td style={S.td}>
                    <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggleSelect(r.id)} disabled={r.is_locked} />
                  </td>
                  <td style={S.td}>{r.activity_date}</td>
                  <td style={S.td}><span style={S.scopeBadge(r.scope)}>S{r.scope}</span></td>
                  <td style={S.td}>{r.category_label}</td>
                  <td style={{ ...S.td, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.description}
                    {r.is_suspicious && <span style={S.suspFlag}>⚠ suspicious</span>}
                  </td>
                  <td style={{ ...S.td, fontFamily: 'var(--font-mono)' }}>{Number(r.raw_value).toLocaleString()} {r.raw_unit}</td>
                  <td style={{ ...S.td, fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>
                    {Number(r.normalized_value_kg_co2e).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </td>
                  <td style={S.td}><span style={S.statusBadge(r.status)}>{r.status}</span></td>
                  <td style={S.td}>
                    {!r.is_locked ? (
                      <button style={S.actionBtn('var(--text-muted)')} onClick={() => openModal(r)}>Review</button>
                    ) : (
                      <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>locked</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div style={S.modal} onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={S.modalBox}>
            <div style={S.modalTitle}>Review Record #{modal.id}</div>
            <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--text-muted)' }}>
              <div>{modal.description}</div>
              <div style={{ marginTop: 4 }}>{modal.activity_date} · {modal.category_label} · Scope {modal.scope}</div>
              <div style={{ marginTop: 4 }}>
                {Number(modal.raw_value).toLocaleString()} {modal.raw_unit} →&nbsp;
                <span style={{ color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>
                  {Number(modal.normalized_value_kg_co2e).toLocaleString(undefined, { maximumFractionDigits: 2 })} kgCO₂e
                </span>
              </div>
              <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-dim)' }}>EF: {modal.emission_factor_used} · {modal.emission_factor_source}</div>
              {modal.is_suspicious && (
                <div style={{ marginTop: 8, color: 'var(--amber)', fontSize: 11 }}>⚠ {modal.suspicious_reason}</div>
              )}
            </div>
            <textarea style={S.textarea} placeholder="Reviewer note (optional)" value={note} onChange={e => setNote(e.target.value)} />
            <div style={S.modalBtns}>
              <button style={S.modalBtn('var(--green)')} onClick={() => doReview('approved')} disabled={saving}>Approve + Lock</button>
              <button style={S.modalBtn('var(--blue)')} onClick={() => doReview('flagged')} disabled={saving}>Flag</button>
              <button style={S.modalBtn('var(--red)')} onClick={() => doReview('rejected')} disabled={saving}>Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
