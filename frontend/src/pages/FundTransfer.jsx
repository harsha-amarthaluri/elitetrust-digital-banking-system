import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import '../styles/pages/FundTransfer.css';

const FundTransfer = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const user = location.state;

    const prefill = location.state?.prefillBeneficiary || null;

    const [transferType, setTransferType] = useState(
        prefill ? (prefill.type === 'MOBILE' ? 'MOBILE' : 'ACCOUNT') : 'MOBILE'
    );
    const [linkedAccounts, setLinkedAccounts] = useState([]);
    const [fromAccountId, setFromAccountId] = useState('');

    // Beneficiaries
    const [beneficiaries, setBeneficiaries] = useState([]);
    const [selectedBeneficiary, setSelectedBeneficiary] = useState(prefill || null);

    // Dynamic fields
    const [toMobileNumber, setToMobileNumber] = useState(prefill?.type === 'MOBILE' ? (prefill.mobileNumber || '') : '');
    const [toAccountNumber, setToAccountNumber] = useState(prefill?.type === 'ACCOUNT' ? (prefill.accountNumber || '') : '');
    const [toAccountId, setToAccountId] = useState('');
    const [amount, setAmount] = useState('');
    const [remarks, setRemarks] = useState('');

    const [status, setStatus] = useState(null); // 'processing', 'success', 'confirm', null
    const [error, setError] = useState('');
    const [transactionDetails, setTransactionDetails] = useState(null);

    // Daily limit info
    const [dailyLimit, setDailyLimit] = useState(null);
    const [dailyUsed, setDailyUsed] = useState(null);

    useEffect(() => {
        if (!user || !user.mobileNumber) {
            navigate('/');
            return;
        }

        // Fetch linked accounts
        api.get(`/linked-accounts/${user.mobileNumber}`)
            .then(res => {
                const accounts = res.data || [];
                setLinkedAccounts(accounts);
                const primary = accounts.find(acc => acc.isPrimary || acc.primaryAccount);
                if (primary) {
                    setFromAccountId(primary.id);
                    setDailyLimit(primary.dailyLimit !== undefined ? primary.dailyLimit : 100000);
                    setDailyUsed(primary.dailyUsed !== undefined ? primary.dailyUsed : 0);
                } else if (accounts.length > 0) {
                    setFromAccountId(accounts[0].id);
                    setDailyLimit(accounts[0].dailyLimit !== undefined ? accounts[0].dailyLimit : 100000);
                    setDailyUsed(accounts[0].dailyUsed !== undefined ? accounts[0].dailyUsed : 0);
                }
            })
            .catch(err => {
                console.error("Failed to load accounts", err);
                setError("Could not load your bank accounts.");
            });

        // Fetch beneficiaries
        api.get(`/beneficiaries/${user.mobileNumber}`)
            .then(res => {
                const mapped = (res.data || []).map(b => {
                    const isMobile = b.accountNumber && /^[0-9]{10}$/.test(b.accountNumber) && (!b.bankName || b.bankName === 'EliteTrust Mobile');
                    return {
                        ...b,
                        type: isMobile ? 'MOBILE' : 'ACCOUNT',
                        mobileNumber: isMobile ? b.accountNumber : null,
                        accountNumber: isMobile ? null : b.accountNumber
                    };
                });
                setBeneficiaries(mapped);
            })
            .catch(() => {});
    }, [user, navigate]);

    const handleAccountChange = (e) => {
        const id = e.target.value;
        setFromAccountId(id);
        const acc = linkedAccounts.find(a => a.id.toString() === id.toString());
        if (acc) {
            setDailyLimit(acc.dailyLimit !== undefined ? acc.dailyLimit : 100000);
            setDailyUsed(acc.dailyUsed !== undefined ? acc.dailyUsed : 0);
        }
    };

    const handleBeneficiarySelect = (b) => {
        setSelectedBeneficiary(b);
        if (b.type === 'MOBILE') {
            setTransferType('MOBILE');
            setToMobileNumber(b.mobileNumber || '');
            setToAccountNumber('');
        } else {
            setTransferType('ACCOUNT');
            setToAccountNumber(b.accountNumber || '');
            setToMobileNumber('');
        }
        setError('');
    };

    const clearBeneficiary = () => {
        setSelectedBeneficiary(null);
        setToMobileNumber('');
        setToAccountNumber('');
    };

    const handleTransfer = async (e) => {
        e.preventDefault();
        setError('');

        if (!fromAccountId) {
            setError('Please select an account to transfer from.');
            return;
        }
        if (!amount || parseFloat(amount) <= 0) {
            setError('Amount must be greater than zero.');
            return;
        }
        const acc = linkedAccounts.find(a => a.id.toString() === fromAccountId.toString());
        if (acc && acc.transactionLimit && parseFloat(amount) > acc.transactionLimit) {
            setError(`Per-transaction limit exceeded. Maximum allowed: ₹${acc.transactionLimit.toLocaleString('en-IN')}`);
            return;
        }
        if (transferType === 'SELF' && fromAccountId.toString() === toAccountId.toString()) {
            setError('Cannot transfer to the same account.');
            return;
        }
        if (dailyLimit !== null && dailyUsed !== null) {
            const remaining = dailyLimit - dailyUsed;
            if (parseFloat(amount) > remaining) {
                setError(`Daily transfer limit exceeded. Remaining limit: ₹${remaining.toLocaleString('en-IN')}`);
                return;
            }
        }

        setStatus('confirm');
    };

    const confirmTransfer = async () => {
        setStatus('processing');

        const payload = {
            type: transferType,
            fromAccountId: parseInt(fromAccountId),
            toMobileNumber: transferType === 'MOBILE' ? toMobileNumber : null,
            toAccountNumber: transferType === 'ACCOUNT' ? toAccountNumber : null,
            toAccountId: transferType === 'SELF' ? parseInt(toAccountId) : null,
            amount: parseFloat(amount),
            category: remarks || 'Transfer',
            beneficiaryId: selectedBeneficiary?.id || null,
        };

        try {
            const response = await api.post('/transactions/transfer', payload);
            setTransactionDetails({ ...response.data, amount: payload.amount });
            setTimeout(() => setStatus('success'), 600);
        } catch (err) {
            console.error("Transfer failed", err);
            setError(err.response?.data?.message || err.response?.data?.error || 'Transfer failed. Check your balance or recipient details.');
            setStatus(null);
        }
    };

    const renderBeneficiaryQuickPick = () => {
        if (beneficiaries.length === 0) return null;
        return (
            <div style={{ marginBottom: '1.5rem' }}>
                <label className="label" style={{ marginBottom: '0.75rem', display: 'block' }}>
                    Quick Pick — Saved Beneficiaries
                </label>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {beneficiaries.slice(0, 8).map(b => (
                        <div
                            key={b.id}
                            onClick={() => handleBeneficiarySelect(b)}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '6px',
                                cursor: 'pointer',
                                padding: '10px 14px',
                                borderRadius: '12px',
                                background: selectedBeneficiary?.id === b.id
                                    ? 'rgba(99,102,241,0.2)'
                                    : 'rgba(255,255,255,0.04)',
                                border: `1px solid ${selectedBeneficiary?.id === b.id ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
                                transition: 'all 0.2s',
                                minWidth: '80px',
                                textAlign: 'center',
                            }}
                        >
                            <div style={{
                                width: '38px', height: '38px', borderRadius: '50%',
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff', fontWeight: 700, fontSize: '0.9rem',
                            }}>
                                {(b.name || 'B').slice(0, 2).toUpperCase()}
                            </div>
                            <span style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 500 }}>{b.name}</span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', lineHeight: 1.2 }}>
                                {b.type === 'MOBILE' ? b.mobileNumber : `****${(b.accountNumber || '').slice(-4)}`}
                            </span>
                        </div>
                    ))}
                    <div
                        onClick={() => navigate('/beneficiaries', { state: user })}
                        style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                            cursor: 'pointer', padding: '10px 14px', borderRadius: '12px',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px dashed rgba(255,255,255,0.15)',
                            minWidth: '80px', textAlign: 'center', color: 'var(--text-secondary)',
                        }}
                    >
                        <div style={{ width: '38px', height: '38px', borderRadius: '50%', border: '1px dashed rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>+</div>
                        <span style={{ fontSize: '0.75rem' }}>Manage</span>
                    </div>
                </div>
                {selectedBeneficiary && (
                    <button
                        onClick={clearBeneficiary}
                        style={{ marginTop: '0.75rem', background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                        ✕ Clear selection
                    </button>
                )}
            </div>
        );
    };

    const renderFormFields = () => {
        switch (transferType) {
            case 'MOBILE':
                return (
                    <div className="form-section">
                        <div className="form-group">
                            <label className="label">Recipient Mobile Number</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="Enter 10-digit mobile number"
                                value={toMobileNumber}
                                onChange={e => setToMobileNumber(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                                required
                            />
                        </div>
                    </div>
                );
            case 'ACCOUNT':
                return (
                    <div className="form-section">
                        <div className="form-group">
                            <label className="label">Beneficiary Account Number</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="Enter account number"
                                value={toAccountNumber}
                                onChange={e => setToAccountNumber(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                );
            case 'SELF':
                return (
                    <div className="form-section">
                        <div className="form-group">
                            <label className="label">To Account (My Accounts)</label>
                            <select
                                className="select-field"
                                value={toAccountId}
                                onChange={e => setToAccountId(e.target.value)}
                                required
                            >
                                <option value="">Select Destination Account</option>
                                {linkedAccounts.filter(acc => acc.id.toString() !== fromAccountId.toString()).map(acc => (
                                    <option key={`to-${acc.id}`} value={acc.id}>
                                        {acc.bankName} - **** {acc.accountNumber?.slice(-4)}
                                    </option>
                                ))}
                            </select>
                            {linkedAccounts.length < 2 && (
                                <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                                    You need at least 2 linked accounts for self transfer.
                                </p>
                            )}
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    if (status === 'confirm' || status === 'processing') {
        const fromAcc = linkedAccounts.find(a => a.id.toString() === fromAccountId.toString());
        const toDisplay = transferType === 'MOBILE' ? `Mobile: ${toMobileNumber}` :
            transferType === 'ACCOUNT' ? `A/c: ****${toAccountNumber.slice(-4)}` :
                `Self A/c: ****${linkedAccounts.find(a => a.id.toString() === toAccountId.toString())?.accountNumber?.slice(-4) || ''}`;

        return (
            <div className="transfer-container" style={{ justifyContent: 'center', alignItems: 'center', display: 'flex', animation: 'fadeIn 0.3s ease' }}>
                <div className="glass-panel" style={{ padding: '2.5rem', borderRadius: '16px', maxWidth: '450px', width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
                    <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Confirm Transfer</h2>

                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Transfer Amount</span>
                            <strong style={{ fontSize: '1.3rem', color: 'var(--primary)' }}>₹{parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                        </div>
                        <hr style={{ border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.1)', margin: '15px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>From Account</span>
                            <span style={{ fontWeight: '500' }}>**** {fromAcc?.accountNumber?.slice(-4)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: selectedBeneficiary ? '12px' : 0 }}>
                            <span style={{ color: 'var(--text-secondary)' }}>To Beneficiary</span>
                            <span style={{ fontWeight: '500' }}>{toDisplay}</span>
                        </div>
                        {selectedBeneficiary && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Payee Name</span>
                                <span style={{ fontWeight: '500', color: '#818cf8' }}>{selectedBeneficiary.name}</span>
                            </div>
                        )}
                        {remarks && (
                            <>
                                <hr style={{ border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.1)', margin: '15px 0' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Remarks</span>
                                    <span style={{ fontWeight: '500' }}>{remarks}</span>
                                </div>
                            </>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button className="btn-transfer" style={{ background: 'transparent', border: '1px solid var(--text-secondary)', color: 'var(--text-secondary)' }} onClick={() => setStatus(null)} disabled={status === 'processing'}>
                            Cancel
                        </button>
                        <button className="btn-transfer" onClick={confirmTransfer} disabled={status === 'processing'}>
                            {status === 'processing' ? 'Processing...' : 'Confirm & Pay'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className="transfer-container" style={{ justifyContent: 'center', alignItems: 'center', display: 'flex' }}>
                <div className="glass-panel" style={{ padding: '3.5rem', textAlign: 'center', borderRadius: '24px', maxWidth: '500px', animation: 'scaleUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
                    <div style={{ fontSize: '5rem', marginBottom: '1rem', color: '#10b981', animation: 'tada 1s ease-in-out' }}>✓</div>
                    <h2 style={{ marginBottom: '0.5rem', fontSize: '1.8rem' }}>Transfer Successful!</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '1.1rem' }}>
                        Your transaction of <strong style={{ color: 'var(--text-primary)' }}>₹{parseFloat(transactionDetails?.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> has been processed.
                    </p>
                    {transactionDetails?.updatedBalance !== undefined && (
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '12px', marginBottom: '2rem', display: 'inline-block' }}>
                            <span style={{ color: '#10b981', fontSize: '0.9rem' }}>Updated Balance: </span>
                            <strong style={{ color: '#10b981', fontSize: '1.2rem' }}>₹{transactionDetails.updatedBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button
                            className="btn-transfer"
                            style={{ background: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)' }}
                            onClick={() => navigate('/dashboard', { state: user })}
                        >
                            Back to Home
                        </button>
                        <button
                            className="btn-transfer"
                            onClick={() => {
                                setStatus(null);
                                setAmount('');
                                setToMobileNumber('');
                                setToAccountNumber('');
                                setToAccountId('');
                                setRemarks('');
                                setTransactionDetails(null);
                                setSelectedBeneficiary(null);
                            }}
                        >
                            New Transfer
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="transfer-container">
            <div className="transfer-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                    <button className="back-btn" onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '1.5rem', cursor: 'pointer' }}>
                        ←
                    </button>
                    <h1 style={{ margin: 0 }}>Pay & Transfer</h1>
                </div>
                <p style={{ color: 'var(--text-secondary)', marginLeft: '3rem' }}>Send money securely.</p>
            </div>

            {error && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    {error}
                </div>
            )}

            {/* Daily limit bar */}
            {dailyLimit !== null && (
                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <span>Daily Transfer Used</span>
                        <span>
                            <strong style={{ color: '#fff' }}>₹{(dailyUsed || 0).toLocaleString('en-IN')}</strong>
                            {' / '}
                            ₹{dailyLimit.toLocaleString('en-IN')}
                        </span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                            height: '100%',
                            width: `${Math.min(((dailyUsed || 0) / dailyLimit) * 100, 100)}%`,
                            background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                            borderRadius: '4px',
                            transition: 'width 0.5s ease',
                        }} />
                    </div>
                </div>
            )}

            {/* Beneficiary Quick Pick */}
            {renderBeneficiaryQuickPick()}

            {/* Transfer Type Tabs */}
            <div className="transfer-tabs">
                <div
                    className={`tab-item ${transferType === 'MOBILE' ? 'active' : ''}`}
                    onClick={() => { setTransferType('MOBILE'); setError(''); clearBeneficiary(); }}
                >
                    Mobile Number
                </div>
                <div
                    className={`tab-item ${transferType === 'ACCOUNT' ? 'active' : ''}`}
                    onClick={() => { setTransferType('ACCOUNT'); setError(''); clearBeneficiary(); }}
                >
                    Account No
                </div>
                <div
                    className={`tab-item ${transferType === 'SELF' ? 'active' : ''}`}
                    onClick={() => { setTransferType('SELF'); setError(''); clearBeneficiary(); }}
                >
                    Self Transfer
                </div>
            </div>

            <div className="transfer-form-card glass-panel">
                <form onSubmit={handleTransfer}>
                    {/* From Account */}
                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label className="label">From Account</label>
                        <select
                            className="select-field"
                            value={fromAccountId}
                            onChange={handleAccountChange}
                            required
                        >
                            {linkedAccounts.length === 0 && <option value="">No linked accounts</option>}
                            {linkedAccounts.map(acc => (
                                <option key={acc.id} value={acc.id}>
                                    {acc.bankName} - **** {acc.accountNumber?.slice(-4)} (Avl: ₹{acc.balance?.toLocaleString('en-IN', { minimumFractionDigits: 2 })})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Dynamic Fields */}
                    {renderFormFields()}

                    {/* Amount & Remarks */}
                    <div className="form-section" style={{ marginTop: '1.5rem' }}>
                        <div className="form-group">
                            <label className="label">Amount</label>
                            <div className="amount-input-group">
                                <span className="currency-symbol">₹</span>
                                <input
                                    type="number"
                                    className="input-amount"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    min="1"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="label">Remarks / Note (Optional)</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="What is this for?"
                                value={remarks}
                                onChange={e => setRemarks(e.target.value)}
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn-transfer" disabled={status === 'processing' || linkedAccounts.length === 0}>
                        {status === 'processing' ? 'Processing...' : 'Proceed to Pay'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default FundTransfer;
