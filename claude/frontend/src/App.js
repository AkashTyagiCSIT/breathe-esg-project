import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Ingest from './pages/Ingest';
import Review from './pages/Review';
import AuditPage from './pages/AuditPage';
import Sidebar from './components/Sidebar';
import './index.css';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('access_token'));
  const [page, setPage] = useState('dashboard');

  useEffect(() => {
    if (token) localStorage.setItem('access_token', token);
  }, [token]);

  const logout = () => {
    localStorage.removeItem('access_token');
    setToken(null);
  };


  if (!token) return <Login onLogin={setToken} />;

  const pages = { dashboard: Dashboard, ingest: Ingest, review: Review, audit: 
    AuditPage };
  const Page = pages[page] || Dashboard;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar page={page} setPage={setPage} onLogout={logout} />
      <main style={{ flex: 1, overflow: 'auto' }}>
        <Page />
      </main>
    </div>
  );
}
