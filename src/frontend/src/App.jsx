import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Shield, LogOut } from 'lucide-react';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import MinerDashboard from './components/MinerDashboard';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/v1/auth/me');
      if (res.ok) {
        setUser(await res.json());
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { checkAuth(); }, []);

  const handleLogout = async () => {
    await fetch('/api/v1/auth/logout', { method: 'POST' });
    setUser(null);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column', gap: '16px' }}>
        <div style={{ fontSize: '3rem' }}>🛡️</div>
        <div style={{ color: 'var(--gold-primary)', fontWeight: 600 }}>Loading BlockVerify...</div>
      </div>
    );
  }

  return (
    <Router>
      {user && (
        <nav className="navbar">
          <div className="navbar-brand">
            <Shield size={26} /> BlockVerify
            {user.role === 'miner' && (
              <span style={{
                background: 'rgba(82,196,26,0.15)', border: '1px solid #52c41a',
                color: '#73d13d', padding: '2px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700,
              }}>⛏️ MINER MODE</span>
            )}
          </div>
          <div className="navbar-nav">
            {user.role === 'miner' && (
              <span style={{ color: 'var(--gold-primary)', fontWeight: 600, fontSize: '0.9rem' }}>
                ⚡ {user.stake_balance} tokens
              </span>
            )}
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              👤 {user.username}
            </span>
            <button onClick={handleLogout} style={{
              background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)',
              padding: '8px 16px', borderRadius: '8px', fontFamily: 'var(--font-family)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', transition: 'all 0.3s',
            }}>
              <LogOut size={15} /> Logout
            </button>
          </div>
        </nav>
      )}

      <main className="main-content animate-fade-in" style={{ maxWidth: user?.role === 'miner' ? '900px' : '780px' }}>
        <Routes>
          <Route path="/" element={
            !user ? <Navigate to="/login" /> :
            user.role === 'miner' ? <MinerDashboard user={user} /> : <Dashboard user={user} />
          } />
          <Route path="/login" element={!user ? <Auth onAuthSuccess={checkAuth} /> : <Navigate to="/" />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;
