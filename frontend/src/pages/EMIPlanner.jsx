import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { calculateEMISavings, generateAISuggestions, calculateProgress } from '../utils/emiSavingsCalculator';
import { analyzeSpending } from '../utils/spendingAnalyzer';
import '../styles/pages/EMIPlanner.css';

const EMIPlanner = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const user = location.state || null;

    // ── State ──
    const [emiAmount, setEmiAmount] = useState('');
    const [days, setDays] = useState(30);
    const [customInterval, setCustomInterval] = useState(10);
    const [savedSoFar, setSavedSoFar] = useState(0);
    const [showResults, setShowResults] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [isLoadingTx, setIsLoadingTx] = useState(false);
    const [activeTab, setActiveTab] = useState('plan'); // plan | schedule | tracker

    // ── Fetch transactions for AI spending-based suggestions ──
    useEffect(() => {
        if (!user?.mobileNumber) return;
        setIsLoadingTx(true);
        api.get(`/transactions/${user.mobileNumber}`)
            .then(res => setTransactions(res.data || []))
            .catch(() => { })
            .finally(() => setIsLoadingTx(false));
    }, [user?.mobileNumber]);

    const spendingAnalysis = useMemo(() => {
        return analyzeSpending(transactions, user?.mobileNumber);
    }, [transactions, user?.mobileNumber]);

    // ── Compute savings plan ──
    const savingsPlan = useMemo(() => {
        if (!showResults || !emiAmount) return null;
        return calculateEMISavings(Number(emiAmount), Number(days), Number(customInterval));
    }, [showResults, emiAmount, days, customInterval]);

    const aiSuggestions = useMemo(() => {
        if (!savingsPlan || !savingsPlan.isValid) return null;
        return generateAISuggestions(savingsPlan, spendingAnalysis);
    }, [savingsPlan, spendingAnalysis]);

    const progress = useMemo(() => {
        if (!savingsPlan || !savingsPlan.isValid) return null;
        return calculateProgress(savedSoFar, Number(emiAmount), 0, Number(days));
    }, [savedSoFar, emiAmount, days, savingsPlan]);

    // ── Handlers ──
    const handleCalculate = (e) => {
        e.preventDefault();
        if (!emiAmount || Number(emiAmount) <= 0) return;
        setShowResults(true);
    };

    const handleReset = () => {
        setShowResults(false);
        setEmiAmount('');
        setDays(30);
        setCustomInterval(10);
        setSavedSoFar(0);
        setActiveTab('plan');
    };

    // ── Preset EMI buttons ──
    const presets = [2000, 5000, 8000, 10000, 15000, 20000];

    return (
        <div className="emi-planner-container">
            {/* ── Header ── */}
            <div className="emi-header">
                <div className="emi-header-left">
                    <h1>
                        EMI Savings Planner
                        <span className="emi-ai-badge">AI Powered</span>
                    </h1>
                    <p>Smart financial planning to make your EMI payments effortless</p>
                </div>
                <div className="emi-header-right">
                    <button className="emi-btn-back" onClick={() => navigate('/dashboard', { state: user })}>
                        ← Dashboard
                    </button>
                </div>
            </div>

            {/* ── Input Section ── */}
            <div className="emi-input-section glass-panel">
                <div className="emi-input-header">
                    <div className="emi-input-icon">🎯</div>
                    <div>
                        <h2>Plan Your EMI Savings</h2>
                        <p>Enter your EMI details and we'll create a smart savings plan</p>
                    </div>
                </div>

                <form onSubmit={handleCalculate} className="emi-form">
                    <div className="emi-form-row">
                        <div className="emi-form-group emi-amount-group">
                            <label htmlFor="emi-amount">EMI Amount (₹)</label>
                            <div className="emi-amount-input-wrapper">
                                <span className="emi-currency-symbol">₹</span>
                                <input
                                    id="emi-amount"
                                    type="number"
                                    min="1"
                                    value={emiAmount}
                                    onChange={(e) => { setEmiAmount(e.target.value); setShowResults(false); }}
                                    placeholder="e.g. 6000"
                                    className="emi-amount-input"
                                    required
                                />
                            </div>
                            {/* Preset buttons */}
                            <div className="emi-presets">
                                {presets.map(p => (
                                    <button
                                        key={p}
                                        type="button"
                                        className={`emi-preset-btn ${Number(emiAmount) === p ? 'active' : ''}`}
                                        onClick={() => { setEmiAmount(p); setShowResults(false); }}
                                    >
                                        ₹{p >= 1000 ? `${p / 1000}K` : p}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="emi-form-group">
                            <label htmlFor="emi-days">Days Remaining</label>
                            <input
                                id="emi-days"
                                type="number"
                                min="1"
                                max="365"
                                value={days}
                                onChange={(e) => { setDays(e.target.value); setShowResults(false); }}
                                className="emi-days-input"
                            />
                            <div className="emi-day-presets">
                                {[15, 30, 45, 60].map(d => (
                                    <button
                                        key={d}
                                        type="button"
                                        className={`emi-preset-btn small ${Number(days) === d ? 'active' : ''}`}
                                        onClick={() => { setDays(d); setShowResults(false); }}
                                    >
                                        {d}d
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="emi-form-group">
                            <label htmlFor="emi-custom">Custom Interval (days)</label>
                            <input
                                id="emi-custom"
                                type="number"
                                min="1"
                                max="365"
                                value={customInterval}
                                onChange={(e) => { setCustomInterval(e.target.value); setShowResults(false); }}
                                className="emi-days-input"
                            />
                        </div>
                    </div>

                    <div className="emi-form-actions">
                        <button type="submit" className="emi-calculate-btn" disabled={!emiAmount || Number(emiAmount) <= 0}>
                            <span className="emi-calc-icon">🤖</span>
                            Generate AI Savings Plan
                        </button>
                        {showResults && (
                            <button type="button" className="emi-reset-btn" onClick={handleReset}>
                                Reset
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* ── Results ── */}
            {showResults && savingsPlan && savingsPlan.isValid && (
                <div className="emi-results-section">
                    {/* ── Savings Cards Row ── */}
                    <div className="emi-savings-cards">
                        <SavingsCard
                            icon="📅"
                            label="Daily Saving"
                            amount={savingsPlan.dailySaving}
                            sublabel={`for ${savingsPlan.days} days`}
                            variant="primary"
                        />
                        <SavingsCard
                            icon="📆"
                            label="Weekly Saving"
                            amount={savingsPlan.weeklySaving}
                            sublabel={`${Math.ceil(savingsPlan.days / 7)} weeks`}
                            variant="secondary"
                        />
                        <SavingsCard
                            icon="🗓️"
                            label={`Every ${savingsPlan.customInterval} Days`}
                            amount={savingsPlan.customSaving}
                            sublabel={`${Math.ceil(savingsPlan.days / savingsPlan.customInterval)} intervals`}
                            variant="accent"
                        />
                        <SavingsCard
                            icon="💰"
                            label="Monthly Total"
                            amount={savingsPlan.monthlySaving}
                            sublabel="EMI target"
                            variant="gradient"
                        />
                    </div>

                    {/* ── Tabs ── */}
                    <div className="emi-tabs">
                        <button className={`emi-tab ${activeTab === 'plan' ? 'active' : ''}`} onClick={() => setActiveTab('plan')}>
                            🤖 AI Insights
                        </button>
                        <button className={`emi-tab ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => setActiveTab('schedule')}>
                            📊 Weekly Schedule
                        </button>
                        <button className={`emi-tab ${activeTab === 'tracker' ? 'active' : ''}`} onClick={() => setActiveTab('tracker')}>
                            📈 Milestone Tracker
                        </button>
                    </div>

                    {/* ── Tab Content ── */}
                    <div className="emi-tab-content">
                        {activeTab === 'plan' && aiSuggestions && (
                            <div className="emi-ai-section glass-panel">
                                <div className="emi-ai-header">
                                    <h3>🤖 AI-Powered Savings Insights</h3>
                                    <span className="emi-smart-tag">SMART ANALYSIS</span>
                                </div>
                                {/* Summary Banner */}
                                <div className="emi-ai-summary">
                                    <div className="emi-ai-summary-icon">💡</div>
                                    <p>{aiSuggestions.summary}</p>
                                </div>
                                {/* Suggestion Cards */}
                                <div className="emi-suggestions-list">
                                    {aiSuggestions.suggestions.map((s, i) => (
                                        <div key={i} className={`emi-suggestion-card ${s.type}`}>
                                            <div className="emi-suggestion-header">
                                                <span className="emi-suggestion-icon">{s.icon}</span>
                                                <span className="emi-suggestion-title">{s.title}</span>
                                            </div>
                                            <p className="emi-suggestion-text">{s.text}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'schedule' && (
                            <div className="emi-schedule-section glass-panel">
                                <div className="emi-schedule-header">
                                    <h3>📊 Weekly Savings Schedule</h3>
                                    <span className="emi-schedule-total">
                                        Target: ₹{savingsPlan.emiAmount.toLocaleString('en-IN')}
                                    </span>
                                </div>
                                <div className="emi-schedule-table">
                                    <div className="emi-schedule-row header">
                                        <span>Week</span>
                                        <span>Days</span>
                                        <span>Save This Week</span>
                                        <span>Cumulative</span>
                                        <span>Progress</span>
                                    </div>
                                    {savingsPlan.weeklySchedule.map((w) => (
                                        <div key={w.week} className="emi-schedule-row">
                                            <span className="emi-week-label">Week {w.week}</span>
                                            <span className="emi-week-days">Day {w.startDay}–{w.endDay}</span>
                                            <span className="emi-week-amount">₹{w.weekAmount.toLocaleString('en-IN')}</span>
                                            <span className="emi-week-cumulative">₹{w.cumulative.toLocaleString('en-IN')}</span>
                                            <span className="emi-week-progress">
                                                <div className="emi-mini-progress-track">
                                                    <div className="emi-mini-progress-fill" style={{ width: `${w.progress}%` }} />
                                                </div>
                                                <span className="emi-progress-pct">{Math.round(w.progress)}%</span>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'tracker' && (
                            <div className="emi-tracker-section glass-panel">
                                <div className="emi-tracker-header">
                                    <h3>📈 Milestone Tracker</h3>
                                </div>
                                <div className="emi-milestones">
                                    {savingsPlan.milestones.map((m, i) => (
                                        <div key={i} className="emi-milestone-card">
                                            <div className="emi-milestone-ring">
                                                <svg viewBox="0 0 80 80" className="emi-milestone-svg">
                                                    <circle
                                                        cx="40" cy="40" r="34"
                                                        fill="none"
                                                        stroke="rgba(79,70,229,0.1)"
                                                        strokeWidth="6"
                                                    />
                                                    <circle
                                                        cx="40" cy="40" r="34"
                                                        fill="none"
                                                        stroke={i === 3 ? '#10b981' : '#4f46e5'}
                                                        strokeWidth="6"
                                                        strokeDasharray={`${(parseFloat(m.label) / 100) * 213.6} 213.6`}
                                                        strokeLinecap="round"
                                                        transform="rotate(-90 40 40)"
                                                        className="emi-milestone-arc"
                                                    />
                                                    <text x="40" y="38" textAnchor="middle" className="emi-milestone-pct">
                                                        {m.label}
                                                    </text>
                                                    <text x="40" y="50" textAnchor="middle" className="emi-milestone-sub">
                                                        DONE
                                                    </text>
                                                </svg>
                                            </div>
                                            <div className="emi-milestone-info">
                                                <span className="emi-milestone-amount">₹{m.amount.toLocaleString('en-IN')}</span>
                                                <span className="emi-milestone-day">By Day {m.day}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Visual Progress Bar */}
                                <div className="emi-full-progress">
                                    <div className="emi-progress-header">
                                        <span>Overall EMI Progress</span>
                                        <span className="emi-progress-target">₹{savingsPlan.emiAmount.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="emi-progress-track-full">
                                        <div
                                            className="emi-progress-fill-full"
                                            style={{ width: `${Math.min((savedSoFar / Number(emiAmount)) * 100, 100)}%` }}
                                        />
                                        {savingsPlan.milestones.map((m, i) => (
                                            <div
                                                key={i}
                                                className="emi-progress-milestone-marker"
                                                style={{ left: `${parseFloat(m.label)}%` }}
                                                title={`${m.label} = ₹${m.amount.toLocaleString('en-IN')}`}
                                            />
                                        ))}
                                    </div>
                                    <div className="emi-progress-labels">
                                        <span>₹0</span>
                                        <span>₹{Math.round(savingsPlan.emiAmount / 2).toLocaleString('en-IN')}</span>
                                        <span>₹{savingsPlan.emiAmount.toLocaleString('en-IN')}</span>
                                    </div>
                                </div>

                                {/* Daily Reminder Suggestion */}
                                <div className="emi-reminder-card">
                                    <div className="emi-reminder-icon">⏰</div>
                                    <div className="emi-reminder-content">
                                        <h4>Daily Reminder</h4>
                                        <p>Save <strong>₹{savingsPlan.dailySaving.toLocaleString('en-IN')}</strong> today to stay on track for your ₹{savingsPlan.emiAmount.toLocaleString('en-IN')} EMI!</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Per-Hour Fun Fact ── */}
                    <div className="emi-funfact glass-panel">
                        <span className="emi-funfact-icon">⏱️</span>
                        <span>
                            <strong>Fun Fact:</strong> You need to save just <strong>₹{savingsPlan.perHour}/hour</strong> to hit your EMI target. That's less than a cup of chai!
                        </span>
                    </div>
                </div>
            )}

            {/* ── Validation error ── */}
            {showResults && savingsPlan && !savingsPlan.isValid && (
                <div className="emi-error glass-panel">
                    <span className="emi-error-icon">⚠️</span>
                    <span>{savingsPlan.error}</span>
                </div>
            )}
        </div>
    );
};

/* ── Sub Components ── */

const SavingsCard = ({ icon, label, amount, sublabel, variant }) => (
    <div className={`emi-saving-card ${variant}`}>
        <div className="emi-saving-card-icon">{icon}</div>
        <div className="emi-saving-card-amount">
            ₹{amount.toLocaleString('en-IN')}
        </div>
        <div className="emi-saving-card-label">{label}</div>
        <div className="emi-saving-card-sublabel">{sublabel}</div>
    </div>
);

export default EMIPlanner;
