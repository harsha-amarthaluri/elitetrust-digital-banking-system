import React, { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import { useNavigate, useLocation } from 'react-router-dom';
import { formatTransactionDate } from '../utils/dateFormatter';
import { analyzeSpending } from '../utils/spendingAnalyzer';
import SpendingCharts from '../components/SpendingCharts';
import { showToast } from '../components/Toast';
import '../styles/pages/Dashboard.css';
import '../styles/pages/SmartInsights.css';

const Dashboard = () => {

    const location = useLocation();
    const [user, setUser] = useState(location.state || null);
    const navigate = useNavigate();
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);

    // Notifications State
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifications, setShowNotifications] = useState(false);

    // Bank Accounts State
    const [linkedAccounts, setLinkedAccounts] = useState([]);
    const [primaryAccount, setPrimaryAccount] = useState(null);
    const [hasLinkedAccounts, setHasLinkedAccounts] = useState(false);
    const [isLoadingBalance, setIsLoadingBalance] = useState(true);
    const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);

    // AI Analysis
    const analysis = useMemo(() => {
        return analyzeSpending(recentTransactions, user?.mobileNumber);
    }, [recentTransactions, user?.mobileNumber]);

    const loadBankData = () => {
        if (!user?.mobileNumber) {
            setIsLoadingBalance(false);
            return;
        }
        setIsLoadingBalance(true);
        setIsLoadingAccounts(true);

        api.get(`/primary-account/${user.mobileNumber}`)
            .then(res => {
                if (res.status === 204 || !res.data) {
                    setPrimaryAccount(null);
                } else {
                    setPrimaryAccount(res.data);
                }
            })
            .catch(e => {
                console.error("Failed to fetch primary account", e);
                setPrimaryAccount(null);
            })
            .finally(() => {
                api.get(`/linked-accounts/${user.mobileNumber}`)
                    .then(res => {
                        const accs = res.data || [];
                        accs.sort((a, b) => (b.isPrimary === true ? 1 : 0) - (a.isPrimary === true ? 1 : 0));
                        setLinkedAccounts(accs);
                        setHasLinkedAccounts(accs.length > 0);
                        setIsLoadingBalance(false);
                    })
                    .catch(e => {
                        console.error("Failed to fetch linked accounts for dashboard", e);
                        setIsLoadingBalance(false);
                    })
                    .finally(() => {
                        setIsLoadingAccounts(false);
                    });
            });
    };

    useEffect(() => {
        if (user?.mobileNumber) {
            setIsLoadingTransactions(true);
            api.get(`/transactions/${user.mobileNumber}`)
                .then(response => {
                    setRecentTransactions(response.data);
                })
                .catch(error => {
                    console.log(error);
                })
                .finally(() => {
                    setIsLoadingTransactions(false);
                });
        } else {
            setIsLoadingTransactions(false);
        }
        loadBankData();
    }, [user?.id, user?.mobileNumber]);

    const fetchNotifications = () => {
        if (!user?.mobileNumber) return;
        api.get(`/notifications/${user.mobileNumber}`)
            .then(res => setNotifications(res.data || []))
            .catch(err => console.error("Failed to load notifications", err));

        api.get(`/notifications/${user.mobileNumber}/unread-count`)
            .then(res => setUnreadCount(res.data.unreadCount || 0))
            .catch(err => console.error("Failed to load unread count", err));
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 15000); // Poll every 15 seconds
        return () => clearInterval(interval);
    }, [user?.mobileNumber]);

    const handleMarkAsRead = async (id) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error("Failed to mark notification as read", err);
        }
    };

    const handleRemoveBankAccount = async (accountId) => {
        if (window.confirm('Are you sure you want to remove this bank account?')) {
            try {
                setIsLoadingAccounts(true);
                await api.post(`/unlink-account`, { accountId });
                loadBankData();
                showToast('Bank account removed.', 'info');
            } catch (err) {
                console.error('Failed to unlink bank account:', err);
                showToast('Failed to unlink bank account. Please try again.', 'error');
            } finally {
                setIsLoadingAccounts(false);
            }
        }
    };

    return (
        <div className="dashboard-container">
            {/* Header */}
            <header className="dashboard-header glass-panel" style={{ padding: '1rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="logo-section" style={{ display: 'flex', alignItems: 'center' }}>
                    <img src="/logo.png" alt="EliteTrust Bank Logo" style={{ height: '32px', marginRight: '10px' }} />
                    <h2 style={{ margin: 0, fontSize: '1.5rem' }}>ELITETRUST BANK</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    {/* Notification Bell */}
                    <div className="notification-bell-container" style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setShowNotifications(!showNotifications)}>
                        <span style={{ fontSize: '1.4rem' }}>🔔</span>
                        {unreadCount > 0 && (
                            <span className="badge" style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: '#fff', borderRadius: '50%', padding: '2px 6px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                                {unreadCount}
                            </span>
                        )}
                    </div>

                    <div className="user-profile" onClick={() => navigate('/profile', { state: user })} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <span>Good Morning, <strong>{user?.name || 'Guest'}</strong></span>
                        <div className="avatar">{user?.name ? user.name.charAt(0).toUpperCase() : 'U'}</div>
                    </div>
                </div>
            </header>

            {/* Notification Dropdown Overlay */}
            {showNotifications && (
                <div style={{ position: 'absolute', top: '90px', right: '2rem', width: '350px', background: '#0e1526', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '1.2rem', zIndex: 1000, boxShadow: '0 10px 30px rgba(0,0,0,0.6)', maxHeight: '400px', overflowY: 'auto', backdropFilter: 'blur(10px)', animation: 'fadeIn 0.2s ease' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
                        <h4 style={{ margin: 0, color: '#fff', fontWeight: 600 }}>Notifications</h4>
                        <button onClick={() => setShowNotifications(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem' }}>Close</button>
                    </div>
                    {notifications.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem 0', fontSize: '0.85rem' }}>No notifications yet.</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {notifications.map(n => (
                                <div key={n.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '0.75rem', background: n.read ? 'rgba(255,255,255,0.02)' : 'rgba(99,102,241,0.08)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <strong style={{ fontSize: '0.85rem', color: n.read ? '#cbd5e1' : '#fff' }}>{n.title}</strong>
                                        {!n.read && (
                                            <button 
                                                onClick={() => handleMarkAsRead(n.id)}
                                                style={{ background: 'transparent', border: 'none', color: '#818cf8', fontSize: '0.72rem', cursor: 'pointer', padding: 0 }}
                                            >
                                                Mark Read
                                            </button>
                                        )}
                                    </div>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary, #94a3b8)', lineHeight: 1.3 }}>{n.message}</p>
                                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', marginTop: '4px' }}>{new Date(n.timestamp).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="dashboard-grid">
                {/* Main Content Left */}
                <div className="main-content" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    {/* Balance Card */}
                    <div className="balance-card">
                        <div className="balance-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            Total Balance
                            {primaryAccount && primaryAccount.bankName && (
                                <span style={{ fontSize: '0.99rem', background: 'rgba(30, 248, 19, 0.15)', padding: '3px 10px', borderRadius: '12px', color: '#00f2fffd', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                                    {primaryAccount.bankName}
                                </span>
                            )}
                        </div>
                        <div className="balance-amount" style={{ transition: 'all 0.3s ease', minHeight: '40px' }}>
                            {isLoadingBalance ? (
                                <span style={{ fontSize: '1.2rem', opacity: 0.7 }}>Loading...</span>
                            ) : primaryAccount ? (
                                `₹${primaryAccount.balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            ) : !hasLinkedAccounts ? (
                                <div style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontWeight: 'normal' }}>
                                    Please link a bank account to view your balance.
                                    <br />
                                    <button onClick={() => navigate('/profile', { state: { ...user, openBankTab: true } })} style={{ marginTop: '10px', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 'bold' }}>Link Account</button>
                                </div>
                            ) : (
                                <div style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontWeight: 'normal' }}>
                                    Please select a primary account.
                                    <br />
                                    <button onClick={() => navigate('/profile', { state: { ...user, openBankTab: true } })} style={{ marginTop: '10px', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 'bold' }}>Select Primary</button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="quick-actions glass-panel">
                        <h3 className="section-title">Quick Actions</h3>
                        <div className="actions-grid">
                            <div className="action-item" onClick={() => navigate('/fund-transfer', { state: user })}>
                                <div className="action-icon">💸</div>
                                <span className="action-label">Transfer</span>
                            </div>
                            <div className="action-item" onClick={() => navigate('/pay-bill', { state: user })}>
                                <div className="action-icon">🧾</div>
                                <span className="action-label">Pay Bills</span>
                            </div>
                            <div className="action-item" onClick={() => navigate('/recharge', { state: user })}>
                                <div className="action-icon">📱</div>
                                <span className="action-label">Recharge</span>
                            </div>
                            <div className="action-item" onClick={() => navigate('/account-summary', { state: user })}>
                                <div className="action-icon">🏢</div>
                                <span className="action-label">Account Info</span>
                            </div>
                            <div className="action-item" onClick={() => navigate('/invest', { state: user })}>
                                <div className="action-icon">📊</div>
                                <span className="action-label">Invest</span>
                            </div>
                            <div className="action-item" onClick={() => navigate('/smart-insights', { state: user })}>
                                <div className="action-icon">🤖</div>
                                <span className="action-label">AI Insights</span>
                            </div>
                            <div className="action-item" onClick={() => navigate('/emi-planner', { state: user })}>
                                <div className="action-icon">📋</div>
                                <span className="action-label">EMI Planner</span>
                            </div>
                            <div className="action-item" onClick={() => navigate('/cards', { state: user })}>
                                <div className="action-icon">💳</div>
                                <span className="action-label">Virtual Cards</span>
                            </div>
                            <div className="action-item" onClick={() => navigate('/loans', { state: user })}>
                                <div className="action-icon">💰</div>
                                <span className="action-label">Loans Hub</span>
                            </div>
                            <div className="action-item" onClick={() => navigate('/upi-qr', { state: user })}>
                                <div className="action-icon">⚡</div>
                                <span className="action-label">UPI & QR</span>
                            </div>
                            <div className="action-item" onClick={() => navigate('/ai-coach', { state: user })}>
                                <div className="action-icon">💬</div>
                                <span className="action-label">AI Coach</span>
                            </div>
                            {user?.role === 'ROLE_EMPLOYEE' && (
                                <div className="action-item" onClick={() => navigate('/employee', { state: user })} style={{ border: '1px solid var(--primary)' }}>
                                    <div className="action-icon">🧑‍💼</div>
                                    <span className="action-label">Employee Portal</span>
                                </div>
                            )}
                            {user?.role === 'ROLE_MANAGER' && (
                                <div className="action-item" onClick={() => navigate('/manager', { state: user })} style={{ border: '1px solid var(--primary)' }}>
                                    <div className="action-icon">👔</div>
                                    <span className="action-label">Manager Portal</span>
                                </div>
                            )}
                            {user?.role === 'ROLE_ADMIN' && (
                                <div className="action-item" onClick={() => navigate('/admin', { state: user })} style={{ border: '1px solid var(--primary)' }}>
                                    <div className="action-icon">⚙️</div>
                                    <span className="action-label">Admin Portal</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* AI Spending Analysis - Bar Graph Visualization */}
                    <div className="dashboard-charts-section">
                        {isLoadingTransactions ? (
                            <div className="charts-loading-state glass-panel" style={{ padding: '2rem', borderRadius: '20px', textAlign: 'center' }}>
                                <div className="loading-spinner" style={{ width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Analyzing spending patterns...</p>
                            </div>
                        ) : (
                            <SpendingCharts analysis={analysis} compact={true} />
                        )}
                    </div>

                    {/* Linked Bank Accounts */}
                    <div className="linked-accounts glass-panel">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 className="section-title" style={{ margin: 0 }}>Linked Bank Accounts</h3>
                            <button className="card-btn" style={{ fontSize: '0.85rem', padding: '5px 10px',width: '100px', color: 'var(--primary)' }} onClick={() => navigate('/profile', { state: { ...user, openBankTab: true } })}>
                                + Add Bank
                            </button>
                        </div>
                        {isLoadingAccounts ? (
                            <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px' }}>
                                <p style={{ color: 'var(--text-secondary)' }}>Loading bank accounts...</p>
                            </div>
                        ) : linkedAccounts && linkedAccounts.length > 0 ? (
                            <div className="accounts-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {linkedAccounts.map((acc, index) => (
                                    <div key={index} className="account-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', border: acc.isPrimary ? '2px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)' }}>
                                        <div className="acc-info" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div className="acc-icon" style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, #3b82f6 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem' }}>
                                                🏦
                                            </div>
                                            <div className="acc-details">
                                                <h4 style={{ margin: '0 0 5px 0', fontSize: '1rem' }}>{acc.bankName}</h4>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>A/c ending in •••• {acc.accountNumber.slice(-4)}</span>
                                            </div>
                                        </div>
                                        <div className="acc-balance" style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                            <h4 style={{ margin: '0 0 5px 0', fontSize: '1rem', color: 'var(--primary)' }}>₹{acc.balance.toLocaleString()}</h4>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Available</span>
                                            {acc.isPrimary && (
                                                <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', marginTop: '5px', fontWeight: 'bold' }}>
                                                    Primary
                                                </span>
                                            )}
                                            <button
                                                onClick={() => handleRemoveBankAccount(acc.id)}
                                                style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer', padding: 0, marginTop: '8px' }}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="no-accounts" style={{ textAlign: 'center', padding: '2rem 1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px dashed rgba(255, 255, 255, 0.2)' }}>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>You haven't linked any bank accounts yet.</p>
                                <button className="card-btn" onClick={() => navigate('/profile', { state: { ...user, openBankTab: true } })}>
                                    Add Bank Account
                                </button>
                            </div>
                        )}
                    </div>

                </div>

                {/* Sidebar / Right Content */}
                <aside className="sidebar-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Recent Transactions */}
                    <div className="transactions-section glass-panel">
                        <h3 className="section-title">Recent Activity</h3>
                        <div className="transaction-list">
                            {recentTransactions && recentTransactions.length > 0 ? (
                                [...recentTransactions]
                                    .sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date))
                                    .slice(0, 5)
                                    .map(t => {
                                        const isSelfTransfer = t.fromNumber === t.toNumber;
                                        const isReceived = t.type === 'CREDIT';
                                        const amountPrefix = isReceived ? '+' : '-';
                                        const amountClass = isReceived ? 'positive' : 'negative';
                                        const counterparty = isSelfTransfer ? 'Self' : (isReceived ? t.fromNumber : t.toNumber);
                                        const maskedCounterparty = isSelfTransfer ? 'Self Account' : (counterparty ? `XXXXXX${counterparty.slice(-4)}` : 'N/A');
                                        const transactionTitle = isSelfTransfer ? (isReceived ? 'Received from Self' : 'Transferred to Self') : (isReceived ? `From ${maskedCounterparty}` : `To ${maskedCounterparty}`);
                                        const categoryName = t.category || 'Transfer';

                                        return (
                                            <div key={t.id} className="transaction-item">
                                                <div className="t-info">
                                                    <div className="t-icon" style={{ background: isReceived ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: isReceived ? '#10b981' : '#ef4444' }}>
                                                        {isReceived ? '↓' : '↑'}
                                                    </div>
                                                    <div className="t-details">
                                                        <h4>{t.title || t.description || transactionTitle}</h4>
                                                        <span className="t-date" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                            <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>{categoryName}</span>
                                                            {formatTransactionDate(t.timestamp || t.date)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <span className={`t-amount ${amountClass}`}>
                                                    {amountPrefix}₹{t.amount.toFixed(2)}
                                                </span>
                                            </div>
                                        );
                                    })
                            ) : (
                                <div style={{ textAlign: 'center', padding: '1.5rem 1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                    No recent transactions found.
                                </div>
                            )}
                        </div>
                        <div
                            style={{ marginTop: '1rem', textAlign: 'center', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.9rem' }}
                            onClick={() => navigate('/transactions', { state: user })}
                        >
                            View All Transactions
                        </div>
                    </div>

                    {/* AI Smart Insights Mini Card */}
                    <div className="insights-mini-card" onClick={() => navigate('/smart-insights', { state: user })}>
                        <div className="mini-card-header">
                            <div className="mini-card-title">
                                🤖 Smart Insights
                                <span className="mini-ai-tag">AI</span>
                            </div>
                            <span className="mini-card-arrow">→</span>
                        </div>
                        {analysis.hasData ? (
                            <>
                                <div className="mini-insights-list">
                                    {analysis.insights.slice(0, 3).map((insight, i) => (
                                        <div key={i} className="mini-insight-item">
                                            <span className="mini-insight-icon">{insight.icon}</span>
                                            <span>{insight.text.length > 80 ? insight.text.substring(0, 80) + '...' : insight.text}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mini-view-more">
                                    View Full Analysis →
                                </div>
                            </>
                        ) : (
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '0.5rem 0' }}>
                                Make transactions to unlock AI insights
                            </div>
                        )}
                    </div>

                </aside>
            </div>
        </div>
    );
};

export default Dashboard;