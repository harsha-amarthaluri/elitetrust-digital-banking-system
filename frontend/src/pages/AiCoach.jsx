import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';

const AiCoach = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const user = location.state || {};

    const [analysis, setAnalysis] = useState(null);
    const [anomalies, setAnomalies] = useState([]);
    const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(true);

    // Chat states
    const [chatInput, setChatInput] = useState('');
    const [chatMessages, setChatMessages] = useState([
        { sender: 'coach', text: "Hello! I am your AI Financial Advisor. I monitor your expenditures, category budgets, and security anomalies. Ask me anything about your finances!" }
    ]);
    const [isCoachTyping, setIsCoachTyping] = useState(false);

    const fetchAiInsights = async () => {
        if (!user?.mobileNumber) return;
        setIsLoadingAnalysis(true);
        try {
            const analysisRes = await api.get(`/ai/spending-analysis/${user.mobileNumber}`);
            setAnalysis(analysisRes.data);

            const anomalyRes = await api.get(`/ai/anomaly-detection/${user.mobileNumber}`);
            setAnomalies(anomalyRes.data || []);

            const initialAdviceRes = await api.get(`/ai/coach/${user.mobileNumber}`);
            if (initialAdviceRes.data.advice) {
                setChatMessages(prev => [
                    ...prev,
                    { sender: 'coach', text: initialAdviceRes.data.advice }
                ]);
            }
        } catch (err) {
            console.error("Failed to load AI insights:", err);
        } finally {
            setIsLoadingAnalysis(false);
        }
    };

    useEffect(() => {
        fetchAiInsights();
    }, [user?.mobileNumber]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        const userMsg = chatInput.trim();
        setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
        setChatInput('');
        setIsCoachTyping(true);

        // Simulated delay for premium coach response
        setTimeout(() => {
            let coachReply = "";
            const lowerMsg = userMsg.toLowerCase();

            if (lowerMsg.includes("balance") || lowerMsg.includes("money") || lowerMsg.includes("savings")) {
                coachReply = "To optimize your savings, try locking in a portion into a Fixed Deposit (FD) which earns up to 7.1% interest. I recommend maintaining a buffer equal to 3 months of expenses.";
            } else if (lowerMsg.includes("budget") || lowerMsg.includes("limit") || lowerMsg.includes("spend")) {
                coachReply = "We recommend allocating your salary according to the 50/30/20 rule: 50% for Needs, 30% for Wants, and 20% for Savings. You can configure spending limits directly on your Virtual Cards!";
            } else if (lowerMsg.includes("loan") || lowerMsg.includes("borrow") || lowerMsg.includes("emi")) {
                coachReply = "If you need additional funds, you can apply for Personal, Education, Home, or Auto loans directly from our Loans tab. Be sure to check your eligibility first to keep your credit score healthy!";
            } else if (lowerMsg.includes("invest") || lowerMsg.includes("wealth") || lowerMsg.includes("stock")) {
                coachReply = "Linking a Systematic Investment Plan (SIP) in mutual funds is an excellent way to harness compound interest. Start with ₹500/month to build long-term wealth.";
            } else {
                coachReply = "I am tracking your transactions. Based on your inputs, I recommend keeping an eye on your utility bill cycles and using virtual cards to set caps on your daily spending limits.";
            }

            setChatMessages(prev => [...prev, { sender: 'coach', text: coachReply }]);
            setIsCoachTyping(false);
        }, 1000);
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <header className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', borderRadius: '16px' }}>
                <button className="back-btn" onClick={() => navigate('/dashboard', { state: user })} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold' }}>
                    ← Back to Dashboard
                </button>
                <div style={{ textAlign: 'center' }}>
                    <h1>AI Spending Coach & Insights</h1>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Get category spending analysis, check anomaly flags, and talk to your financial coach</span>
                </div>
                <div style={{ width: '100px' }}></div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
                
                {/* Spending Analysis Left Panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    
                    {/* Category Breakdown */}
                    <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px' }}>
                        <h3 style={{ borderBottom: '2px solid rgba(79,70,229,0.1)', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: 'var(--primary)' }}>📊 Expenditures Breakdown</h3>
                        
                        {isLoadingAnalysis ? (
                            <div style={{ textAlign: 'center', padding: '2rem' }}>Analyzing transactions...</div>
                        ) : analysis && analysis.totalSpending > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                    Total Expenditure this month: <strong style={{ color: 'var(--text-primary)' }}>₹{analysis.totalSpending.toLocaleString()}</strong>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {Object.entries(analysis.totalsByCategory).map(([cat, total]) => {
                                        const pct = Math.round((total / analysis.totalSpending) * 100);
                                        return (
                                            <div key={cat}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                                                    <strong>{cat}</strong>
                                                    <span>₹{total.toLocaleString()} ({pct}%)</span>
                                                </div>
                                                <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${pct}%`, height: '100%', background: 'var(--primary)', borderRadius: '4px' }}></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No debit transactions recorded to build breakdown charts.</div>
                        )}
                    </div>

                    {/* Security & Anomaly alerts */}
                    <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px' }}>
                        <h3 style={{ borderBottom: '2px solid rgba(79,70,229,0.1)', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: '#ef4444' }}>🚨 Security Anomalies</h3>
                        
                        {isLoadingAnalysis ? (
                            <div style={{ textAlign: 'center', padding: '2rem' }}>Scanning for security anomalies...</div>
                        ) : anomalies.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {anomalies.map((anom, idx) => (
                                    <div key={idx} style={{ padding: '1rem', background: anom.severity === 'HIGH' ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)', border: `1px solid ${anom.severity === 'HIGH' ? '#ef4444' : '#f59e0b'}`, borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <strong style={{ fontSize: '0.85rem' }}>{anom.description || 'Suspicious Outflow'}</strong>
                                            <span style={{ fontSize: '0.72rem', background: anom.severity === 'HIGH' ? '#ef4444' : '#f59e0b', color: '#fff', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>{anom.severity}</span>
                                        </div>
                                        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Amount: <strong>₹{anom.amount.toLocaleString()}</strong></span>
                                        <ul style={{ paddingLeft: '1rem', margin: '4px 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                            {anom.reasons.map((r, rIdx) => (
                                                <li key={rIdx}>{r}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '2rem', color: '#10b981', background: 'rgba(16,185,129,0.05)', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.2)' }}>
                                ✅ No security anomalies or suspicious patterns detected. Your profile is safe.
                            </div>
                        )}
                    </div>
                </div>

                {/* AI Chatbot Terminal Right Panel */}
                <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', height: '600px' }}>
                    <h3 style={{ borderBottom: '2px solid rgba(79,70,229,0.1)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--primary)' }}>💬 Financial Coach Chat</h3>
                    
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '10px', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', marginBottom: '1rem' }}>
                        {chatMessages.map((msg, idx) => (
                            <div 
                                key={idx} 
                                style={{ 
                                    maxWidth: '85%', 
                                    padding: '10px 14px', 
                                    borderRadius: '16px', 
                                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                                    background: msg.sender === 'user' ? 'var(--primary)' : '#fff',
                                    color: msg.sender === 'user' ? '#fff' : 'var(--text-primary)',
                                    border: msg.sender === 'user' ? 'none' : '1px solid rgba(0,0,0,0.08)',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                }}
                            >
                                <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.4 }}>{msg.text}</p>
                            </div>
                        ))}
                        {isCoachTyping && (
                            <div style={{ alignSelf: 'flex-start', background: '#f3f4f6', padding: '8px 14px', borderRadius: '16px', fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                                Coach is typing advice...
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px' }}>
                        <input 
                            type="text" 
                            placeholder="Ask about budgets, FDs, savings, cards..."
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.1)' }}
                            required
                        />
                        <button 
                            type="submit"
                            style={{ padding: '12px 18px', border: 'none', background: 'var(--primary)', color: '#fff', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                            Send
                        </button>
                    </form>
                </div>

            </div>
        </div>
    );
};

export default AiCoach;
