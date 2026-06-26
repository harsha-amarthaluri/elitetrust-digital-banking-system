package com.bank_application.backend.services;

import com.bank_application.backend.entity.*;
import com.bank_application.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class PaymentScheduler {

    @Autowired
    private ScheduledTransactionRepo scheduledTransactionRepo;

    @Autowired
    private BankAccountRepo bankAccountRepo;

    @Autowired
    private TransactionRepo transactionRepo;

    @Autowired
    private LedgerService ledgerService;

    @Autowired
    private UserRepo userRepo;

    @Autowired
    private NotificationService notificationService;

    @Scheduled(fixedRate = 60000) // Runs every minute
    @Transactional
    public void processScheduledTransactions() {
        LocalDateTime now = LocalDateTime.now();
        List<ScheduledTransaction> pendingTasks = scheduledTransactionRepo
                .findByActiveTrueAndNextExecutionDateBefore(now);

        for (ScheduledTransaction task : pendingTasks) {
            executeTask(task);
        }
    }

    private void executeTask(ScheduledTransaction task) {
        Optional<BankAccount> fromAccOpt = bankAccountRepo.findByAccountNumber(task.getFromAccountNumber());
        Optional<BankAccount> toAccOpt = bankAccountRepo.findByAccountNumber(task.getToAccountNumber());

        Transaction tx = new Transaction();
        tx.setFromNumber(fromAccOpt.map(BankAccount::getMobileNumber).orElse("SYSTEM"));
        tx.setToNumber(toAccOpt.map(BankAccount::getMobileNumber).orElse("SYSTEM"));
        tx.setAmount(task.getAmount());
        tx.setType(TransactionType.DEBIT);
        tx.setCategory(task.getCategory() != null ? task.getCategory() : "SCHEDULED_PAYMENT");
        tx.setDescription(task.getDescription() != null ? task.getDescription() : "Scheduled Transfer");
        tx.setFromAccountId(fromAccOpt.map(BankAccount::getId).orElse(null));
        tx.setToAccountId(toAccOpt.map(BankAccount::getId).orElse(null));
        tx.setTimestamp(LocalDateTime.now());

        if (!fromAccOpt.isPresent()) {
            tx.setStatus(TransactionStatus.FAILED);
            tx.setDescription(tx.getDescription() + " (Failed: Source account not found)");
            transactionRepo.save(tx);
            task.setActive(false); // Disable task
            scheduledTransactionRepo.save(task);
            return;
        }

        BankAccount fromAcc = fromAccOpt.get();
        User user = userRepo.getByMobileNumber(fromAcc.getMobileNumber());
        if (user != null) {
            tx.setUser(user);
        }

        if (fromAcc.getBalance() < task.getAmount()) {
            tx.setStatus(TransactionStatus.FAILED);
            tx.setDescription(tx.getDescription() + " (Failed: Insufficient balance)");
            transactionRepo.save(tx);
            
            // Notify user of failed payment
            if (user != null) {
                notificationService.createNotification(
                    user.getMobileNumber(),
                    "Scheduled Transfer Failed",
                    "Your scheduled payment of ₹" + task.getAmount() + " to " + task.getToAccountNumber() + " failed due to insufficient balance."
                );
            }
            
            // For recurring, we still move next execution date forward, but for one-time we deactivate
            if (task.getFrequency() == RecurrenceInterval.ONE_TIME) {
                task.setActive(false);
            } else {
                task.setNextExecutionDate(calculateNextExecutionDate(task.getNextExecutionDate(), task.getFrequency()));
            }
            scheduledTransactionRepo.save(task);
            return;
        }

        // Perform Transfer
        fromAcc.setBalance(fromAcc.getBalance() - task.getAmount());
        bankAccountRepo.save(fromAcc);

        if (toAccOpt.isPresent()) {
            BankAccount toAcc = toAccOpt.get();
            toAcc.setBalance(toAcc.getBalance() + task.getAmount());
            bankAccountRepo.save(toAcc);
        }

        tx.setStatus(TransactionStatus.SUCCESS);
        transactionRepo.save(tx);

        // Record Core Ledger entry
        ledgerService.recordDoubleEntry(tx.getId(), task.getFromAccountNumber(), task.getToAccountNumber(), task.getAmount());

        // Notify user of successful payment
        if (user != null) {
            notificationService.createNotification(
                user.getMobileNumber(),
                "Scheduled Transfer Executed",
                "Your scheduled payment of ₹" + task.getAmount() + " to " + task.getToAccountNumber() + " has been successfully executed."
            );
        }

        // Update task schedule
        if (task.getFrequency() == RecurrenceInterval.ONE_TIME) {
            task.setActive(false);
        } else {
            task.setNextExecutionDate(calculateNextExecutionDate(task.getNextExecutionDate(), task.getFrequency()));
        }
        scheduledTransactionRepo.save(task);
    }

    private LocalDateTime calculateNextExecutionDate(LocalDateTime current, RecurrenceInterval frequency) {
        switch (frequency) {
            case DAILY:
                return current.plusDays(1);
            case WEEKLY:
                return current.plusWeeks(1);
            case MONTHLY:
                return current.plusMonths(1);
            default:
                return current;
        }
    }
}
