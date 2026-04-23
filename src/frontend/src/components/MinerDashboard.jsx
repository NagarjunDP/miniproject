import React, { useState, useEffect, useCallback } from 'react';

const RISK_COLORS = {
  Safe:       { bg: 'rgba(82,196,26,0.15)',  border: '#52c41a', text: '#73d13d', bar: '#52c41a' },
  Suspicious: { bg: 'rgba(250,173,20,0.15)', border: '#faad14', text: '#ffc53d', bar: '#faad14' },
  Dangerous:  { bg: 'rgba(255,77,79,0.15)',  border: '#ff4d4f', text: '#ff7875', bar: '#ff4d4f' },
};

const getRiskLevel = (score) => {
  if (score > 85) return 'Safe';
  if (score >= 50) return 'Suspicious';
  return 'Dangerous';
};

// --- Countdown timer hook ---
const useTimer = (endTime) => {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!endTime) return;
    const tick = () => setRemaining(Math.max(0, Math.round(endTime - Date.now() / 1000)));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [endTime]);
  return remaining;
};

// --- Arena Transaction Card ---
const ArenaCard = ({ txn, onVote, myVote, votePending }) => {
  const remaining = useTimer(txn.voting_end_time);
  const riskLevel = getRiskLevel(txn.risk_score);
  const c = RISK_COLORS[riskLevel];
  const totalVotes = txn.accept_votes + txn.reject_votes;
  const acceptPct = totalVotes > 0 ? Math.round((txn.accept_votes / totalVotes) * 100) : 0;
  const rejectPct = totalVotes > 0 ? 100 - acceptPct : 0;
  const isVoting = txn.status === 'voting';
  const canVote = !myVote && isVoting;

  return (
    <div style={{
      border: `2px solid ${c.border}`, background: c.bg, borderRadius: '16px',
      padding: '24px', marginBottom: '20px', position: 'relative', overflow: 'hidden',
    }}>
      {/* Live badge */}
      {isVoting && (
        <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff4d4f', display: 'inline-block', animation: 'pulse 1.2s infinite' }} />
          <span style={{ color: '#ff7875', fontWeight: 700, fontSize: '0.8rem' }}>LIVE</span>
        </div>
      )}
      {txn.status === 'pending' && (
        <div style={{ position: 'absolute', top: '16px', right: '16px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>
          ⏳ Awaiting first vote...
        </div>
      )}

      {/* File info */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <span style={{ fontSize: '1.6rem' }}>📄</span>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.05rem' }}>{txn.file_name}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontFamily: 'monospace', marginTop: '2px' }}>
              #{txn.id} · {txn.file_hash ? `${txn.file_hash.slice(0, 16)}...` : ''}
            </div>
          </div>
        </div>

        {/* Risk score bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ flex: 1, background: '#0a0a0a', borderRadius: '6px', height: '8px', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: '6px', background: c.bar, width: `${txn.risk_score}%`, transition: 'width 0.8s ease' }} />
          </div>
          <span style={{ color: c.text, fontWeight: 700, fontSize: '0.9rem', minWidth: '80px' }}>
            {riskLevel} {txn.risk_score}/100
          </span>
        </div>
      </div>

      {/* Timer */}
      {isVoting && (
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: remaining <= 5 ? '#ff7875' : 'var(--text-secondary)', fontSize: '0.85rem' }}>⏱ Time left:</span>
          <span style={{
            fontWeight: 900, fontSize: '1.5rem', fontFamily: 'monospace',
            color: remaining <= 5 ? '#ff4d4f' : remaining <= 10 ? '#faad14' : '#52c41a',
            transition: 'color 0.5s',
          }}>
            {remaining}s
          </span>
          {/* Timer bar */}
          <div style={{ flex: 1, background: '#0a0a0a', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '4px',
              background: remaining <= 5 ? '#ff4d4f' : remaining <= 10 ? '#faad14' : '#52c41a',
              width: `${(remaining / 15) * 100}%`, transition: 'width 0.5s linear, background 0.5s',
            }} />
          </div>
        </div>
      )}

      {/* Vote progress */}
      {totalVotes > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
            <span style={{ color: '#73d13d' }}>✅ Accept: {txn.accept_votes} ({acceptPct}%)</span>
            <span style={{ color: '#ff7875' }}>❌ Reject: {txn.reject_votes} ({rejectPct}%)</span>
          </div>
          <div style={{ display: 'flex', height: '8px', borderRadius: '6px', overflow: 'hidden', gap: '2px', background: '#0a0a0a' }}>
            {acceptPct > 0 && <div style={{ width: `${acceptPct}%`, background: '#52c41a', transition: 'width 0.5s' }} />}
            {rejectPct > 0 && <div style={{ width: `${rejectPct}%`, background: '#ff4d4f', transition: 'width 0.5s' }} />}
          </div>
        </div>
      )}

      {/* Voting buttons */}
      {canVote ? (
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-primary" onClick={() => onVote(txn.id, 'accept')}
            disabled={votePending}
            style={{ flex: 1, background: 'linear-gradient(135deg, #52c41a, #389e0d)', justifyContent: 'center' }}>
            ✅ Accept
          </button>
          <button className="btn-primary" onClick={() => onVote(txn.id, 'reject')}
            disabled={votePending}
            style={{ flex: 1, background: 'linear-gradient(135deg, #ff4d4f, #cf1322)', justifyContent: 'center' }}>
            ❌ Reject
          </button>
        </div>
      ) : myVote ? (
        <div className="alert alert-success" style={{ marginBottom: 0 }}>
          ✅ You voted: <strong>{myVote.toUpperCase()}</strong> — waiting for consensus...
        </div>
      ) : txn.status === 'pending' ? (
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', padding: '12px', background: '#0a0a0a', borderRadius: '8px' }}>
          Be the first to vote and set the proposed decision!
        </div>
      ) : null}
    </div>
  );
};

// --- Leaderboard Component ---
const Leaderboard = ({ data }) => (
  <div>
    <h3 style={{ color: 'var(--gold-primary)', marginBottom: '16px' }}>🏆 Miner Leaderboard</h3>
    {data.length === 0
      ? <p style={{ color: 'var(--text-secondary)' }}>No miners yet.</p>
      : data.map((m, i) => (
        <div key={m.username} style={{
          display: 'flex', alignItems: 'center', gap: '14px', padding: '14px',
          background: i === 0 ? 'rgba(212,175,55,0.08)' : 'var(--surface-color-light)',
          border: `1px solid ${i === 0 ? 'var(--gold-dark)' : 'var(--border-color)'}`,
          borderRadius: '10px', marginBottom: '8px',
        }}>
          <span style={{ fontSize: '1.4rem', minWidth: '30px', textAlign: 'center' }}>
            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
          </span>
          <img src={m.avatar} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: i === 0 ? 'var(--gold-primary)' : 'var(--text-primary)' }}>{m.username}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              {m.correct_votes}/{m.total_votes} correct votes
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700, color: '#52c41a' }}>{m.accuracy}%</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--gold-primary)' }}>⚡ {m.stake_balance} tokens</div>
          </div>
        </div>
      ))
    }
  </div>
);

// --- Main Miner Dashboard ---
const MinerDashboard = ({ user }) => {
  const [arenaData, setArenaData] = useState({ active: [], resolved: [] });
  const [leaderboard, setLeaderboard] = useState([]);
  const [votePending, setVotePending] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [activeTab, setActiveTab] = useState('arena');
  const [currentUser, setCurrentUser] = useState(user);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const fetchArena = useCallback(async () => {
    try {
      const r = await fetch('/api/v1/arena/live');
      if (r.ok) setArenaData(await r.json());
    } catch { /* ignore */ }
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const r = await fetch('/api/v1/arena/leaderboard');
      if (r.ok) {
        const d = await r.json();
        setLeaderboard(d.leaderboard);
      }
    } catch { /* ignore */ }
  }, []);

  const fetchMe = useCallback(async () => {
    try {
      const r = await fetch('/api/v1/auth/me');
      if (r.ok) setCurrentUser(await r.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchArena();
    fetchLeaderboard();
    const id = setInterval(() => { fetchArena(); fetchLeaderboard(); fetchMe(); }, 2000);
    return () => clearInterval(id);
  }, [fetchArena, fetchLeaderboard, fetchMe]);

  const handleVote = async (txnId, decision) => {
    setVotePending(true);
    try {
      const r = await fetch('/api/v1/arena/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction_id: txnId, decision }),
      });
      const d = await r.json();
      if (r.ok) {
        showToast(`🗳️ Vote cast: ${decision.toUpperCase()}! Stake deducted. ${d.time_left}s remaining.`);
        fetchArena(); fetchMe();
      } else {
        showToast(`❌ ${d.error}`);
      }
    } catch {
      showToast('❌ Network error');
    } finally {
      setVotePending(false);
    }
  };

  const tabs = [
    { key: 'arena', label: '🏟️ Mining Arena' },
    { key: 'resolved', label: '⛓️ Resolved' },
    { key: 'leaderboard', label: '🏆 Leaderboard' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Toast */}
      {toastMsg && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
          background: '#1a1a1a', border: '1px solid var(--gold-primary)', color: 'var(--gold-light)',
          padding: '14px 24px', borderRadius: '12px', fontWeight: 600, boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          animation: 'fadeIn 0.3s ease',
        }}>
          {toastMsg}
        </div>
      )}

      {/* Miner Profile */}
      <div className="card" style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
        <img src={currentUser.avatar} alt="Avatar"
          style={{ width: '72px', height: '72px', borderRadius: '50%', border: '3px solid var(--gold-primary)' }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <h2 style={{ color: 'var(--gold-light)', fontSize: '1.4rem' }}>⛏️ {currentUser.username}</h2>
            <span style={{
              background: 'rgba(82,196,26,0.15)', border: '1px solid #52c41a',
              color: '#73d13d', padding: '2px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
            }}>⛏️ Miner</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Validate suspicious files and earn rewards for accurate decisions.
          </div>
        </div>

        {/* Stat tiles */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {[
            { label: 'Stake Balance', value: `⚡ ${currentUser.stake_balance}`, color: 'var(--gold-primary)' },
            { label: 'Accuracy', value: `${currentUser.accuracy || 0}%`, color: '#52c41a' },
            { label: 'Reputation', value: `${currentUser.reputation}/100`, color: '#faad14' },
            { label: 'Total Votes', value: currentUser.total_votes, color: 'var(--text-primary)' },
          ].map(tile => (
            <div key={tile.label} style={{
              background: 'var(--surface-color-light)', border: '1px solid var(--border-color)',
              borderRadius: '10px', padding: '12px 18px', textAlign: 'center', minWidth: '90px',
            }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: tile.color }}>{tile.value}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{tile.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main content card */}
      <div className="card">
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '24px' }}>
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '8px 20px', border: `2px solid ${activeTab === tab.key ? 'var(--gold-primary)' : 'var(--border-color)'}`,
                borderRadius: '8px', fontFamily: 'var(--font-family)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
                background: activeTab === tab.key ? 'linear-gradient(135deg, var(--gold-primary), var(--gold-dark))' : 'transparent',
                color: activeTab === tab.key ? '#000' : 'var(--text-secondary)', transition: 'all 0.3s',
              }}>
              {tab.label}
            </button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#52c41a', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Live (2s polling)</span>
          </div>
        </div>

        {/* ARENA TAB */}
        {activeTab === 'arena' && (
          <div key="arena" className="animate-fade-in">
            {arenaData.active.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🏟️</div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Mining Arena is quiet...</p>
                <p style={{ color: 'var(--gold-dark)', fontSize: '0.85rem', marginTop: '8px' }}>
                  Waiting for suspicious files to validate. Ask a user to upload a .exe or .bat file!
                </p>
              </div>
            ) : (
              arenaData.active.map(txn => (
                <ArenaCard key={txn.id} txn={txn} onVote={handleVote} myVote={txn.my_vote} votePending={votePending} />
              ))
            )}
          </div>
        )}

        {/* RESOLVED TAB */}
        {activeTab === 'resolved' && (
          <div key="resolved" className="animate-fade-in">
            {arenaData.resolved.length === 0
              ? <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px' }}>No resolved transactions yet.</p>
              : arenaData.resolved.map(txn => {
                const riskLevel = getRiskLevel(txn.risk_score);
                const c = RISK_COLORS[riskLevel];
                return (
                  <div key={txn.id} style={{
                    border: `1px solid ${txn.status === 'accepted' ? '#52c41a' : '#ff4d4f'}`,
                    background: txn.status === 'accepted' ? 'rgba(82,196,26,0.05)' : 'rgba(255,77,79,0.05)',
                    borderRadius: '12px', padding: '16px 20px', marginBottom: '12px',
                    display: 'flex', alignItems: 'center', gap: '16px',
                  }}>
                    <span style={{ fontSize: '1.6rem' }}>{txn.status === 'accepted' ? '✅' : '❌'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{txn.file_name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        Risk: {txn.risk_score}/100 · Votes: ✅{txn.accept_votes} ❌{txn.reject_votes}
                      </div>
                    </div>
                    <span style={{
                      padding: '4px 14px', borderRadius: '20px', fontWeight: 700, fontSize: '0.8rem',
                      background: txn.status === 'accepted' ? 'rgba(82,196,26,0.2)' : 'rgba(255,77,79,0.2)',
                      color: txn.status === 'accepted' ? '#73d13d' : '#ff7875',
                    }}>
                      {txn.status === 'accepted' ? '⛏️ MINED' : '🚫 REJECTED'}
                    </span>
                  </div>
                );
              })
            }
          </div>
        )}

        {/* LEADERBOARD TAB */}
        {activeTab === 'leaderboard' && (
          <div key="leaderboard" className="animate-fade-in">
            <Leaderboard data={leaderboard} />
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
};

export default MinerDashboard;
