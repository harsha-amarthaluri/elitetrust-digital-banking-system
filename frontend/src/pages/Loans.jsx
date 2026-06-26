import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import '../styles/pages/Loans.css';

const Loans = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const user = location.state || {};

    const [loans, setLoans] = useState([]);
    const [isLoadingLoans, setIsLoadingLoans] = useState(true);
    const [alertMsg, setAlertMsg] = useState({ text: '', type: '' });

    // Calculator states
    const [calcAmount, setCalcAmount] = useState(200000);
    const [calcTenure, setCalcTenure] = useState(24);
    const [calcType, setCalcType] = useState('PERSONAL');
    const [calculatedEmi, setCalculatedEmi] = useState(0);
    const [calcRate, setCalcRate] = useState(12);

    // Eligibility Checker state
    const [eligibilityForm, setEligibilityForm] = useState({
        monthlySalary: '',
        panCardNumber: ''
    });
    const [eligibilityResult, setEligibilityResult] = useState(null);
    const [isCheckingEligibility, setIsCheckingEligibility] = useState(false);

    // Application state
    const [applyForm, setApplyForm] = useState({
        loanType: 'PERSONAL',
        amount: 100000,
        tenureMonths: 24,
        monthlySalary: '',
        panCardNumber: '',
        aadhaarNumber: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchLoans = async () => {
        if (!user?.mobileNumber) return;
        setIsLoadingLoans(true);
        try {
            const res = await api.get(`/loans/user/${user.mobileNumber}`);
            setLoans(res.data || []);
        } catch (err) {
            console.error("Failed to fetch loans:", err);
        } finally {
            setIsLoadingLoans(false);
        }
    };

    // Calculate EMI on slider changes
    useEffect(() => {
        const getEmi = async () => {
            try {
                const res = await api.post('/loans/calculate-emi', {
                    amount: calcAmount,
                    loanType: calcType,
                    tenureMonths: calcTenure
                });
                setCalculatedEmi(res.data.emi || 0);
                setCalcRate(res.data.interestRate || 10);
            } catch (err) {
                console.error("Failed to calculate EMI:", err);
            }
        };
        getEmi();
    }, [calcAmount, calcTenure, calcType]);

    useEffect(() => {
        fetchLoans();
    }, [user?.mobileNumber]);

    const handleCheckEligibility = async (e) => {
        e.preventDefault();
        setIsCheckingEligibility(true);
        setEligibilityResult(null);
        try {
            const res = await api.post('/loans/check-eligibility', eligibilityForm);
            setEligibilityResult(res.data);
        } catch (err) {
            console.error("Eligibility check failed:", err);
            setAlertMsg({ text: "Failed to check eligibility. Please try again.", type: 'danger' });
            setTimeout(() => setAlertMsg({ text: '', type: '' }), 4000);
        } finally {
            setIsCheckingEligibility(false);
        }
    };

    const handleApplyLoan = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.post('/loans/apply', {
                userId: user.mobileNumber, // Using mobileNumber as userId for consistency with backend mapping
                loanType: applyForm.loanType,
                amount: applyForm.amount,
                tenureMonths: applyForm.tenureMonths,
                monthlySalary: applyForm.monthlySalary,
                panCardNumber: applyForm.panCardNumber
            });
            setAlertMsg({ text: "Loan application submitted successfully!", type: 'success' });
            setTimeout(() => setAlertMsg({ text: '', type: '' }), 4000);
            setApplyForm({
                loanType: 'PERSONAL',
                amount: 100000,
                tenureMonths: 24,
                monthlySalary: '',
                panCardNumber: '',
                aadhaarNumber: ''
            });
            fetchLoans();
        } catch (err) {
            console.error("Loan application failed:", err);
            setAlertMsg({ text: "Failed to submit loan application. Note that low CIBIL score or salary may cause direct rejection.", type: 'danger' });
            setTimeout(() => setAlertMsg({ text: '', type: '' }), 5000);
            fetchLoans();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="loans-container">
            {alertMsg.text && (
                <div className={`alert alert-${alertMsg.type}`} style={{ borderRadius: '12px', margin: 0 }}>
                    {alertMsg.text}
                </div>
            )}
            <header className="loans-header glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', borderRadius: '16px' }}>
                <button className="back-btn" onClick={() => navigate('/dashboard', { state: user })} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold' }}>
                    ← Back to Dashboard
                </button>
                <div style={{ textAlign: 'center' }}>
                    <h1>Lending Platform</h1>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Estimate EMIs, check eligibility, and apply for low-interest loans</span>
                </div>
                <div style={{ width: '100px' }}></div>
            </header>

            <div className="loans-grid">
                {/* Sliders EMI Calculator */}
                <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px' }}>
                    <h3 className="card-section-title">🧮 Loan EMI Calculator</h3>
                    
                    <div className="calculator-wrapper">
                        <div className="slider-group">
                            <label className="slider-label">
                                <span>Loan Type</span>
                                <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{calcRate}% Interest Rate</span>
                            </label>
                            <select 
                                value={calcType} 
                                onChange={e => setCalcType(e.target.value)}
                                style={{ padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.1)' }}
                            >
                                <option value="PERSONAL">Personal Loan (12%)</option>
                                <option value="EDUCATION">Education Loan (8%)</option>
                                <option value="HOME">Home Loan (7%)</option>
                                <option value="AUTO">Auto Loan (9%)</option>
                            </select>
                        </div>

                        <div className="slider-group">
                            <div className="slider-label">
                                <span>Loan Amount</span>
                                <span>₹{calcAmount.toLocaleString()}</span>
                            </div>
                            <input 
                                type="range" 
                                min="50000" 
                                max="5000000" 
                                step="25000" 
                                value={calcAmount} 
                                onChange={e => setCalcAmount(parseInt(e.target.value))} 
                                className="slider-input"
                            />
                        </div>

                        <div className="slider-group">
                            <div className="slider-label">
                                <span>Tenure (Months)</span>
                                <span>{calcTenure} months ({Math.round(calcTenure / 12 * 10) / 10} yrs)</span>
                            </div>
                            <input 
                                type="range" 
                                min="12" 
                                max="120" 
                                step="6" 
                                value={calcTenure} 
                                onChange={e => setCalcTenure(parseInt(e.target.value))} 
                                className="slider-input"
                            />
                        </div>

                        <div className="emi-display-card">
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Estimated Monthly EMI</div>
                            <div className="emi-amount">₹{Math.round(calculatedEmi).toLocaleString()}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Interest charges are included. Subject to confirmation.</div>
                        </div>
                    </div>
                </div>

                {/* Eligibility Checker */}
                <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px' }}>
                    <h3 className="card-section-title">🔍 Check Eligibility</h3>
                    <form onSubmit={handleCheckEligibility} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', fontWeight: 600 }}>Monthly Take-home Salary (₹)</label>
                            <input 
                                type="number" 
                                placeholder="e.g. 45000"
                                value={eligibilityForm.monthlySalary}
                                onChange={e => setEligibilityForm({ ...eligibilityForm, monthlySalary: e.target.value })}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)' }}
                                required
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', fontWeight: 600 }}>PAN Card Number</label>
                            <input 
                                type="text" 
                                placeholder="ABCDE1234F"
                                value={eligibilityForm.panCardNumber}
                                onChange={e => setEligibilityForm({ ...eligibilityForm, panCardNumber: e.target.value.toUpperCase() })}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)' }}
                                required
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={isCheckingEligibility}
                            style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                            {isCheckingEligibility ? 'Checking CIBIL Records...' : 'Check Status'}
                        </button>
                    </form>

                    {eligibilityResult && (
                        <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '10px', background: eligibilityResult.eligible ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${eligibilityResult.eligible ? '#10b981' : '#ef4444'}` }}>
                            <h4 style={{ color: eligibilityResult.eligible ? '#10b981' : '#ef4444', display: 'flex', justifyBetween: 'space-between', alignItems: 'center' }}>
                                <span>{eligibilityResult.eligible ? '✅ You are Eligible!' : '❌ Not Eligible'}</span>
                                <span style={{ fontSize: '0.8rem', background: 'rgba(0,0,0,0.05)', padding: '2px 8px', borderRadius: '10px' }}>CIBIL: {eligibilityResult.cibilScore}</span>
                            </h4>
                            <p style={{ fontSize: '0.82rem', marginTop: '6px', color: 'var(--text-secondary)' }}>
                                {eligibilityResult.eligible 
                                  ? "Congratulations! You meet our credit score and income criteria. You can proceed to submit an application below." 
                                  : "Unfortunately, you do not meet the minimum criteria (CIBIL score > 650 & income > ₹20k/month). You can still apply, but it may require manual verification."}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Apply & Active Dashboard section */}
            <div className="loans-grid">
                {/* Application Form */}
                <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px' }}>
                    <h3 className="card-section-title">📝 Apply for a New Loan</h3>
                    
                    <form onSubmit={handleApplyLoan} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px' }}>Loan Type</label>
                                <select 
                                    value={applyForm.loanType} 
                                    onChange={e => setApplyForm({ ...applyForm, loanType: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.1)' }}
                                >
                                    <option value="PERSONAL">Personal Loan</option>
                                    <option value="EDUCATION">Education Loan</option>
                                    <option value="HOME">Home Loan</option>
                                    <option value="AUTO">Auto Loan</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px' }}>Loan Amount (₹)</label>
                                <input 
                                    type="number"
                                    value={applyForm.amount}
                                    onChange={e => setApplyForm({ ...applyForm, amount: parseFloat(e.target.value) })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)' }}
                                    required
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px' }}>Tenure (Months)</label>
                                <input 
                                    type="number"
                                    value={applyForm.tenureMonths}
                                    onChange={e => setApplyForm({ ...applyForm, tenureMonths: parseInt(e.target.value) })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)' }}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px' }}>Monthly Salary (₹)</label>
                                <input 
                                    type="number"
                                    value={applyForm.monthlySalary}
                                    onChange={e => setApplyForm({ ...applyForm, monthlySalary: parseFloat(e.target.value) })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)' }}
                                    required
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px' }}>PAN Card</label>
                                <input 
                                    type="text"
                                    placeholder="PAN Card Number"
                                    value={applyForm.panCardNumber}
                                    onChange={e => setApplyForm({ ...applyForm, panCardNumber: e.target.value.toUpperCase() })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)' }}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px' }}>Aadhaar Number</label>
                                <input 
                                    type="text"
                                    placeholder="12 Digit Aadhaar"
                                    value={applyForm.aadhaarNumber}
                                    onChange={e => setApplyForm({ ...applyForm, aadhaarNumber: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)' }}
                                    required
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, var(--primary) 0%, #4338ca 100%)', color: '#fff', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}
                        >
                            {isSubmitting ? 'Submitting Application...' : 'Submit Application'}
                        </button>
                    </form>
                </div>

                {/* Active Loans list */}
                <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px' }}>
                    <h3 className="card-section-title">📊 My Active Loans & Applications</h3>

                    {isLoadingLoans ? (
                        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading loan records...</div>
                    ) : loans.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {loans.map(loan => (
                                <div key={loan.id} style={{ padding: '1rem', background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h4 style={{ margin: 0 }}>
                                            {loan.loanType} LOAN
                                            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginLeft: '8px' }}>({loan.tenureMonths} Months)</span>
                                        </h4>
                                        <span className={`status-badge ${loan.status.toLowerCase()}`}>
                                            {loan.status}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        <span>Principal: <strong>₹{loan.amount.toLocaleString()}</strong></span>
                                        <span>EMI: <strong>₹{Math.round(loan.monthlyEmi).toLocaleString()}/mo</strong></span>
                                    </div>
                                    {loan.status === 'PENDING' && (
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                                            <span>Risk Score: {loan.riskScore}%</span>
                                            <span>Credit Bureau CIBIL: {loan.cibilScore}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.01)', borderRadius: '16px', border: '1px dashed rgba(0,0,0,0.1)' }}>
                            No active loans or pending applications found.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Loans;
