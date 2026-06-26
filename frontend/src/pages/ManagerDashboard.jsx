import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';

const ManagerDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const user = location.state || {};

    const [pendingTransactions, setPendingTransactions] = useState([]);
    const [complianceLogs, setComplianceLogs] = useState([]);
    const [fraudAlerts, setFraudAlerts] = useState([]);
    
    const [activeTab, setActiveTab] = useState('queue'); // 'queue', 'fraud', 'logs'
    const [isLoadingTx, setIsLoadingTx] = useState(true);
    const [isLoadingLogs, setIsLoadingLogs] = useState(true);
    const [isLoadingFraud, setIsLoadingFraud] = useState(true);
    const [alertMsg, setAlertMsg] = useState({ text: '', type: '' });

    const fetchTxQueue = async () => {
        setIsLoadingTx(true);
        try {
            const res = await api.get('/manager/transactions/pending');
            setPendingTransactions(res.data || []);
        } catch (err) {
            console.error("Failed to fetch pending transactions:", err);
        } finally {
            setIsLoadingTx(false);
        }
    };

    const fetchComplianceLogs = async () => {
        setIsLoadingLogs(true);
        try {
            const res = await api.get('/manager/compliance/logs');
            setComplianceLogs(res.data || []);
        } catch (err) {
            console.error("Failed to fetch compliance logs:", err);
        } finally {
            setIsLoadingLogs(false);
        }
    };

    const fetchFraudAlerts = async () => {
        setIsLoadingFraud(true);
        try {
            const res = await api.get('/manager/fraud-alerts');
            setFraudAlerts(res.data || []);
        } catch (err) {
            console.error("Failed to fetch fraud alerts:", err);
        } finally {
            setIsLoadingFraud(false);
        }
    };

    useEffect(() => {
        fetchTxQueue();
        fetchComplianceLogs();
        fetchFraudAlerts();
    }, []);

    const handleApproveTx = async (txId) => {
        try {
            await api.post(`/manager/transactions/${txId}/approve`);
            setAlertMsg({ text: "Transaction approved and executed successfully.", type: 'success' });
            setTimeout(() => setAlertMsg({ text: '', type: '' }), 4000);
            fetchTxQueue();
            fetchComplianceLogs();
            fetchFraudAlerts();
        } catch (err) {
            console.error("Approval failed:", err);
            setAlertMsg({ text: "Failed to approve transaction. Please verify sender balance.", type: 'danger' });
            setTimeout(() => setAlertMsg({ text: '', type: '' }), 4000);
        }
    };

    const handleRejectTx = async (txId) => {
        try {
            await api.post(`/manager/transactions/${txId}/reject`);
            setAlertMsg({ text: "Transaction rejected.", type: 'success' });
            setTimeout(() => setAlertMsg({ text: '', type: '' }), 4000);
            fetchTxQueue();
            fetchComplianceLogs();
            fetchFraudAlerts();
        } catch (err) {
            console.error("Rejection failed:", err);
            setAlertMsg({ text: "Failed to reject transaction.", type: 'danger' });
            setTimeout(() => setAlertMsg({ text: '', type: '' }), 4000);
        }
    };

    const handleResolveAlert = async (alertId, actionType) => {
        try {
            await api.post(`/manager/fraud-alerts/${alertId}/resolve?action=${actionType}`);
            setAlertMsg({ text: `Fraud alert has been marked as ${actionType}.`, type: 'success' });
            setTimeout(() => setAlertMsg({ text: '', type: '' }), 4000);
            fetchFraudAlerts();
            fetchComplianceLogs();
        } catch (err) {
            console.error("Failed to resolve alert:", err);
            setAlertMsg({ text: "Failed to update fraud alert status.", type: 'danger' });
            setTimeout(() => setAlertMsg({ text: '', type: '' }), 4000);
        }
    };

    // Derived statistics
    const pendingReviewAlerts = fraudAlerts.filter(a => a.status === 'PENDING_REVIEW');
    const highSeverityCount = pendingReviewAlerts.filter(a => a.severity === 'HIGH').length;
    const mediumSeverityCount = pendingReviewAlerts.filter(a => a.severity === 'MEDIUM').length;

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {alertMsg.text && (
                <div className={`alert alert-${alertMsg.type}`} style={{ borderRadius: '12px', margin: 0 }}>
                    {alertMsg.text}
                </div>
            )}
            <header className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', borderRadius: '16px' }}>
                <button className="back-btn" onClick={() => navigate('/dashboard', { state: user })} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold' }}>
                    ← Back to Dashboard
                </button>
                <div style={{ textAlign: 'center' }}>
                    <h1>Manager & Compliance Portal</h1>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Review high-value transactions (Maker-Checker) and monitor system audits</span>
                </div>
                <div style={{ width: '100px' }}></div>
            </header>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '0.5rem' }}>
                <button 
                    onClick={() => setActiveTab('queue')}
                    style={{ 
                        padding: '10px 20px', 
                        background: activeTab === 'queue' ? 'var(--primary)' : 'transparent', 
                        color: activeTab === 'queue' ? '#fff' : 'var(--text-secondary)',
                        border: 'none', 
                        borderRadius: '8px', 
                        fontWeight: 'bold', 
                        cursor: 'pointer' 
                    }}
                >
                    🛡️ Maker-Checker Queue ({pendingTransactions.length})
                </button>
                <button 
                    onClick={() => setActiveTab('fraud')}
                    style={{ 
                        padding: '10px 20px', 
                        background: activeTab === 'fraud' ? 'var(--primary)' : 'transparent', 
                        color: activeTab === 'fraud' ? '#fff' : 'var(--text-secondary)',
                        border: 'none', 
                        borderRadius: '8px', 
                        fontWeight: 'bold', 
                        cursor: 'pointer' 
                    }}
                >
                    🚨 AML & Fraud Alerts ({pendingReviewAlerts.length})
                </button>
                <button 
                    onClick={() => setActiveTab('logs')}
                    style={{ 
                        padding: '10px 20px', 
                        background: activeTab === 'logs' ? 'var(--primary)' : 'transparent', 
                        color: activeTab === 'logs' ? '#fff' : 'var(--text-secondary)',
                        border: 'none', 
                        borderRadius: '8px', 
                        fontWeight: 'bold', 
                        cursor: 'pointer' 
                    }}
                >
                    📋 Compliance Logs
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
                
                {/* 1. Maker-Checker Queue */}
                {activeTab === 'queue' && (
                    <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px' }}>
                        <h3 style={{ borderBottom: '2px solid rgba(79,70,229,0.1)', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: 'var(--primary)' }}>🛡️ Maker-Checker Transaction Queue</h3>
                        
                        {isLoadingTx ? (
                            <div style={{ textAlign: 'center', padding: '2rem' }}>Loading high-value queue...</div>
                        ) : pendingTransactions.length > 0 ? (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.1)', color: 'var(--text-secondary)' }}>
                                            <th style={{ padding: '10px' }}>Tx ID</th>
                                            <th style={{ padding: '10px' }}>Sender</th>
                                            <th style={{ padding: '10px' }}>Recipient</th>
                                            <th style={{ padding: '10px' }}>Amount</th>
                                            <th style={{ padding: '10px' }}>Details</th>
                                            <th style={{ padding: '10px' }}>Timestamp</th>
                                            <th style={{ padding: '10px', textAlign: 'center' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendingTransactions.map(tx => (
                                            <tr key={tx.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                                <td style={{ padding: '12px 10px', fontWeight: 'bold' }}>#{tx.id}</td>
                                                <td style={{ padding: '12px 10px' }}>{tx.fromNumber}</td>
                                                <td style={{ padding: '12px 10px' }}>{tx.toNumber}</td>
                                                <td style={{ padding: '12px 10px', color: 'var(--primary)', fontWeight: 'bold' }}>₹{tx.amount.toLocaleString()}</td>
                                                <td style={{ padding: '12px 10px', fontStyle: 'italic', fontSize: '0.82rem' }}>{tx.description}</td>
                                                <td style={{ padding: '12px 10px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(tx.timestamp).toLocaleString()}</td>
                                                <td style={{ padding: '12px 10px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                    <button 
                                                        onClick={() => handleRejectTx(tx.id)}
                                                        style={{ padding: '6px 12px', border: '1px solid #ef4444', color: '#ef4444', background: 'transparent', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                                                    >
                                                        Reject
                                                    </button>
                                                    <button 
                                                        onClick={() => handleApproveTx(tx.id)}
                                                        style={{ padding: '6px 12px', border: 'none', background: '#10b981', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                                                    >
                                                        Approve
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No transactions pending approval. All settled.</div>
                        )}
                    </div>
                )}

                {/* 2. AML & Fraud Alerts Dashboard */}
                {activeTab === 'fraud' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {/* Stats Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
                            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', textAlign: 'center' }}>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase' }}>Active AML Alerts</span>
                                <strong style={{ fontSize: '1.8rem', color: 'var(--primary)' }}>{pendingReviewAlerts.length}</strong>
                            </div>
                            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', textAlign: 'center', borderLeft: '4px solid #ef4444' }}>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase' }}>High Severity</span>
                                <strong style={{ fontSize: '1.8rem', color: '#ef4444' }}>{highSeverityCount}</strong>
                            </div>
                            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', textAlign: 'center', borderLeft: '4px solid #f59e0b' }}>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase' }}>Medium Severity</span>
                                <strong style={{ fontSize: '1.8rem', color: '#f59e0b' }}>{mediumSeverityCount}</strong>
                            </div>
                        </div>

                        {/* Alerts Table */}
                        <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px' }}>
                            <h3 style={{ borderBottom: '2px solid rgba(79,70,229,0.1)', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: 'var(--primary)' }}>🚨 Suspicious Activity & AML Alerts</h3>

                            {isLoadingFraud ? (
                                <div style={{ textAlign: 'center', padding: '2rem' }}>Loading fraud warnings...</div>
                            ) : fraudAlerts.length > 0 ? (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.1)', color: 'var(--text-secondary)' }}>
                                                <th style={{ padding: '10px' }}>Alert ID</th>
                                                <th style={{ padding: '10px' }}>Rule Name</th>
                                                <th style={{ padding: '10px' }}>User Mobile</th>
                                                <th style={{ padding: '10px' }}>Tx ID</th>
                                                <th style={{ padding: '10px' }}>Severity</th>
                                                <th style={{ padding: '10px' }}>Alert Details</th>
                                                <th style={{ padding: '10px' }}>Status</th>
                                                <th style={{ padding: '10px', textAlign: 'center' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[...fraudAlerts].reverse().map(alert => (
                                                <tr key={alert.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', background: alert.status === 'PENDING_REVIEW' ? 'transparent' : 'rgba(0,0,0,0.02)' }}>
                                                    <td style={{ padding: '12px 10px', fontWeight: 'bold' }}>#{alert.id}</td>
                                                    <td style={{ padding: '12px 10px', fontWeight: 600 }}>{alert.ruleName}</td>
                                                    <td style={{ padding: '12px 10px' }}>{alert.userMobile}</td>
                                                    <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>{alert.transactionId ? `#${alert.transactionId}` : 'N/A'}</td>
                                                    <td style={{ padding: '12px 10px' }}>
                                                        <span style={{ 
                                                            padding: '2px 8px', 
                                                            borderRadius: '10px', 
                                                            fontSize: '0.75rem', 
                                                            fontWeight: 'bold', 
                                                            background: alert.severity === 'HIGH' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)', 
                                                            color: alert.severity === 'HIGH' ? '#ef4444' : '#f59e0b' 
                                                        }}>
                                                            {alert.severity}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px 10px', fontStyle: 'italic', fontSize: '0.82rem' }}>{alert.details}</td>
                                                    <td style={{ padding: '12px 10px', fontWeight: 600, color: alert.status === 'PENDING_REVIEW' ? '#ef4444' : 'var(--text-secondary)' }}>{alert.status}</td>
                                                    <td style={{ padding: '12px 10px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                        {alert.status === 'PENDING_REVIEW' ? (
                                                            <>
                                                                <button 
                                                                    onClick={() => handleResolveAlert(alert.id, 'DISMISSED')}
                                                                    style={{ padding: '4px 10px', border: '1px solid rgba(0,0,0,0.15)', background: 'transparent', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                                                                >
                                                                    Dismiss
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleResolveAlert(alert.id, 'RESOLVED')}
                                                                    style={{ padding: '4px 10px', border: 'none', background: 'var(--primary)', color: '#fff', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                                                                >
                                                                    Resolve
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Settled</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No compliance alerts flagged. System safe.</div>
                            )}
                        </div>
                    </div>
                )}

                {/* 3. Compliance Audit Logs */}
                {activeTab === 'logs' && (
                    <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px' }}>
                        <h3 style={{ borderBottom: '2px solid rgba(79,70,229,0.1)', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: 'var(--primary)' }}>📋 System Compliance Audit Logs</h3>

                        {isLoadingLogs ? (
                            <div style={{ textAlign: 'center', padding: '2rem' }}>Loading compliance audit...</div>
                        ) : complianceLogs.length > 0 ? (
                            <div style={{ overflowX: 'auto', maxHeight: '500px', overflowY: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.1)', color: 'var(--text-secondary)' }}>
                                            <th style={{ padding: '8px' }}>Log ID</th>
                                            <th style={{ padding: '8px' }}>Action</th>
                                            <th style={{ padding: '8px' }}>Mobile</th>
                                            <th style={{ padding: '8px' }}>IP Address</th>
                                            <th style={{ padding: '8px' }}>Details</th>
                                            <th style={{ padding: '8px' }}>Timestamp</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[...complianceLogs].reverse().map(log => (
                                            <tr key={log.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                                                <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>#{log.id}</td>
                                                <td style={{ padding: '8px' }}><span style={{ padding: '2px 6px', background: 'rgba(0,0,0,0.05)', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>{log.action}</span></td>
                                                <td style={{ padding: '8px' }}>{log.userMobile}</td>
                                                <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>{log.ipAddress}</td>
                                                <td style={{ padding: '8px', fontStyle: 'italic' }}>{log.details}</td>
                                                <td style={{ padding: '8px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{new Date(log.timestamp).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No audit log history available.</div>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
};

export default ManagerDashboard;
