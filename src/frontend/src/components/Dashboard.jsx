import React, { useState } from 'react';
import FileUploader from './FileUploader';
import { Key } from 'lucide-react';

const Dashboard = ({ user }) => {
  const [activeTab, setActiveTab] = useState('add'); // 'add' or 'verify'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div className="card" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <img 
          src={user.avatar} 
          alt="Avatar" 
          style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px solid var(--gold-primary)' }} 
        />
        <div>
          <h2 style={{ color: 'var(--gold-light)' }}>Welcome to your Dashboard</h2>
          <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
            <Key size={16} /> 
            <span>GPG Key Fingerprint: </span>
            <code style={{ background: 'var(--surface-color-light)', padding: '4px 8px', borderRadius: '4px', color: 'var(--gold-primary)' }}>
              {user.key_fingerprint}
            </code>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px', marginBottom: '20px' }}>
          <button 
            className={`btn-secondary ${activeTab === 'add' ? 'active' : ''}`}
            style={{ 
              background: activeTab === 'add' ? 'var(--gold-primary)' : 'transparent',
              color: activeTab === 'add' ? '#000' : 'var(--gold-primary)'
            }}
            onClick={() => setActiveTab('add')}
          >
            Add New File
          </button>
          <button 
            className={`btn-secondary ${activeTab === 'verify' ? 'active' : ''}`}
            style={{ 
              background: activeTab === 'verify' ? 'var(--gold-primary)' : 'transparent',
              color: activeTab === 'verify' ? '#000' : 'var(--gold-primary)'
            }}
            onClick={() => setActiveTab('verify')}
          >
            Verify Existing File
          </button>
        </div>

        <div className="animate-fade-in" key={activeTab}>
          {activeTab === 'add' ? (
            <FileUploader mode="add" />
          ) : (
            <FileUploader mode="verify" />
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
