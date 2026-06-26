import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { showToast } from '../components/Toast';
import '../styles/pages/UpiQr.css';

const UpiQr = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const user = location.state || {};

    const [linkedAccounts, setLinkedAccounts] = useState([]);
    const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
    
    // UPI Registration State
    const [upiAlias, setUpiAlias] = useState('');
    const [registeredUpi, setRegisteredUpi] = useState(null);
    const [selectedRegisterAccount, setSelectedRegisterAccount] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);

    // Pay via VPA State
    const [payForm, setPayForm] = useState({
        fromAccountNumber: '',
        recipientUpiId: '',
        amount: ''
    });
    const [isPayingVpa, setIsPayingVpa] = useState(false);

    // Dynamic QR Generator State
    const [qrAmount, setQrAmount] = useState('');
    const [generatedQr, setGeneratedQr] = useState(null);
    const [isGeneratingQr, setIsGeneratingQr] = useState(false);

    // QR Scanner Mock State
    const [scanPayload, setScanPayload] = useState('');
    const [scanSourceAccount, setScanSourceAccount] = useState('');
    const [isPayingQr, setIsPayingQr] = useState(false);

    const fetchAccounts = async () => {
        if (!user?.mobileNumber) return;
        setIsLoadingAccounts(true);
        try {
            const res = await api.get(`/linked-accounts/${user.mobileNumber}`);
            const accs = res.data || [];
            setLinkedAccounts(accs);
            if (accs.length > 0) {
                setSelectedRegisterAccount(accs[0].accountNumber);
                setPayForm(prev => ({ ...prev, fromAccountNumber: accs[0].accountNumber }));
                setScanSourceAccount(accs[0].accountNumber);
                
                // Fetch existing UPI registry if any
                checkExistingUpi(accs[0].accountNumber);
            }
        } catch (err) {
            console.error("Failed to load bank accounts:", err);
        } finally {
            setIsLoadingAccounts(false);
        }
    };

    const checkExistingUpi = async (accountNum) => {
        try {
            const res = await api.get(`/upi/mapping/${accountNum}`);
            if (res.status === 200 && res.data) {
                setRegisteredUpi(res.data.upiId);
            } else {
                setRegisteredUpi(null);
            }
        } catch {
            setRegisteredUpi(null);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, [user?.mobileNumber]);

    const handleRegisterUpi = async (e) => {
        e.preventDefault();
        if (!upiAlias || !selectedRegisterAccount) return;
        setIsRegistering(true);
        try {
            const res = await api.post(`/upi/register?accountNumber=${selectedRegisterAccount}&upiId=${upiAlias}`);
            showToast('UPI ID registered successfully!', 'success');
            setRegisteredUpi(res.data.upiId);
            setUpiAlias('');
        } catch (err) {
            console.error('UPI ID registration failed:', err);
            showToast('Failed to register UPI ID. The alias might already be taken.', 'error');
        } finally {
            setIsRegistering(false);
        }
    };

    const handlePayVpa = async (e) => {
        e.preventDefault();
        if (!payForm.fromAccountNumber || !payForm.recipientUpiId || !payForm.amount) return;
        setIsPayingVpa(true);
        try {
            await api.post(`/upi/pay?fromAccountNumber=${payForm.fromAccountNumber}&recipientUpiId=${payForm.recipientUpiId}&amount=${payForm.amount}`);
            showToast('UPI Payment completed successfully!', 'success');
            setPayForm(prev => ({ ...prev, recipientUpiId: '', amount: '' }));
            fetchAccounts();
        } catch (err) {
            console.error('UPI payment failed:', err);
            showToast('Payment failed. Please verify recipient UPI ID and balance.', 'error');
        } finally {
            setIsPayingVpa(false);
        }
    };

    const handleGenerateQr = async (e) => {
        e.preventDefault();
        if (!registeredUpi || !qrAmount) return;
        setIsGeneratingQr(true);
        try {
            const res = await api.post(`/upi/qr/generate-dynamic?upiId=${registeredUpi}&amount=${qrAmount}`);
            setGeneratedQr(res.data.qrPayload);
        } catch (err) {
            console.error('Failed to generate QR:', err);
            showToast('Failed to generate dynamic payment QR.', 'error');
        } finally {
            setIsGeneratingQr(false);
        }
    };

    const handlePayQr = async (e) => {
        e.preventDefault();
        if (!scanSourceAccount || !scanPayload) return;
        setIsPayingQr(true);
        try {
            await api.post(`/upi/qr/pay?fromAccountNumber=${scanSourceAccount}&qrPayload=${scanPayload}`);
            showToast('QR Code Payment successful!', 'success');
            setScanPayload('');
            setGeneratedQr(null);
            fetchAccounts();
        } catch (err) {
            console.error('QR Payment failed:', err);
            showToast('QR code payment failed. Ensure the format matches: upi://pay?pa=...&am=...', 'error');
        } finally {
            setIsPayingQr(false);
        }
    };

    return (
        <div className="upi-qr-container">
            <header className="upi-qr-header glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', borderRadius: '16px' }}>
                <button className="back-btn" onClick={() => navigate('/dashboard', { state: user })} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold' }}>
                    ← Back to Dashboard
                </button>
                <div style={{ textAlign: 'center' }}>
                    <h1>UPI & QR Payments</h1>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Instantly transfer funds via Virtual Addresses or QR Codes</span>
                </div>
                <div style={{ width: '100px' }}></div>
            </header>

            <div className="upi-qr-grid">
                {/* VPA Alias Setup & QR Generator */}
                <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px' }}>
                    <h3 className="card-section-title">⚡ UPI VPA Registration</h3>
                    
                    {registeredUpi ? (
                        <div style={{ padding: '1rem', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '12px', marginBottom: '2rem' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Active UPI address linked to your account:</span>
                            <h3 style={{ color: 'var(--primary)', margin: '4px 0 0 0', letterSpacing: '0.5px' }}>{registeredUpi}</h3>
                        </div>
                    ) : (
                        <form onSubmit={handleRegisterUpi} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                Register a customized virtual payment address (VPA) linked to your primary account.
                            </p>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>Select Account</label>
                                <select 
                                    value={selectedRegisterAccount}
                                    onChange={e => {
                                        setSelectedRegisterAccount(e.target.value);
                                        checkExistingUpi(e.target.value);
                                    }}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.1)' }}
                                >
                                    {linkedAccounts.map(acc => (
                                        <option key={acc.id} value={acc.accountNumber}>
                                            {acc.bankName} (••• {acc.accountNumber.slice(-4)})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>Desired Alias (e.g. name)</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <input 
                                        type="text" 
                                        placeholder="alias"
                                        value={upiAlias}
                                        onChange={e => setUpiAlias(e.target.value.toLowerCase())}
                                        style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)' }}
                                        required
                                    />
                                    <strong style={{ color: 'var(--text-secondary)' }}>@elitetrust</strong>
                                </div>
                            </div>
                            <button 
                                type="submit" 
                                disabled={isRegistering || isLoadingAccounts}
                                style={{ padding: '10px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                {isRegistering ? 'Registering Alias...' : 'Link UPI ID'}
                            </button>
                        </form>
                    )}

                    {registeredUpi && (
                        <>
                            <hr style={{ border: 'none', borderBottom: '1px solid rgba(0,0,0,0.05)', marginBottom: '1.5rem' }} />
                            <h3 className="card-section-title">📱 Dynamic QR Generator</h3>
                            <form onSubmit={handleGenerateQr} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>Requested Amount (₹)</label>
                                    <input 
                                        type="number"
                                        placeholder="e.g. 500"
                                        value={qrAmount}
                                        onChange={e => setQrAmount(e.target.value)}
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)' }}
                                        required
                                    />
                                </div>
                                <button 
                                    type="submit"
                                    disabled={isGeneratingQr}
                                    style={{ padding: '10px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #06b6d4 0%, var(--primary) 100%)', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    {isGeneratingQr ? 'Generating QR...' : 'Generate Dynamic QR'}
                                </button>
                            </form>

                            {generatedQr && (
                                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                                    <div className="qr-code-box">
                                        <div className="qr-mock-dots">
                                            <div className="qr-mock-corner-bottom"></div>
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '0.78rem', wordBreak: 'break-all', display: 'block', padding: '8px', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
                                        {generatedQr}
                                    </span>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Pay via UPI ID & QR Code scan */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    
                    {/* Pay VPA */}
                    <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px' }}>
                        <h3 className="card-section-title">💸 Pay via UPI ID</h3>
                        <form onSubmit={handlePayVpa} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>Pay From</label>
                                <select 
                                    value={payForm.fromAccountNumber}
                                    onChange={e => setPayForm({ ...payForm, fromAccountNumber: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.1)' }}
                                >
                                    {linkedAccounts.map(acc => (
                                        <option key={acc.id} value={acc.accountNumber}>
                                            {acc.bankName} (₹{acc.balance.toLocaleString()})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>Recipient UPI ID</label>
                                <input 
                                    type="text"
                                    placeholder="username@elitetrust"
                                    value={payForm.recipientUpiId}
                                    onChange={e => setPayForm({ ...payForm, recipientUpiId: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)' }}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>Amount (₹)</label>
                                <input 
                                    type="number"
                                    placeholder="Enter amount to pay"
                                    value={payForm.amount}
                                    onChange={e => setPayForm({ ...payForm, amount: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)' }}
                                    required
                                />
                            </div>
                            <button 
                                type="submit"
                                disabled={isPayingVpa || isLoadingAccounts}
                                style={{ padding: '10px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                {isPayingVpa ? 'Completing Transaction...' : 'Send Funds'}
                            </button>
                        </form>
                    </div>

                    {/* QR Code Scanner Mockup */}
                    <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px' }}>
                        <h3 className="card-section-title">📷 Scan & Pay QR Code</h3>
                        <form onSubmit={handlePayQr} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                Paste the dynamic UPI QR link payload string to simulate scanning and paying.
                            </p>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>Pay From</label>
                                <select 
                                    value={scanSourceAccount}
                                    onChange={e => setScanSourceAccount(e.target.value)}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.1)' }}
                                >
                                    {linkedAccounts.map(acc => (
                                        <option key={acc.id} value={acc.accountNumber}>
                                            {acc.bankName} (₹{acc.balance.toLocaleString()})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>Scanned QR String</label>
                                <input 
                                    type="text"
                                    placeholder="upi://pay?pa=name@elitetrust&am=500"
                                    value={scanPayload}
                                    onChange={e => setScanPayload(e.target.value)}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)' }}
                                    required
                                />
                            </div>
                            <button 
                                type="submit"
                                disabled={isPayingQr || !scanPayload}
                                style={{ padding: '10px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                {isPayingQr ? 'Executing Payment...' : 'Pay Scanned QR'}
                            </button>
                        </form>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default UpiQr;
