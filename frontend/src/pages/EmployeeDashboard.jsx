import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';

const EmployeeDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const user = location.state || {};

    const [pendingKycUsers, setPendingKycUsers] = useState([]);
    const [pendingLoans, setPendingLoans] = useState([]);
    const [pendingAccounts, setPendingAccounts] = useState([]);
    
    const [isLoadingKyc, setIsLoadingKyc] = useState(true);
    const [isLoadingLoans, setIsLoadingLoans] = useState(true);
    const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
    const [alertMsg, setAlertMsg] = useState({ text: '', type: '' });

    const fetchKycQueue = async () => {
        setIsLoadingKyc(true);
        try {
            const res = await api.get('/employee/kyc/pending');
            setPendingKycUsers(res.data || []);
        } catch (err) {
            console.error("Failed to fetch KYC queue:", err);
        } finally {
            setIsLoadingKyc(false);
        }
    };

    const fetchLoanQueue = async () => {
        setIsLoadingLoans(true);
        try {
            const res = await api.get('/loans/pending');
            setPendingLoans(res.data || []);
        } catch (err) {
            console.error("Failed to fetch loan queue:", err);
        } finally {
            setIsLoadingLoans(false);
        }
    };

    const fetchAccountQueue = async () => {
        setIsLoadingAccounts(true);
        try {
            const res = await api.get('/employee/accounts/pending');
            setPendingAccounts(res.data || []);
        } catch (err) {
            console.error("Failed to fetch pending accounts queue:", err);
        } finally {
            setIsLoadingAccounts(false);
        }
    };

    useEffect(() => {
        fetchKycQueue();
        fetchLoanQueue();
        fetchAccountQueue();
    }, []);

    const handleKycReview = async (userId, approve) => {
        const status = approve ? 'APPROVED' : 'REJECTED';
        try {
            await api.post(`/employee/kyc/${userId}/review?status=${status}`);
            setAlertMsg({ text: `KYC status updated to ${status}`, type: 'success' });
            setTimeout(() => setAlertMsg({ text: '', type: '' }), 4000);
            fetchKycQueue();
        } catch (err) {
            console.error("KYC review failed:", err);
            setAlertMsg({ text: "Failed to update KYC status.", type: 'danger' });
            setTimeout(() => setAlertMsg({ text: '', type: '' }), 4000);
        }
    };

    const handleLoanReview = async (loanId, approve) => {
        const status = approve ? 'APPROVED' : 'REJECTED';
        try {
            await api.post(`/loans/${loanId}/review?status=${status}`);
            setAlertMsg({ text: `Loan status updated to ${status}`, type: 'success' });
            setTimeout(() => setAlertMsg({ text: '', type: '' }), 4000);
            fetchLoanQueue();
        } catch (err) {
            console.error("Loan review failed:", err);
            setAlertMsg({ text: "Failed to review loan application.", type: 'danger' });
            setTimeout(() => setAlertMsg({ text: '', type: '' }), 4000);
        }
    };

    const handleAccountReview = async (accountId, approve) => {
        const status = approve ? 'ACTIVE' : 'CLOSED';
        try {
            await api.post(`/employee/accounts/${accountId}/review?status=${status}`);
            setAlertMsg({ text: `Account application status updated to ${status}`, type: 'success' });
            setTimeout(() => setAlertMsg({ text: '', type: '' }), 4000);
            fetchAccountQueue();
        } catch (err) {
            console.error("Account review failed:", err);
            setAlertMsg({ text: "Failed to review account application.", type: 'danger' });
            setTimeout(() => setAlertMsg({ text: '', type: '' }), 4000);
        }
    };

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
                    <h1>Employee Verification Portal</h1>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Onboard customers, approve KYC, and verify loan documentation</span>
                </div>
                <div style={{ width: '100px' }}></div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
                
                {/* KYC Review Section */}
                <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px' }}>
                    <h3 style={{ borderBottom: '2px solid rgba(79,70,229,0.1)', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: 'var(--primary)' }}>👤 KYC Approval Pipeline</h3>
                    
                    {isLoadingKyc ? (
                        <div style={{ textAlign: 'center', padding: '2rem' }}>Loading KYC queue...</div>
                    ) : pendingKycUsers.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {pendingKycUsers.map(u => (
                                <div key={u.user_Id} style={{ padding: '1rem', background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <strong>{u.name}</strong>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{u.mobileNumber}</span>
                                    </div>
                                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <span>PAN: {u.panCardNumber || 'N/A'}</span>
                                        <span>Aadhaar: {u.aadhaarNumber || 'N/A'}</span>
                                        {u.kycDocumentUrl && (
                                            <a href={u.kycDocumentUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontStyle: 'italic' }}>📄 View Submitted Document</a>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                        <button 
                                            onClick={() => handleKycReview(u.user_Id, false)}
                                            style={{ flex: 1, padding: '8px', border: '1px solid #ef4444', color: '#ef4444', background: 'transparent', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                                        >
                                            Reject
                                        </button>
                                        <button 
                                            onClick={() => handleKycReview(u.user_Id, true)}
                                            style={{ flex: 1, padding: '8px', border: 'none', background: '#10b981', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                                        >
                                            Verify & Approve
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No pending KYC verifications.</div>
                    )}
                </div>

                {/* Loan Review Section */}
                <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px' }}>
                    <h3 style={{ borderBottom: '2px solid rgba(79,70,229,0.1)', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: 'var(--primary)' }}>💼 Loan Processing Queue</h3>

                    {isLoadingLoans ? (
                        <div style={{ textAlign: 'center', padding: '2rem' }}>Loading loan queue...</div>
                    ) : pendingLoans.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {pendingLoans.map(loan => (
                                <div key={loan.id} style={{ padding: '1rem', background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <strong>{loan.loanType} Loan</strong>
                                        <span style={{ fontSize: '0.8rem', background: 'rgba(79,70,229,0.1)', padding: '2px 8px', borderRadius: '10px', color: 'var(--primary)' }}>CIBIL: {loan.cibilScore}</span>
                                    </div>
                                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <span>Amount: <strong>₹{loan.amount.toLocaleString()}</strong></span>
                                        <span>EMI: ₹{Math.round(loan.monthlyEmi).toLocaleString()}/month ({loan.tenureMonths} mo)</span>
                                        <span>Salary: ₹{loan.monthlySalary.toLocaleString()}/month</span>
                                        <span style={{ color: loan.riskScore > 60 ? '#ef4444' : '#10b981' }}>Risk Score: {loan.riskScore}%</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                        <button 
                                            onClick={() => handleLoanReview(loan.id, false)}
                                            style={{ flex: 1, padding: '8px', border: '1px solid #ef4444', color: '#ef4444', background: 'transparent', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                                        >
                                            Reject
                                        </button>
                                        <button 
                                            onClick={() => handleLoanReview(loan.id, true)}
                                            style={{ flex: 1, padding: '8px', border: 'none', background: '#10b981', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                                        >
                                            Verify & Approve
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No pending loans in queue.</div>
                    )}
                </div>

                {/* Bank Account Applications Section */}
                <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px' }}>
                    <h3 style={{ borderBottom: '2px solid rgba(79,70,229,0.1)', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: 'var(--primary)' }}>🏦 Bank Account Applications</h3>

                    {isLoadingAccounts ? (
                        <div style={{ textAlign: 'center', padding: '2rem' }}>Loading applications...</div>
                    ) : pendingAccounts.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {pendingAccounts.map(acc => (
                                <div key={acc.id} style={{ padding: '1rem', background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <strong>{acc.accountType} Account</strong>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>+91 {acc.mobileNumber}</span>
                                    </div>
                                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <span>Customer ID: {acc.customerId || 'N/A'}</span>
                                        <span>IFSC Code: {acc.ifscCode}</span>
                                        {acc.nomineeName ? (
                                            <span style={{ color: '#10b981' }}>👥 Nominee: {acc.nomineeName} ({acc.nomineeRelationship})</span>
                                        ) : (
                                            <span style={{ color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>No Nominee</span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                        <button 
                                            onClick={() => handleAccountReview(acc.id, false)}
                                            style={{ flex: 1, padding: '8px', border: '1px solid #ef4444', color: '#ef4444', background: 'transparent', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                                        >
                                            Reject
                                        </button>
                                        <button 
                                            onClick={() => handleAccountReview(acc.id, true)}
                                            style={{ flex: 1, padding: '8px', border: 'none', background: '#10b981', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                                        >
                                            Approve
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No pending account applications.</div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default EmployeeDashboard;
