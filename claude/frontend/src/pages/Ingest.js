import { useState, useRef } from 'react';
import { ingestFile } from '../api';

const SOURCES = [
  {
    key: 'sap',
    label: 'SAP — Fuel & Procurement',
    scope: 'Scope 1',
    scopeColor: 'var(--scope1)',
    description: 'Flat-file CSV export from SAP (BAPI/SM35). Accepts German or English column headers. Expected fields: posting date, plant code, cost center, material, quantity, unit.',
    sampleFile: 'sap_fuel.csv',
  },
  {
    key: 'utility',
    label: 'Utility — Electricity',
    scope: 'Scope 2',
    scopeColor: 'var(--scope2)',
    description: 'Portal CSV export from electricity utility provider. Expected fields: billing period, meter ID, site, consumption (kWh), country/grid region.',
    sampleFile: 'utility_electricity.csv',
  },
  {
    key: 'travel',
    label: 'Corporate Travel',
    scope: 'Scope 3',
    scopeColor: 'var(--scope3)',
    description: 'Concur/Navan-style CSV export. Expected fields: travel date, trip type (flight/hotel/taxi/train/rental_car), origin, destination, distance (km if ground), nights (if hotel), traveler, cost center.',
    sampleFile: 'travel_concur.csv',
  },
];

const S = {
  page: { padding: 32 },
  title: { fontSize: 20, fontWeight: 600, marginBottom: 4 },
  sub: { fontSize: 12, color: 'var(--text-dim)', marginBottom: 32 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 },
  card: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 6, padding: 24, display: 'flex', flexDirection: 'column',
  },
  scopeBadge: (color) => ({
    display: 'inline-block', fontSize: 10, fontWeight: 600, color,
    border: `1px solid ${color}66`, padding: '2px 8px', borderRadius: 10, marginBottom: 12,
    letterSpacing: '0.05em',
  }),
  cardTitle: { fontSize: 14, fontWeight: 600, marginBottom: 8 },
  cardDesc: { fontSize: 12, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6, flex: 1 },
  dropzone: (active) => ({
    border: `2px dashed ${active ? 'var(--green)' : 'var(--border)'}`,
    borderRadius: 6, padding: 20, textAlign: 'center', cursor: 'pointer',
    background: active ? 'var(--green-dim)' : 'transparent',
    transition: 'all 0.15s',
  }),
  dropText: { fontSize: 12, color: 'var(--text-muted)' },
  btn: {
    background: 'var(--green)', color: '#000', border: 'none',
    padding: '10px 20px', borderRadius: 4, fontSize: 13, fontWeight: 600,
    width: '100%', marginTop: 12, cursor: 'pointer',
  },
  result: (ok) => ({
    marginTop: 12, padding: 12, borderRadius: 4, fontSize: 12,
    background: ok ? 'var(--green-dim)' : 'var(--red-dim)',
    color: ok ? 'var(--green)' : 'var(--red)',
  }),
  errItem: { marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: 11, opacity: 0.8 },
};

function SourceCard({ source }) {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const inputRef = useRef();

  const handleFile = (f) => {
    if (f && f.name.endsWith('.csv')) {
      setFile(f);
      setResult(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await ingestFile(source.key, file);
      setResult({ ok: true, data: res.data });
    } catch (err) {
      setResult({ ok: false, error: err.response?.data?.error || 'Upload failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.card}>
      <div style={S.scopeBadge(source.scopeColor)}>{source.scope}</div>
      <div style={S.cardTitle}>{source.label}</div>
      <div style={S.cardDesc}>{source.description}</div>

      <div
        style={S.dropzone(dragging)}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
        {file ? (
          <div style={{ color: 'var(--green)', fontSize: 12 }}>📄 {file.name}</div>
        ) : (
          <div style={S.dropText}>Drop CSV here or click to browse</div>
        )}
      </div>

      {file && (
        <button style={S.btn} onClick={handleUpload} disabled={loading}>
          {loading ? 'Processing...' : `Upload & Ingest`}
        </button>
      )}

      {result && (
        <div style={S.result(result.ok)}>
          {result.ok ? (
            <>
              <div>✓ Ingested {result.data.parsed} records</div>
              {result.data.failed > 0 && <div>{result.data.failed} rows failed to parse</div>}
              {result.data.errors?.map((e, i) => <div key={i} style={S.errItem}>{e}</div>)}
            </>
          ) : (
            <div>✗ {result.error}</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Ingest() {
  return (
    <div style={S.page}>
      <div style={S.title}>Ingest Data</div>
      <div style={S.sub}>Upload CSV exports from each source. Parsing, unit normalization, and emission factor application happen automatically.</div>
      <div style={S.grid}>
        {SOURCES.map(s => <SourceCard key={s.key} source={s} />)}
      </div>
    </div>
  );
}
