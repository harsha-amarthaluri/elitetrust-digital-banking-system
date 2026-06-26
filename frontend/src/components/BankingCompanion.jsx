import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    detectIntent,
    detectTone,
    generateResponse,
    generateProactiveAlerts,
    calculateBadges,
    getRandomChallenge,
    parseGoalFromMessage,
    calculateGoalProgress,
} from '../utils/bankingCompanion';
import '../styles/components/BankingCompanion.css';

const TABS = [
    { id: 'chat', icon: '💬', label: 'Chat' },
    { id: 'alerts', icon: '🔔', label: 'Alerts' },
    { id: 'badges', icon: '🏆', label: 'Rewards' },
];

const BankingCompanion = ({ user, primaryAccount, spendingAnalysis }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // ── State ──
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('chat');
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [goals, setGoals] = useState(() => {
        try { return JSON.parse(localStorage.getItem('companion_goals') || '[]'); } catch { return []; }
    });

    // Build user data for the AI engine
    const userData = useMemo(() => ({
        balance: primaryAccount?.balance,
        userName: user?.name,
        spendingAnalysis,
        goals,
    }), [primaryAccount, user, spendingAnalysis, goals]);

    // ── Alerts ──
    const alerts = useMemo(() => {
        return generateProactiveAlerts({
            balance: primaryAccount?.balance,
            spendingAnalysis,
        });
    }, [primaryAccount, spendingAnalysis]);

    // ── Badges ──
    const badges = useMemo(() => {
        return calculateBadges({
            spendingScore: spendingAnalysis?.spendingScore || 0,
            spendRatio: spendingAnalysis?.hasData ? (spendingAnalysis.totalSpend / (spendingAnalysis.totalIncome || 1)) : 1,
            goalsCreated: goals.length,
            transfersMade: 1, // simplified
            billsPaid: 1,
        });
    }, [spendingAnalysis, goals]);

    // ── Challenge ──
    const [currentChallenge] = useState(() => getRandomChallenge());

    // Auto-scroll to latest message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    // Welcome message on first open
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            sendBotMessage('GREETING');
        }
    }, [isOpen]);

    // Focus input when chat opens
    useEffect(() => {
        if (isOpen && activeTab === 'chat') {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen, activeTab]);

    // Persist goals
    useEffect(() => {
        localStorage.setItem('companion_goals', JSON.stringify(goals));
    }, [goals]);

    // ── Send bot message ──
    const sendBotMessage = useCallback((intent, userMsg = null) => {
        setIsTyping(true);

        // Simulate "thinking" delay
        const delay = 600 + Math.random() * 800;
        setTimeout(() => {
            const tone = detectTone(userMsg);
            const response = generateResponse(intent, tone, userData);

            setMessages(prev => [...prev, {
                id: Date.now(),
                sender: 'bot',
                text: response.text,
                quickActions: response.quickActions,
                type: response.type,
                navigate: response.navigate,
                timestamp: new Date(),
            }]);
            setIsTyping(false);
        }, delay);
    }, [userData]);

    // ── Handle user send ──
    const handleSend = useCallback(() => {
        const msg = inputValue.trim();
        if (!msg) return;

        // Add user message
        setMessages(prev => [...prev, {
            id: Date.now(),
            sender: 'user',
            text: msg,
            timestamp: new Date(),
        }]);
        setInputValue('');

        // Check for goal parsing first
        const goalResult = parseGoalFromMessage(msg);
        if (goalResult) {
            setIsTyping(true);
            setTimeout(() => {
                const newGoal = {
                    id: Date.now(),
                    targetAmount: goalResult.targetAmount,
                    months: goalResult.months,
                    savedSoFar: 0,
                    createdAt: new Date().toISOString(),
                };
                setGoals(prev => [...prev, newGoal]);
                setMessages(prev => [...prev, {
                    id: Date.now(),
                    sender: 'bot',
                    text: goalResult.message,
                    quickActions: ['View Progress', 'Plan EMI', 'Check Balance'],
                    type: 'goal',
                    timestamp: new Date(),
                }]);
                setIsTyping(false);
            }, 800);
            return;
        }

        // Detect intent and respond
        const intent = detectIntent(msg);
        sendBotMessage(intent, msg);
    }, [inputValue, sendBotMessage]);

    // ── Handle quick action clicks ──
    const handleQuickAction = useCallback((action) => {
        const actionMap = {
            'Check Balance': () => sendBotMessage('CHECK_BALANCE'),
            'View Insights': () => sendBotMessage('VIEW_INSIGHTS'),
            'Plan EMI': () => sendBotMessage('PLAN_EMI'),
            'Transfer Money': () => sendBotMessage('TRANSFER'),
            'Pay Bills': () => sendBotMessage('PAY_BILL'),
            'Help': () => sendBotMessage('HELP'),
            'Plan Savings': () => sendBotMessage('SET_GOAL'),
            'Set a Goal': () => sendBotMessage('SET_GOAL'),
            'Set New Goal': () => sendBotMessage('SET_GOAL'),
            'View History': () => sendBotMessage('TRANSACTIONS'),
            'View Trends': () => sendBotMessage('VIEW_INSIGHTS'),
            'View Progress': () => {
                if (goals.length > 0) {
                    const g = goals[0];
                    const progress = calculateGoalProgress(g.savedSoFar, g.targetAmount);
                    setMessages(prev => [...prev, {
                        id: Date.now(),
                        sender: 'bot',
                        text: `📈 **Goal Progress:**\n\n${progress.message}\n\n🎯 Target: ₹${g.targetAmount.toLocaleString('en-IN')}\n💰 Saved: ₹${g.savedSoFar.toLocaleString('en-IN')}\n📊 Progress: ${progress.percent}%`,
                        quickActions: ['Add Savings', 'View Insights', 'New Goal'],
                        type: 'progress',
                        goalProgress: progress,
                        timestamp: new Date(),
                    }]);
                } else {
                    sendBotMessage('SET_GOAL');
                }
            },
            'Go to Insights': () => { navigate('/smart-insights', { state: user }); setIsOpen(false); },
            'Go to EMI Planner': () => { navigate('/emi-planner', { state: user }); setIsOpen(false); },
            'Go to Transfer': () => { navigate('/fund-transfer', { state: user }); setIsOpen(false); },
            'Go to Pay Bill': () => { navigate('/pay-bill', { state: user }); setIsOpen(false); },
            'Go to Recharge': () => { navigate('/recharge', { state: user }); setIsOpen(false); },
            'Go to Invest': () => { navigate('/invest', { state: user }); setIsOpen(false); },
            'Go to Profile': () => { navigate('/profile', { state: user }); setIsOpen(false); },
            'Go to Transactions': () => { navigate('/transactions', { state: user }); setIsOpen(false); },
            'EMI Planner': () => sendBotMessage('PLAN_EMI'),
            'Reduce Spending': () => sendBotMessage('VIEW_INSIGHTS'),
            'View Details': () => sendBotMessage('VIEW_INSIGHTS'),
            'Plan Now': () => sendBotMessage('PLAN_EMI'),
            'Share Achievement': () => {
                setMessages(prev => [...prev, {
                    id: Date.now(),
                    sender: 'bot',
                    text: `🎉 That's the spirit! Keep sharing your wins — it builds momentum! 💪\n\n🏆 Your achievements are recorded in the Rewards tab.`,
                    quickActions: ['View Badges', 'Set New Goal', 'Check Balance'],
                    type: 'celebrate',
                    timestamp: new Date(),
                }]);
            },
            'View Badges': () => setActiveTab('badges'),
            'Add Savings': () => {
                setMessages(prev => [...prev, {
                    id: Date.now(),
                    sender: 'bot',
                    text: `💰 To add savings, transfer money to your savings account and I'll track the progress!\n\n💡 **Tip:** Automate daily small transfers for consistent saving.`,
                    quickActions: ['Go to Transfer', 'View Progress', 'Check Balance'],
                    type: 'info',
                    timestamp: new Date(),
                }]);
            },
        };

        // Add user action message
        setMessages(prev => [...prev, {
            id: Date.now(),
            sender: 'user',
            text: action,
            timestamp: new Date(),
            isQuickAction: true,
        }]);

        // Execute action
        const handler = actionMap[action];
        if (handler) {
            handler();
        } else {
            sendBotMessage('HELP');
        }
    }, [navigate, user, goals, sendBotMessage]);

    // ── Alert action handler ──
    const handleAlertAction = useCallback((action) => {
        setActiveTab('chat');
        handleQuickAction(action);
    }, [handleQuickAction]);

    // ── Format message text (simple markdown) ──
    const formatText = (text) => {
        if (!text) return '';
        return text.split('\n').map((line, i) => {
            // Bold
            let formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            // Bullet
            if (formatted.startsWith('• ') || formatted.startsWith('- ')) {
                formatted = `<span style="padding-left: 8px">${formatted}</span>`;
            }
            // Numbered list
            if (/^\d+\.\s/.test(formatted)) {
                formatted = `<span style="padding-left: 8px">${formatted}</span>`;
            }
            return `<div class="msg-line" key="${i}">${formatted || '&nbsp;'}</div>`;
        }).join('');
    };

    // ── Key handler ──
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // ── Render ──
    return (
        <>
            {/* Floating Trigger */}
            <button
                className={`companion-trigger ${isOpen ? 'active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Open Banking Companion"
                id="companion-trigger-btn"
            >
                <span className="trigger-icon">{isOpen ? '✕' : '🤖'}</span>
                {!isOpen && alerts.length > 0 && (
                    <span className="companion-notification-badge">{alerts.length}</span>
                )}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="companion-window" id="companion-window">
                    {/* Header */}
                    <div className="companion-header">
                        <div className="companion-header-info">
                            <div className="companion-avatar">🤖</div>
                            <div className="companion-header-text">
                                <h3>Smart Companion</h3>
                                <div className="companion-header-status">
                                    <span className="companion-status-dot" />
                                    Always here to help
                                </div>
                            </div>
                        </div>
                        <div className="companion-header-actions">
                            <button
                                className="companion-header-btn"
                                onClick={() => {
                                    setMessages([]);
                                    sendBotMessage('GREETING');
                                }}
                                title="Reset conversation"
                            >
                                🔄
                            </button>
                            <button
                                className="companion-header-btn"
                                onClick={() => setIsOpen(false)}
                                title="Close"
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="companion-tabs">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                className={`companion-tab ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <span className="tab-icon">{tab.icon}</span>
                                {tab.label}
                                {tab.id === 'alerts' && alerts.length > 0 && (
                                    <span style={{
                                        width: 6, height: 6, borderRadius: '50%',
                                        background: '#ef4444', position: 'absolute',
                                        top: 8, right: '30%'
                                    }} />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* ── Chat Tab ── */}
                    {activeTab === 'chat' && (
                        <>
                            <div className="companion-messages">
                                {messages.map(msg => (
                                    <div key={msg.id} className={`companion-message ${msg.sender}`}>
                                        <div className="message-avatar">
                                            {msg.sender === 'bot' ? '🤖' : (user?.name?.[0]?.toUpperCase() || '👤')}
                                        </div>
                                        <div>
                                            <div
                                                className="message-bubble"
                                                dangerouslySetInnerHTML={{ __html: formatText(msg.text) }}
                                            />
                                            {/* Goal Progress Card */}
                                            {msg.goalProgress && (
                                                <div className="goal-progress-card">
                                                    <div className="goal-header">
                                                        <span className="goal-title">🎯 Goal Progress</span>
                                                        <span className="goal-percentage">{msg.goalProgress.percent}%</span>
                                                    </div>
                                                    <div className="goal-progress-bar">
                                                        <div className="goal-progress-fill"
                                                            style={{ width: `${msg.goalProgress.percent}%` }}
                                                        />
                                                    </div>
                                                    <div className="goal-message">{msg.goalProgress.message}</div>
                                                </div>
                                            )}
                                            {/* Quick Actions */}
                                            {msg.sender === 'bot' && msg.quickActions && (
                                                <div className="companion-quick-actions">
                                                    {msg.quickActions.map((action, i) => (
                                                        <button
                                                            key={i}
                                                            className="quick-action-btn"
                                                            onClick={() => handleQuickAction(action)}
                                                        >
                                                            {action}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {isTyping && (
                                    <div className="companion-message bot">
                                        <div className="message-avatar">🤖</div>
                                        <div className="typing-indicator">
                                            <div className="typing-dot" />
                                            <div className="typing-dot" />
                                            <div className="typing-dot" />
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="companion-input-area">
                                <input
                                    ref={inputRef}
                                    className="companion-input"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask me anything..."
                                    disabled={isTyping}
                                    id="companion-message-input"
                                />
                                <button
                                    className="companion-send-btn"
                                    onClick={handleSend}
                                    disabled={!inputValue.trim() || isTyping}
                                    id="companion-send-btn"
                                >
                                    ➤
                                </button>
                            </div>
                        </>
                    )}

                    {/* ── Alerts Tab ── */}
                    {activeTab === 'alerts' && (
                        <div className="companion-alerts-panel">
                            {alerts.length > 0 ? (
                                alerts.map((alert, i) => (
                                    <div key={i} className={`companion-alert-card ${alert.type}`}>
                                        <span className="alert-icon">{alert.icon}</span>
                                        <div className="alert-content">
                                            <div className="alert-text">{alert.text}</div>
                                            <div className="alert-actions">
                                                {alert.actions.map((action, j) => (
                                                    <button
                                                        key={j}
                                                        className="alert-action-btn"
                                                        onClick={() => handleAlertAction(action)}
                                                    >
                                                        {action}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="no-alerts-state">
                                    <span className="no-alerts-icon">✅</span>
                                    <p>All clear! No alerts right now. 🎉</p>
                                    <p style={{ fontSize: '0.75rem', marginTop: '8px' }}>
                                        I'll notify you about important financial events.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Badges Tab ── */}
                    {activeTab === 'badges' && (
                        <div className="companion-badges-panel">
                            <div className="badges-grid">
                                {badges.map(badge => (
                                    <div key={badge.id} className={`badge-card ${badge.earned ? 'earned' : 'locked'}`}>
                                        <span className="badge-icon">
                                            {badge.label.split(' ').pop()}
                                        </span>
                                        <div className="badge-label">
                                            {badge.label.split(' ').slice(0, -1).join(' ')}
                                        </div>
                                        <div className="badge-desc">{badge.description}</div>
                                        <div className="badge-status">
                                            {badge.earned ? '✅ Earned' : '🔒 Locked'}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Challenge */}
                            {currentChallenge && (
                                <div className="challenge-section">
                                    <h4>🎮 Today's Challenge</h4>
                                    <div className="challenge-card">
                                        <div className="challenge-emoji">{currentChallenge.emoji}</div>
                                        <div className="challenge-info">
                                            <div className="challenge-label">{currentChallenge.label}</div>
                                            <div className="challenge-status">Active Challenge</div>
                                        </div>
                                        <button className="challenge-accept-btn">Accept</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

export default BankingCompanion;
