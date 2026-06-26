package com.bank_application.backend.services;

import com.bank_application.backend.entity.*;
import com.bank_application.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class InterestService {

    @Autowired
    private BankAccountRepo bankAccountRepo;

    @Autowired
    private TransactionRepo transactionRepo;

    @Autowired
    private LedgerService ledgerService;

    @Autowired
    private NotificationService notificationService;

    // Monthly scheduled execution (Runs on the 1st of every month at midnight)
    @Scheduled(cron = "0 0 0 1 * ?")
    @Transactional
    public void runMonthlyInterestCalculation() {
        processInterest(false);
    }

    @Transactional
    public int processInterest(boolean force30DaysSimulation) {
        List<BankAccount> savingsAccounts = bankAccountRepo.findAll();
        int count = 0;

        for (BankAccount account : savingsAccounts) {
            if (account.getAccountType() == AccountType.SAVINGS && account.isActive() && account.getBalance() > 0) {
                long days = ChronoUnit.DAYS.between(account.getLastInterestDate(), LocalDateTime.now());
                if (days <= 0 || force30DaysSimulation) {
                    days = 30; // Default to 30 days simulation for testing/manual triggers
                }

                double interest = account.getBalance() * account.getInterestRate() * (days / 365.0);
                
                // Truncate to 2 decimal places
                interest = Math.round(interest * 100.0) / 100.0;

                if (interest > 0) {
                    // Credit Account
                    account.setBalance(account.getBalance() + interest);
                    account.setLastInterestDate(LocalDateTime.now());
                    bankAccountRepo.save(account);

                    // Create Transaction
                    Transaction tx = new Transaction();
                    tx.setFromNumber("SYSTEM");
                    tx.setToNumber(account.getMobileNumber());
                    tx.setAmount(interest);
                    tx.setType(TransactionType.CREDIT);
                    tx.setCategory("INTEREST");
                    tx.setStatus(TransactionStatus.SUCCESS);
                    tx.setTimestamp(LocalDateTime.now());
                    tx.setDescription("Monthly Savings Interest credit (" + days + " days @ " + (account.getInterestRate() * 100) + "%)");
                    transactionRepo.save(tx);

                    // Double-entry record (Debit INTEREST_POOL virtual account, Credit customer account)
                    ledgerService.recordDoubleEntry(tx.getId(), "INTEREST_POOL", account.getAccountNumber(), interest);

                    // Send Notification
                    notificationService.createNotification(
                            account.getMobileNumber(),
                            "Interest Credited",
                            "Interest of ₹" + interest + " has been credited to your account " + account.getAccountNumber() + "."
                    );
                    
                    count++;
                }
            }
        }
        return count;
    }
}
