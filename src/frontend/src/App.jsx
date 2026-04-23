import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { Shield, Upload, CheckCircle, LogOut } from 'lucide-react';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/v1/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch (e) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleLogout = async () => {
    await fetch('/api/v1/auth/logout', { method: 'POST' });
    setUser(null);
  };

  if (loading) return <div className="main-content" style={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}>Loading...</div>;

  return (
    <Router>
      <nav className="navbar">
        <Link to="/" className="navbar-brand">
          <Shield size={28} /> BlockVerify
        </Link>
        <div className="navbar-nav">
          {user ? (
            <>
              <span className="nav-link" style={{color: 'var(--text-primary)'}}>Hi, {user.username}!</span>
              <button onClick={handleLogout} className="btn-secondary" style={{padding: '8px 16px', display: 'flex', gap: '8px', alignItems: 'center'}}>
                <LogOut size={16} /> Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="btn-primary">Sign In</Link>
          )}
        </div>
      </nav>

      <main className="main-content animate-fade-in">
        <Routes>
          <Route path="/" element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} />
          <Route path="/login" element={!user ? <Auth onAuthSuccess={checkAuth} /> : <Navigate to="/" />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;
