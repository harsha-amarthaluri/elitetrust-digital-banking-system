package com.bank_application.backend.services;

import com.bank_application.backend.entity.BankAccount;
import com.bank_application.backend.entity.EntryType;
import com.bank_application.backend.entity.LedgerEntry;
import com.bank_application.backend.repository.BankAccountRepo;
import com.bank_application.backend.repository.LedgerEntryRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class LedgerService {

    @Autowired
    private LedgerEntryRepo ledgerEntryRepo;

    @Autowired
    private BankAccountRepo bankAccountRepo;

    @Transactional
    public void recordDoubleEntry(Long transactionId, String fromAccountNumber, String toAccountNumber, double amount) {
        // 1. Record Debit (fromAccount)
        if (fromAccountNumber != null && !fromAccountNumber.isEmpty() && !fromAccountNumber.equals("SYSTEM") && !fromAccountNumber.equals("BILLER")) {
            double fromBalanceAfter = 0;
            Optional<BankAccount> fromAccOpt = bankAccountRepo.findByAccountNumber(fromAccountNumber);
            if (fromAccOpt.isPresent()) {
                fromBalanceAfter = fromAccOpt.get().getBalance();
            }
            
            LedgerEntry debit = new LedgerEntry();
            debit.setTransactionId(transactionId);
            debit.setAccountNumber(fromAccountNumber);
            debit.setEntryType(EntryType.DEBIT);
            debit.setAmount(amount);
            debit.setBalanceAfter(fromBalanceAfter);
            debit.setTimestamp(LocalDateTime.now());
            ledgerEntryRepo.save(debit);
        }

        // 2. Record Credit (toAccount)
        if (toAccountNumber != null && !toAccountNumber.isEmpty() && !toAccountNumber.equals("SYSTEM") && !toAccountNumber.equals("BILLER")) {
            double toBalanceAfter = 0;
            Optional<BankAccount> toAccOpt = bankAccountRepo.findByAccountNumber(toAccountNumber);
            if (toAccOpt.isPresent()) {
                toBalanceAfter = toAccOpt.get().getBalance();
            }
            
            LedgerEntry credit = new LedgerEntry();
            credit.setTransactionId(transactionId);
            credit.setAccountNumber(toAccountNumber);
            credit.setEntryType(EntryType.CREDIT);
            credit.setAmount(amount);
            credit.setBalanceAfter(toBalanceAfter);
            credit.setTimestamp(LocalDateTime.now());
            ledgerEntryRepo.save(credit);
        }
    }

    public Map<String, Object> reconcileLedger() {
        Map<String, Object> result = new HashMap<>();
        List<BankAccount> accounts = bankAccountRepo.findAll();
        
        double totalBalanceFromAccounts = 0;
        for (BankAccount acc : accounts) {
            totalBalanceFromAccounts += acc.getBalance();
        }

        List<LedgerEntry> entries = ledgerEntryRepo.findAll();
        double totalDebits = 0;
        double totalCredits = 0;
        
        for (LedgerEntry entry : entries) {
            if (entry.getEntryType() == EntryType.DEBIT) {
                totalDebits += entry.getAmount();
            } else if (entry.getEntryType() == EntryType.CREDIT) {
                totalCredits += entry.getAmount();
            }
        }

        result.put("totalAccountsBalance", totalBalanceFromAccounts);
        result.put("totalDebits", totalDebits);
        result.put("totalCredits", totalCredits);
        result.put("balanced", Math.abs(totalDebits - totalCredits) < 0.01);
        result.put("reconciledAt", LocalDateTime.now());

        return result;
    }
}
