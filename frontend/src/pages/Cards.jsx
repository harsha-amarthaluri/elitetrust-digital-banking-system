import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import '../styles/pages/Cards.css';

const Cards = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const user = location.state || {};

    const [cards, setCards] = useState([]);
    const [linkedAccounts, setLinkedAccounts] = useState([]);
    
    const [isLoadingCards, setIsLoadingCards] = useState(true);
    const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);

    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [alertMsg, setAlertMsg] = useState({ text: '', type: '' });

    // Modal state for PIN & Limits
    const [configuringCard, setConfiguringCard] = useState(null);
    const [configForm, setConfigForm] = useState({
        spendingLimit: 50000,
        dailyLimit: 100000,
        pin: ''
    });

    const fetchCardData = async () => {
        if (!user?.mobileNumber) return;
        setIsLoadingCards(true);
        try {
            const res = await api.get(`/cards/user/${user.mobileNumber}`);
            setCards(res.data || []);
        } catch (err) {
            console.error("Failed to fetch cards:", err);
        } finally {
            setIsLoadingCards(false);
        }
    };

    const fetchAccounts = async () => {
        if (!user?.mobileNumber) return;
        setIsLoadingAccounts(true);
        try {
            const res = await api.get(`/linked-accounts/${user.mobileNumber}`);
            const accs = res.data || [];
            setLinkedAccounts(accs);
            if (accs.length > 0) {
                setSelectedAccountId(accs[0].id);
            }
        } catch (err) {
            console.error("Failed to fetch linked accounts:", err);
        } finally {
            setIsLoadingAccounts(false);
        }
    };

    useEffect(() => {
        fetchCardData();
        fetchAccounts();
    }, [user?.mobileNumber]);

    const handleCreateDebitCard = async () => {
        if (!selectedAccountId) return;
        setIsGenerating(true);
        try {
            await api.post(`/cards/debit/generate?accountId=${selectedAccountId}&cardHolderName=${user.name}`);
            setAlertMsg({ text: "Virtual Debit Card generated successfully!", type: 'success' });
            setTimeout(() => setAlertMsg({ text: '', type: '' }), 4000);
            fetchCardData();
        } catch (err) {
            console.error("Failed to generate debit card:", err);
            setAlertMsg({ text: "Failed to generate debit card. Note that only one card per account is allowed.", type: 'danger' });
            setTimeout(() => setAlertMsg({ text: '', type: '' }), 5000);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCreateCreditCard = async () => {
        setIsGenerating(true);
        try {
            await api.post(`/cards/credit/generate?userId=${user.mobileNumber}&cardHolderName=${user.name}`);
            setAlertMsg({ text: "Virtual Credit Card generated successfully!", type: 'success' });
            setTimeout(() => setAlertMsg({ text: '', type: '' }), 4000);
            fetchCardData();
        } catch (err) {
            console.error("Failed to generate credit card:", err);
            setAlertMsg({ text: "Failed to generate credit card.", type: 'danger' });
            setTimeout(() => setAlertMsg({ text: '', type: '' }), 4000);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleToggleFreeze = async (cardId) => {
        try {
            await api.post(`/cards/${cardId}/toggle-freeze`);
            setCards(prev => prev.map(c => c.id === cardId ? { ...c, frozen: !c.frozen } : c));
        } catch (err) {
            console.error("Failed to freeze card:", err);
            setAlertMsg({ text: "Failed to toggle card freeze status.", type: 'danger' });
            setTimeout(() => setAlertMsg({ text: '', type: '' }), 4000);
        }
    };

    const handleToggleInternational = async (cardId) => {
        try {
            await api.post(`/cards/${cardId}/toggle-international`);
            setCards(prev => prev.map(c => c.id === cardId ? { ...c, internationalEnabled: !c.internationalEnabled } : c));
        } catch (err) {
            console.error("Failed to toggle international usage:", err);
            setAlertMsg({ text: "Failed to update card settings.", type: 'danger' });
            setTimeout(() => setAlertMsg({ text: '', type: '' }), 4000);
        }
    };

    const handleSaveConfig = async (e) => {
        e.preventDefault();
        if (!configuringCard) return;

        try {
            // Update limits
            await api.post(`/cards/${configuringCard.id}/limits?spendingLimit=${configForm.spendingLimit}&dailyLimit=${configForm.dailyLimit}`);
            
            // Update PIN if specified
            if (configForm.pin && configForm.pin.length === 4) {
                await api.post(`/cards/${configuringCard.id}/pin?pin=${configForm.pin}`);
            }

            setAlertMsg({ text: "Card settings updated successfully!", type: 'success' });
            setTimeout(() => setAlertMsg({ text: '', type: '' }), 4000);
            setConfiguringCard(null);
            fetchCardData();
        } catch (err) {
            console.error("Failed to save card config:", err);
            setAlertMsg({ text: "Failed to save card configuration details. Make sure PIN is 4 digits.", type: 'danger' });
            setTimeout(() => setAlertMsg({ text: '', type: '' }), 5000);
        }
    };

    const maskCardNumber = (num) => {
        if (!num) return '';
        return `${num.slice(0, 4)} •••• •••• ${num.slice(-4)}`;
    };

    return (
        <div className="cards-page-container">
            {alertMsg.text && (
                <div className={`alert alert-${alertMsg.type}`} style={{ borderRadius: '12px', margin: '0 0 1.5rem 0' }}>
                    {alertMsg.text}
                </div>
            )}
            <header className="cards-header glass-panel">
                <button className="back-btn" onClick={() => navigate('/dashboard', { state: user })} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold' }}>
                    ← Back to Dashboard
                </button>
                <div style={{ textAlign: 'center' }}>
                    <h1>My Cards Hub</h1>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Manage your virtual debit and credit credentials</span>
                </div>
                <div style={{ width: '100px' }}></div>
            </header>

            <div className="cards-grid">
                {/* Request New Cards Section */}
                <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px' }}>
                    <h3 className="card-section-title">✨ Issue Virtual Card</h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div>
                            <h4 style={{ marginBottom: '8px' }}>Issue Virtual Debit Card</h4>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                Link a new virtual debit card instantly to one of your active savings or current accounts.
                            </p>
                            {isLoadingAccounts ? (
                                <div>Loading eligible accounts...</div>
                            ) : linkedAccounts.length > 0 ? (
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <select 
                                        value={selectedAccountId} 
                                        onChange={e => setSelectedAccountId(e.target.value)}
                                        style={{ flex: 1, padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(0,0,0,0.1)' }}
                                    >
                                        {linkedAccounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>
                                                {acc.bankName} (••• {acc.accountNumber.slice(-4)})
                                            </option>
                                        ))}
                                    </select>
                                    <button 
                                        className="control-btn" 
                                        onClick={handleCreateDebitCard}
                                        disabled={isGenerating}
                                        style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '10px' }}
                                    >
                                        Generate
                                    </button>
                                </div>
                            ) : (
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No linked accounts available to link a debit card.</div>
                            )}
                        </div>

                        <hr style={{ border: 'none', borderBottom: '1px solid rgba(0,0,0,0.05)' }} />

                        <div>
                            <h4>Request Virtual Credit Card</h4>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                Get an instant credit line with customized repayment tracking. Requires active KYC status.
                            </p>
                            <button 
                                className="control-btn"
                                onClick={handleCreateCreditCard}
                                disabled={isGenerating}
                                style={{ width: '100%', background: 'linear-gradient(135deg, #3b82f6 0%, var(--primary) 100%)', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold' }}
                            >
                                Generate Credit Card
                            </button>
                        </div>
                    </div>
                </div>

                {/* Cards List Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h3 className="card-section-title">💳 Active Virtual Cards</h3>
                    {isLoadingCards ? (
                        <div style={{ padding: '3rem', textAlign: 'center' }}>Loading your virtual credentials...</div>
                    ) : cards.length > 0 ? (
                        cards.map(card => (
                            <div key={card.id} className="glass-panel" style={{ padding: '1.5rem', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div className="virtual-card-wrapper">
                                    <div className={`virtual-card ${card.cardType.toLowerCase()} ${card.frozen ? 'frozen' : ''}`}>
                                        <div className="card-face">
                                            <div className="card-top">
                                                <div className="card-chip"></div>
                                                <span className="card-type-logo">
                                                    {card.cardType === 'DEBIT' ? 'DEBIT' : 'CREDIT'}
                                                </span>
                                            </div>
                                            <div className="card-number">
                                                {maskCardNumber(card.cardNumber)}
                                            </div>
                                            <div className="card-bottom">
                                                <div>
                                                    <div className="card-label">Card Holder</div>
                                                    <div className="card-value">{card.cardHolderName}</div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '1.5rem' }}>
                                                    <div>
                                                        <div className="card-label">Expires</div>
                                                        <div className="card-value">{card.expiryDate}</div>
                                                    </div>
                                                    <div>
                                                        <div className="card-label">CVV</div>
                                                        <div className="card-value">{card.cvv}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="card-controls">
                                    {card.cardType === 'CREDIT' && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '8px' }}>
                                            <span>Limit: ₹{card.creditLimit.toLocaleString()}</span>
                                            <span style={{ color: '#ef4444' }}>Owed: ₹{card.balance.toLocaleString()}</span>
                                        </div>
                                    )}
                                    <div className="control-btn-grid">
                                        <button 
                                            className={`control-btn ${card.frozen ? 'active-action' : ''}`}
                                            onClick={() => handleToggleFreeze(card.id)}
                                        >
                                            {card.frozen ? '❄️ Unfreeze' : '🧊 Freeze'}
                                        </button>
                                        <button 
                                            className="control-btn"
                                            onClick={() => {
                                                setConfiguringCard(card);
                                                setConfigForm({
                                                    spendingLimit: card.spendingLimit,
                                                    dailyLimit: card.dailyLimit,
                                                    pin: ''
                                                });
                                            }}
                                        >
                                            ⚙️ Configure
                                        </button>
                                        <button 
                                            className={`control-btn ${card.internationalEnabled ? 'active-action' : ''}`}
                                            onClick={() => handleToggleInternational(card.id)}
                                            style={{ gridColumn: '1 / -1' }}
                                        >
                                            🌐 International Usage: {card.internationalEnabled ? 'ON' : 'OFF'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.02)', borderRadius: '16px', border: '1px dashed rgba(0,0,0,0.1)' }}>
                            No active virtual cards generated. Apply for one on the left panel!
                        </div>
                    )}
                </div>
            </div>

            {/* Config Modal */}
            {configuringCard && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.65)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, backdropFilter: 'blur(5px)' }}>
                    <div className="glass-panel" style={{ padding: '2rem', borderRadius: '20px', width: '90%', maxWidth: '400px', background: '#fff' }}>
                        <h3 style={{ marginBottom: '1.5rem' }}>Configure Virtual Card</h3>
                        <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Single Tx Limit</label>
                                <input 
                                    type="number"
                                    value={configForm.spendingLimit}
                                    onChange={e => setConfigForm({ ...configForm, spendingLimit: parseFloat(e.target.value) })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)' }}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Daily Spending Limit</label>
                                <input 
                                    type="number"
                                    value={configForm.dailyLimit}
                                    onChange={e => setConfigForm({ ...configForm, dailyLimit: parseFloat(e.target.value) })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)' }}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Update PIN (4 Digits)</label>
                                <input 
                                    type="password"
                                    maxLength="4"
                                    placeholder="Enter new 4-digit PIN"
                                    value={configForm.pin}
                                    onChange={e => setConfigForm({ ...configForm, pin: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
                                <button type="button" onClick={() => setConfiguringCard(null)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', background: '#f3f4f6', cursor: 'pointer' }}>
                                    Cancel
                                </button>
                                <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: '#fff', cursor: 'pointer' }}>
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Cards;
