import React, { useState, useRef } from 'react';

const RISK_COLORS = {
  Safe: { bg: 'rgba(82,196,26,0.15)', border: '#52c41a', text: '#73d13d', emoji: '🟢' },
  Suspicious: { bg: 'rgba(250,173,20,0.15)', border: '#faad14', text: '#ffc53d', emoji: '🟡' },
  Dangerous: { bg: 'rgba(255,77,79,0.15)', border: '#ff4d4f', text: '#ff7875', emoji: '🔴' },
};

const RiskBadge = ({ level, score }) => {
  const c = RISK_COLORS[level] || RISK_COLORS['Suspicious'];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px',
      borderRadius: '20px', border: `1px solid ${c.border}`, background: c.bg, color: c.text,
      fontWeight: 700, fontSize: '0.85rem',
    }}>
      {c.emoji} {level} ({score}/100)
    </span>
  );
};

const FileUploader = ({ mode }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) { setFile(e.target.files[0]); setResult(null); setError(''); }
  };
  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) { setFile(e.dataTransfer.files[0]); setResult(null); setError(''); }
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true); setError(''); setResult(null);
    const formData = new FormData();
    formData.append('file', file);
    const endpoint = mode === 'add' ? '/api/v1/files/add' : '/api/v1/files/verify';
    try {
      const res = await fetch(endpoint, { method: 'POST', body: formData });
      const data = await res.json();
      setResult({ ...data, httpCode: res.status });
    } catch {
      setError('Network error or server is down');
    } finally {
      setLoading(false);
    }
  };

  const isAdd = mode === 'add';

  return (
    <div>
      <h3 style={{ marginBottom: '8px', color: 'var(--gold-primary)', fontSize: '1.2rem' }}>
        {isAdd ? '📤 Timestamp a New File' : '🔍 Verify File Integrity'}
      </h3>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.9rem' }}>
        {isAdd
          ? 'Upload a file. The Risk Engine will analyze it and decide: Auto-Mine, send to Arena, or Reject.'
          : 'Upload the same file to check if it matches the blockchain record and verify the signature.'}
      </p>

      <div className={`file-dropzone ${file ? 'active' : ''}`}
        onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}
        onClick={() => fileInputRef.current.click()}>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
        {file ? (
          <div>
            <div style={{ fontSize: '3rem', marginBottom: '8px' }}>📄</div>
            <p className="filename">{file.name}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {(file.size / 1024).toFixed(2)} KB
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--gold-dark)', marginTop: '8px' }}>Click to change file</p>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '3rem', marginBottom: '8px' }}>☁️</div>
            <p style={{ fontWeight: 600, marginBottom: '4px' }}>Drag & drop your file here</p>
            <p style={{ fontSize: '0.9rem', color: 'var(--gold-dark)' }}>or click to browse</p>
          </div>
        )}
      </div>

      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn-primary" onClick={handleSubmit} disabled={!file || loading}>
          {loading ? '⚙️ Analyzing...' : isAdd ? '🔐 Submit to Risk Engine' : '🔍 Verify File'}
        </button>
      </div>

      {error && <div className="alert alert-error" style={{ marginTop: '20px' }}>❌ {error}</div>}

      {result && (
        <div className="animate-fade-in" style={{ marginTop: '28px' }}>
          {/* Verify mode */}
          {!isAdd && (
            <div className={`alert ${result.verify ? 'alert-success' : 'alert-error'}`}>
              {result.verify ? '✅ File is VERIFIED — hash matches and signature is valid!' : '❌ File NOT found on blockchain or has been tampered!'}
            </div>
          )}

          {/* Add mode — show analysis */}
          {isAdd && (
            <>
              {/* Risk Analysis Card */}
              {result.risk_score !== undefined && (
                <div style={{ background: '#0a0a0a', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
                  <h4 style={{ color: 'var(--gold-light)', marginBottom: '16px' }}>🧠 Security Analysis Report</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <RiskBadge level={result.risk_level} score={result.risk_score} />
                  </div>

                  {/* Score bar */}
                  <div style={{ background: '#1a1a1a', borderRadius: '6px', height: '10px', marginBottom: '16px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: '6px', transition: 'width 1s ease',
                      width: `${result.risk_score}%`,
                      background: result.risk_score > 85 ? '#52c41a' : result.risk_score >= 50 ? '#faad14' : '#ff4d4f',
                    }} />
                  </div>

                  {/* Checks */}
                  {result.checks && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {Object.entries(result.checks).map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                          <span>{v === false || v === true ? (
                            k === 'duplicate' ? (v ? '🔴 Duplicate Detected' : '🟢 No Duplicate') :
                            (v ? '🟢 ' : '🔴 ')
                          ) : ''}
                          {k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Decision */}
              {result.status === 'mined' && (
                <div className="alert alert-success">⛏️ Auto-Mined! File secured in the blockchain instantly.</div>
              )}
              {result.status === 'pending_review' && (
                <div className="alert" style={{ background: 'rgba(250,173,20,0.1)', border: '1px solid #faad14', color: '#ffc53d' }}>
                  🏟️ File sent to Cyber Mining Arena for human review. Arena ID: #{result.arena_id}
                </div>
              )}
              {result.status === 'rejected' && (
                <div className="alert alert-error">🚫 File rejected by the automated security engine.</div>
              )}
            </>
          )}

          {/* Hash */}
          <div style={{ marginTop: '16px' }}>
            <h4 style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '0.85rem' }}>SHA-256 HASH</h4>
            <pre style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>
              {result.file_hash || result.hash || '—'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
