package com.bank_application.backend.services;

import com.bank_application.backend.entity.*;
import com.bank_application.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class FraudDetectionService {

    @Autowired
    private TransactionRepo transactionRepo;

    @Autowired
    private FraudAlertRepo fraudAlertRepo;

    @Autowired
    private DeviceSessionRepo deviceSessionRepo;

    @Transactional
    public FraudAlert evaluateTransaction(String mobileNumber, double amount, Long transactionId) {
        // 1. High Velocity Rule check (>= 3 transfers in the last 1 minute)
        LocalDateTime oneMinuteAgo = LocalDateTime.now().minusMinutes(1);
        List<Transaction> recentTxs = transactionRepo.findByFromNumberAndTimestampAfter(mobileNumber, oneMinuteAgo);
        if (recentTxs.size() >= 3) {
            FraudAlert alert = new FraudAlert();
            alert.setUserMobile(mobileNumber);
            alert.setTransactionId(transactionId);
            alert.setRuleName("HIGH_VELOCITY");
            alert.setSeverity("HIGH");
            alert.setStatus("PENDING_REVIEW");
            alert.setDetails("High velocity: " + (recentTxs.size() + 1) + " transactions executed within 1 minute.");
            return fraudAlertRepo.save(alert);
        }

        // 2. Structuring Transfer Rule check (consecutive transfers between 40k and 50k inside 1 hour)
        if (amount >= 40000.0 && amount < 50000.0) {
            LocalDateTime oneHourAgo = LocalDateTime.now().minusHours(1);
            List<Transaction> hourTxs = transactionRepo.findByFromNumberAndTimestampAfter(mobileNumber, oneHourAgo);
            long structuringCount = hourTxs.stream()
                    .filter(t -> t.getAmount() >= 40000.0 && t.getAmount() < 50000.0)
                    .count();
            if (structuringCount >= 1) {
                FraudAlert alert = new FraudAlert();
                alert.setUserMobile(mobileNumber);
                alert.setTransactionId(transactionId);
                alert.setRuleName("STRUCTURING_TRANSFER");
                alert.setSeverity("HIGH");
                alert.setStatus("PENDING_REVIEW");
                alert.setDetails("Structuring pattern detected: Multiple transfers just below ₹50,000 inside 1 hour.");
                return fraudAlertRepo.save(alert);
            }
        }

        // 3. Untrusted Device session risk check (Transfer > 30k on profiles with untrusted sessions)
        List<DeviceSession> sessions = deviceSessionRepo.findByUserMobile(mobileNumber);
        boolean hasUntrusted = sessions.stream().anyMatch(s -> !s.isTrusted());
        if (hasUntrusted && amount > 30000.0) {
            FraudAlert alert = new FraudAlert();
            alert.setUserMobile(mobileNumber);
            alert.setTransactionId(transactionId);
            alert.setRuleName("UNTRUSTED_DEVICE_TRANSFER");
            alert.setSeverity("MEDIUM");
            alert.setStatus("PENDING_REVIEW");
            alert.setDetails("Transfer of ₹" + amount + " initiated from a profile with untrusted active devices.");
            return fraudAlertRepo.save(alert);
        }

        // 4. Suspicious Late-Night Transfer Rule check (Transfer > 20k between 11 PM and 5 AM)
        int hour = LocalDateTime.now().getHour();
        if ((hour >= 23 || hour < 5) && amount > 20000.0) {
            FraudAlert alert = new FraudAlert();
            alert.setUserMobile(mobileNumber);
            alert.setTransactionId(transactionId);
            alert.setRuleName("SUSPICIOUS_LATE_NIGHT");
            alert.setSeverity("MEDIUM");
            alert.setStatus("PENDING_REVIEW");
            alert.setDetails("Suspicious late-night transfer of ₹" + amount + " executed at " + LocalDateTime.now().toLocalTime() + ".");
            return fraudAlertRepo.save(alert);
        }

        return null;
    }
}
