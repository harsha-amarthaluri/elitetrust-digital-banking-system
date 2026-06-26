/**
 * AI-Powered EMI Savings Calculator & Prediction Engine
 * Calculates how much a user needs to save daily, weekly, and in custom intervals
 * to reach their EMI target, and generates AI-powered suggestions.
 */

/**
 * Core EMI savings plan computation
 * @param {number} emiAmount - The EMI amount to plan for
 * @param {number} days - Number of days until EMI is due (default: 30)
 * @param {number} customInterval - Custom interval in days (default: 10)
 * @returns {object} Savings plan breakdown
 */
export function calculateEMISavings(emiAmount, days = 30, customInterval = 10) {
    // Validation
    if (!emiAmount || emiAmount <= 0) {
        return { error: 'EMI amount must be greater than zero.', isValid: false };
    }
    if (days <= 0) days = 30;
    if (customInterval <= 0) customInterval = 10;

    const dailySaving = Math.round(emiAmount / days);
    const weeklySaving = Math.round(emiAmount / (days / 7));
    const tenDaySaving = Math.round(emiAmount / (days / 10));
    const customSaving = Math.round(emiAmount / (days / customInterval));
    const monthlySaving = emiAmount;

    // Milestone markers (25%, 50%, 75%, 100%)
    const milestones = [
        { label: '25%', day: Math.round(days * 0.25), amount: Math.round(emiAmount * 0.25) },
        { label: '50%', day: Math.round(days * 0.50), amount: Math.round(emiAmount * 0.50) },
        { label: '75%', day: Math.round(days * 0.75), amount: Math.round(emiAmount * 0.75) },
        { label: '100%', day: days, amount: emiAmount },
    ];

    // Weekly breakdown schedule
    const weeklySchedule = [];
    const totalWeeks = Math.ceil(days / 7);
    for (let w = 1; w <= totalWeeks; w++) {
        const startDay = (w - 1) * 7 + 1;
        const endDay = Math.min(w * 7, days);
        const daysInWeek = endDay - startDay + 1;
        const weekAmount = dailySaving * daysInWeek;
        const cumulative = Math.min(dailySaving * endDay, emiAmount);
        weeklySchedule.push({
            week: w,
            startDay,
            endDay,
            daysInWeek,
            weekAmount,
            cumulative,
            progress: Math.min((cumulative / emiAmount) * 100, 100),
        });
    }

    return {
        isValid: true,
        emiAmount,
        days,
        customInterval,
        dailySaving,
        weeklySaving,
        tenDaySaving,
        customSaving,
        monthlySaving,
        milestones,
        weeklySchedule,
        perHour: Math.round((emiAmount / days / 24) * 100) / 100,
    };
}

/**
 * Generate AI-powered saving suggestions based on EMI plan and optional spending data.
 * @param {object} savingsPlan - The result of calculateEMISavings
 * @param {object|null} spendingAnalysis - Optional spending analysis from spendingAnalyzer
 * @returns {object} AI suggestions & tips
 */
export function generateAISuggestions(savingsPlan, spendingAnalysis = null) {
    if (!savingsPlan || !savingsPlan.isValid) {
        return { suggestions: [], summary: '' };
    }

    const { emiAmount, dailySaving, weeklySaving, days } = savingsPlan;
    const suggestions = [];

    // ── Core Savings Plan Explanation ──
    suggestions.push({
        type: 'plan',
        icon: '📋',
        title: 'Your Savings Plan',
        text: `To meet your ₹${emiAmount.toLocaleString('en-IN')} EMI in ${days} days, save ₹${dailySaving.toLocaleString('en-IN')} daily or ₹${weeklySaving.toLocaleString('en-IN')} weekly. Think of it as setting aside just ₹${Math.round(dailySaving / 3)} per meal or ₹${Math.round(dailySaving / 24)} per hour.`,
        priority: 1,
    });

    // ── Difficulty Assessment ──
    if (dailySaving <= 100) {
        suggestions.push({
            type: 'success',
            icon: '✅',
            title: 'Very Achievable Goal',
            text: `Your daily saving target of ₹${dailySaving} is very manageable. Skip one street snack or coffee, and you're there! This is an easy win.`,
            priority: 2,
        });
    } else if (dailySaving <= 300) {
        suggestions.push({
            type: 'info',
            icon: '💪',
            title: 'Moderate Goal',
            text: `Saving ₹${dailySaving}/day is moderate. You can achieve this by packing lunch instead of ordering, using public transport, or skipping one impulse buy each day.`,
            priority: 2,
        });
    } else if (dailySaving <= 700) {
        suggestions.push({
            type: 'warning',
            icon: '⚠️',
            title: 'Challenging Target',
            text: `₹${dailySaving}/day requires discipline. Consider reducing discretionary spending like subscriptions, dining out, and impulse shopping. Automate a daily transfer to a savings jar.`,
            priority: 2,
        });
    } else {
        suggestions.push({
            type: 'danger',
            icon: '🚨',
            title: 'High Daily Target',
            text: `Saving ₹${dailySaving}/day is significant. You may need to look at major expense reductions. Consider extending the saving period if possible, or explore additional income sources.`,
            priority: 2,
        });
    }

    // ── Smart Tips ──
    suggestions.push({
        type: 'info',
        icon: '🏦',
        title: 'Automate Your Savings',
        text: `Set up an automatic daily transfer of ₹${dailySaving} to a dedicated EMI savings account. "Out of sight, out of mind" — you won't miss what you don't see!`,
        priority: 3,
    });

    suggestions.push({
        type: 'info',
        icon: '📅',
        title: 'Weekly Check-in Strategy',
        text: `Every weekend, verify you've accumulated ₹${weeklySaving.toLocaleString('en-IN')} for the week. If you're short, compensate in the next 2-3 days. Staying on track weekly prevents last-minute stress.`,
        priority: 4,
    });

    // ── Spending-Based Insights ──
    if (spendingAnalysis && spendingAnalysis.hasData) {
        const { categories, totalSpend, averageTransaction, frequentSmallExpenses } = spendingAnalysis;

        // Find categories where cutting 20% would cover the daily saving
        const sortedCats = Object.entries(categories).sort(([, a], [, b]) => b.total - a.total);

        for (const [cat, data] of sortedCats.slice(0, 3)) {
            const potentialSaving = Math.round(data.total * 0.15);
            const dailyEquivalent = Math.round(potentialSaving / 30);

            if (dailyEquivalent >= dailySaving * 0.3) {
                suggestions.push({
                    type: 'warning',
                    icon: data.config?.icon || '💡',
                    title: `Reduce ${data.config?.label || cat} Spending`,
                    text: `You spend ₹${data.total.toLocaleString('en-IN')} on ${(data.config?.label || cat).toLowerCase()}. Cutting just 15% saves ₹${potentialSaving.toLocaleString('en-IN')}/month (₹${dailyEquivalent}/day) — that's ${Math.round((dailyEquivalent / dailySaving) * 100)}% of your daily EMI target covered!`,
                    priority: 3,
                    category: cat,
                });
            }
        }

        // Frequent small expenses insight
        if (frequentSmallExpenses && frequentSmallExpenses.length > 0) {
            const totalSmallSpend = frequentSmallExpenses.reduce((sum, e) => sum + e.total, 0);
            const dailySmallSpend = Math.round(totalSmallSpend / 30);

            if (dailySmallSpend >= dailySaving * 0.25) {
                suggestions.push({
                    type: 'info',
                    icon: '🪙',
                    title: 'Cut Micro-Expenses',
                    text: `Your frequent small expenses total ₹${totalSmallSpend.toLocaleString('en-IN')}/month (≈₹${dailySmallSpend}/day). Reducing these by half would cover ₹${Math.round(dailySmallSpend / 2)}/day of your EMI savings goal.`,
                    priority: 4,
                });
            }
        }

        // If total spend is much higher than EMI, show confidence
        if (totalSpend > emiAmount * 3) {
            suggestions.push({
                type: 'success',
                icon: '📊',
                title: 'Your Cash Flow Can Handle This',
                text: `Your total monthly spending is ₹${totalSpend.toLocaleString('en-IN')}, and this EMI is only ${Math.round((emiAmount / totalSpend) * 100)}% of that. With minor adjustments, this EMI is very manageable within your current cash flow.`,
                priority: 2,
            });
        }
    }

    // ── Motivational Closing ──
    suggestions.push({
        type: 'success',
        icon: '🎯',
        title: 'You Can Do This!',
        text: `The key to EMI planning is consistency, not perfection. Even if you miss a day, make it up the next. After ${days} days of discipline, you'll have ₹${emiAmount.toLocaleString('en-IN')} ready — and a great saving habit to show for it!`,
        priority: 10,
    });

    // Sort by priority
    suggestions.sort((a, b) => a.priority - b.priority);

    // Build summary
    const summary = `Save ₹${dailySaving.toLocaleString('en-IN')} daily or ₹${weeklySaving.toLocaleString('en-IN')} weekly to comfortably meet your ₹${emiAmount.toLocaleString('en-IN')} EMI in ${days} days. ${
        dailySaving <= 200
            ? 'This is a very achievable target with minor lifestyle adjustments.'
            : dailySaving <= 500
                ? 'This requires moderate discipline — focus on reducing one major expense category.'
                : 'This is a stretch goal — consider extending the timeline or identifying significant expense cuts.'
    }`;

    return { suggestions, summary };
}

/**
 * Calculate savings progress
 * @param {number} savedSoFar - Amount saved so far
 * @param {number} emiAmount - Total EMI target
 * @param {number} daysElapsed - Days elapsed since start
 * @param {number} totalDays - Total days in plan
 * @returns {object} Progress data
 */
export function calculateProgress(savedSoFar, emiAmount, daysElapsed, totalDays) {
    const progressPercent = Math.min((savedSoFar / emiAmount) * 100, 100);
    const expectedSaved = (emiAmount / totalDays) * daysElapsed;
    const isOnTrack = savedSoFar >= expectedSaved * 0.9;
    const remaining = Math.max(emiAmount - savedSoFar, 0);
    const daysLeft = Math.max(totalDays - daysElapsed, 1);
    const requiredDaily = Math.round(remaining / daysLeft);

    return {
        progressPercent: Math.round(progressPercent * 10) / 10,
        expectedSaved: Math.round(expectedSaved),
        isOnTrack,
        remaining,
        daysLeft,
        requiredDaily,
        status: progressPercent >= 100
            ? 'completed'
            : isOnTrack
                ? 'on-track'
                : 'behind',
    };
}
