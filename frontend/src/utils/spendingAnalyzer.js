/**
 * AI-Based Spending Analysis & Prediction Engine
 * Analyzes transaction history and generates intelligent financial insights.
 */

const CATEGORY_CONFIG = {
    FOOD: { icon: '🍔', color: '#f97316', label: 'Food & Dining', threshold: 0.30 },
    TRAVEL: { icon: '✈️', color: '#3b82f6', label: 'Travel', threshold: 0.20 },
    SHOPPING: { icon: '🛍️', color: '#ec4899', label: 'Shopping', threshold: 0.25 },
    BILLS: { icon: '📄', color: '#8b5cf6', label: 'Bills & Utilities', threshold: 0.25 },
    ENTERTAINMENT: { icon: '🎬', color: '#ef4444', label: 'Entertainment', threshold: 0.15 },
    RECHARGE: { icon: '📱', color: '#06b6d4', label: 'Recharges', threshold: 0.05 },
    TRANSFER: { icon: '💸', color: '#10b981', label: 'Transfers', threshold: 0.40 },
    OTHER: { icon: '📦', color: '#64748b', label: 'Other', threshold: 0.20 },
};

/**
 * Main analysis function
 */
export function analyzeSpending(transactions, userMobileNumber) {
    if (!transactions || transactions.length === 0) {
        return {
            hasData: false,
            message: 'No transaction data available for analysis.',
            insights: [],
            categories: {},
            totalSpend: 0,
            totalIncome: 0,
            monthlyData: {},
        };
    }

    // Filter DEBIT transactions (expenses)
    const debitTransactions = transactions.filter(t => t.type === 'DEBIT');
    const creditTransactions = transactions.filter(t => t.type === 'CREDIT');

    if (debitTransactions.length === 0) {
        return {
            hasData: false,
            message: 'No expense transactions found to analyze.',
            insights: [{ type: 'info', icon: '📊', text: 'You have no recorded expenses yet. Start spending to see insights!' }],
            categories: {},
            totalSpend: 0,
            totalIncome: creditTransactions.reduce((sum, t) => sum + t.amount, 0),
            monthlyData: {},
        };
    }

    // Category-wise breakdown
    const categoryBreakdown = groupByCategory(debitTransactions);

    // Monthly data
    const monthlyData = groupByMonth(debitTransactions);

    // Total calculations
    const totalSpend = debitTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = creditTransactions.reduce((sum, t) => sum + t.amount, 0);

    // Current month data
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

    const currentMonthSpend = monthlyData[currentMonthKey]?.total || 0;
    const lastMonthSpend = monthlyData[lastMonthKey]?.total || 0;

    // Generate insights
    const insights = generateInsights(
        categoryBreakdown,
        totalSpend,
        totalIncome,
        currentMonthSpend,
        lastMonthSpend,
        debitTransactions,
        monthlyData
    );

    // Spending score (0-100, higher = better financial health)
    const spendingScore = calculateSpendingScore(totalSpend, totalIncome, categoryBreakdown);

    // Prediction
    const prediction = generatePrediction(monthlyData, currentMonthSpend);

    // Frequent small expenses
    const frequentSmallExpenses = detectFrequentSmallExpenses(debitTransactions);

    // Top spending day
    const topSpendingDay = detectTopSpendingDay(debitTransactions);

    return {
        hasData: true,
        totalSpend,
        totalIncome,
        netSavings: totalIncome - totalSpend,
        categories: categoryBreakdown,
        monthlyData,
        insights,
        spendingScore,
        prediction,
        frequentSmallExpenses,
        topSpendingDay,
        currentMonthSpend,
        lastMonthSpend,
        transactionCount: debitTransactions.length,
        averageTransaction: totalSpend / debitTransactions.length,
        highestCategory: getHighestCategory(categoryBreakdown),
        lowestCategory: getLowestCategory(categoryBreakdown),
    };
}

/**
 * Maps raw category/description keywords to a standard category.
 * This ensures entries like "electricity", "cinema", "uber" etc.
 * are correctly grouped instead of falling into OTHER.
 */
const CATEGORY_KEYWORDS = {
    FOOD: ['food', 'dining', 'restaurant', 'swiggy', 'zomato', 'pizza', 'burger', 'cafe', 'coffee', 'bakery', 'grocery', 'meal', 'lunch', 'dinner', 'breakfast', 'snack', 'canteen', 'hotel food', 'biryani', 'dosa', 'chai'],
    TRAVEL: ['travel', 'uber', 'ola', 'cab', 'taxi', 'flight', 'train', 'bus', 'metro', 'petrol', 'fuel', 'diesel', 'parking', 'toll', 'irctc', 'airline', 'hotel', 'resort', 'trip'],
    BILLS: ['bill', 'bills', 'electricity', 'electric', 'power', 'water', 'gas', 'internet', 'wifi', 'broadband', 'rent', 'emi', 'loan', 'insurance', 'tax', 'maintenance', 'utility', 'utilities', 'phone bill', 'mobile bill', 'dth', 'cable'],
    SHOPPING: ['shopping', 'amazon', 'flipkart', 'myntra', 'clothing', 'clothes', 'shoes', 'fashion', 'electronics', 'gadget', 'furniture', 'appliance', 'mall', 'store', 'purchase', 'buy'],
    ENTERTAINMENT: ['entertainment', 'cinema', 'movie', 'movies', 'netflix', 'spotify', 'hotstar', 'prime', 'gaming', 'game', 'concert', 'show', 'theatre', 'theater', 'subscription', 'music', 'sports', 'gym', 'fitness', 'club'],
    RECHARGE: ['recharge', 'prepaid', 'postpaid', 'top up', 'topup', 'mobile recharge', 'data pack'],
    TRANSFER: ['transfer', 'sent', 'upi', 'neft', 'imps', 'rtgs', 'bank transfer', 'self transfer'],
};

function mapToCategory(rawCategory) {
    if (!rawCategory) return 'OTHER';
    const upper = rawCategory.toUpperCase();

    // Direct match first
    if (CATEGORY_CONFIG[upper]) return upper;

    // Keyword-based matching
    const lower = rawCategory.toLowerCase().trim();
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        for (const keyword of keywords) {
            if (lower === keyword || lower.includes(keyword)) {
                return category;
            }
        }
    }

    return 'OTHER';
}

function groupByCategory(transactions) {
    const groups = {};

    transactions.forEach(t => {
        const cat = mapToCategory(t.category);
        if (!groups[cat]) {
            groups[cat] = {
                total: 0,
                count: 0,
                transactions: [],
                config: CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.OTHER,
            };
        }
        groups[cat].total += t.amount;
        groups[cat].count += 1;
        groups[cat].transactions.push(t);
    });

    // Calculate percentages
    const totalSpend = Object.values(groups).reduce((sum, g) => sum + g.total, 0);
    Object.keys(groups).forEach(cat => {
        groups[cat].percentage = totalSpend > 0 ? ((groups[cat].total / totalSpend) * 100) : 0;
    });

    return groups;
}

function groupByMonth(transactions) {
    const monthly = {};

    transactions.forEach(t => {
        const date = new Date(t.timestamp || t.date);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthly[key]) {
            monthly[key] = { total: 0, count: 0, categories: {} };
        }
        monthly[key].total += t.amount;
        monthly[key].count += 1;

        const cat = mapToCategory(t.category);
        if (!monthly[key].categories[cat]) {
            monthly[key].categories[cat] = 0;
        }
        monthly[key].categories[cat] += t.amount;
    });

    return monthly;
}

function generateInsights(categoryBreakdown, totalSpend, totalIncome, currentMonthSpend, lastMonthSpend, transactions, monthlyData) {
    const insights = [];

    // 1. Overall spending vs income
    if (totalIncome > 0) {
        const spendRatio = (totalSpend / totalIncome) * 100;
        if (spendRatio > 90) {
            insights.push({
                type: 'danger',
                icon: '🚨',
                title: 'Critical Spending Alert',
                text: `You've spent ${spendRatio.toFixed(0)}% of your total income. You're barely saving anything! Consider reducing discretionary spending immediately.`,
                priority: 1,
            });
        } else if (spendRatio > 70) {
            insights.push({
                type: 'warning',
                icon: '⚠️',
                title: 'High Spending Ratio',
                text: `Your expenses are ${spendRatio.toFixed(0)}% of your income. Aim to keep spending below 70% for healthier savings.`,
                priority: 2,
            });
        } else {
            insights.push({
                type: 'success',
                icon: '✅',
                title: 'Good Savings Ratio',
                text: `You're spending ${spendRatio.toFixed(0)}% of your income. Great job keeping your expenses in check! You're saving ₹${(totalIncome - totalSpend).toLocaleString('en-IN')}.`,
                priority: 3,
            });
        }
    }

    // 2. Month-over-month comparison
    if (lastMonthSpend > 0 && currentMonthSpend > 0) {
        const change = ((currentMonthSpend - lastMonthSpend) / lastMonthSpend) * 100;
        if (change > 20) {
            insights.push({
                type: 'danger',
                icon: '📈',
                title: 'Spending Spike Detected',
                text: `Your spending has increased by ${change.toFixed(0)}% compared to last month (₹${currentMonthSpend.toLocaleString('en-IN')} vs ₹${lastMonthSpend.toLocaleString('en-IN')}). Review your recent expenses to identify unnecessary spending.`,
                priority: 1,
            });
        } else if (change > 0) {
            insights.push({
                type: 'info',
                icon: '📊',
                title: 'Slight Increase in Spending',
                text: `Your spending is up ${change.toFixed(0)}% from last month. Current: ₹${currentMonthSpend.toLocaleString('en-IN')} vs Last: ₹${lastMonthSpend.toLocaleString('en-IN')}.`,
                priority: 4,
            });
        } else {
            insights.push({
                type: 'success',
                icon: '📉',
                title: 'Spending Decreased!',
                text: `Great news! Your spending decreased by ${Math.abs(change).toFixed(0)}% compared to last month. Keep up the good habits!`,
                priority: 3,
            });
        }
    }

    // 3. Category-wise insights
    Object.entries(categoryBreakdown).forEach(([cat, data]) => {
        const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.OTHER;
        const percentage = data.percentage;

        if (percentage > (config.threshold * 100 * 1.5)) {
            const possibleSaving = data.total * 0.20;
            insights.push({
                type: 'warning',
                icon: config.icon,
                title: `High ${config.label} Spending`,
                text: `You spent ₹${data.total.toLocaleString('en-IN')} on ${config.label.toLowerCase()}, which is ${percentage.toFixed(1)}% of your total expenses. By reducing this by just 20%, you could save ₹${possibleSaving.toLocaleString('en-IN', { maximumFractionDigits: 0 })}.`,
                priority: 2,
                category: cat,
                savingPotential: possibleSaving,
            });
        } else if (percentage > (config.threshold * 100)) {
            insights.push({
                type: 'info',
                icon: config.icon,
                title: `${config.label} Spending`,
                text: `₹${data.total.toLocaleString('en-IN')} spent on ${config.label.toLowerCase()} (${percentage.toFixed(1)}% of total). This is slightly above the recommended threshold.`,
                priority: 5,
                category: cat,
            });
        }
    });

    // 4. Frequent small expenses
    const smallExpenses = transactions.filter(t => t.amount < 200);
    if (smallExpenses.length > 5) {
        const smallTotal = smallExpenses.reduce((sum, t) => sum + t.amount, 0);
        insights.push({
            type: 'info',
            icon: '🪙',
            title: 'Watch the Small Spends',
            text: `You made ${smallExpenses.length} transactions under ₹200, totalling ₹${smallTotal.toLocaleString('en-IN')}. These small expenses can add up quickly — consider tracking them more carefully.`,
            priority: 4,
        });
    }

    // 5. Average transaction size
    const avgAmount = totalSpend / transactions.length;
    insights.push({
        type: 'info',
        icon: '💰',
        title: 'Average Transaction',
        text: `Your average expense transaction is ₹${avgAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })} across ${transactions.length} transactions.`,
        priority: 6,
    });

    // 6. Saving suggestions
    const totalPotentialSaving = insights
        .filter(i => i.savingPotential)
        .reduce((sum, i) => sum + i.savingPotential, 0);

    if (totalPotentialSaving > 0) {
        insights.push({
            type: 'success',
            icon: '💡',
            title: 'Total Saving Potential',
            text: `By optimizing your spending in high categories, you could potentially save ₹${totalPotentialSaving.toLocaleString('en-IN', { maximumFractionDigits: 0 })} per period!`,
            priority: 2,
        });
    }

    // Sort by priority
    return insights.sort((a, b) => (a.priority || 99) - (b.priority || 99));
}

function calculateSpendingScore(totalSpend, totalIncome, categories) {
    let score = 100;

    // Penalize for high spend ratio
    if (totalIncome > 0) {
        const ratio = totalSpend / totalIncome;
        if (ratio > 0.9) score -= 40;
        else if (ratio > 0.7) score -= 25;
        else if (ratio > 0.5) score -= 10;
    }

    // Penalize for categories exceeding thresholds
    Object.entries(categories).forEach(([cat, data]) => {
        const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.OTHER;
        if (data.percentage > (config.threshold * 100 * 1.5)) {
            score -= 10;
        } else if (data.percentage > (config.threshold * 100)) {
            score -= 5;
        }
    });

    return Math.max(0, Math.min(100, score));
}

function generatePrediction(monthlyData, currentMonthSpend) {
    const sortedMonths = Object.keys(monthlyData).sort();

    if (sortedMonths.length < 2) {
        return {
            hasData: false,
            message: 'Need at least 2 months of data for predictions.',
        };
    }

    const totals = sortedMonths.map(key => monthlyData[key].total);
    const avgMonthly = totals.reduce((sum, t) => sum + t, 0) / totals.length;

    // Simple trend analysis
    const recentTotals = totals.slice(-3);
    const trend = recentTotals.length > 1
        ? (recentTotals[recentTotals.length - 1] - recentTotals[0]) / recentTotals[0] * 100
        : 0;

    // Day-based projection for current month
    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const projectedMonthEnd = dayOfMonth > 0 ? (currentMonthSpend / dayOfMonth) * daysInMonth : 0;

    return {
        hasData: true,
        averageMonthly: avgMonthly,
        projectedMonthEnd,
        trend: trend,
        trendDirection: trend > 5 ? 'increasing' : trend < -5 ? 'decreasing' : 'stable',
        message: trend > 5
            ? `Your spending trend is increasing. At this rate, you may spend ₹${projectedMonthEnd.toLocaleString('en-IN', { maximumFractionDigits: 0 })} this month.`
            : trend < -5
                ? `Great! Your spending is trending downward. Projected this month: ₹${projectedMonthEnd.toLocaleString('en-IN', { maximumFractionDigits: 0 })}.`
                : `Your spending is stable. Projected this month: ₹${projectedMonthEnd.toLocaleString('en-IN', { maximumFractionDigits: 0 })}.`,
    };
}

function detectFrequentSmallExpenses(transactions) {
    const categoryCount = {};
    transactions.filter(t => t.amount < 300).forEach(t => {
        const cat = mapToCategory(t.category);
        if (!categoryCount[cat]) categoryCount[cat] = { count: 0, total: 0 };
        categoryCount[cat].count += 1;
        categoryCount[cat].total += t.amount;
    });

    return Object.entries(categoryCount)
        .filter(([, data]) => data.count >= 3)
        .map(([cat, data]) => ({
            category: cat,
            config: CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.OTHER,
            count: data.count,
            total: data.total,
        }))
        .sort((a, b) => b.count - a.count);
}

function detectTopSpendingDay(transactions) {
    const dayMap = {};
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    transactions.forEach(t => {
        const day = new Date(t.timestamp || t.date).getDay();
        if (!dayMap[day]) dayMap[day] = { total: 0, count: 0 };
        dayMap[day].total += t.amount;
        dayMap[day].count += 1;
    });

    let maxDay = 0;
    let maxTotal = 0;
    Object.entries(dayMap).forEach(([day, data]) => {
        if (data.total > maxTotal) {
            maxTotal = data.total;
            maxDay = parseInt(day);
        }
    });

    return { day: dayNames[maxDay], total: maxTotal, count: dayMap[maxDay]?.count || 0 };
}

function getHighestCategory(categories) {
    let highest = { category: 'N/A', total: 0 };
    Object.entries(categories).forEach(([cat, data]) => {
        if (data.total > highest.total) {
            highest = { category: cat, ...data };
        }
    });
    return highest;
}

function getLowestCategory(categories) {
    let lowest = { category: 'N/A', total: Infinity };
    Object.entries(categories).forEach(([cat, data]) => {
        if (data.total < lowest.total) {
            lowest = { category: cat, ...data };
        }
    });
    if (lowest.total === Infinity) lowest.total = 0;
    return lowest;
}

export { CATEGORY_CONFIG };
