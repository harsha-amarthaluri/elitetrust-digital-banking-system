import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import '../styles/pages/AccountSummary.css';

const AccountSummary = () => {
    const location = useLocation();
    
    // Get user from state or localStorage
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

    const [account, setAccount] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [copiedField, setCopiedField] = useState("");

    useEffect(() => {
        if (!user?.mobileNumber) {
            setIsLoading(false);
            return;
        }

        api.get(`/bank/${user.mobileNumber}`)
            .then(res => {
                if (res.data && res.data.length > 0) {
                    // Try to find primary account, fallback to first account
                    const primary = res.data.find(acc => acc.primaryAccount) || res.data[0];
                    setAccount(primary);
                }
            })
            .catch(err => {
                console.error("Failed to fetch bank account summary", err);
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [user?.mobileNumber]);

    const handleCopy = (text, fieldName) => {
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(""), 2000);
    };

    if (isLoading) {
        return (
            <div className="summary-container">
                <div className="summary-header">
                    <h1>Account Summary</h1>
                    <p className="summary-subtitle">Loading your account details...</p>
                </div>
                <div className="summary-grid">
                    <div className="detail-card glass-panel loading-skeleton" style={{ height: '300px' }} />
                    <div className="detail-card glass-panel loading-skeleton" style={{ height: '300px' }} />
                </div>
            </div>
        );
    }

    // Determine details
    const accountDetails = {
        accountHolder: user?.name || "Guest User",
        accountNumber: account?.accountNumber || "No Account Linked",
        accountType: account ? (account.accountType === "SAVINGS" ? "Savings Account" : "Current Account") : "N/A",
        status: account?.accountStatus || (account?.active ? "ACTIVE" : "INACTIVE"),
        currency: "INR",
        openDate: account?.accountOpenDate || "N/A"
    };

    const branchDetails = {
        bankName: account?.bankName || "EliteTrust Bank",
        branchName: "Corporate Headquarters & Central Hub",
        ifsc: account?.ifscCode || "ELTR0000001",
        swift: "ELTRIN11XXX",
        branchCode: "000001",
        address: "EliteTrust Tower, Bandra Kurla Complex, Mumbai, MH 400051"
    };

    return (
        <div className="summary-container">
            <div className="summary-header">
                <h1>Account Summary</h1>
                <p className="summary-subtitle">Overview of your primary banking account details.</p>
            </div>

            {account ? (
                <div className="summary-grid">
                    {/* Account Details Card */}
                    <div className="detail-card glass-panel">
                        <div className="card-header">
                            <div className="card-icon">💼</div>
                            <h3 className="card-title">Account Details</h3>
                        </div>

                        <div className="detail-row">
                            <span className="detail-label">Account Holder</span>
                            <span className="detail-value">{accountDetails.accountHolder}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Account Type</span>
                            <span className="detail-value">{accountDetails.accountType}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Account Number</span>
                            <div className="detail-value">
                                <span className="account-number-display">{accountDetails.accountNumber}</span>
                                <button
                                    className="copy-btn"
                                    onClick={() => handleCopy(accountDetails.accountNumber, 'accountNumber')}
                                    title="Copy Account Number"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', padding: '2px 6px' }}
                                >
                                    {copiedField === 'accountNumber' ? '✓ Copied' : '📋'}
                                </button>
                            </div>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Status</span>
                            <span className={`detail-value status-badge ${accountDetails.status === 'ACTIVE' ? 'status-active' : 'status-inactive'}`}>{accountDetails.status}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Opening Date</span>
                            <span className="detail-value">{accountDetails.openDate}</span>
                        </div>
                    </div>

                    {/* Branch & Bank Details Card */}
                    <div className="detail-card glass-panel">
                        <div className="card-header">
                            <div className="card-icon">🏛️</div>
                            <h3 className="card-title">Branch & Bank Info</h3>
                        </div>

                        <div className="detail-row">
                            <span className="detail-label">Bank Name</span>
                            <span className="detail-value">{branchDetails.bankName}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Branch Name</span>
                            <span className="detail-value">{branchDetails.branchName}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">IFSC Code</span>
                            <div className="detail-value">
                                <span style={{ fontFamily: 'monospace' }}>{branchDetails.ifsc}</span>
                                <button
                                    className="copy-btn"
                                    onClick={() => handleCopy(branchDetails.ifsc, 'ifsc')}
                                    title="Copy IFSC"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', padding: '2px 6px' }}
                                >
                                    {copiedField === 'ifsc' ? '✓ Copied' : '📋'}
                                </button>
                            </div>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">SWIFT Code</span>
                            <span className="detail-value" style={{ fontFamily: 'monospace' }}>{branchDetails.swift}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Branch Address</span>
                            <span className="detail-value" style={{ maxWidth: '60%', lineHeight: '1.4' }}>
                                {branchDetails.address}
                            </span>
                        </div>
                    </div>

                    {/* Additional Info / Contact */}
                    <div className="detail-card glass-panel" style={{ gridColumn: '1 / -1' }}>
                        <div className="card-header">
                            <div className="card-icon">📞</div>
                            <h3 className="card-title">Dedicated Support</h3>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <p className="detail-label">Your Relationship Manager</p>
                                <p className="detail-value" style={{ fontSize: '1.1rem', marginTop: '4px' }}>Sarah Jenkins</p>
                            </div>
                            <div>
                                <p className="detail-label">Direct Line</p>
                                <p className="detail-value" style={{ marginTop: '4px' }}>+91 (22) 5550-0199</p>
                            </div>
                            <div>
                                <p className="detail-label">Email Support</p>
                                <p className="detail-value" style={{ marginTop: '4px' }}>premium.support@elitetrust.com</p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="detail-card glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>No active bank accounts found. Please link or open an account first.</p>
                </div>
            )}
        </div>
    );
};

export default AccountSummary;
