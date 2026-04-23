import React, { useState } from 'react';
import FileUploader from './FileUploader';

const Dashboard = ({ user }) => {
  const [activeTab, setActiveTab] = useState('add');

  const tabs = [
    { key: 'add', label: '📤 Add File' },
    { key: 'verify', label: '🔍 Verify File' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Profile Card */}
      <div className="card" style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
        <img src={user.avatar} alt="Avatar"
          style={{ width: '72px', height: '72px', borderRadius: '50%', border: '3px solid var(--gold-primary)' }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <h2 style={{ color: 'var(--gold-light)', fontSize: '1.4rem' }}>Welcome, {user.username}!</h2>
            <span style={{
              background: 'rgba(212,175,55,0.15)', border: '1px solid var(--gold-dark)',
              color: 'var(--gold-primary)', padding: '2px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
            }}>👤 User</span>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            🔑 GPG Key:
            <code style={{ background: 'var(--surface-color-light)', padding: '2px 8px', borderRadius: '4px', color: 'var(--gold-primary)', fontSize: '0.78rem' }}>
              {user.key_fingerprint ? `${user.key_fingerprint.slice(0, 8)}...${user.key_fingerprint.slice(-8)}` : 'N/A'}
            </code>
          </div>
        </div>

        {/* Info tiles */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {[
            { label: 'Role', value: '👤 User' },
            { label: 'Protection', value: '🛡️ GPG' },
          ].map(tile => (
            <div key={tile.label} style={{
              background: 'var(--surface-color-light)', border: '1px solid var(--border-color)',
              borderRadius: '10px', padding: '12px 18px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--gold-primary)' }}>{tile.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{tile.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* How it Works banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(212,175,55,0.07) 0%, rgba(10,10,10,0) 100%)',
        border: '1px solid rgba(212,175,55,0.2)', borderRadius: '12px', padding: '16px 20px',
        display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center',
      }}>
        <span style={{ color: 'var(--gold-primary)', fontWeight: 700, fontSize: '0.85rem' }}>⚡ HOW IT WORKS:</span>
        {[
          { score: '>85', label: 'Auto Mined', color: '#52c41a', icon: '⛏️' },
          { score: '50–85', label: 'Mining Arena', color: '#faad14', icon: '🏟️' },
          { score: '<50', label: 'Rejected', color: '#ff4d4f', icon: '🚫' },
        ].map(s => (
          <div key={s.score} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <span style={{ color: s.color, fontWeight: 700 }}>{s.icon} Score {s.score}</span>
            <span style={{ color: 'var(--text-secondary)' }}>→ {s.label}</span>
          </div>
        ))}
      </div>

      {/* File Actions */}
      <div className="card">
        <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px', marginBottom: '24px' }}>
          {tabs.map(tab => (
            <button key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '10px 24px', border: `2px solid ${activeTab === tab.key ? 'var(--gold-primary)' : 'var(--border-color)'}`,
                borderRadius: '8px', fontFamily: 'var(--font-family)', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer',
                background: activeTab === tab.key ? 'linear-gradient(135deg, var(--gold-primary), var(--gold-dark))' : 'transparent',
                color: activeTab === tab.key ? '#000' : 'var(--text-secondary)', transition: 'all 0.3s',
              }}>
              {tab.label}
            </button>
          ))}
        </div>
        <div key={activeTab} className="animate-fade-in">
          <FileUploader mode={activeTab === 'add' ? 'add' : 'verify'} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
