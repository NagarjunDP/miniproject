import React, { useState, useEffect, useCallback } from 'react';

const ReviewerView = () => {
  const [activeTab, setActiveTab] = useState('blockchain');
  const [chainData, setChainData] = useState(null);
  const [sqlData, setSqlData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch Blockchain
      const chainRes = await fetch('/api/chain/blocks/transactions');
      const chainJson = await chainRes.json();
      setChainData(chainJson);

      // Fetch SQL
      const sqlRes = await fetch('/api/v1/admin/debug/db');
      const sqlJson = await sqlRes.json();
      setSqlData(sqlJson);
    } catch (err) {
      setError("Failed to fetch system state. Ensure backend services are running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const tabs = [
    { id: 'blockchain', label: '⛓️ Blockchain (API)', icon: '🔗' },
    { id: 'sql', label: '🗄️ SQL Database (App)', icon: '💾' },
    { id: 'logic', label: '🧠 Security Logic', icon: '🛡️' },
  ];

  return (
    <div className="animate-fade-in" style={{ padding: '20px' }}>
      <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: 'var(--gold-primary)', fontSize: '2rem', marginBottom: '8px' }}>Project Reviewer Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Live inspection of decentralized document verification system state.</p>
        </div>
        <button onClick={fetchData} className="btn-primary" style={{ padding: '8px 16px' }}>
          🔄 Refresh
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '30px', borderBottom: '1px solid var(--border-color)', paddingBottom: '15px' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: `2px solid ${activeTab === tab.id ? 'var(--gold-primary)' : 'transparent'}`,
              background: activeTab === tab.id ? 'rgba(212,175,55,0.1)' : 'var(--surface-color-light)',
              color: activeTab === tab.id ? 'var(--gold-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: 700,
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {loading && !chainData && <div style={{ textAlign: 'center', padding: '50px', color: 'var(--gold-primary)' }}>Loading system state...</div>}

      {/* BLOCKCHAIN VIEW */}
      {activeTab === 'blockchain' && chainData && (
        <div className="animate-fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--gold-primary)' }}>{chainData.blocks?.length || 0}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Blocks</div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#52c41a' }}>Verified</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Chain Integrity</div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#faad14' }}>SHA-256</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Hash Algorithm</div>
            </div>
          </div>

          <h3 style={{ color: 'var(--gold-light)', marginBottom: '15px' }}>Chain of Blocks</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {chainData.blocks?.map((block, idx) => (
              <div key={block.block_hash} style={{
                background: 'var(--surface-color-light)',
                borderLeft: `5px solid ${idx === 0 ? '#faad14' : 'var(--gold-primary)'}`,
                padding: '20px',
                borderRadius: '8px',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontWeight: 800, color: 'var(--gold-primary)' }}>BLOCK #{block.index} {idx === 0 && '(GENESIS)'}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(block.timestamp * 1000).toLocaleString()}</span>
                </div>
                <div style={{ fontSize: '0.85rem', fontFamily: 'monospace', wordBreak: 'break-all', marginBottom: '10px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Hash:</span> <span style={{ color: 'var(--gold-light)' }}>{block.block_hash}</span><br />
                  <span style={{ color: 'var(--text-secondary)' }}>Prev:</span> {block.previous_hash}
                </div>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '4px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '5px', color: 'var(--gold-dark)' }}>TRANSACTIONS ({block.transactions?.length || 0})</div>
                  {block.transactions?.map((tx, txIdx) => (
                    <div key={txIdx} style={{ fontSize: '0.75rem', padding: '5px 0', borderBottom: txIdx < block.transactions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                      📄 <b>File Hash:</b> {tx.file_hash.slice(0, 32)}... <br />
                      🔑 <b>Signer:</b> {tx.author_key.slice(0, 16)}...
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SQL DATABASE VIEW */}
      {activeTab === 'sql' && sqlData && (
        <div className="animate-fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
            <div>
              <h3 style={{ color: 'var(--gold-light)', marginBottom: '15px' }}>Users (SQL `User` Table)</h3>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: 'rgba(212,175,55,0.1)' }}>
                    <tr>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.8rem' }}>Username</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.8rem' }}>Role</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontSize: '0.8rem' }}>Stake</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontSize: '0.8rem' }}>Reputation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sqlData.users?.map(user => (
                      <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px', fontSize: '0.9rem' }}>{user.username}</td>
                        <td style={{ padding: '12px', fontSize: '0.8rem' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: '4px',
                            background: user.role === 'miner' ? 'rgba(82,196,26,0.1)' : 'rgba(250,173,20,0.1)',
                            color: user.role === 'miner' ? '#52c41a' : '#faad14'
                          }}>
                            {user.role}
                          </span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontSize: '0.9rem', color: 'var(--gold-primary)' }}>{user.stake_balance}</td>
                        <td style={{ padding: '12px', textAlign: 'right', fontSize: '0.9rem' }}>{user.reputation}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 style={{ color: 'var(--gold-light)', marginBottom: '15px' }}>Arena History (SQL `ArenaTransaction`)</h3>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: 'rgba(212,175,55,0.1)' }}>
                    <tr>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.8rem' }}>File</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontSize: '0.8rem' }}>Risk</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontSize: '0.8rem' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sqlData.arena_transactions?.map(tx => (
                      <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px', fontSize: '0.85rem' }}>
                          {tx.file_name}<br />
                          <small style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{tx.file_hash.slice(0, 12)}...</small>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <span style={{ fontWeight: 700, color: tx.risk_score > 85 ? '#52c41a' : tx.risk_score > 50 ? '#faad14' : '#ff4d4f' }}>
                            {tx.risk_score}
                          </span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem',
                            background: tx.status === 'accepted' ? 'rgba(82,196,26,0.1)' : 'rgba(255,77,79,0.1)',
                            color: tx.status === 'accepted' ? '#52c41a' : '#ff4d4f'
                          }}>
                            {tx.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LOGIC VIEW */}
      {activeTab === 'logic' && (
        <div className="animate-fade-in card" style={{ background: '#0a0a0a' }}>
          <h3 style={{ color: 'var(--gold-primary)', marginBottom: '20px' }}>Security & Consensus Engine</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
            <div>
              <h4 style={{ color: 'var(--gold-light)', marginBottom: '10px' }}>1. Automated Risk Analysis</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>
                Files are analyzed before being sent to the blockchain. If the risk score is too low, they are rejected. 
                If suspicious, they enter the "Cyber Mining Arena" for manual miner consensus.
              </p>
              <div style={{ background: '#1a1a1a', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Safe Score (&gt;85)</span>
                  <span style={{ color: '#52c41a' }}>Direct Mining</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Suspicious (50-85)</span>
                  <span style={{ color: '#faad14' }}>Arena Consensus</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Dangerous (&lt;50)</span>
                  <span style={{ color: '#ff4d4f' }}>Auto-Reject</span>
                </div>
              </div>
            </div>

            <div>
              <h4 style={{ color: 'var(--gold-light)', marginBottom: '10px' }}>2. Decentralized Consensus</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>
                Miners stake tokens to vote on suspicious files. The winning decision becomes the truth. 
                Accuracy builds reputation and rewards.
              </p>
              <ul style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', paddingLeft: '20px' }}>
                <li style={{ marginBottom: '8px' }}><b>Consensus Window:</b> 15 seconds</li>
                <li style={{ marginBottom: '8px' }}><b>Stake Required:</b> 5 tokens per vote</li>
                <li style={{ marginBottom: '8px' }}><b>Reward:</b> Up to 15 tokens based on reputation</li>
                <li><b>Penalty:</b> Reputation loss for malicious/incorrect voting</li>
              </ul>
            </div>
          </div>

          <div style={{ marginTop: '30px', padding: '20px', background: 'rgba(212,175,55,0.05)', borderRadius: '12px', border: '1px dashed var(--gold-dark)' }}>
             <h4 style={{ color: 'var(--gold-primary)', marginBottom: '10px' }}>Backend Verification Workflow</h4>
             <div style={{ display: 'flex', alignItems: 'center', gap: '15px', overflowX: 'auto', padding: '10px 0' }}>
                <div style={{ minWidth: '120px', textAlign: 'center', padding: '10px', background: 'var(--surface-color-light)', borderRadius: '8px' }}>Upload</div>
                <span>➡️</span>
                <div style={{ minWidth: '120px', textAlign: 'center', padding: '10px', background: 'var(--surface-color-light)', borderRadius: '8px' }}>SHA-256 Hash</div>
                <span>➡️</span>
                <div style={{ minWidth: '120px', textAlign: 'center', padding: '10px', background: 'var(--surface-color-light)', borderRadius: '8px' }}>GPG Signature</div>
                <span>➡️</span>
                <div style={{ minWidth: '120px', textAlign: 'center', padding: '10px', background: 'var(--surface-color-light)', borderRadius: '8px' }}>Risk Scoring</div>
                <span>➡️</span>
                <div style={{ minWidth: '120px', textAlign: 'center', padding: '10px', background: 'var(--gold-primary)', color: '#000', borderRadius: '8px', fontWeight: 700 }}>BLOCKCHAIN</div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewerView;
