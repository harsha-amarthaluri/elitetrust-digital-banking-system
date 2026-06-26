import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { showToast } from '../components/Toast';
import '../styles/pages/Invest.css';

const Invest = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [user] = useState(() => {
        try {
            const stateUser = location.state;
            if (stateUser?.mobileNumber) return stateUser;
            const saved = localStorage.getItem('smart_bank_user');
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });

    const [accounts, setAccounts] = useState([]);
    const [fds, setFds] = useState([]);
    const [isLoadingFds, setIsLoadingFds] = useState(true);
    const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);

    // Modal state for creating FD
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [fdAmount, setFdAmount] = useState(10000);
    const [fdTenure, setFdTenure] = useState(12); // months
    const [isCreating, setIsCreating] = useState(false);

    // Modal state for calculator
    const [showCalcModal, setShowCalcModal] = useState(false);
    const [calcPrincipal, setCalcPrincipal] = useState(50000);
    const [calcMonths, setCalcMonths] = useState(12);

    const fetchAccounts = async () => {
        if (!user?.mobileNumber) return;
        setIsLoadingAccounts(true);
        try {
            const res = await api.get(`/bank/${user.mobileNumber}`);
            setAccounts(res.data || []);
            if (res.data && res.data.length > 0) {
                const primary = res.data.find(acc => acc.primaryAccount) || res.data[0];
                setSelectedAccountId(primary.accountNumber);
            }
        } catch (err) {
            console.error("Failed to fetch linked bank accounts:", err);
        } finally {
            setIsLoadingAccounts(false);
        }
    };

    const fetchFds = async () => {
        if (!user?.mobileNumber) return;
        setIsLoadingFds(true);
        try {
            const res = await api.get(`/fixed-deposits/user/${user.mobileNumber}`);
            setFds(res.data || []);
        } catch (err) {
            console.error("Failed to fetch FDs:", err);
        } finally {
            setIsLoadingFds(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
        fetchFds();
    }, [user?.mobileNumber]);

    const handleCreateFD = async (e) => {
        e.preventDefault();
        if (!selectedAccountId) {
            showToast("Please select a linked bank account.", "warning");
            return;
        }
        if (fdAmount < 10000) {
            showToast("Minimum amount for Fixed Deposit is ₹10,000.", "warning");
            return;
        }
        const account = accounts.find(acc => acc.accountNumber === selectedAccountId);
        if (account && account.balance < fdAmount) {
            showToast(`Insufficient balance in selected account. Available: ₹${account.balance.toLocaleString()}`, "error");
            return;
        }

        setIsCreating(true);
        try {
            await api.post('/fixed-deposits/create', {
                mobileNumber: user.mobileNumber,
                linkedAccountNumber: selectedAccountId,
                amount: fdAmount,
                tenureMonths: fdTenure
            });
            showToast("Fixed Deposit created successfully!", "success");
            setShowCreateModal(false);
            setFdAmount(10000);
            fetchAccounts();
            fetchFds();
        } catch (err) {
            const errMsg = err.response?.data?.message || err.message || "Failed to create Fixed Deposit.";
            showToast(errMsg, "error");
        } finally {
            setIsCreating(false);
        }
    };

    const handleBreakFD = async (fdId, fdNumber) => {
        if (!window.confirm(`Are you sure you want to prematurely withdraw/break FD ${fdNumber}? A 1% penalty on interest will apply.`)) {
            return;
        }
        try {
            await api.post(`/fixed-deposits/${fdId}/withdraw`);
            showToast(`FD ${fdNumber} closed. Principal and interest credited.`, "success");
            fetchAccounts();
            fetchFds();
        } catch (err) {
            const errMsg = err.response?.data?.message || err.message || "Failed to withdraw Fixed Deposit.";
            showToast(errMsg, "error");
        }
    };

    // Calculate rates
    const resolveRate = (months) => {
        if (months <= 6) return 6.5;
        if (months <= 12) return 7.0;
        if (months <= 24) return 7.5;
        return 8.0;
    };

    const calcInterest = calcPrincipal * (resolveRate(calcMonths) / 100) * (calcMonths / 12);
    const calcMaturity = calcPrincipal + calcInterest;

    return (
        <div className="invest-container">
            <header className="invest-header glass-panel">
                <button className="back-btn" onClick={() => navigate('/dashboard', { state: user })}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                    <span className="back-text">Back to Dashboard</span>
                </button>
                <div className="header-center">
                    <h1>Wealth Builder</h1>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Secure your future with smart investments</span>
                </div>
                <div className="header-right"></div>
            </header>

            <div className="invest-hero">
                <div className="calculator-card">
                    <h3 className="card-title">🧮 Investment Calculator</h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
                        Curious about your future returns? Estimate your wealth growth based on current interest rates.
                    </p>
                    <button className="invest-btn" onClick={() => setShowCalcModal(true)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', alignSelf: 'flex-start', width: 'auto', padding: '0.6rem 1.5rem' }}>
                        Open Calculator
                    </button>
                </div>
                <div className="expert-picks-card">
                    <h3 className="card-title">⭐ Smart Portfolio</h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
                        You have {fds.length} active Fixed Deposit investment(s) growing securely.
                    </p>
                    <a href="#active-investments" className="invest-btn" style={{ alignSelf: 'flex-start', width: 'auto', padding: '0.6rem 1.5rem', textAlign: 'center', textDecoration: 'none' }}>
                        View My FDs
                    </a>
                </div>
            </div>

            <div className="invest-grid">
                {/* FD Card */}
                <div className="invest-card">
                    <div className="invest-icon">🏦</div>
                    <div className="invest-info">
                        <h3>Fixed Deposits (FD)</h3>
                        <p>Invest a lump sum for a fixed period and earn guaranteed higher interest rates.</p>
                    </div>
                    <div className="invest-details">
                        <div className="detail-item">
                            <span className="detail-label">Min Amount</span>
                            <span className="detail-value">₹10,000</span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">Lock-in</span>
                            <span className="detail-value">7 Days - 10 Years</span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">Returns</span>
                            <span className="detail-value">Up to 8.0% p.a.</span>
                        </div>
                    </div>
                    <button className="invest-btn" onClick={() => setShowCreateModal(true)}>Invest Now</button>
                </div>

                {/* RD Card */}
                <div className="invest-card">
                    <div className="invest-icon">🔁</div>
                    <div className="invest-info">
                        <h3>Recurring Deposits (RD)</h3>
                        <p>Save a fixed amount every month and build your savings steadily with high interest.</p>
                    </div>
                    <div className="invest-details">
                        <div className="detail-item">
                            <span className="detail-label">Monthly Min</span>
                            <span className="detail-value">₹500</span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">Duration</span>
                            <span className="detail-value">6 Months - 10 Years</span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">Returns</span>
                            <span className="detail-value">Up to 7.2% p.a.</span>
                        </div>
                    </div>
                    <button className="invest-btn" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>Coming Soon</button>
                </div>

                {/* MF Card */}
                <div className="invest-card">
                    <div className="invest-icon">📈</div>
                    <div className="invest-info">
                        <h3>Mutual Funds</h3>
                        <p>Expertly managed funds to grow your wealth through SIP or one-time investments.</p>
                    </div>
                    <div className="invest-details">
                        <div className="detail-item">
                            <span className="detail-label">SIP Min</span>
                            <span className="detail-value">₹500</span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">Type</span>
                            <span className="detail-value">Equity, Hybrid</span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">Avg Returns</span>
                            <span className="detail-value">12-15% p.a.*</span>
                        </div>
                    </div>
                    <button className="invest-btn" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>Coming Soon</button>
                </div>
            </div>

            {/* Active Investments section */}
            <div id="active-investments" className="glass-panel" style={{ marginTop: '4rem', padding: '2rem', borderRadius: '24px' }}>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '1.5rem' }}>💼 Active Fixed Deposits</h2>
                {isLoadingFds ? (
                    <div className="loading-skeleton" style={{ height: '100px' }} />
                ) : fds.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>No active Fixed Deposit investments found.</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                    <th style={{ padding: '1rem' }}>FD Number</th>
                                    <th style={{ padding: '1rem' }}>Principal</th>
                                    <th style={{ padding: '1rem' }}>Interest Rate</th>
                                    <th style={{ padding: '1rem' }}>Maturity Amount</th>
                                    <th style={{ padding: '1rem' }}>Maturity Date</th>
                                    <th style={{ padding: '1rem' }}>Status</th>
                                    <th style={{ padding: '1rem' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fds.map(fd => (
                                    <tr key={fd.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '1rem', fontWeight: 600 }}>{fd.fdNumber}</td>
                                        <td style={{ padding: '1rem' }}>₹{fd.principalAmount.toLocaleString()}</td>
                                        <td style={{ padding: '1rem', color: 'var(--primary)' }}>{fd.interestRate}%</td>
                                        <td style={{ padding: '1rem', fontWeight: 600 }}>₹{fd.maturityAmount.toLocaleString()}</td>
                                        <td style={{ padding: '1rem' }}>{fd.maturityDate}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{
                                                padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem',
                                                background: fd.status === 'ACTIVE' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                                color: fd.status === 'ACTIVE' ? '#10B981' : '#EF4444'
                                            }}>{fd.status}</span>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            {fd.status === 'ACTIVE' && (
                                                <button
                                                    onClick={() => handleBreakFD(fd.id, fd.fdNumber)}
                                                    style={{ background: '#EF4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                                                >
                                                    Break FD
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create FD Modal */}
            {showCreateModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div className="glass-panel" style={{ padding: '2.5rem', borderRadius: '24px', maxWidth: '500px', width: '90%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.4rem' }}>🏦 Open Fixed Deposit</h3>
                            <button onClick={() => setShowCreateModal(false)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                        </div>
                        <form onSubmit={handleCreateFD}>
                            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem' }}>Linked Account</label>
                                <select
                                    value={selectedAccountId}
                                    onChange={(e) => setSelectedAccountId(e.target.value)}
                                    style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                                    required
                                >
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.accountNumber} style={{ background: '#0e1526' }}>
                                            {acc.accountNumber} ({acc.accountType}) - Balance: ₹{acc.balance.toLocaleString()}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem' }}>Principal Amount (₹)</label>
                                <input
                                    type="number"
                                    min="10000"
                                    step="1000"
                                    value={fdAmount}
                                    onChange={(e) => setFdAmount(Number(e.target.value))}
                                    style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                                    required
                                />
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Minimum investment: ₹10,000</span>
                            </div>
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem' }}>Tenure</label>
                                <select
                                    value={fdTenure}
                                    onChange={(e) => setFdTenure(Number(e.target.value))}
                                    style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                                    required
                                >
                                    <option value="6" style={{ background: '#0e1526' }}>6 Months (6.5% interest)</option>
                                    <option value="12" style={{ background: '#0e1526' }}>12 Months (7.0% interest)</option>
                                    <option value="24" style={{ background: '#0e1526' }}>24 Months (7.5% interest)</option>
                                    <option value="36" style={{ background: '#0e1526' }}>36 Months (8.0% interest)</option>
                                </select>
                            </div>
                            <div style={{ background: 'rgba(67, 56, 202, 0.1)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid rgba(67, 56, 202, 0.2)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span>Interest Rate:</span>
                                    <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{resolveRate(fdTenure)}% p.a.</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginTop: '6px' }}>
                                    <span>Estimated Maturity Amount:</span>
                                    <span style={{ fontWeight: 600 }}>₹{Math.round(fdAmount + (fdAmount * (resolveRate(fdTenure)/100) * (fdTenure/12))).toLocaleString()}</span>
                                </div>
                            </div>
                            <button type="submit" className="invest-btn" disabled={isCreating}>
                                {isCreating ? "Opening FD..." : "Confirm & Invest"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Calculator Modal */}
            {showCreateModal === false && showCalcModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div className="glass-panel" style={{ padding: '2.5rem', borderRadius: '24px', maxWidth: '450px', width: '90%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.4rem' }}>🧮 Investment Calculator</h3>
                            <button onClick={() => setShowCalcModal(false)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                        </div>
                        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem' }}>Principal Amount (₹)</label>
                            <input
                                type="number"
                                min="1000"
                                value={calcPrincipal}
                                onChange={(e) => setCalcPrincipal(Number(e.target.value))}
                                style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem' }}>Duration (Months)</label>
                            <select
                                value={calcMonths}
                                onChange={(e) => setCalcMonths(Number(e.target.value))}
                                style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                            >
                                <option value="6">6 Months (6.5% interest)</option>
                                <option value="12">12 Months (7.0% interest)</option>
                                <option value="24">24 Months (7.5% interest)</option>
                                <option value="36">36 Months (8.0% interest)</option>
                            </select>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '8px' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Interest Rate:</span>
                                <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{resolveRate(calcMonths)}% p.a.</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '8px' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Interest Earned:</span>
                                <span style={{ fontWeight: 600 }}>₹{Math.round(calcInterest).toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                <span style={{ fontWeight: 700 }}>Total Value:</span>
                                <span style={{ fontWeight: 800, color: 'var(--primary)' }}>₹{Math.round(calcMaturity).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Invest;
