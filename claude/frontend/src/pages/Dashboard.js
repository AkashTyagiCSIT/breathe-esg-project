import { useState, useEffect } from 'react';
import { getDashboard } from '../api';
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';

const S = {
  page: { padding: 32 },
  header: { marginBottom: 28 },
  title: { fontSize: 20, fontWeight: 600, color: 'var(--text)', marginBottom: 4 },
  sub: { fontSize: 12, color: 'var(--text-dim)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 },
  card: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 6, padding: 20,
  },
  cardLabel: { fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.08em', marginBottom: 8 },
  cardValue: { fontSize: 28, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text)' },
  cardUnit: { fontSize: 11, color: 'var(--text-muted)', marginTop: 2 },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 },
  chartCard: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 6, padding: 20,
  },
  chartTitle: { fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, fontWeight: 500 },
  statusGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 },
  statusItem: (color) => ({
    background: 'var(--surface-2)', border: `1px solid ${color}33`,
    borderRadius: 4, padding: 12, textAlign: 'center',
  }),
  statusVal: (color) => ({ fontSize: 22, fontWeight: 600, color, fontFamily: 'var(--font-mono)' }),
  statusLabel: { fontSize: 10, color: 'var(--text-dim)', marginTop: 4, letterSpacing: '0.05em' },
  runRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 0', borderBottom: '1px solid var(--border)',
    fontSize: 12,
  },
  badge: (status) => {
    const colors = { done: 'var(--green)', failed: 'var(--red)', processing: 'var(--amber)', pending: 'var(--text-muted)' };
    return {
      background: `${colors[status] || 'var(--text-muted)'}22`,
      color: colors[status] || 'var(--text-muted)',
      padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600,
    };
  },
};

const SCOPE_COLORS = ['#fb923c', '#60a5fa', '#a78bfa'];
const STATUS_COLORS = { pending: 'var(--amber)', approved: 'var(--green)', flagged: 'var(--blue)', rejected: 'var(--red)' };

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard().then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 32, color: 'var(--text-muted)' }}>Loading...</div>;
  if (!data) return <div style={{ padding: 32, color: 'var(--red)' }}>Failed to load dashboard.</div>;

  const scopeData = [
    { name: 'Scope 1', value: data.scope_breakdown.scope_1 },
    { name: 'Scope 2', value: data.scope_breakdown.scope_2 },
    { name: 'Scope 3', value: data.scope_breakdown.scope_3 },
  ];

  const sourceData = [
    { name: 'SAP', value: data.source_breakdown.sap },
    { name: 'Utility', value: data.source_breakdown.utility },
    { name: 'Travel', value: data.source_breakdown.travel },
  ];

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div style={S.title}>Emissions Overview</div>
        <div style={S.sub}>All figures in tCO₂e unless noted</div>
      </div>

      <div style={S.grid}>
        <div style={S.card}>
          <div style={S.cardLabel}>TOTAL EMISSIONS</div>
          <div style={S.cardValue}>{(data.total_tonne_co2e).toFixed(2)}</div>
          <div style={S.cardUnit}>tCO₂e</div>
        </div>
        <div style={S.card}>
          <div style={S.cardLabel}>SCOPE 1</div>
          <div style={{ ...S.cardValue, color: 'var(--scope1)' }}>
            {(data.scope_breakdown.scope_1 / 1000).toFixed(2)}
          </div>
          <div style={S.cardUnit}>tCO₂e · Direct combustion</div>
        </div>
        <div style={S.card}>
          <div style={S.cardLabel}>SCOPE 2</div>
          <div style={{ ...S.cardValue, color: 'var(--scope2)' }}>
            {(data.scope_breakdown.scope_2 / 1000).toFixed(2)}
          </div>
          <div style={S.cardUnit}>tCO₂e · Purchased electricity</div>
        </div>
        <div style={S.card}>
          <div style={S.cardLabel}>SCOPE 3</div>
          <div style={{ ...S.cardValue, color: 'var(--scope3)' }}>
            {(data.scope_breakdown.scope_3 / 1000).toFixed(2)}
          </div>
          <div style={S.cardUnit}>tCO₂e · Business travel</div>
        </div>
      </div>

      <div style={S.row}>
        <div style={S.chartCard}>
          <div style={S.chartTitle}>SCOPE BREAKDOWN</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={scopeData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                {scopeData.map((_, i) => <Cell key={i} fill={SCOPE_COLORS[i]} />)}
              </Pie>
              <Tooltip formatter={v => [`${(v / 1000).toFixed(2)} tCO₂e`]} contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={S.chartCard}>
          <div style={S.chartTitle}>BY SOURCE</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={sourceData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}t`} />
              <Tooltip formatter={v => [`${(v / 1000).toFixed(2)} tCO₂e`]} contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 12 }} />
              <Bar dataKey="value" fill="var(--green)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={S.row}>
        <div style={S.chartCard}>
          <div style={S.chartTitle}>REVIEW STATUS</div>
          <div style={S.statusGrid}>
            {Object.entries(STATUS_COLORS).map(([key, color]) => (
              <div key={key} style={S.statusItem(color)}>
                <div style={S.statusVal(color)}>{data.status_counts[key] || 0}</div>
                <div style={S.statusLabel}>{key.toUpperCase()}</div>
              </div>
            ))}
          </div>
          {data.status_counts.suspicious > 0 && (
            <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--amber-dim)', borderRadius: 4, fontSize: 11, color: 'var(--amber)' }}>
              ⚠ {data.status_counts.suspicious} suspicious record{data.status_counts.suspicious !== 1 ? 's' : ''} flagged for review
            </div>
          )}
        </div>

        <div style={S.chartCard}>
          <div style={S.chartTitle}>RECENT INGESTION RUNS</div>
          {data.recent_runs.length === 0 ? (
            <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>No runs yet. Upload data to begin.</div>
          ) : (
            data.recent_runs.map(run => (
              <div key={run.id} style={S.runRow}>
                <div>
                  <div style={{ fontWeight: 500 }}>{run.source_type.toUpperCase()} — {run.original_filename}</div>
                  <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 2 }}>
                    {run.parsed_rows} parsed · {run.failed_rows} failed · {new Date(run.created_at).toLocaleDateString()}
                  </div>
                </div>
                <span style={S.badge(run.status)}>{run.status}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
