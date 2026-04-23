import React, { useState } from 'react';

const Auth = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: '', password: '', email: '', role: 'user' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const endpoint = isLogin ? '/api/v1/auth/login' : '/api/v1/auth/register';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        if (isLogin) {
          onAuthSuccess();
        } else {
          setIsLogin(true);
          setError('✅ Registration successful! Please sign in.');
          setFormData({ ...formData, password: '' });
        }
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch {
      setError('Network error — is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '440px', margin: '60px auto' }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{
          fontSize: '3rem', marginBottom: '8px'
        }}>🛡️</div>
        <h1 style={{ fontSize: '1.8rem', color: 'var(--gold-primary)', marginBottom: '4px' }}>BlockVerify</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Cybersecurity-Powered Blockchain Verification
        </p>
      </div>

      <div className="card">
        {/* Tab toggle */}
        <div style={{ display: 'flex', marginBottom: '28px', background: '#0a0a0a', borderRadius: '10px', padding: '4px' }}>
          {['Sign In', 'Register'].map((tab, i) => (
            <button key={tab} onClick={() => { setIsLogin(i === 0); setError(''); }}
              style={{
                flex: 1, padding: '10px', border: 'none', borderRadius: '8px', fontFamily: 'var(--font-family)',
                fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.3s',
                background: (isLogin ? i === 0 : i === 1) ? 'linear-gradient(135deg, var(--gold-primary), var(--gold-dark))' : 'transparent',
                color: (isLogin ? i === 0 : i === 1) ? '#000' : 'var(--text-secondary)',
              }}>
              {tab}
            </button>
          ))}
        </div>

        {error && (
          <div className={`alert ${error.startsWith('✅') ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '20px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Username</label>
            <input type="text" required value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })} placeholder="Enter username" />
          </div>

          {!isLogin && (
            <>
              <div className="input-group">
                <label>Email Address</label>
                <input type="email" required value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="Enter email" />
              </div>

              <div className="input-group">
                <label>Choose Your Role</label>
                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  {[{ val: 'user', icon: '👤', label: 'User', desc: 'Upload & Verify files' },
                    { val: 'miner', icon: '⛏️', label: 'Miner', desc: 'Validate transactions' }].map(r => (
                    <button type="button" key={r.val}
                      onClick={() => setFormData({ ...formData, role: r.val })}
                      style={{
                        flex: 1, padding: '14px 10px', border: `2px solid ${formData.role === r.val ? 'var(--gold-primary)' : 'var(--border-color)'}`,
                        borderRadius: '10px', background: formData.role === r.val ? 'rgba(212,175,55,0.1)' : 'var(--surface-color-light)',
                        cursor: 'pointer', textAlign: 'center', transition: 'all 0.3s',
                      }}>
                      <div style={{ fontSize: '1.6rem' }}>{r.icon}</div>
                      <div style={{ fontWeight: 700, color: formData.role === r.val ? 'var(--gold-primary)' : 'var(--text-primary)', fontFamily: 'var(--font-family)' }}>{r.label}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-family)' }}>{r.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="input-group">
            <label>Password</label>
            <input type="password" required value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Enter password" />
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '12px', padding: '14px' }} disabled={loading}>
            {loading ? (isLogin ? 'Signing in...' : 'Generating GPG Key...') : (isLogin ? '🔐 Sign In' : '🚀 Create Account')}
          </button>
        </form>
      </div>

      <p style={{ marginTop: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
        🔒 Your account is secured with GPG cryptographic keys
      </p>
    </div>
  );
};

export default Auth;
