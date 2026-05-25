import React, { useState, useEffect, useCallback } from 'react';
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

  const load = useCallback(() => {
    setLoading(true);

    const params = {};

    if (filters.source) params.source = filters.source;
    if (filters.scope) params.scope = filters.scope;
    if (filters.status) params.status = filters.status;
    if (filters.suspicious) params.suspicious = filters.suspicious;

    getRecords(params)
      .then(r => setRecords(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleSelect = (id) => {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  };

  const selectAll = () => {
    if (selected.length === records.length) setSelected([]);
    else setSelected(records.filter(r => !r.is_locked).map(r => r.id));
  };

  const openModal = (record) => {
    setModal(record);
    setNote('');
  };

  const doReview = async (status) => {
    if (!modal) return;

    setSaving(true);

    try {
      await reviewRecord(modal.id, { status, reviewer_note: note });
      setModal(null);
      load();
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const doBulk = async (status) => {
    if (!selected.length) return;

    setSaving(true);

    try {
      await bulkReview({ ids: selected, status });
      setSelected([]);
      load();
    } catch {
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={S.page}>
      {/* your remaining JSX stays SAME */}
    </div>
  );
}
