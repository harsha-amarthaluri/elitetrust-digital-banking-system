import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import '../styles/pages/BillPaymentForm.css';

const BillPaymentForm = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Default params to handle direct navigation gracefully
    const { 
        user, 
        billType = 'ELECTRICITY', 
        title = 'Electricity Bill', 
        isRecharge = false,
        icon = '🧾'
    } = location.state || {};

    const [step, setStep] = useState(1);
    const [identifier, setIdentifier] = useState('');
    const [provider, setProvider] = useState('');
    const [amount, setAmount] = useState('');
    const [billDetails, setBillDetails] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Account selection
    const [accounts, setAccounts] = useState([]);
    const [selectedAccount, setSelectedAccount] = useState('');
    const [successData, setSuccessData] = useState(null);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        const fetchAccounts = async () => {
            try {
                const res = await api.get(`/linked-accounts/${user.mobileNumber}`);
                const accs = res.data || [];
                setAccounts(accs);
                if (accs.length > 0) {
                    const primary = accs.find(a => a.isPrimary) || accs[0];
                    setSelectedAccount(primary.id);
                }
            } catch (err) {
                console.error("Failed to fetch accounts", err);
            }
        };
        fetchAccounts();
    }, [user, navigate]);

    // Handle form submit for fetch or pre-pay
    const handleFetchSubmit = async (e) => {
        e.preventDefault();
        if (!identifier) {
            setError('Please enter your details');
            return;
        }

        if (isRecharge) {
            if (!amount) {
                setError('Please enter a valid amount');
                return;
            }
            setStep(2); // directly to pay confirmation for recharge
            return;
        }

        setLoading(true);
        setError('');
        try {
            const res = await api.post('/bill/fetch', {
                type: billType,
                identifier: identifier
            });
            setBillDetails(res.data);
            setAmount(res.data.amount);
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch bill details. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handlePayBill = async () => {
        if (!selectedAccount) {
            setError("Please link or select a bank account first");
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/bill/pay', {
                type: billType,
                identifier: identifier,
                amount: amount,
                fromAccountId: selectedAccount
            });
            setSuccessData(res.data);
            setStep(3);
        } catch (err) {
            setError(err.response?.data?.message || 'Payment failed. Please check your balance.');
        } finally {
            setLoading(false);
        }
    };

    const renderInputFields = () => {
        if (isRecharge) {
            return (
                <>
                    <div className="input-group">
                        <label>Mobile / Customer Number</label>
                        <input 
                            type="text" 
                            placeholder="Enter 10-digit number" 
                            value={identifier} 
                            onChange={(e) => setIdentifier(e.target.value)} 
                            required 
                        />
                    </div>
                    <div className="input-group">
                        <label>Operator</label>
                        <select value={provider} onChange={(e) => setProvider(e.target.value)} required>
                            <option value="">Select Operator</option>
                            <option value="Jio">Jio</option>
                            <option value="Airtel">Airtel</option>
                            <option value="VI">VI</option>
                            <option value="BSNL">BSNL</option>
                        </select>
                    </div>
                    <div className="input-group">
                        <label>Amount (₹)</label>
                        <input 
                            type="number" 
                            placeholder="Enter recharge amount" 
                            value={amount} 
                            onChange={(e) => setAmount(e.target.value)} 
                            required 
                        />
                    </div>
                </>
            );
        }

        return (
            <>
                <div className="input-group">
                    <label>Consumer Number / Subscriber ID / Account No.</label>
                    <input 
                        type="text" 
                        placeholder="e.g. 1234567890" 
                        value={identifier} 
                        onChange={(e) => setIdentifier(e.target.value)} 
                        required 
                    />
                </div>
                <div className="input-group">
                    <label>Provider/Biller Name (Optional)</label>
                    <input 
                        type="text" 
                        placeholder="e.g. BESCOM, BWSSB, Tata Play" 
                        value={provider} 
                        onChange={(e) => setProvider(e.target.value)} 
                    />
                </div>
            </>
        );
    };

    return (
        <div className="bill-payment-container">
            <header className="bill-header glass-panel">
                <button className="back-btn" onClick={() => navigate(-1)}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                    <span className="back-text">Back</span>
                </button>
                <div className="header-center">
                    <h1>{icon} {title}</h1>
                </div>
                <div className="header-right"></div>
            </header>

            <div className="form-container glass-panel">
                {error && <div className="error-message">{error}</div>}

                {step === 1 && (
                    <form onSubmit={handleFetchSubmit} className="bill-form">
                        <h2 className="form-title">Enter {isRecharge ? 'Recharge' : 'Bill'} Details</h2>
                        {renderInputFields()}
                        <button type="submit" className="action-btn primary-btn" disabled={loading}>
                            {loading ? 'Processing...' : (isRecharge ? 'Proceed to Pay' : 'Fetch Bill')}
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <div className="payment-confirmation">
                        <h2 className="form-title">Payment Summary</h2>
                        <div className="summary-card">
                            <div className="summary-row">
                                <span>Biller/Type:</span>
                                <strong>{title}</strong>
                            </div>
                            <div className="summary-row">
                                <span>Identifier:</span>
                                <strong>{identifier}</strong>
                            </div>
                            {billDetails && (
                                <>
                                    <div className="summary-row">
                                        <span>Customer Name:</span>
                                        <strong>{billDetails.customerName}</strong>
                                    </div>
                                    <div className="summary-row">
                                        <span>Due Date:</span>
                                        <strong>{billDetails.dueDate}</strong>
                                    </div>
                                </>
                            )}
                            <div className="summary-row amount-row">
                                <span>Amount to Pay:</span>
                                <strong className="amount-text">₹{Number(amount).toFixed(2)}</strong>
                            </div>
                        </div>

                        <div className="payment-method">
                            <h3 style={{marginTop: '1.5rem', marginBottom: '0.8rem'}}>Select Source Account</h3>
                            {accounts.length === 0 ? (
                                <div className="no-accounts-msg" style={{color: '#ff4b4b'}}>
                                    No linked bank accounts found. Please link an account in Profile.
                                </div>
                            ) : (
                                <select 
                                    className="account-select"
                                    value={selectedAccount} 
                                    onChange={(e) => setSelectedAccount(e.target.value)}
                                >
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>
                                            {acc.bankName} - {acc.accountNumber.slice(-4)} (Bal: ₹{acc.balance.toFixed(2)})
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <div className="btn-group" style={{marginTop: '2rem'}}>
                            <button className="action-btn secondary-btn" onClick={() => setStep(1)} disabled={loading}>
                                Edit Details
                            </button>
                            <button className="action-btn primary-btn" onClick={handlePayBill} disabled={loading || accounts.length === 0}>
                                {loading ? 'Processing...' : `Pay ₹${Number(amount).toFixed(2)}`}
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && successData && (
                    <div className="success-card">
                        <div className="success-icon">✅</div>
                        <h2 className="success-title">Payment Successful!</h2>
                        <p className="success-message">{successData.message}</p>
                        <div className="receipt-details">
                            <p><strong>Transaction ID:</strong> {successData.transactionId}</p>
                            <p><strong>Amount Paid:</strong> ₹{Number(amount).toFixed(2)}</p>
                            <p><strong>Paid For:</strong> {title}</p>
                            <p><strong>Identifier:</strong> {identifier}</p>
                        </div>
                        <button className="action-btn primary-btn" onClick={() => navigate('/dashboard', { state: user })} style={{marginTop: '1.5rem'}}>
                            Return to Dashboard
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BillPaymentForm;
