import React, { useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, Cell, ReferenceLine
} from 'recharts';
import { CATEGORY_CONFIG } from '../utils/spendingAnalyzer';
import '../styles/components/SpendingCharts.css';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Color tiers for spending intensity
const getSpendingColor = (amount, maxAmount) => {
    const ratio = maxAmount > 0 ? amount / maxAmount : 0;
    if (ratio >= 0.75) return { fill: '#ef4444', gradient: ['#ef4444', '#dc2626'], label: 'High' }; // Red
    if (ratio >= 0.4) return { fill: '#3b82f6', gradient: ['#3b82f6', '#2563eb'], label: 'Moderate' }; // Blue
    return { fill: '#10b981', gradient: ['#10b981', '#059669'], label: 'Low' }; // Green
};

// Custom Tooltip
const CustomTooltip = ({ active, payload, label, prefix = '₹' }) => {
    if (!active || !payload || !payload.length) return null;

    return (
        <div className="chart-custom-tooltip">
            <p className="tooltip-label">{label}</p>
            {payload.map((entry, index) => (
                <div key={index} className="tooltip-row">
                    <span className="tooltip-dot" style={{ background: entry.color || entry.fill }} />
                    <span className="tooltip-name">{entry.name || entry.dataKey}</span>
                    <span className="tooltip-value">
                        {prefix}{Number(entry.value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                </div>
            ))}
        </div>
    );
};

// ─── Category-wise Spending Bar Chart ───
const CategoryBarChart = ({ categories, totalSpend }) => {
    const data = useMemo(() => {
        if (!categories) return [];
        return Object.entries(categories)
            .sort(([, a], [, b]) => b.total - a.total)
            .map(([cat, catData]) => {
                const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.OTHER;
                return {
                    name: config.label,
                    amount: catData.total,
                    percentage: catData.percentage,
                    count: catData.count,
                    color: config.color,
                    icon: config.icon,
                    category: cat,
                };
            });
    }, [categories]);

    if (data.length === 0) return <EmptyState message="No category data available" />;

    const maxAmount = Math.max(...data.map(d => d.amount));

    return (
        <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={320}>
                <BarChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                    <defs>
                        <linearGradient id="categoryGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.95} />
                            <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.7} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                    <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickLine={false}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        height={60}
                    />
                    <YAxis
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}K`}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(79, 70, 229, 0.04)' }} />
                    <Bar
                        dataKey="amount"
                        name="Spending"
                        fill="url(#categoryGradient)"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={55}
                        animationDuration={1200}
                        animationBegin={200}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

// ─── Monthly Spending Trend Bar Chart ───
const MonthlyTrendChart = ({ monthlyData, filter }) => {
    const data = useMemo(() => {
        if (!monthlyData) return [];
        const sortedKeys = Object.keys(monthlyData).sort();

        let filteredKeys = sortedKeys;
        if (filter === 'weekly') {
            filteredKeys = sortedKeys.slice(-1); // Current month only
        } else if (filter === 'monthly') {
            filteredKeys = sortedKeys.slice(-6);
        } else {
            filteredKeys = sortedKeys; // yearly (all)
        }

        return filteredKeys.map(key => {
            const [year, month] = key.split('-');
            const monthLabel = MONTH_NAMES[parseInt(month) - 1] || key;
            return {
                name: `${monthLabel} '${year.slice(2)}`,
                amount: monthlyData[key].total,
                transactions: monthlyData[key].count,
            };
        });
    }, [monthlyData, filter]);

    if (data.length === 0) return <EmptyState message="No monthly data available" />;

    const maxAmount = Math.max(...data.map(d => d.amount));
    const avgAmount = data.reduce((sum, d) => sum + d.amount, 0) / data.length;

    return (
        <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={320}>
                <BarChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                    <defs>
                        <linearGradient id="monthlyGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.95} />
                            <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.7} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                    <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickLine={false}
                    />
                    <YAxis
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}K`}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(124, 58, 237, 0.04)' }} />
                    <ReferenceLine
                        y={avgAmount}
                        stroke="#f59e0b"
                        strokeDasharray="6 4"
                        strokeWidth={2}
                        label={{
                            value: `Avg: ₹${(avgAmount / 1000).toFixed(1)}K`,
                            position: 'insideTopRight',
                            fill: '#f59e0b',
                            fontSize: 11,
                            fontWeight: 600,
                        }}
                    />
                    <Bar
                        dataKey="amount"
                        name="Monthly Spending"
                        fill="url(#monthlyGradient)"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={50}
                        animationDuration={1200}
                        animationBegin={400}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

// ─── Predicted vs Actual Bar Chart ───
const PredictedVsActualChart = ({ categories, prediction, monthlyData }) => {
    const data = useMemo(() => {
        if (!categories || !prediction || !prediction.hasData) return [];

        // Get current month and last month data
        const now = new Date();
        const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const monthData = monthlyData?.[currentMonthKey];

        // Build comparison data from categories
        return Object.entries(categories)
            .filter(([, data]) => data.total > 0)
            .sort(([, a], [, b]) => b.total - a.total)
            .slice(0, 6) // Top 6 categories
            .map(([cat, catData]) => {
                const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.OTHER;
                // Predicted: use trend-based prediction per category
                const trendMultiplier = prediction.trendDirection === 'increasing'
                    ? 1 + Math.abs(prediction.trend) / 100
                    : prediction.trendDirection === 'decreasing'
                        ? 1 - Math.abs(prediction.trend) / 200
                        : 1;

                const avgMonthly = catData.total / Math.max(Object.keys(monthlyData || {}).length, 1);
                const predicted = Math.round(avgMonthly * trendMultiplier);

                return {
                    name: config.label,
                    actual: Math.round(catData.total / Math.max(Object.keys(monthlyData || {}).length, 1)),
                    predicted: predicted,
                    icon: config.icon,
                };
            });
    }, [categories, prediction, monthlyData]);

    if (data.length === 0) return <EmptyState message="Need more data for predictions" />;

    return (
        <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={320}>
                <BarChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                    <defs>
                        <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.95} />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.7} />
                        </linearGradient>
                        <linearGradient id="predictedGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.95} />
                            <stop offset="100%" stopColor="#d97706" stopOpacity={0.7} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                    <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickLine={false}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        height={60}
                    />
                    <YAxis
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}K`}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(79, 70, 229, 0.04)' }} />
                    <Legend
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                    />
                    <Bar
                        dataKey="actual"
                        name="Current Avg/Month"
                        fill="url(#actualGradient)"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={35}
                        animationDuration={1200}
                        animationBegin={200}
                    />
                    <Bar
                        dataKey="predicted"
                        name="Predicted Next Month"
                        fill="url(#predictedGradient)"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={35}
                        animationDuration={1200}
                        animationBegin={600}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

// ─── Empty State ───
const EmptyState = ({ message }) => (
    <div className="chart-empty-state">
        <div className="chart-empty-icon">📊</div>
        <p>{message}</p>
    </div>
);

// ─── Main SpendingCharts Component ───
const SpendingCharts = ({ analysis, compact = false }) => {
    const [activeView, setActiveView] = useState('category');
    const [timeFilter, setTimeFilter] = useState('monthly');

    if (!analysis || !analysis.hasData) {
        return (
            <div className="spending-charts-container glass-panel">
                <div className="charts-header">
                    <div className="charts-title-row">
                        <h3>📊 Smart Insights</h3>
                        <span className="charts-ai-badge">AI</span>
                    </div>
                </div>
                <EmptyState message="No data available. Make transactions to unlock AI-powered spending insights." />
            </div>
        );
    }

    return (
        <div className={`spending-charts-container ${compact ? 'compact' : ''}`}>
            {/* Charts Header */}
            <div className="charts-header glass-panel">
                <div className="charts-title-row">
                    <h3>📊 Smart Insights</h3>
                    <span className="charts-ai-badge">AI Powered</span>
                </div>

                {/* View Toggle */}
                <div className="charts-toggle-group">
                    <button
                        className={`toggle-btn ${activeView === 'category' ? 'active' : ''}`}
                        onClick={() => setActiveView('category')}
                    >
                        📁 Category
                    </button>
                    <button
                        className={`toggle-btn ${activeView === 'monthly' ? 'active' : ''}`}
                        onClick={() => setActiveView('monthly')}
                    >
                        📅 Monthly
                    </button>
                    {analysis.prediction?.hasData && (
                        <button
                            className={`toggle-btn ${activeView === 'predicted' ? 'active' : ''}`}
                            onClick={() => setActiveView('predicted')}
                        >
                            🔮 Predicted
                        </button>
                    )}
                </div>
            </div>

            {/* Chart Content */}
            <div className="charts-content glass-panel">
                {/* Chart Title & Filters */}
                <div className="chart-info-bar">
                    <div className="chart-subtitle">
                        {activeView === 'category' && (
                            <>
                                <h4>Category-wise Spending</h4>
                                <p>See where you spend the most</p>
                            </>
                        )}
                        {activeView === 'monthly' && (
                            <>
                                <h4>Monthly Spending Trend</h4>
                                <p>Track your spending growth over time</p>
                            </>
                        )}
                        {activeView === 'predicted' && (
                            <>
                                <h4>Predicted vs Actual Spending</h4>
                                <p>AI-predicted spending for next month</p>
                            </>
                        )}
                    </div>

                    {activeView === 'monthly' && (
                        <div className="time-filter-group">
                            {['monthly', 'yearly'].map(f => (
                                <button
                                    key={f}
                                    className={`filter-btn ${timeFilter === f ? 'active' : ''}`}
                                    onClick={() => setTimeFilter(f)}
                                >
                                    {f.charAt(0).toUpperCase() + f.slice(1)}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Charts */}
                <div className="chart-area">
                    {activeView === 'category' && (
                        <CategoryBarChart
                            categories={analysis.categories}
                            totalSpend={analysis.totalSpend}
                        />
                    )}
                    {activeView === 'monthly' && (
                        <MonthlyTrendChart
                            monthlyData={analysis.monthlyData}
                            filter={timeFilter}
                        />
                    )}
                    {activeView === 'predicted' && (
                        <PredictedVsActualChart
                            categories={analysis.categories}
                            prediction={analysis.prediction}
                            monthlyData={analysis.monthlyData}
                        />
                    )}
                </div>

                {/* Insight Text Below Chart */}
                <div className="chart-insight-text">
                    {activeView === 'category' && analysis.highestCategory && (
                        <div className="insight-chip danger">
                            <span>🔥</span>
                            <span>
                                Highest: <strong>{analysis.highestCategory.config?.label || analysis.highestCategory.category}</strong>
                                {' — '}₹{analysis.highestCategory.total?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                {' '}({analysis.highestCategory.percentage?.toFixed(1)}% of total)
                            </span>
                        </div>
                    )}
                    {activeView === 'monthly' && analysis.prediction?.hasData && (
                        <div className={`insight-chip ${analysis.prediction.trendDirection === 'increasing' ? 'danger' : analysis.prediction.trendDirection === 'decreasing' ? 'success' : 'info'}`}>
                            <span>{analysis.prediction.trendDirection === 'increasing' ? '📈' : analysis.prediction.trendDirection === 'decreasing' ? '📉' : '➡️'}</span>
                            <span>{analysis.prediction.message}</span>
                        </div>
                    )}
                    {activeView === 'predicted' && analysis.prediction?.hasData && (
                        <div className="insight-chip info">
                            <span>🤖</span>
                            <span>
                                AI predicts your spending trend is <strong>{analysis.prediction.trendDirection}</strong>
                                {' '}({analysis.prediction.trend > 0 ? '+' : ''}{analysis.prediction.trend.toFixed(1)}%).
                                Projected this month: <strong>₹{analysis.prediction.projectedMonthEnd?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SpendingCharts;
