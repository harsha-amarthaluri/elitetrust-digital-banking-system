import React, { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import { useLocation, useNavigate } from 'react-router-dom';
import { analyzeSpending, CATEGORY_CONFIG } from '../utils/spendingAnalyzer';
import SpendingCharts from '../components/SpendingCharts';
import '../styles/pages/SmartInsights.css';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const SmartInsights = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const user = location.state || null;

    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!user?.mobileNumber) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        api.get(`/transactions/${user.mobileNumber}`)
            .then(res => {
                setTransactions(res.data || []);
            })
            .catch(err => {
                console.error('Failed to fetch transactions for insights', err);
                setError('Failed to load transaction data.');
            })
            .finally(() => setIsLoading(false));
    }, [user?.mobileNumber]);

    const analysis = useMemo(() => {
        return analyzeSpending(transactions, user?.mobileNumber);
    }, [transactions, user?.mobileNumber]);

    // ─── Loading State ───
    if (isLoading) {
        return (
            <div className="insights-container">
                <div className="loading-container glass-panel" style={{ borderRadius: '20px' }}>
                    <div className="loading-spinner" />
                    <p className="loading-text">Analyzing your spending patterns...</p>
                </div>
            </div>
        );
    }

    // ─── Error State ───
    if (error) {
        return (
            <div className="insights-container">
                <div className="no-data-container glass-panel" style={{ borderRadius: '20px' }}>
                    <div className="no-data-icon">⚠️</div>
                    <h2>Something went wrong</h2>
                    <p>{error}</p>
                    <button className="btn-back" onClick={() => navigate('/dashboard', { state: user })}>
                        ← Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // ─── No Data State ───
    if (!analysis.hasData) {
        return (
            <div className="insights-container">
                <InsightsHeader user={user} navigate={navigate} />
                <div className="no-data-container glass-panel" style={{ borderRadius: '20px' }}>
                    <div className="no-data-icon">📊</div>
                    <h2>No Data Available</h2>
                    <p>{analysis.message || 'Start making transactions to see AI-powered spending insights.'}</p>
                    <button className="btn-back" onClick={() => navigate('/dashboard', { state: user })}>
                        ← Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const sortedCategories = Object.entries(analysis.categories)
        .sort(([, a], [, b]) => b.total - a.total);

    const sortedMonths = Object.keys(analysis.monthlyData).sort().slice(-6);

    return (
        <div className="insights-container">
            {/* Header */}
            <InsightsHeader user={user} navigate={navigate} />

            {/* Financial Health Score */}
            <div className="score-card">
                <div className="score-content">
                    <div className="score-ring">
                        <span className="score-value">{analysis.spendingScore}</span>
                        <span className="score-label">Score</span>
                    </div>
                    <div className="score-details">
                        <h2>Financial Health Score</h2>
                        <p>
                            {analysis.spendingScore >= 80
                                ? "Excellent! You're managing your finances like a pro. Keep up the great work!"
                                : analysis.spendingScore >= 60
                                    ? "Good financial health, but there's room for improvement. Check the insights below."
                                    : analysis.spendingScore >= 40
                                        ? "Your spending needs attention. Consider following the saving suggestions below."
                                        : "Critical! Your spending patterns need immediate attention. Review the insights carefully."}
                        </p>
                    </div>
                    <div className="score-stats">
                        <div className="score-stat-item">
                            <span className="stat-value">₹{analysis.totalSpend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                            <span className="stat-label">Total Spent</span>
                        </div>
                        <div className="score-stat-item">
                            <span className="stat-value">₹{analysis.totalIncome.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                            <span className="stat-label">Total Income</span>
                        </div>
                        <div className="score-stat-item">
                            <span className="stat-value" style={{ color: analysis.netSavings >= 0 ? '#4ade80' : '#fca5a5' }}>
                                {analysis.netSavings >= 0 ? '+' : ''}₹{analysis.netSavings.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </span>
                            <span className="stat-label">Net Savings</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="quick-stats-grid">
                <div className="quick-stat-card glass-panel">
                    <div className="quick-stat-icon" style={{ background: 'rgba(79, 70, 229, 0.1)' }}>💳</div>
                    <span className="quick-stat-value">{analysis.transactionCount}</span>
                    <span className="quick-stat-label">Transactions</span>
                </div>
                <div className="quick-stat-card glass-panel">
                    <div className="quick-stat-icon" style={{ background: 'rgba(236, 72, 153, 0.1)' }}>📊</div>
                    <span className="quick-stat-value">₹{analysis.averageTransaction.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    <span className="quick-stat-label">Avg Expense</span>
                </div>
                <div className="quick-stat-card glass-panel">
                    <div className="quick-stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>🔥</div>
                    <span className="quick-stat-value">{analysis.highestCategory.config?.label || analysis.highestCategory.category}</span>
                    <span className="quick-stat-label">Top Category</span>
                </div>
                <div className="quick-stat-card glass-panel">
                    <div className="quick-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>📅</div>
                    <span className="quick-stat-value">{analysis.topSpendingDay.day}</span>
                    <span className="quick-stat-label">Top Spend Day</span>
                </div>
            </div>

            {/* Main Grid: Categories + Insights */}
            <div className="insights-grid">
                {/* Category Breakdown */}
                <div className="category-section glass-panel">
                    <div className="section-header">
                        <h3>📁 Category Breakdown</h3>
                    </div>

                    {/* Donut Chart */}
                    <DonutChart categories={sortedCategories} totalSpend={analysis.totalSpend} />

                    {/* Category List */}
                    <div className="category-list">
                        {sortedCategories.map(([cat, data]) => {
                            const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.OTHER;
                            const isHigh = data.percentage > (config.threshold * 100 * 1.5);
                            return (
                                <div key={cat} className="category-row">
                                    <div className="category-icon" style={{ background: `${config.color}18` }}>
                                        {config.icon}
                                    </div>
                                    <div className="category-info">
                                        <div className="category-name-row">
                                            <span className="category-name" style={isHigh ? { color: '#ef4444' } : {}}>
                                                {config.label}
                                                {isHigh && <span style={{ fontSize: '0.7rem', marginLeft: '6px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '1px 6px', borderRadius: '6px' }}>HIGH</span>}
                                            </span>
                                            <span className="category-amount">₹{data.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                        </div>
                                        <div className="category-bar-track">
                                            <div
                                                className="category-bar-fill"
                                                style={{
                                                    width: `${data.percentage}%`,
                                                    background: isHigh
                                                        ? 'linear-gradient(90deg, #ef4444, #f97316)'
                                                        : `linear-gradient(90deg, ${config.color}, ${config.color}cc)`,
                                                }}
                                            />
                                        </div>
                                        <div className="category-percentage">
                                            <span>{data.percentage.toFixed(1)}%</span>
                                            <span>{data.count} txns</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* AI Insights */}
                <div className="insights-list-section glass-panel">
                    <div className="section-header">
                        <h3>🤖 AI Insights</h3>
                        <span style={{ fontSize: '0.7rem', background: 'linear-gradient(135deg, #4f46e5, #ec4899)', color: '#fff', padding: '3px 10px', borderRadius: '10px', fontWeight: 700, letterSpacing: '1px' }}>
                            SMART
                        </span>
                    </div>
                    <div className="insights-list">
                        {analysis.insights.map((insight, i) => (
                            <div key={i} className={`insight-card ${insight.type}`}>
                                <div className="insight-header">
                                    <span className="insight-icon">{insight.icon}</span>
                                    <span className="insight-title">{insight.title}</span>
                                </div>
                                <p className="insight-text">{insight.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ─── Recharts Bar Graph Visualization ─── */}
            <SpendingCharts analysis={analysis} />

            {/* Prediction Section */}
            {analysis.prediction.hasData && (
                <div className="prediction-section glass-panel">
                    <div className="section-header">
                        <h3>🔮 Predictions & Trends</h3>
                    </div>
                    <div className="prediction-content">
                        <div className="prediction-item">
                            <div className="prediction-item-label">Monthly Average</div>
                            <div className="prediction-item-value">₹{analysis.prediction.averageMonthly.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                        </div>
                        <div className="prediction-item">
                            <div className="prediction-item-label">Projected This Month</div>
                            <div className="prediction-item-value">₹{analysis.prediction.projectedMonthEnd.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                        </div>
                        <div className="prediction-item">
                            <div className="prediction-item-label">Spending Trend</div>
                            <div className="prediction-item-value" style={{ fontSize: '1.2rem' }}>
                                {analysis.prediction.trendDirection === 'increasing' ? '📈' : analysis.prediction.trendDirection === 'decreasing' ? '📉' : '➡️'}
                                {' '}
                                {analysis.prediction.trendDirection.charAt(0).toUpperCase() + analysis.prediction.trendDirection.slice(1)}
                            </div>
                            <span className={`prediction-item-trend ${
                                analysis.prediction.trendDirection === 'increasing' ? 'trend-up'
                                    : analysis.prediction.trendDirection === 'decreasing' ? 'trend-down'
                                        : 'trend-stable'
                            }`}>
                                {analysis.prediction.trend > 0 ? '+' : ''}{analysis.prediction.trend.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '1rem', textAlign: 'center', fontStyle: 'italic' }}>
                        {analysis.prediction.message}
                    </p>
                </div>
            )}

            {/* Frequent Small Expenses */}
            {analysis.frequentSmallExpenses.length > 0 && (
                <div className="frequent-expenses-section glass-panel">
                    <div className="section-header">
                        <h3>🔄 Frequent Small Expenses</h3>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Under ₹300 each</span>
                    </div>
                    <div className="frequent-list">
                        {analysis.frequentSmallExpenses.map((item, i) => (
                            <div key={i} className="frequent-item">
                                <div className="frequent-icon" style={{ background: `${item.config.color}18` }}>
                                    {item.config.icon}
                                </div>
                                <div className="frequent-info">
                                    <div className="frequent-name">{item.config.label}</div>
                                    <div className="frequent-count">{item.count} small transactions</div>
                                </div>
                                <div className="frequent-total">₹{item.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

/* ─── Sub Components ─── */

const InsightsHeader = ({ user, navigate }) => (
    <div className="insights-header">
        <div className="insights-header-left">
            <h1>
                Smart Insights
                <span className="ai-badge">AI Powered</span>
            </h1>
            <p>Intelligent analysis of your spending patterns and financial health</p>
        </div>
        <div className="insights-header-right">
            <button className="btn-back" onClick={() => navigate('/dashboard', { state: user })}>
                ← Dashboard
            </button>
        </div>
    </div>
);

const DonutChart = ({ categories, totalSpend }) => {
    const size = 180;
    const strokeWidth = 30;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    let cumulativeOffset = 0;

    return (
        <div className="donut-chart-wrapper">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="donut-chart-svg">
                {categories.map(([cat, data]) => {
                    const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.OTHER;
                    const segmentLength = (data.percentage / 100) * circumference;
                    const gapSize = 3;
                    const dashArray = `${Math.max(0, segmentLength - gapSize)} ${circumference - segmentLength + gapSize}`;
                    const offset = -cumulativeOffset;
                    cumulativeOffset += segmentLength;

                    return (
                        <circle
                            key={cat}
                            className="donut-segment"
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            fill="none"
                            stroke={config.color}
                            strokeWidth={strokeWidth}
                            strokeDasharray={dashArray}
                            strokeDashoffset={offset}
                            strokeLinecap="round"
                        />
                    );
                })}
                <text x={size / 2} y={size / 2 - 6} className="donut-center-text" style={{ fontSize: '14px', fontWeight: 800 }}
                    transform={`rotate(90, ${size / 2}, ${size / 2})`}>
                    ₹{(totalSpend / 1000).toFixed(1)}K
                </text>
                <text x={size / 2} y={size / 2 + 12} className="donut-center-text" style={{ fontSize: '8px', fill: 'var(--text-secondary)' }}
                    transform={`rotate(90, ${size / 2}, ${size / 2})`}>
                    TOTAL SPENT
                </text>
            </svg>
        </div>
    );
};

const MonthlyBarChart = ({ monthlyData, months }) => {
    const maxVal = Math.max(...months.map(m => monthlyData[m]?.total || 0));

    return (
        <div className="monthly-bars">
            {months.map(monthKey => {
                const data = monthlyData[monthKey];
                const total = data?.total || 0;
                const height = maxVal > 0 ? (total / maxVal) * 160 : 4;
                const [year, month] = monthKey.split('-');
                const label = MONTH_NAMES[parseInt(month) - 1] || monthKey;

                return (
                    <div key={monthKey} className="monthly-bar-col">
                        <span className="monthly-bar-value">₹{(total / 1000).toFixed(1)}K</span>
                        <div
                            className="monthly-bar"
                            style={{ height: `${height}px` }}
                            title={`${label} ${year}: ₹${total.toLocaleString('en-IN')}`}
                        />
                        <span className="monthly-bar-label">{label}</span>
                    </div>
                );
            })}
        </div>
    );
};

export default SmartInsights;
