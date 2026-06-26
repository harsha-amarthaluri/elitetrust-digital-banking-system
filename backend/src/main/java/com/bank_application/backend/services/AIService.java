package com.bank_application.backend.services;

import com.bank_application.backend.entity.BankAccount;
import com.bank_application.backend.entity.DeviceSession;
import com.bank_application.backend.entity.Transaction;
import com.bank_application.backend.entity.TransactionType;
import com.bank_application.backend.repository.BankAccountRepo;
import com.bank_application.backend.repository.DeviceSessionRepo;
import com.bank_application.backend.repository.TransactionRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class AIService {

    @Autowired
    private TransactionRepo transactionRepo;

    @Autowired
    private BankAccountRepo bankAccountRepo;

    @Autowired
    private DeviceSessionRepo deviceSessionRepo;

    public Map<String, Object> getSpendingAnalysis(String mobileNumber) {
        List<Transaction> txs = transactionRepo.findDoubleEntryTransactionsForUser(mobileNumber);
        
        Map<String, Double> categoryTotals = new HashMap<>();
        double totalSpending = 0.0;

        for (Transaction tx : txs) {
            if (tx.getType() == TransactionType.DEBIT && tx.getStatus() == com.bank_application.backend.entity.TransactionStatus.SUCCESS) {
                String cat = tx.getCategory() != null ? tx.getCategory() : "Others";
                categoryTotals.put(cat, categoryTotals.getOrDefault(cat, 0.0) + tx.getAmount());
                totalSpending += tx.getAmount();
            }
        }

        Map<String, Object> analysis = new HashMap<>();
        analysis.put("totalsByCategory", categoryTotals);
        analysis.put("totalSpending", totalSpending);

        List<String> suggestions = new ArrayList<>();
        if (categoryTotals.getOrDefault("BILL_PAYMENT", 0.0) > (totalSpending * 0.4)) {
            suggestions.add("Your bill payments constitute over 40% of your debits. Try exploring energy-saving appliances to cut utility bills.");
        }
        if (categoryTotals.getOrDefault("UPI_TRANSFER", 0.0) > (totalSpending * 0.5)) {
            suggestions.add("UPI transfers comprise a major chunk of your outbox. Categorize small peer-to-peer transfers to track them better.");
        }
        if (totalSpending > 50000.0) {
            suggestions.add("High outflow this month. We recommend checking your automated subscriptions and setting up daily limit warnings.");
        } else {
            suggestions.add("Your spending pattern is within safe limits. Keep it up!");
        }

        analysis.put("savingsAdvice", suggestions);
        return analysis;
    }

    public List<Map<String, Object>> getAnomalies(String mobileNumber) {
        List<Transaction> txs = transactionRepo.findDoubleEntryTransactionsForUser(mobileNumber);
        List<Map<String, Object>> anomalies = new ArrayList<>();

        if (txs.isEmpty()) {
            return anomalies;
        }

        // Calculate average debit transaction amount
        double totalDebitAmt = 0.0;
        int debitCount = 0;
        for (Transaction tx : txs) {
            if (tx.getType() == TransactionType.DEBIT && tx.getStatus() == com.bank_application.backend.entity.TransactionStatus.SUCCESS) {
                totalDebitAmt += tx.getAmount();
                debitCount++;
            }
        }

        double averageDebit = debitCount > 0 ? (totalDebitAmt / debitCount) : 0.0;

        // Check for anomalies: transactions > 3x average, or transactions from untrusted devices
        List<DeviceSession> devices = deviceSessionRepo.findByUserMobile(mobileNumber);
        boolean hasUntrustedDevices = devices.stream().anyMatch(d -> !d.isTrusted());

        for (Transaction tx : txs) {
            if (tx.getType() == TransactionType.DEBIT && tx.getStatus() == com.bank_application.backend.entity.TransactionStatus.SUCCESS) {
                boolean isAmountAnomaly = averageDebit > 0 && tx.getAmount() > (3 * averageDebit) && tx.getAmount() > 10000.0;
                
                if (isAmountAnomaly || hasUntrustedDevices) {
                    Map<String, Object> anomaly = new HashMap<>();
                    anomaly.put("transactionId", tx.getId());
                    anomaly.put("amount", tx.getAmount());
                    anomaly.put("description", tx.getDescription());
                    anomaly.put("timestamp", tx.getTimestamp());
                    
                    List<String> reasons = new ArrayList<>();
                    if (isAmountAnomaly) {
                        reasons.add("Transaction amount (₹" + tx.getAmount() + ") is significantly higher than your average debit (₹" + Math.round(averageDebit) + ").");
                    }
                    if (hasUntrustedDevices) {
                        reasons.add("Your profile currently has unverified/untrusted active devices logged in.");
                    }
                    anomaly.put("reasons", reasons);
                    anomaly.put("severity", isAmountAnomaly ? "HIGH" : "MEDIUM");
                    
                    anomalies.add(anomaly);
                }
            }
        }

        return anomalies;
    }

    public String getAIAdvice(String mobileNumber) {
        List<BankAccount> accounts = bankAccountRepo.findAllByMobileNumber(mobileNumber);
        double totalBalance = accounts.stream().mapToDouble(BankAccount::getBalance).sum();

        if (totalBalance < 5000.0) {
            return "Hey there! Your total savings balance is currently under ₹5,000. I recommend turning on 'Save the Change' on your debit card transactions or scheduling a small recurring deposit of ₹500 every week to build your buffer.";
        } else if (totalBalance > 100000.0) {
            return "Excellent job! You have a strong cash reserve of ₹" + Math.round(totalBalance) + ". Keeping all this in a savings account might lose value to inflation. Consider booking a Fixed Deposit (FD) which offers a higher 7.1% interest rate, or starting a SIP mutual fund investment to let your money grow.";
        } else {
            return "Your financial health looks solid! To optimize further, try setting a monthly budget under 'Ai Coach preferences' and target a 20% savings rate. Linking your primary bill payments to auto-debit will also prevent late fee charges.";
        }
    }
}
