import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { showToast } from '../components/Toast';
import '../styles/pages/Profile.css';

const Profile = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const user = location.state || {}; // Get user from state
    console.log(user);

    const [currentUser, setCurrentUser] = useState(user);
    const [activeTab, setActiveTab] = useState(location.state?.openBankTab ? 'banks' : 'personal');

    const [personalInfo, setPersonalInfo] = useState({
        firstName: currentUser.name?.split(' ')[0] || 'Guest',
        lastName: currentUser.name?.split(' ').slice(1).join(' ') || '',
        email: currentUser.email || 'guest@example.com',
        phone: currentUser.mobileNumber || '',
        address: currentUser.address || 'Address not set'
    });

    const [passwordData, setPasswordData] = useState({
        current: '',
        new: '',
        confirm: ''
    });

    const [deviceSessions, setDeviceSessions] = useState([]);
    const [currentFingerprint, setCurrentFingerprint] = useState('');

    const notificationSettings = [
        { id: 'trans_email', label: 'Transaction Emails', desc: 'Receive emails for every transaction.', checked: true },
        { id: 'trans_push', label: 'Transaction Push', desc: 'Receive push notifications for transactions.', checked: true },
        { id: 'sec_alert', label: 'Security Alerts', desc: 'Get notified about new logins and security changes.', checked: true },
        { id: 'offers', label: 'Marketing Offers', desc: 'Receive updates about new features and promos.', checked: false },
    ];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setPersonalInfo(prev => ({ ...prev, [name]: value }));
    };

    // --- Bank Accounts Logic ---

    const [linkedAccounts, setLinkedAccounts] = useState([]);
    const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
    const [accountsError, setAccountsError] = useState(null);

    // State for Link New Bank Account section
    const [availableAccounts, setAvailableAccounts] = useState([]);
    const [isLoadingAvailable, setIsLoadingAvailable] = useState(false);
    const [availableError, setAvailableError] = useState(null);
    const [selectedAccountsToLink, setSelectedAccountsToLink] = useState([]);
    const [isLinking, setIsLinking] = useState(false);

    const [editingAccount, setEditingAccount] = useState(null);
    const [editForm, setEditForm] = useState({
        accountType: 'SAVINGS',
        nomineeName: '',
        nomineeRelationship: '',
        nomineeAge: '',
        jointHolderName: '',
        jointHolderMobile: '',
        transactionLimit: 50000,
        dailyLimit: 100000
    });

    // Apply for Bank Account Form State
    const [appForm, setAppForm] = useState({
        accountType: 'SAVINGS',
        nomineeName: '',
        nomineeRelationship: '',
        nomineeAge: '',
        jointHolderName: '',
        jointHolderMobile: ''
    });
    const [isSubmittingApp, setIsSubmittingApp] = useState(false);
    const [pendingApplications, setPendingApplications] = useState([]);
    const [isLoadingApps, setIsLoadingApps] = useState(false);

    useEffect(() => {
        const fetchUserProfile = async () => {
            if (!user?.mobileNumber) return;
            try {
                const res = await api.get(`/user/${user.mobileNumber}`);
                if (res.data) {
                    setCurrentUser(res.data);
                    setPersonalInfo({
                        firstName: res.data.name?.split(' ')[0] || '',
                        lastName: res.data.name?.split(' ').slice(1).join(' ') || '',
                        email: res.data.email || '',
                        phone: res.data.mobileNumber || '',
                        address: res.data.address || ''
                    });
                }
            } catch (err) {
                console.error("Failed to fetch user profile:", err);
            }
        };
        fetchUserProfile();
    }, [user?.mobileNumber]);

    useEffect(() => {
        const fetchData = async () => {
            if (!user?.mobileNumber) return;

            // Fetch Linked Accounts
            setIsLoadingAccounts(true);
            setAccountsError(null);
            try {
                const response = await api.get(`/linked-accounts/${user.mobileNumber}`);
                setLinkedAccounts(response.data || []);
            } catch (err) {
                console.error("Failed to fetch linked bank accounts:", err);
                setAccountsError("Failed to load linked bank accounts.");
            } finally {
                setIsLoadingAccounts(false);
            }

            // Fetch Available external accounts for linking
            setIsLoadingAvailable(true);
            setAvailableError(null);
            try {
                const response = await api.get(`/bank/${user.mobileNumber}`);
                setAvailableAccounts(response.data || []);
            } catch (err) {
                console.error("Failed to fetch available accounts:", err);
                setAvailableError("Failed to load available bank accounts.");
            } finally {
                setIsLoadingAvailable(false);
            }

            // Fetch Pending Applications
            setIsLoadingApps(true);
            try {
                const res = await api.get(`/bank/${user.mobileNumber}/applications`);
                setPendingApplications(res.data || []);
            } catch (err) {
                console.error("Failed to fetch pending applications:", err);
            } finally {
                setIsLoadingApps(false);
            }
        };

        if (activeTab === 'banks') {
            fetchData();
        }
    }, [activeTab, user?.mobileNumber]);

    const handleApplyAccount = async (e) => {
        e.preventDefault();
        if (currentUser.kycStatus !== 'APPROVED') {
            showToast('KYC must be APPROVED before applying for a bank account.', 'error');
            return;
        }
        setIsSubmittingApp(true);
        try {
            await api.post('/bank/apply', {
                mobileNumber: currentUser.mobileNumber,
                accountType: appForm.accountType,
                nomineeName: appForm.nomineeName || null,
                nomineeRelationship: appForm.nomineeRelationship || null,
                nomineeAge: appForm.nomineeAge ? parseInt(appForm.nomineeAge) : null,
                jointHolderName: appForm.jointHolderName || null,
                jointHolderMobile: appForm.jointHolderMobile || null
            });
            showToast('Bank account application submitted successfully!', 'success');
            setAppForm({
                accountType: 'SAVINGS',
                nomineeName: '',
                nomineeRelationship: '',
                nomineeAge: '',
                jointHolderName: '',
                jointHolderMobile: ''
            });
            const res = await api.get(`/bank/${user.mobileNumber}/applications`);
            setPendingApplications(res.data || []);
        } catch (err) {
            console.error('Failed to apply for bank account:', err);
            showToast(err.response?.data?.message || 'Failed to submit application. Please try again.', 'error');
        } finally {
            setIsSubmittingApp(false);
        }
    };

    const toggleAccountSelection = (accountNumber) => {
        setSelectedAccountsToLink(prev =>
            prev.includes(accountNumber)
                ? prev.filter(acc => acc !== accountNumber)
                : [...prev, accountNumber]
        );
    };

    const handleLinkAccounts = async () => {
        if (selectedAccountsToLink.length === 0) return;
        setIsLinking(true);

        const accountsToPayload = availableAccounts.filter(acc =>
            selectedAccountsToLink.includes(acc.accountNumber)
        );

        try {
            await api.post("/link-account", accountsToPayload);

            const response = await api.get(`/linked-accounts/${user.mobileNumber}`);
            setLinkedAccounts(response.data || []);

            setSelectedAccountsToLink([]);
            showToast('Accounts successfully linked!', 'success');
        } catch (err) {
            console.error('Failed to link bank accounts:', err);
            showToast('Failed to link bank accounts. Please try again.', 'error');
        } finally {
            setIsLinking(false);
        }
    };

    const handleRemoveBankAccount = async (accountId) => {
        if (window.confirm('Are you sure you want to unlink this bank account?')) {
            try {
                await api.post(`/unlink-account`, { accountId });
                const response = await api.get(`/linked-accounts/${user.mobileNumber}`);
                setLinkedAccounts(response.data || []);
                showToast('Bank account unlinked.', 'info');
            } catch (err) {
                console.error('Failed to unlink bank account:', err);
                showToast('Failed to unlink bank account. Please try again.', 'error');
            }
        }
    };

    const handleSetPrimary = async (accountId) => {
        try {
            await api.post("/set-primary-account", {
                mobileNumber: user.mobileNumber,
                accountId: accountId
            });
            setLinkedAccounts(linkedAccounts.map(acc => ({
                ...acc,
                isPrimary: acc.id === accountId
            })));
            showToast('Primary account updated.', 'success');
        } catch (err) {
            console.error('Failed to set primary account:', err);
            showToast('Failed to set primary account. Please try again.', 'error');
        }
    };

    useEffect(() => {
        if (activeTab === 'security' && user?.mobileNumber) {
            api.get(`/devices/${user.mobileNumber}`)
                .then(res => setDeviceSessions(res.data || []))
                .catch(err => console.error("Failed to load devices", err));
            const fp = `${navigator.userAgent}_${navigator.language || ''}_${window.screen.width}x${window.screen.height}`;
            setCurrentFingerprint(fp);
        }
    }, [activeTab, user?.mobileNumber]);

    const handleToggleTrust = async (id) => {
        try {
            await api.post(`/devices/${id}/trust`);
            setDeviceSessions(prev => prev.map(d => d.id === id ? { ...d, trusted: !d.trusted } : d));
        } catch (err) {
            console.error('Failed to toggle trust', err);
            showToast('Failed to update device trust status.', 'error');
        }
    };

    const handleRevokeDevice = async (id) => {
        if (!window.confirm('Terminate this session?')) return;
        try {
            await api.delete(`/devices/${id}`);
            setDeviceSessions(prev => prev.filter(d => d.id !== id));
            showToast('Device session terminated.', 'info');
        } catch (err) {
            console.error('Failed to revoke session', err);
            showToast('Failed to terminate device session.', 'error');
        }
    };

    const handleSaveAccountDetails = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/bank/${editingAccount.id}/details`, {
                accountType: editForm.accountType,
                nomineeName: editForm.nomineeName || null,
                nomineeRelationship: editForm.nomineeRelationship || null,
                nomineeAge: editForm.nomineeAge || null,
                jointHolderName: editForm.jointHolderName || null,
                jointHolderMobile: editForm.jointHolderMobile || null,
                transactionLimit: editForm.transactionLimit,
                dailyLimit: editForm.dailyLimit
            });
            showToast('Account settings updated successfully!', 'success');
            setEditingAccount(null);
            const response = await api.get(`/linked-accounts/${user.mobileNumber}`);
            setLinkedAccounts(response.data || []);
        } catch (err) {
            console.error('Failed to update account details:', err);
            showToast('Failed to update account details. Please try again.', 'error');
        }
    };

    const renderBankAccounts = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Linked Accounts List */}
            <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px' }}>
                <div className="section-header">
                    <h2>Linked Bank Accounts</h2>
                </div>
                {isLoadingAccounts ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        Loading bank accounts...
                    </div>
                ) : accountsError ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
                        {accountsError}
                    </div>
                ) : linkedAccounts.length > 0 ? (
                    <div className="accounts-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                        {linkedAccounts.map(acc => (
                            <div key={acc.id} className="account-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '16px', border: acc.isPrimary ? '2px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ fontSize: '1.8rem' }}>🏦</div>
                                    <div>
                                        <h4 style={{ margin: '0 0 5px 0', fontSize: '1.05rem', fontWeight: 600 }}>{acc.bankName} <span style={{ fontSize: '0.7rem', background: 'rgba(129,140,248,0.15)', padding: '2px 8px', borderRadius: '10px', marginLeft: '6px', color: '#818cf8', fontWeight: 600 }}>{acc.accountType || 'SAVINGS'}</span></h4>
                                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span>Account No: •••• {acc.accountNumber.slice(-4)}</span>
                                            <span>Limits: Tx: ₹{(acc.transactionLimit || 50000).toLocaleString()} | Daily: ₹{(acc.dailyLimit || 100000).toLocaleString()}</span>
                                            {acc.nomineeName ? (
                                                <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>👥 Nominee: {acc.nomineeName} ({acc.nomineeRelationship})</span>
                                            ) : (
                                                <span style={{ color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>No Nominee configured</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                                    <h4 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.1rem' }}>₹{acc.balance.toLocaleString()}</h4>
                                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Available Balance</span>
                                    
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                                        {acc.isPrimary || linkedAccounts.length === 1 ? (
                                            <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '3px 10px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                                                Primary
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => handleSetPrimary(acc.id)}
                                                style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '6px', color: '#818cf8', fontSize: '0.72rem', cursor: 'pointer', padding: '3px 10px' }}
                                            >
                                                Set Primary
                                            </button>
                                        )}

                                        <button
                                            onClick={() => {
                                                setEditingAccount(acc);
                                                setEditForm({
                                                    accountType: acc.accountType || 'SAVINGS',
                                                    nomineeName: acc.nomineeName || '',
                                                    nomineeRelationship: acc.nomineeRelationship || '',
                                                    nomineeAge: acc.nomineeAge !== null && acc.nomineeAge !== undefined ? acc.nomineeAge : '',
                                                    jointHolderName: acc.jointHolderName || '',
                                                    jointHolderMobile: acc.jointHolderMobile || '',
                                                    transactionLimit: acc.transactionLimit || 50000,
                                                    dailyLimit: acc.dailyLimit || 100000
                                                });
                                            }}
                                            style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '6px', color: '#818cf8', fontSize: '0.72rem', cursor: 'pointer', padding: '3px 10px' }}
                                        >
                                            Configure
                                        </button>

                                        <button
                                            onClick={() => handleRemoveBankAccount(acc.id)}
                                            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', color: '#ef4444', fontSize: '0.72rem', cursor: 'pointer', padding: '3px 10px' }}
                                        >
                                            Unlink
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No bank accounts linked to this mobile number.
                    </div>
                )}
            </div>

            {/* Apply for a new bank account */}
            <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px' }}>
                <div className="section-header">
                    <h2>Apply for new EliteTrust Bank Account</h2>
                </div>
                {currentUser.kycStatus !== 'APPROVED' ? (
                    <div style={{ padding: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', color: '#f87171', fontSize: '0.9rem' }}>
                        ⚠️ <strong>KYC Verification Required:</strong> Your current KYC status is <strong>{currentUser.kycStatus || 'PENDING'}</strong>. You can only apply for a new bank account once your identity verification is approved.
                    </div>
                ) : (
                    <form onSubmit={handleApplyAccount} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div className="form-group">
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary, #94a3b8)', marginBottom: '0.4rem', fontWeight: 600 }}>Account Type</label>
                            <select 
                                className="form-input" 
                                style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff' }}
                                value={appForm.accountType} 
                                onChange={e => setAppForm({ ...appForm, accountType: e.target.value })}
                            >
                                <option value="SAVINGS" style={{ background: '#0b0f19' }}>Savings Account</option>
                                <option value="CURRENT" style={{ background: '#0b0f19' }}>Current Account</option>
                            </select>
                        </div>

                        <h4 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', margin: '0.5rem 0', color: '#818cf8', fontWeight: 600, fontSize: '0.95rem' }}>Nominee Details (Optional)</h4>
                        
                        <div className="form-group">
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary, #94a3b8)', marginBottom: '0.4rem', fontWeight: 600 }}>Nominee Name</label>
                            <input 
                                type="text" 
                                className="form-input" 
                                placeholder="Enter nominee's full name"
                                style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', boxSizing: 'border-box' }}
                                value={appForm.nomineeName} 
                                onChange={e => setAppForm({ ...appForm, nomineeName: e.target.value })} 
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary, #94a3b8)', marginBottom: '0.4rem', fontWeight: 600 }}>Relationship</label>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    placeholder="e.g. Spouse, Parent"
                                    style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', boxSizing: 'border-box' }}
                                    value={appForm.nomineeRelationship} 
                                    onChange={e => setAppForm({ ...appForm, nomineeRelationship: e.target.value })} 
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary, #94a3b8)', marginBottom: '0.4rem', fontWeight: 600 }}>Nominee Age</label>
                                <input 
                                    type="number" 
                                    className="form-input" 
                                    placeholder="Age"
                                    style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', boxSizing: 'border-box' }}
                                    value={appForm.nomineeAge} 
                                    onChange={e => setAppForm({ ...appForm, nomineeAge: e.target.value })} 
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            className="btn-save" 
                            disabled={isSubmittingApp}
                            style={{ marginTop: '0.5rem', background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', width: '100%' }}
                        >
                            {isSubmittingApp ? 'Submitting Application...' : 'Submit Bank Account Application'}
                        </button>
                    </form>
                )}
            </div>

            {/* Pending Applications List */}
            {pendingApplications.length > 0 && (
                <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px' }}>
                    <div className="section-header">
                        <h2>Pending Applications</h2>
                    </div>
                    {isLoadingApps ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading applications...</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {pendingApplications.map(app => (
                                <div key={app.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '12px' }}>
                                    <div>
                                        <h4 style={{ margin: '0 0 4px 0', fontWeight: 600 }}>{app.accountType} Account</h4>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Applied on {new Date(app.accountOpenDate).toLocaleDateString()}</span>
                                    </div>
                                    <span style={{ fontSize: '0.8rem', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold' }}>
                                        Awaiting Approval
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Available Bank Accounts for Linking */}
            <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px' }}>
                <div className="section-header">
                    <h2>Link Bank Account</h2>
                </div>
                {isLoadingAvailable ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        Fetching your accounts...
                    </div>
                ) : availableError ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
                        {availableError}
                    </div>
                ) : availableAccounts.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            We found the following accounts associated with your mobile number (+91 {user?.mobileNumber}).
                        </p>
                        <div className="available-accounts-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {availableAccounts.map(acc => {
                                const isAlreadyLinked = linkedAccounts.some(linked => linked.accountNumber === acc.accountNumber);
                                const isSelected = selectedAccountsToLink.includes(acc.accountNumber);

                                return (
                                    <div
                                        key={acc.accountNumber}
                                        onClick={() => !isAlreadyLinked && toggleAccountSelection(acc.accountNumber)}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '1rem',
                                            background: isSelected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                            borderRadius: '12px',
                                            border: `2px solid ${isSelected ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)'}`,
                                            cursor: isAlreadyLinked ? 'not-allowed' : 'pointer',
                                            opacity: isAlreadyLinked ? 0.5 : 1,
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '50%',
                                                border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--text-secondary)'}`,
                                                background: isSelected ? 'var(--primary)' : 'transparent',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                marginRight: '0.5rem'
                                            }}>
                                                {isSelected && <span style={{ color: '#fff', fontSize: '12px' }}>✓</span>}
                                            </div>
                                            <div>
                                                <h4 style={{ margin: '0 0 5px 0' }}>{acc.bankName}</h4>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>A/c: •••• {acc.accountNumber.slice(-4)}</span>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            {isAlreadyLinked ? (
                                                <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 'bold' }}>Already Linked</span>
                                            ) : (
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Select to Link</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <button
                            className="btn-save"
                            onClick={handleLinkAccounts}
                            disabled={isLinking || selectedAccountsToLink.length === 0}
                            style={{
                                marginTop: '1rem',
                                opacity: (isLinking || selectedAccountsToLink.length === 0) ? 0.5 : 1,
                                cursor: (isLinking || selectedAccountsToLink.length === 0) ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {isLinking ? 'Linking Accounts...' : `Link Selected Account${selectedAccountsToLink.length > 1 ? 's' : ''}`}
                        </button>
                    </div>
                ) : (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No external bank accounts found for this mobile number.
                    </div>
                )}
            </div>
        </div>
    );

    const renderPersonal = () => (
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px' }}>
            <div className="section-header">
                <h2>Personal Information</h2>
            </div>
            <div className="form-grid">
                <div className="form-group">
                    <label>First Name</label>
                    <input type="text" name="firstName" className="form-input" value={personalInfo.firstName} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                    <label>Last Name</label>
                    <input type="text" name="lastName" className="form-input" value={personalInfo.lastName} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                    <label>Email Address</label>
                    <input type="email" name="email" className="form-input" value={personalInfo.email} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                    <label>Mobile Number</label>
                    <input type="tel" name="phone" className="form-input" value={personalInfo.phone} onChange={handleInputChange} />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Address</label>
                    <input type="text" name="address" className="form-input" value={personalInfo.address} onChange={handleInputChange} />
                </div>
            </div>
            <button className="btn-save">Save Changes</button>
        </div>
    );

    const renderSecurity = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Password Change */}
            <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px' }}>
                <div className="section-header">
                    <h2>Change Password</h2>
                </div>
                <div className="form-grid" style={{ maxWidth: '600px' }}>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label>Current Password</label>
                        <input type="password" className="form-input" placeholder="••••••••" />
                    </div>
                    <div className="form-group">
                        <label>New Password</label>
                        <input type="password" className="form-input" placeholder="••••••••" />
                    </div>
                    <div className="form-group">
                        <label>Confirm Password</label>
                        <input type="password" className="form-input" placeholder="••••••••" />
                    </div>
                </div>
                <button className="btn-save">Update Password</button>
            </div>

            {/* Manage Devices */}
            <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px' }}>
                <div className="section-header">
                    <h2>Manage Devices</h2>
                </div>
                <div className="devices-list">
                    {deviceSessions.map(device => {
                        const isCurrent = device.deviceFingerprint === currentFingerprint;
                        const isMobile = device.deviceFingerprint.includes("Mobi");
                        return (
                            <div key={device.id} className="device-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <div className="device-info" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div className="device-icon" style={{ fontSize: '1.5rem' }}>
                                        {isMobile ? '📱' : '💻'}
                                    </div>
                                    <div className="device-details">
                                        <h4 style={{ margin: '0 0 4px 0' }}>
                                            {device.deviceName}{' '}
                                            {isCurrent && <span className="device-status" style={{ fontSize: '0.75rem', color: 'var(--primary)', marginLeft: '4px' }}>(This Device)</span>}{' '}
                                            {device.trusted && <span style={{ color: '#10b981', fontSize: '0.7rem', marginLeft: '0.5rem', background: 'rgba(16,185,129,0.15)', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>✓ Trusted</span>}
                                        </h4>
                                        <div className="device-meta" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            <span>IP: {device.ipAddress}</span> • <span>Last active: {new Date(device.lastActive).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <button 
                                        className="btn-save" 
                                        style={{ fontSize: '0.7rem', padding: '6px 12px', width: 'auto', background: device.trusted ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none', margin: 0 }}
                                        onClick={() => handleToggleTrust(device.id)}
                                    >
                                        {device.trusted ? 'Untrust' : 'Trust'}
                                    </button>
                                    {!isCurrent && (
                                        <button className="btn-logout" style={{ margin: 0, padding: '6px 12px', fontSize: '0.7rem' }} onClick={() => handleRevokeDevice(device.id)}>Logout</button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    const renderSettings = () => (
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px' }}>
            <div className="section-header">
                <h2>Notification Settings</h2>
            </div>
            <div className="settings-list">
                {notificationSettings.map(setting => (
                    <div key={setting.id} className="toggle-row">
                        <div className="toggle-label">
                            <h4>{setting.label}</h4>
                            <p>{setting.desc}</p>
                        </div>
                        <label className="switch">
                            <input type="checkbox" defaultChecked={setting.checked} />
                            <span className="slider"></span>
                        </label>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="profile-container">
            {/* Sidebar */}
            <aside className="profile-sidebar">
                <div className="profile-card glass-panel">
                    <div className="profile-avatar">{personalInfo.firstName.charAt(0).toUpperCase()}</div>
                    <h3 className="profile-name">{personalInfo.firstName} {personalInfo.lastName}</h3>
                    <span className="profile-role">Premium User</span>
                </div>

                <div className="profile-nav glass-panel">
                    <div
                        className={`nav-item ${activeTab === 'personal' ? 'active' : ''}`}
                        onClick={() => setActiveTab('personal')}
                    >
                        👤 Personal Details
                    </div>
                    <div
                        className={`nav-item ${activeTab === 'security' ? 'active' : ''}`}
                        onClick={() => setActiveTab('security')}
                    >
                        🛡️ Security & Devices
                    </div>
                    <div
                        className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                        onClick={() => setActiveTab('settings')}
                    >
                        ⚙️ Preferences
                    </div>
                    <div
                        className={`nav-item ${activeTab === 'banks' ? 'active' : ''}`}
                        onClick={() => setActiveTab('banks')}
                    >
                        🏦 Link Accounts
                    </div>
                </div>

                <div className="glass-panel" style={{ marginTop: '1rem', padding: '1rem' }}>
                    <button
                        className="btn-logout"
                        style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }}
                        onClick={() => {
                            // Clear session/local storage here
                            localStorage.removeItem('userToken'); // Example
                            navigate('/login');
                        }}
                    >
                        <span>🚪</span> Sign Out
                    </button>
                </div>
            </aside>

            <main className="profile-content">
                {activeTab === 'personal' && renderPersonal()}
                {activeTab === 'security' && renderSecurity()}
                {activeTab === 'settings' && renderSettings()}
                {activeTab === 'banks' && renderBankAccounts()}

            {editingAccount && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(8px)', animation: 'fadeIn 0.2s ease' }}>
                    <div className="glass-panel" style={{ padding: '2rem', borderRadius: '24px', maxWidth: '500px', width: '90%', background: '#0b0f19', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, color: '#fff', fontSize: '1.3rem', fontWeight: 700 }}>Configure {editingAccount.bankName}</h3>
                            <button onClick={() => setEditingAccount(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer', transition: 'color 0.2s' }}>×</button>
                        </div>
                        <form onSubmit={handleSaveAccountDetails}>
                            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary, #94a3b8)', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Account Type</label>
                                <select 
                                    className="form-input" 
                                    style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff' }}
                                    value={editForm.accountType} 
                                    onChange={e => setEditForm({ ...editForm, accountType: e.target.value })}
                                >
                                    <option value="SAVINGS" style={{ background: '#0b0f19' }}>Savings</option>
                                    <option value="CURRENT" style={{ background: '#0b0f19' }}>Current</option>
                                    <option value="FIXED_DEPOSIT" style={{ background: '#0b0f19' }}>Fixed Deposit</option>
                                    <option value="JOINT" style={{ background: '#0b0f19' }}>Joint</option>
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                                <div className="form-group">
                                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary, #94a3b8)', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tx Limit (Single)</label>
                                    <input 
                                        type="number" 
                                        className="form-input" 
                                        style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', boxSizing: 'border-box' }}
                                        value={editForm.transactionLimit} 
                                        onChange={e => setEditForm({ ...editForm, transactionLimit: parseFloat(e.target.value) })} 
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary, #94a3b8)', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Daily Limit</label>
                                    <input 
                                        type="number" 
                                        className="form-input" 
                                        style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', boxSizing: 'border-box' }}
                                        value={editForm.dailyLimit} 
                                        onChange={e => setEditForm({ ...editForm, dailyLimit: parseFloat(e.target.value) })} 
                                        required
                                    />
                                </div>
                            </div>

                            <h4 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginBottom: '1rem', marginTop: '1.5rem', color: '#818cf8', fontWeight: 600 }}>Nominee Configuration</h4>
                            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary, #94a3b8)', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nominee Name</label>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', boxSizing: 'border-box' }}
                                    placeholder="Enter nominee name" 
                                    value={editForm.nomineeName} 
                                    onChange={e => setEditForm({ ...editForm, nomineeName: e.target.value })} 
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                                <div className="form-group">
                                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary, #94a3b8)', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Relationship</label>
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', boxSizing: 'border-box' }}
                                        placeholder="e.g. Spouse, Father" 
                                        value={editForm.nomineeRelationship} 
                                        onChange={e => setEditForm({ ...editForm, nomineeRelationship: e.target.value })} 
                                    />
                                </div>
                                <div className="form-group">
                                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary, #94a3b8)', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Age</label>
                                    <input 
                                        type="number" 
                                        className="form-input" 
                                        style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', boxSizing: 'border-box' }}
                                        placeholder="Age" 
                                        value={editForm.nomineeAge} 
                                        onChange={e => setEditForm({ ...editForm, nomineeAge: e.target.value ? parseInt(e.target.value) : '' })} 
                                    />
                                </div>
                            </div>

                            {editForm.accountType === 'JOINT' && (
                                <>
                                    <h4 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginBottom: '1rem', marginTop: '1.5rem', color: '#818cf8', fontWeight: 600 }}>Joint Holder Info</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                                        <div className="form-group">
                                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary, #94a3b8)', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</label>
                                            <input 
                                                type="text" 
                                                className="form-input" 
                                                style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', boxSizing: 'border-box' }}
                                                value={editForm.jointHolderName} 
                                                onChange={e => setEditForm({ ...editForm, jointHolderName: e.target.value })} 
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary, #94a3b8)', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mobile Number</label>
                                            <input 
                                                type="text" 
                                                className="form-input" 
                                                style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', boxSizing: 'border-box' }}
                                                value={editForm.jointHolderMobile} 
                                                onChange={e => setEditForm({ ...editForm, jointHolderMobile: e.target.value })} 
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                <button type="button" className="btn-logout" style={{ margin: 0, flex: 1, padding: '0.85rem' }} onClick={() => setEditingAccount(null)}>Cancel</button>
                                <button type="submit" className="btn-save" style={{ margin: 0, flex: 1, padding: '0.85rem' }}>Save Settings</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    </div>
);
};

export default Profile;
