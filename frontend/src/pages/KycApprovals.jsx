import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../services/api';
import { Shield, CheckCircle, XCircle, Clock, AlertTriangle, User, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

const KycApprovals = () => {
    const navigate = useNavigate();
    const user = (() => {
        try { return JSON.parse(localStorage.getItem('smart_bank_user')); } catch { return null; }
    })();

    const [pendingUsers, setPendingUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState({});
    const [actionStatus, setActionStatus] = useState({}); // per-user status
    const [expandedUser, setExpandedUser] = useState(null);
    const [rejectionRemarks, setRejectionRemarks] = useState({});
    const [showRejectInput, setShowRejectInput] = useState({});

    const loadPending = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/kyc/pending');
            setPendingUsers(res.data || []);
        } catch (err) {
            setError(getErrorMessage(err) || 'Failed to load KYC applications. Check your permissions.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!user || (user.role !== 'ROLE_ADMIN' && user.role !== 'ROLE_MANAGER' && user.role !== 'ROLE_EMPLOYEE')) {
            navigate('/dashboard');
            return;
        }
        loadPending();
    }, []);

    const handleApprove = async (mobile) => {
        setProcessing(p => ({ ...p, [mobile]: true }));
        setActionStatus(s => ({ ...s, [mobile]: null }));
        try {
            await api.post(`/kyc/approve/${mobile}`);
            setActionStatus(s => ({ ...s, [mobile]: { type: 'success', message: 'KYC approved successfully. Account is now fully active.' } }));
            setTimeout(() => {
                setPendingUsers(prev => prev.filter(u => u.mobileNumber !== mobile));
                setActionStatus(s => { const n = { ...s }; delete n[mobile]; return n; });
            }, 2000);
        } catch (err) {
            setActionStatus(s => ({ ...s, [mobile]: { type: 'error', message: getErrorMessage(err) || 'Approval failed. Please try again.' } }));
        } finally {
            setProcessing(p => ({ ...p, [mobile]: false }));
        }
    };

    const handleReject = async (mobile) => {
        const remarks = rejectionRemarks[mobile] || '';
        if (!remarks.trim()) {
            setActionStatus(s => ({ ...s, [mobile]: { type: 'error', message: 'Please provide a rejection reason before submitting.' } }));
            return;
        }
        setProcessing(p => ({ ...p, [mobile]: true }));
        setActionStatus(s => ({ ...s, [mobile]: null }));
        try {
            await api.post(`/kyc/reject/${mobile}`, { remarks });
            setActionStatus(s => ({ ...s, [mobile]: { type: 'success', message: 'KYC rejected. Customer has been notified.' } }));
            setTimeout(() => {
                setPendingUsers(prev => prev.filter(u => u.mobileNumber !== mobile));
                setActionStatus(s => { const n = { ...s }; delete n[mobile]; return n; });
            }, 2000);
        } catch (err) {
            setActionStatus(s => ({ ...s, [mobile]: { type: 'error', message: getErrorMessage(err) || 'Rejection failed. Please try again.' } }));
        } finally {
            setProcessing(p => ({ ...p, [mobile]: false }));
        }
    };

    const maskPan = (pan) => pan ? pan.substring(0, 2) + '●●●●●' + pan.substring(7) : '—';
    const maskAadhaar = (a) => a ? '●●●● ●●●● ' + a.substring(8) : '—';

    const kycStatus = (u) => {
        const s = u.kycStatus;
        if (s === 'SUBMITTED') return { label: 'Awaiting Review', cls: 'info', Icon: Clock };
        if (s === 'APPROVED') return { label: 'Approved', cls: 'success', Icon: CheckCircle };
        if (s === 'REJECTED') return { label: 'Rejected', cls: 'danger', Icon: XCircle };
        return { label: 'Pending', cls: 'warning', Icon: AlertTriangle };
    };

    return (
        <div className="kyc-approvals-page">
            {/* Page Header */}
            <div className="kyc-approvals-header">
                <div className="kyc-approvals-header-left">
                    <div className="kyc-approvals-icon">
                        <Shield size={22} />
                    </div>
                    <div>
                        <h1>KYC Compliance Portal</h1>
                        <p>Review and process customer identity verification applications</p>
                    </div>
                </div>
                <button className="kyc-refresh-btn" onClick={loadPending} disabled={loading}>
                    <RefreshCw size={16} className={loading ? 'spinning' : ''} />
                    Refresh
                </button>
            </div>

            {/* Stats Bar */}
            <div className="kyc-stats-bar">
                <div className="kyc-stat-item">
                    <span className="kyc-stat-number">{pendingUsers.length}</span>
                    <span className="kyc-stat-label">Awaiting Review</span>
                </div>
                <div className="kyc-stat-divider" />
                <div className="kyc-stat-item">
                    <span className="kyc-stat-number kyc-stat-orange">
                        {pendingUsers.filter(u => u.riskScore === 'HIGH').length}
                    </span>
                    <span className="kyc-stat-label">High Risk</span>
                </div>
                <div className="kyc-stat-divider" />
                <div className="kyc-stat-item">
                    <span className="kyc-stat-number">
                        {pendingUsers.filter(u => u.kycDocumentUrl).length}
                    </span>
                    <span className="kyc-stat-label">With Documents</span>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="kyc-error-banner">
                    <AlertTriangle size={18} />
                    <span>{error}</span>
                    <button onClick={() => setError('')}>✕</button>
                </div>
            )}

            {/* Loading State */}
            {loading ? (
                <div className="kyc-loading-grid">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="kyc-skeleton-card">
                            <div className="kyc-skeleton-line wide" />
                            <div className="kyc-skeleton-line medium" />
                            <div className="kyc-skeleton-line short" />
                        </div>
                    ))}
                </div>
            ) : pendingUsers.length === 0 ? (
                <div className="kyc-empty-state">
                    <CheckCircle size={56} className="kyc-empty-icon" />
                    <h3>All Clear</h3>
                    <p>No pending KYC applications. All submissions have been processed.</p>
                </div>
            ) : (
                <div className="kyc-applications-list">
                    {pendingUsers.map(u => {
                        const status = kycStatus(u);
                        const isExpanded = expandedUser === u.mobileNumber;
                        const isProcessing = processing[u.mobileNumber];
                        const status_msg = actionStatus[u.mobileNumber];
                        const showReject = showRejectInput[u.mobileNumber];

                        return (
                            <div key={u.mobileNumber} className={`kyc-application-card ${status_msg?.type === 'success' ? 'card-success' : ''}`}>
                                {/* Card Header */}
                                <div className="kyc-card-header" onClick={() => setExpandedUser(isExpanded ? null : u.mobileNumber)}>
                                    <div className="kyc-card-left">
                                        <div className="kyc-avatar">
                                            {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                                        </div>
                                        <div className="kyc-card-info">
                                            <div className="kyc-card-name">{u.name || 'Unknown Customer'}</div>
                                            <div className="kyc-card-meta">
                                                <span>{u.mobileNumber}</span>
                                                <span className="kyc-meta-sep">·</span>
                                                <span>{u.email || '—'}</span>
                                                {u.customerId && (
                                                    <>
                                                        <span className="kyc-meta-sep">·</span>
                                                        <span className="kyc-customer-id">{u.customerId}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="kyc-card-right">
                                        {u.riskScore && (
                                            <span className={`kyc-risk-badge risk-${u.riskScore?.toLowerCase()}`}>
                                                {u.riskScore} Risk
                                            </span>
                                        )}
                                        <span className={`kyc-status-badge status-${status.cls}`}>
                                            <status.Icon size={12} />
                                            {status.label}
                                        </span>
                                        <span className="kyc-expand-icon">
                                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                        </span>
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {isExpanded && (
                                    <div className="kyc-card-body">
                                        <div className="kyc-details-grid">
                                            <div className="kyc-detail-group">
                                                <span className="kyc-detail-label">PAN Number</span>
                                                <span className="kyc-detail-value mono">{maskPan(u.panCardNumber)}</span>
                                            </div>
                                            <div className="kyc-detail-group">
                                                <span className="kyc-detail-label">Aadhaar Number</span>
                                                <span className="kyc-detail-value mono">{maskAadhaar(u.aadhaarNumber)}</span>
                                            </div>
                                            <div className="kyc-detail-group">
                                                <span className="kyc-detail-label">Date of Birth</span>
                                                <span className="kyc-detail-value">{u.dateOfBirth || '—'}</span>
                                            </div>
                                            <div className="kyc-detail-group">
                                                <span className="kyc-detail-label">Occupation</span>
                                                <span className="kyc-detail-value">{u.occupation || '—'}</span>
                                            </div>
                                            <div className="kyc-detail-group">
                                                <span className="kyc-detail-label">Annual Income</span>
                                                <span className="kyc-detail-value">{u.annualIncome ? `₹${Number(u.annualIncome).toLocaleString('en-IN')}` : '—'}</span>
                                            </div>
                                            <div className="kyc-detail-group">
                                                <span className="kyc-detail-label">Address</span>
                                                <span className="kyc-detail-value">{[u.address, u.city, u.state, u.pincode].filter(Boolean).join(', ') || '—'}</span>
                                            </div>
                                            <div className="kyc-detail-group">
                                                <span className="kyc-detail-label">Nominee</span>
                                                <span className="kyc-detail-value">{u.nomineeName ? `${u.nomineeName} (${u.nomineeRelationship || '—'})` : '—'}</span>
                                            </div>
                                            <div className="kyc-detail-group">
                                                <span className="kyc-detail-label">KYC Document</span>
                                                <span className="kyc-detail-value">
                                                    {u.kycDocumentUrl ? (
                                                        <a href={`http://localhost:9090${u.kycDocumentUrl}`} target="_blank" rel="noreferrer" className="kyc-doc-link">
                                                            View Document ↗
                                                        </a>
                                                    ) : 'No document uploaded'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Action Status Message */}
                                        {status_msg && (
                                            <div className={`kyc-action-status ${status_msg.type}`}>
                                                {status_msg.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                                                <span>{status_msg.message}</span>
                                            </div>
                                        )}

                                        {/* Rejection Remarks Input */}
                                        {showReject && (
                                            <div className="kyc-reject-form">
                                                <label className="kyc-reject-label">Rejection Reason (required)</label>
                                                <textarea
                                                    className="kyc-reject-textarea"
                                                    placeholder="State the reason for rejection clearly. The customer will be notified with this message."
                                                    rows={3}
                                                    value={rejectionRemarks[u.mobileNumber] || ''}
                                                    onChange={e => setRejectionRemarks(r => ({ ...r, [u.mobileNumber]: e.target.value }))}
                                                />
                                            </div>
                                        )}

                                        {/* Action Buttons */}
                                        <div className="kyc-action-buttons">
                                            <button
                                                className="kyc-approve-btn"
                                                onClick={() => handleApprove(u.mobileNumber)}
                                                disabled={isProcessing || showReject}
                                            >
                                                {isProcessing && !showReject ? (
                                                    <span className="kyc-btn-spinner" />
                                                ) : (
                                                    <CheckCircle size={16} />
                                                )}
                                                Approve KYC
                                            </button>

                                            {!showReject ? (
                                                <button
                                                    className="kyc-reject-btn"
                                                    onClick={() => setShowRejectInput(s => ({ ...s, [u.mobileNumber]: true }))}
                                                    disabled={isProcessing}
                                                >
                                                    <XCircle size={16} />
                                                    Reject KYC
                                                </button>
                                            ) : (
                                                <>
                                                    <button
                                                        className="kyc-confirm-reject-btn"
                                                        onClick={() => handleReject(u.mobileNumber)}
                                                        disabled={isProcessing}
                                                    >
                                                        {isProcessing ? <span className="kyc-btn-spinner" /> : <XCircle size={16} />}
                                                        Confirm Rejection
                                                    </button>
                                                    <button
                                                        className="kyc-cancel-btn"
                                                        onClick={() => {
                                                            setShowRejectInput(s => ({ ...s, [u.mobileNumber]: false }));
                                                            setRejectionRemarks(r => ({ ...r, [u.mobileNumber]: '' }));
                                                        }}
                                                        disabled={isProcessing}
                                                    >
                                                        Cancel
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <style>{`
                .kyc-approvals-page {
                    padding: 2rem;
                    max-width: 900px;
                    margin: 0 auto;
                }
                .kyc-approvals-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 1.5rem;
                }
                .kyc-approvals-header-left {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                .kyc-approvals-icon {
                    width: 44px;
                    height: 44px;
                    background: var(--color-accent-light);
                    color: var(--color-accent);
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .kyc-approvals-header h1 {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: var(--color-text-primary);
                    margin: 0 0 0.2rem 0;
                }
                .kyc-approvals-header p {
                    font-size: 0.875rem;
                    color: var(--color-text-secondary);
                    margin: 0;
                }
                .kyc-refresh-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 1rem;
                    background: var(--color-bg);
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-btn);
                    font-size: 0.875rem;
                    color: var(--color-text-primary);
                    cursor: pointer;
                    transition: all var(--transition);
                }
                .kyc-refresh-btn:hover { background: var(--color-bg-subtle); }
                .kyc-refresh-btn:disabled { opacity: 0.6; cursor: not-allowed; }
                .spinning { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

                .kyc-stats-bar {
                    display: flex;
                    align-items: center;
                    gap: 2rem;
                    background: var(--color-bg);
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-card);
                    padding: 1rem 1.5rem;
                    margin-bottom: 1.5rem;
                }
                .kyc-stat-item { text-align: center; }
                .kyc-stat-number { display: block; font-size: 1.5rem; font-weight: 700; color: var(--color-text-primary); }
                .kyc-stat-number.kyc-stat-orange { color: var(--color-warning); }
                .kyc-stat-label { font-size: 0.75rem; color: var(--color-text-secondary); }
                .kyc-stat-divider { width: 1px; height: 36px; background: var(--color-border); }

                .kyc-error-banner {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    background: var(--color-danger-light);
                    border: 1px solid var(--color-danger);
                    color: var(--color-danger);
                    border-radius: var(--radius-card);
                    padding: 0.875rem 1rem;
                    margin-bottom: 1.5rem;
                    font-size: 0.875rem;
                }
                .kyc-error-banner button {
                    margin-left: auto;
                    background: none;
                    border: none;
                    color: var(--color-danger);
                    cursor: pointer;
                    font-size: 1rem;
                }

                .kyc-loading-grid { display: flex; flex-direction: column; gap: 1rem; }
                .kyc-skeleton-card {
                    background: var(--color-bg);
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-card);
                    padding: 1.5rem;
                }
                .kyc-skeleton-line {
                    height: 12px;
                    background: var(--color-bg-subtle);
                    border-radius: 6px;
                    margin-bottom: 0.75rem;
                    animation: shimmer 1.5s infinite;
                }
                .kyc-skeleton-line.wide { width: 60%; }
                .kyc-skeleton-line.medium { width: 40%; }
                .kyc-skeleton-line.short { width: 25%; }
                @keyframes shimmer {
                    0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; }
                }

                .kyc-empty-state {
                    text-align: center;
                    padding: 4rem 2rem;
                    background: var(--color-bg);
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-card);
                }
                .kyc-empty-icon { color: var(--color-success); margin-bottom: 1rem; }
                .kyc-empty-state h3 { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--color-text-primary); }
                .kyc-empty-state p { color: var(--color-text-secondary); font-size: 0.9rem; }

                .kyc-applications-list { display: flex; flex-direction: column; gap: 1rem; }
                .kyc-application-card {
                    background: var(--color-bg);
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-card);
                    overflow: hidden;
                    transition: box-shadow var(--transition);
                }
                .kyc-application-card:hover { box-shadow: var(--shadow-md); }
                .kyc-application-card.card-success { border-color: var(--color-success); }

                .kyc-card-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 1.25rem 1.5rem;
                    cursor: pointer;
                    user-select: none;
                }
                .kyc-card-header:hover { background: var(--color-bg-subtle); }
                .kyc-card-left { display: flex; align-items: center; gap: 1rem; }
                .kyc-avatar {
                    width: 40px;
                    height: 40px;
                    background: var(--color-accent-light);
                    color: var(--color-accent);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    font-size: 1rem;
                    flex-shrink: 0;
                }
                .kyc-card-name { font-weight: 600; font-size: 0.95rem; color: var(--color-text-primary); }
                .kyc-card-meta { font-size: 0.8rem; color: var(--color-text-secondary); margin-top: 0.2rem; }
                .kyc-meta-sep { margin: 0 0.4rem; }
                .kyc-customer-id { font-family: monospace; color: var(--color-accent); }
                .kyc-card-right { display: flex; align-items: center; gap: 0.75rem; }
                .kyc-expand-icon { color: var(--color-text-muted); }

                .kyc-risk-badge {
                    font-size: 0.7rem;
                    font-weight: 600;
                    padding: 0.25rem 0.6rem;
                    border-radius: 100px;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .risk-low { background: var(--color-success-light); color: var(--color-success); }
                .risk-medium { background: var(--color-warning-light); color: var(--color-warning); }
                .risk-high { background: var(--color-danger-light); color: var(--color-danger); }

                .kyc-status-badge {
                    display: flex;
                    align-items: center;
                    gap: 0.35rem;
                    font-size: 0.75rem;
                    font-weight: 500;
                    padding: 0.3rem 0.7rem;
                    border-radius: 100px;
                }
                .status-info { background: var(--color-info-light); color: var(--color-info); }
                .status-success { background: var(--color-success-light); color: var(--color-success); }
                .status-danger { background: var(--color-danger-light); color: var(--color-danger); }
                .status-warning { background: var(--color-warning-light); color: var(--color-warning); }

                .kyc-card-body {
                    border-top: 1px solid var(--color-border);
                    padding: 1.5rem;
                }
                .kyc-details-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                }
                .kyc-detail-group { display: flex; flex-direction: column; gap: 0.2rem; }
                .kyc-detail-label { font-size: 0.75rem; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 500; }
                .kyc-detail-value { font-size: 0.9rem; color: var(--color-text-primary); }
                .kyc-detail-value.mono { font-family: monospace; }
                .kyc-doc-link { color: var(--color-accent); text-decoration: none; font-weight: 500; }
                .kyc-doc-link:hover { text-decoration: underline; }

                .kyc-action-status {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.75rem 1rem;
                    border-radius: 8px;
                    font-size: 0.875rem;
                    margin-bottom: 1rem;
                }
                .kyc-action-status.success { background: var(--color-success-light); color: var(--color-success); border: 1px solid var(--color-success); }
                .kyc-action-status.error { background: var(--color-danger-light); color: var(--color-danger); border: 1px solid var(--color-danger); }

                .kyc-reject-form { margin-bottom: 1rem; }
                .kyc-reject-label { display: block; font-size: 0.8rem; font-weight: 500; color: var(--color-text-secondary); margin-bottom: 0.5rem; }
                .kyc-reject-textarea {
                    width: 100%;
                    padding: 0.75rem;
                    border: 1px solid var(--color-border);
                    border-radius: 8px;
                    font-family: var(--font-family);
                    font-size: 0.875rem;
                    color: var(--color-text-primary);
                    background: var(--color-bg-subtle);
                    resize: vertical;
                    transition: border-color var(--transition);
                }
                .kyc-reject-textarea:focus { outline: none; border-color: var(--color-border-focus); }

                .kyc-action-buttons { display: flex; gap: 0.75rem; flex-wrap: wrap; }
                .kyc-approve-btn, .kyc-reject-btn, .kyc-confirm-reject-btn, .kyc-cancel-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.625rem 1.25rem;
                    border-radius: var(--radius-btn);
                    font-size: 0.875rem;
                    font-weight: 500;
                    cursor: pointer;
                    border: none;
                    transition: all var(--transition);
                }
                .kyc-approve-btn { background: var(--color-success); color: #fff; }
                .kyc-approve-btn:hover:not(:disabled) { background: #047857; }
                .kyc-reject-btn { background: var(--color-bg-subtle); color: var(--color-danger); border: 1px solid var(--color-danger); }
                .kyc-reject-btn:hover:not(:disabled) { background: var(--color-danger-light); }
                .kyc-confirm-reject-btn { background: var(--color-danger); color: #fff; }
                .kyc-confirm-reject-btn:hover:not(:disabled) { background: #b91c1c; }
                .kyc-cancel-btn { background: var(--color-bg-subtle); color: var(--color-text-secondary); border: 1px solid var(--color-border); }
                .kyc-cancel-btn:hover:not(:disabled) { background: var(--color-bg-subtle); }
                button:disabled { opacity: 0.6; cursor: not-allowed; }

                .kyc-btn-spinner {
                    width: 14px;
                    height: 14px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-top-color: #fff;
                    border-radius: 50%;
                    animation: spin 0.7s linear infinite;
                    display: inline-block;
                }

                @media (max-width: 640px) {
                    .kyc-approvals-page { padding: 1rem; }
                    .kyc-details-grid { grid-template-columns: 1fr; }
                    .kyc-card-header { flex-direction: column; align-items: flex-start; gap: 0.75rem; }
                    .kyc-card-right { flex-wrap: wrap; }
                }
            `}</style>
        </div>
    );
};

export default KycApprovals;
