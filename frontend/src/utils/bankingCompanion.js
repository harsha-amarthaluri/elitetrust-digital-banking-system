/**
 * 🧠 Smart Digital Banking Companion — AI Engine
 * Adaptive conversations, emotion detection, gamification,
 * goal tracking, proactive alerts, and dynamic financial intelligence.
 */

// ── Intent detection keywords ──
const INTENT_PATTERNS = {
    CHECK_BALANCE: ['balance', 'how much', 'money left', 'remaining', 'account balance', 'total balance'],
    VIEW_INSIGHTS: ['insights', 'analysis', 'spending', 'analyze', 'patterns', 'trends', 'breakdown', 'category'],
    PLAN_EMI: ['emi', 'loan', 'installment', 'plan emi', 'emi plan', 'monthly payment'],
    TRANSFER: ['transfer', 'send money', 'pay someone', 'send', 'fund transfer'],
    PAY_BILL: ['bill', 'pay bill', 'electricity', 'utility', 'water bill', 'gas bill'],
    RECHARGE: ['recharge', 'prepaid', 'mobile recharge', 'top up'],
    SET_GOAL: ['goal', 'save', 'target', 'saving goal', 'save money', 'I want to save'],
    TRANSACTIONS: ['transaction', 'history', 'recent', 'last transaction', 'activity'],
    HELP: ['help', 'what can you do', 'features', 'options', 'menu'],
    GREETING: ['hi', 'hello', 'hey', 'good morning', 'good evening', 'good afternoon', 'sup', 'yo'],
    THANKS: ['thanks', 'thank you', 'thx', 'appreciate', 'great', 'awesome', 'nice'],
    STRESSED: ['worried', 'stress', 'broke', 'no money', 'poor', 'debt', 'struggling', 'can\'t afford', 'tight budget', 'financial trouble', 'money problem', 'crisis'],
    CELEBRATE: ['saved', 'reached goal', 'achieved', 'milestone', 'paid off', 'completed'],
    INVEST: ['invest', 'investment', 'mutual fund', 'stocks', 'fd', 'fixed deposit', 'sip'],
    PROFILE: ['profile', 'account info', 'my account', 'settings', 'personal info'],
};

// ── Tone / personality config ──
const TONE = {
    FORMAL: 'formal',
    FRIENDLY: 'friendly',
    EMPATHETIC: 'empathetic',
    CELEBRATORY: 'celebratory',
};

// ── Badge definitions ──
const BADGES = [
    { id: 'savings_streak', label: 'Savings Streak 🔥', condition: (stats) => stats.savingsStreak >= 3, description: '3+ months of positive savings' },
    { id: 'smart_spender', label: 'Smart Spender 🧠', condition: (stats) => stats.spendingScore >= 70, description: 'Financial health score 70+' },
    { id: 'budget_master', label: 'Budget Master 💼', condition: (stats) => stats.spendRatio < 0.6, description: 'Spending under 60% of income' },
    { id: 'goal_setter', label: 'Goal Setter 🎯', condition: (stats) => stats.goalsCreated >= 1, description: 'Created a financial goal' },
    { id: 'consistent_saver', label: 'Consistent Saver 💎', condition: (stats) => stats.consistentSaving, description: 'Saving every month' },
    { id: 'first_transfer', label: 'First Transfer ✈️', condition: (stats) => stats.transfersMade >= 1, description: 'Made your first transfer' },
    { id: 'bill_warrior', label: 'Bill Warrior ⚡', condition: (stats) => stats.billsPaid >= 3, description: 'Paid 3+ bills on time' },
];

// ── Challenges ──
const CHALLENGES = [
    { id: 'save_500', label: 'Save ₹500 this week!', emoji: '💪', target: 500, unit: 'week' },
    { id: 'no_unnecessary', label: 'No unnecessary spending for 3 days', emoji: '🧘', target: 3, unit: 'days' },
    { id: 'reduce_food', label: 'Reduce food expenses by ₹200 this week', emoji: '🍔', target: 200, unit: 'week' },
    { id: 'save_1000', label: 'Save ₹1,000 this month!', emoji: '🚀', target: 1000, unit: 'month' },
    { id: 'track_all', label: 'Track every expense for 7 days', emoji: '📝', target: 7, unit: 'days' },
];

/**
 * Detect user intent from message
 */
export function detectIntent(message) {
    if (!message) return 'UNKNOWN';
    const lower = message.toLowerCase().trim();

    for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
        for (const pattern of patterns) {
            if (lower.includes(pattern)) {
                return intent;
            }
        }
    }
    return 'UNKNOWN';
}

/**
 * Detect emotional tone of message
 */
export function detectTone(message) {
    if (!message) return TONE.FRIENDLY;
    const lower = message.toLowerCase();

    const stressWords = ['worried', 'stress', 'broke', 'no money', 'poor', 'struggling', 'can\'t afford', 'trouble', 'crisis', 'debt'];
    const celebrateWords = ['saved', 'achieved', 'milestone', 'paid off', 'yay', 'awesome', 'great news'];
    const formalWords = ['regarding', 'kindly', 'request', 'please process', 'i would like to', 'could you'];

    if (stressWords.some(w => lower.includes(w))) return TONE.EMPATHETIC;
    if (celebrateWords.some(w => lower.includes(w))) return TONE.CELEBRATORY;
    if (formalWords.some(w => lower.includes(w))) return TONE.FORMAL;
    return TONE.FRIENDLY;
}

/**
 * Generate companion response based on intent, tone, and user data
 */
export function generateResponse(intent, tone, userData = {}) {
    const { balance, spendingAnalysis, goals, userName } = userData;
    const name = userName || 'there';

    switch (intent) {
        case 'GREETING':
            return buildGreeting(tone, name, balance, spendingAnalysis);
        case 'CHECK_BALANCE':
            return buildBalanceResponse(tone, balance, name);
        case 'VIEW_INSIGHTS':
            return buildInsightsResponse(tone, spendingAnalysis, name);
        case 'PLAN_EMI':
            return buildEMIResponse(tone, name);
        case 'TRANSFER':
            return buildTransferResponse(tone, name);
        case 'PAY_BILL':
            return buildBillResponse(tone, name);
        case 'RECHARGE':
            return buildRechargeResponse(tone, name);
        case 'SET_GOAL':
            return buildGoalResponse(tone, name, goals);
        case 'TRANSACTIONS':
            return buildTransactionResponse(tone, name);
        case 'HELP':
            return buildHelpResponse(tone, name);
        case 'THANKS':
            return buildThanksResponse(tone, name);
        case 'STRESSED':
            return buildStressResponse(tone, name, balance, spendingAnalysis);
        case 'CELEBRATE':
            return buildCelebrateResponse(tone, name);
        case 'INVEST':
            return buildInvestResponse(tone, name);
        case 'PROFILE':
            return buildProfileResponse(tone, name);
        default:
            return buildDefaultResponse(tone, name);
    }
}

// ── Response Builders ──

function buildGreeting(tone, name, balance, analysis) {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    const emoji = hour < 12 ? '🌅' : hour < 17 ? '☀️' : '🌙';

    let snapshot = '';
    if (balance !== undefined && balance !== null) {
        snapshot = `\n\n💰 **Your Quick Snapshot:**\n• Balance: ₹${Number(balance).toLocaleString('en-IN')}\n`;
        if (analysis?.hasData) {
            snapshot += `• This month spending: ₹${(analysis.currentMonthSpend || 0).toLocaleString('en-IN')}${analysis.currentMonthSpend > analysis.lastMonthSpend ? ' 📈' : ' 📉'}\n`;
            snapshot += `• Financial Health: ${analysis.spendingScore || 0}/100 ${analysis.spendingScore >= 70 ? '✅' : '⚠️'}\n`;
        }
    }

    return {
        text: `${emoji} ${greeting}, **${name}**! Welcome back to your Smart Banking Companion.${snapshot}\nHow can I help you today?`,
        quickActions: ['Check Balance', 'View Insights', 'Plan EMI', 'Transfer Money'],
        type: 'greeting',
    };
}

function buildBalanceResponse(tone, balance, name) {
    if (balance === undefined || balance === null) {
        return {
            text: `💳 I don't have your balance info yet, ${name}. Please link a bank account from your profile to see your balance here!\n\n⚡ **Quick Tip:** Linking your account unlocks all smart features!`,
            quickActions: ['Go to Profile', 'View Insights', 'Help'],
            type: 'info',
            navigate: '/profile',
        };
    }

    const balanceNum = Number(balance);
    let insight = '';
    if (balanceNum < 1000) {
        insight = `\n\n⚠️ **Low Balance Alert!** Consider reviewing your expenses or setting up a savings plan.`;
    } else if (balanceNum > 50000) {
        insight = `\n\n✅ Looking healthy! Consider investing the surplus for better returns.`;
    } else {
        insight = `\n\n💡 **Tip:** Automate your savings to build wealth faster!`;
    }

    return {
        text: `💰 **Your Current Balance:**\n\n**₹${balanceNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}**${insight}`,
        quickActions: ['View Insights', 'Transfer Money', 'Plan Savings', 'Set a Goal'],
        type: 'balance',
    };
}

function buildInsightsResponse(tone, analysis, name) {
    if (!analysis?.hasData) {
        return {
            text: `📊 I don't have enough transaction data yet to generate insights, ${name}.\n\nStart making transactions and I'll provide:\n• Category-wise spending breakdown\n• AI-powered saving suggestions\n• Predictive trends\n• Financial health score`,
            quickActions: ['Go to Insights', 'Check Balance', 'Help'],
            type: 'info',
            navigate: '/smart-insights',
        };
    }

    const topCat = analysis.highestCategory;
    const score = analysis.spendingScore || 0;

    return {
        text: `📊 **Your Financial Snapshot:**\n\n• 💰 Total Spent: ₹${analysis.totalSpend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}\n• 📈 Income: ₹${analysis.totalIncome.toLocaleString('en-IN', { maximumFractionDigits: 0 })}\n• 🏆 Top Category: ${topCat?.config?.label || topCat?.category || 'N/A'}\n• ❤️ Health Score: **${score}/100** ${score >= 70 ? '✅' : score >= 40 ? '⚠️' : '🚨'}\n\n${analysis.insights?.[0]?.text || ''}\n\n👉 **Want a deeper breakdown?** Head to Smart Insights!`,
        quickActions: ['Go to Insights', 'Plan EMI', 'Set a Goal', 'View Trends'],
        type: 'insights',
        navigate: '/smart-insights',
    };
}

function buildEMIResponse(tone, name) {
    return {
        text: `📋 **EMI Savings Planner** 🤖\n\nI can help you plan your EMI payments smartly!\n\n**What the planner does:**\n• 📅 Calculates daily/weekly saving targets\n• 📊 Creates a visual savings schedule\n• 🎯 Sets milestone checkpoints\n• 💡 AI-powered money-saving tips\n\nReady to plan your next EMI?`,
        quickActions: ['Go to EMI Planner', 'Check Balance', 'View Insights'],
        type: 'emi',
        navigate: '/emi-planner',
    };
}

function buildTransferResponse(tone, name) {
    return {
        text: `💸 **Fund Transfer**\n\nI can take you to the transfer page. You can:\n• 🏦 Transfer between your accounts\n• 📲 Send to other accounts\n• ⚡ Quick transfer with saved contacts\n\n💡 **Tip:** Always double-check the recipient details before transferring!`,
        quickActions: ['Go to Transfer', 'Check Balance', 'View History'],
        type: 'transfer',
        navigate: '/fund-transfer',
    };
}

function buildBillResponse(tone, name) {
    return {
        text: `🧾 **Bill Payment**\n\nPay your bills quickly and securely:\n• ⚡ Electricity\n• 💧 Water\n• 📱 Phone/Internet\n• 🏠 Rent & more\n\n📅 **Smart Alert:** Set reminders so you never miss a payment!`,
        quickActions: ['Go to Pay Bill', 'Check Balance', 'View Bills'],
        type: 'bill',
        navigate: '/pay-bill',
    };
}

function buildRechargeResponse(tone, name) {
    return {
        text: `📱 **Mobile Recharge**\n\nRecharge your mobile quickly:\n• Prepaid plans\n• Postpaid bills\n• DTH recharge\n\n💡 **Tip:** Compare plans to get the best data deal!`,
        quickActions: ['Go to Recharge', 'Pay Bills', 'Check Balance'],
        type: 'recharge',
        navigate: '/recharge',
    };
}

function buildGoalResponse(tone, name, goals) {
    const existingGoals = goals?.length || 0;

    return {
        text: `🎯 **Financial Goals**\n\nSetting clear goals is the first step to financial freedom!\n\n**Examples:**\n• "Save ₹50,000 in 5 months"\n• "Emergency fund of ₹1,00,000"\n• "Vacation fund ₹30,000"\n\n${existingGoals > 0 ? `You have **${existingGoals} active goal(s)**. Keep going! 💪` : 'Ready to set your first goal? Try typing:\n**"I want to save ₹50000 in 5 months"**'}\n\n💡 I'll calculate daily/monthly targets and track your progress!`,
        quickActions: ['Set New Goal', 'View Insights', 'Plan EMI'],
        type: 'goal',
        isGoalPrompt: true,
    };
}

function buildTransactionResponse(tone, name) {
    return {
        text: `📜 **Transaction History**\n\nView all your recent transactions with:\n• 📊 Category breakdown\n• 🔍 Search & filter\n• 📥 Download statements\n\nLet me take you there!`,
        quickActions: ['Go to Transactions', 'View Insights', 'Check Balance'],
        type: 'transactions',
        navigate: '/transactions',
    };
}

function buildHelpResponse(tone, name) {
    return {
        text: `🤖 **Hi ${name}! Here's what I can do:**\n\n💰 **Banking**\n• Check your balance\n• Transfer money\n• Pay bills & recharge\n\n📊 **Smart Analysis**\n• AI spending insights\n• EMI savings planner\n• Financial health score\n\n🎯 **Goals & Motivation**\n• Set savings goals\n• Track progress\n• Earn badges & rewards\n\n💬 **Just Chat**\n• Ask me anything about your finances\n• Get personalized tips\n• Stay motivated!\n\nTry asking: *"How's my spending?"* or *"Plan my EMI"* 👇`,
        quickActions: ['Check Balance', 'View Insights', 'Plan EMI', 'Set a Goal'],
        type: 'help',
    };
}

function buildThanksResponse(tone, name) {
    const responses = [
        `Happy to help, ${name}! 😊 Anything else I can do for you?`,
        `You're welcome! 🎉 I'm always here to assist with your finances.`,
        `Glad I could help! 💙 Keep making smart financial decisions!`,
        `No problem, ${name}! 🚀 Remember, I'm just a click away!`,
    ];
    return {
        text: responses[Math.floor(Math.random() * responses.length)],
        quickActions: ['Check Balance', 'View Insights', 'Help'],
        type: 'thanks',
    };
}

function buildStressResponse(tone, name, balance, analysis) {
    let tips = '';
    if (analysis?.hasData) {
        const topCat = analysis.highestCategory;
        tips = `\n\n📊 **Quick Analysis:**\n• Your biggest expense: ${topCat?.config?.label || 'Unknown'} (₹${(topCat?.total || 0).toLocaleString('en-IN')})\n• Try reducing this by 15-20% first\n• Even ₹50/day saved = ₹1,500/month!`;
    }

    return {
        text: `💙 **I understand, ${name} — let's fix this step by step.**\n\nFinancial stress happens to everyone. You're already taking a positive step by reaching out!\n\n**Here's a plan:**\n1. 📋 List your essential expenses first\n2. 🔍 Identify what you can reduce\n3. 🎯 Set a small, achievable savings goal\n4. 📅 Track daily — small wins matter!${tips}\n\n💪 **You've got this!** Let me help you create a recovery plan.`,
        quickActions: ['Plan Savings', 'View Insights', 'Set a Goal', 'EMI Planner'],
        type: 'empathetic',
    };
}

function buildCelebrateResponse(tone, name) {
    return {
        text: `🎉🎉🎉 **AMAZING, ${name}!** 🎉🎉🎉\n\nThat's incredible progress! Every financial milestone deserves celebration! 🏆\n\n✨ You're building real financial discipline\n🔥 Keep this momentum going!\n🚀 Your future self will thank you\n\n**What's next?** Set an even bigger goal and crush it!`,
        quickActions: ['Set New Goal', 'View Progress', 'Share Achievement'],
        type: 'celebrate',
    };
}

function buildInvestResponse(tone, name) {
    return {
        text: `📊 **Smart Investments**\n\nGrow your money wisely:\n• 🏦 Fixed Deposits — Safe & guaranteed\n• 📈 Mutual Funds / SIPs — Growth potential\n• 💹 Stocks — Higher returns, higher risk\n\n💡 **Rule of 72:** Divide 72 by your return rate to know how many years it takes to double your money!\n\nLet me take you to the investment page.`,
        quickActions: ['Go to Invest', 'Check Balance', 'View Insights'],
        type: 'invest',
        navigate: '/invest',
    };
}

function buildProfileResponse(tone, name) {
    return {
        text: `👤 **Your Profile**\n\nManage your account settings:\n• 📝 Update personal information\n• 🏦 Link/manage bank accounts\n• 🔐 Security settings\n\nLet me take you there!`,
        quickActions: ['Go to Profile', 'Check Balance', 'Help'],
        type: 'profile',
        navigate: '/profile',
    };
}

function buildDefaultResponse(tone, name) {
    const responses = [
        `Hmm, I'm not sure I understood that, ${name}. Let me show you what I can help with! 😊`,
        `I didn't quite catch that. Try asking about your balance, insights, or EMI planning! 🤖`,
        `I'm still learning, ${name}! Here are some things I can definitely help with: 👇`,
    ];
    return {
        text: responses[Math.floor(Math.random() * responses.length)],
        quickActions: ['Check Balance', 'View Insights', 'Plan EMI', 'Help'],
        type: 'default',
    };
}

// ── Goal Calculator ──
export function calculateGoal(targetAmount, months) {
    if (!targetAmount || targetAmount <= 0 || !months || months <= 0) return null;

    const monthly = Math.ceil(targetAmount / months);
    const daily = Math.ceil(targetAmount / (months * 30));
    const weekly = Math.ceil(targetAmount / (months * 4));

    return {
        targetAmount,
        months,
        monthly,
        daily,
        weekly,
        message: `🎯 **Goal Created!**\n\nTo save **₹${targetAmount.toLocaleString('en-IN')}** in **${months} months**, you need:\n• ₹${daily.toLocaleString('en-IN')}/day\n• ₹${weekly.toLocaleString('en-IN')}/week\n• ₹${monthly.toLocaleString('en-IN')}/month\n\n💪 That's totally doable! I'll track your progress.`,
    };
}

// ── Parse goal from natural language ──
export function parseGoalFromMessage(message) {
    const lower = message.toLowerCase();

    // Match patterns like "save 50000 in 5 months" or "I want to save ₹50,000 in 5 months"
    const amountMatch = lower.match(/(?:save|target|goal)\s*(?:₹|rs\.?|inr)?\s*([\d,]+)/);
    const monthsMatch = lower.match(/in\s*(\d+)\s*months?/);

    if (amountMatch && monthsMatch) {
        const amount = parseInt(amountMatch[1].replace(/,/g, ''));
        const months = parseInt(monthsMatch[1]);
        return calculateGoal(amount, months);
    }
    return null;
}

// ── Proactive Alerts Generator ──
export function generateProactiveAlerts(userData = {}) {
    const { balance, spendingAnalysis, upcomingEMI } = userData;
    const alerts = [];

    // Low balance alert
    if (balance !== undefined && balance < 2000) {
        alerts.push({
            type: 'warning',
            icon: '⚠️',
            text: 'Low balance alert! Your balance is below ₹2,000.',
            actions: ['Plan Savings', 'View Details'],
        });
    }

    // Spending spike
    if (spendingAnalysis?.hasData && spendingAnalysis.currentMonthSpend > (spendingAnalysis.lastMonthSpend * 1.3) && spendingAnalysis.lastMonthSpend > 0) {
        alerts.push({
            type: 'danger',
            icon: '🚨',
            text: `Unusual spending detected! You've spent ${Math.round(((spendingAnalysis.currentMonthSpend - spendingAnalysis.lastMonthSpend) / spendingAnalysis.lastMonthSpend) * 100)}% more than last month.`,
            actions: ['Reduce Spending', 'View Details'],
        });
    }

    // EMI reminder
    if (upcomingEMI) {
        alerts.push({
            type: 'info',
            icon: '📅',
            text: `EMI due in ${upcomingEMI.daysLeft} days. Plan now to avoid last-minute stress!`,
            actions: ['Plan Now', 'View Details'],
        });
    }

    // Positive reinforcement
    if (spendingAnalysis?.hasData && spendingAnalysis.spendingScore >= 80) {
        alerts.push({
            type: 'success',
            icon: '🏆',
            text: 'Your financial health score is excellent! Keep up the amazing work!',
            actions: ['View Details', 'Set New Goal'],
        });
    }

    return alerts;
}

// ── Gamification: Calculate earned badges ──
export function calculateBadges(userData = {}) {
    const stats = {
        savingsStreak: userData.savingsStreak || 0,
        spendingScore: userData.spendingScore || 0,
        spendRatio: userData.spendRatio || 1,
        goalsCreated: userData.goalsCreated || 0,
        consistentSaving: userData.consistentSaving || false,
        transfersMade: userData.transfersMade || 0,
        billsPaid: userData.billsPaid || 0,
    };

    return BADGES.map(badge => ({
        ...badge,
        earned: badge.condition(stats),
    }));
}

// ── Get random challenge ──
export function getRandomChallenge() {
    return CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];
}

// ── Get all challenges ──
export function getChallenges() {
    return CHALLENGES;
}

// ── Calculate goal progress ──
export function calculateGoalProgress(savedSoFar, targetAmount) {
    if (!targetAmount || targetAmount <= 0) return null;
    const percent = Math.min((savedSoFar / targetAmount) * 100, 100);
    const remaining = Math.max(targetAmount - savedSoFar, 0);

    let message = '';
    if (percent >= 100) {
        message = `🎉 Congratulations! You've reached your goal!`;
    } else if (percent >= 75) {
        message = `🚀 Almost there! Only ₹${remaining.toLocaleString('en-IN')} left!`;
    } else if (percent >= 50) {
        message = `💪 Halfway mark crossed! You're ${Math.round(percent)}% there!`;
    } else if (percent >= 25) {
        message = `📈 Great start! You're ${Math.round(percent)}% closer to your goal.`;
    } else {
        message = `🌱 Just getting started! Every rupee counts. Keep going!`;
    }

    return { percent: Math.round(percent * 10) / 10, remaining, message };
}

export { TONE, BADGES, CHALLENGES };
