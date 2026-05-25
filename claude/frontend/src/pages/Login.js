import { useState } from 'react';
import { login } from '../api';

const S = {
  wrap: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--bg)',
  },
  box: {
    width: 360, padding: 40,
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
  },
  title: {
    fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 600,
    color: 'var(--green)', marginBottom: 4,
  },
  sub: { fontSize: 12, color: 'var(--text-dim)', marginBottom: 32 },
  label: { fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, display: 'block', letterSpacing: '0.05em' },
  input: {
    width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)',
    color: 'var(--text)', padding: '10px 12px', borderRadius: 4, fontSize: 14,
    marginBottom: 16, outline: 'none',
  },
  btn: {
    width: '100%', background: 'var(--green)', color: '#000', border: 'none',
    padding: '11px', borderRadius: 4, fontSize: 14, fontWeight: 600, cursor: 'pointer',
    marginTop: 8,
  },
  err: { color: 'var(--red)', fontSize: 12, marginBottom: 12 },
  hint: { marginTop: 20, padding: 12, background: 'var(--surface-2)', borderRadius: 4, fontSize: 11, color: 'var(--text-dim)' },
};

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await login(username, password);
      onLogin(res.data.access);
    } catch {
      setError('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.wrap}>
      <div style={S.box}>
        <div style={S.title}>BREATHE ESG</div>
        <div style={S.sub}>Emissions Data Platform</div>
        {error && <div style={S.err}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <label style={S.label}>USERNAME</label>
          <input style={S.input} value={username} onChange={e => setUsername(e.target.value)} autoFocus />
          <label style={S.label}>PASSWORD</label>
          <input style={S.input} type="password" value={password} onChange={e => setPassword(e.target.value)} />
          <button style={S.btn} type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <div style={S.hint}>
          Demo: analyst / analyst123 &nbsp;|&nbsp; admin / admin123
        </div>
      </div>
    </div>
  );
}
