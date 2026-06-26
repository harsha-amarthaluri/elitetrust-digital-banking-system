package com.bank_application.backend.services;

import com.bank_application.backend.entity.*;
import com.bank_application.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class UpiService {

    @Autowired
    private UpiMappingRepo upiMappingRepo;

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

    public UpiMapping registerUpiId(String accountNumber, String upiId) {
        if (!upiId.contains("@")) {
            upiId = upiId + "@elitetrust";
        }

        Optional<UpiMapping> existingMapping = upiMappingRepo.findByUpiId(upiId);
        if (existingMapping.isPresent()) {
            throw new IllegalArgumentException("UPI ID already registered");
        }

        Optional<BankAccount> accountOpt = bankAccountRepo.findByAccountNumber(accountNumber);
        if (!accountOpt.isPresent()) {
            throw new IllegalArgumentException("Bank account not found");
        }

        UpiMapping mapping = new UpiMapping();
        mapping.setAccountNumber(accountNumber);
        mapping.setUpiId(upiId.toLowerCase());
        
        return upiMappingRepo.save(mapping);
    }

    public Optional<UpiMapping> getMappingByUpiId(String upiId) {
        return upiMappingRepo.findByUpiId(upiId.toLowerCase());
    }

    public Optional<UpiMapping> getMappingByAccountNumber(String accountNumber) {
        return upiMappingRepo.findByAccountNumber(accountNumber);
    }

    @Transactional
    public Transaction payViaUpi(String fromAccountNumber, String recipientUpiId, double amount) {
        Optional<BankAccount> fromAccOpt = bankAccountRepo.findByAccountNumber(fromAccountNumber);
        if (!fromAccOpt.isPresent()) {
            throw new IllegalArgumentException("Source account not found");
        }

        BankAccount fromAcc = fromAccOpt.get();
        if (fromAcc.getBalance() < amount) {
            throw new IllegalArgumentException("Insufficient balance");
        }

        Optional<UpiMapping> recipientMappingOpt = upiMappingRepo.findByUpiId(recipientUpiId.toLowerCase());
        if (!recipientMappingOpt.isPresent()) {
            throw new IllegalArgumentException("Recipient UPI ID is not registered");
        }

        UpiMapping recipientMapping = recipientMappingOpt.get();
        Optional<BankAccount> toAccOpt = bankAccountRepo.findByAccountNumber(recipientMapping.getAccountNumber());
        if (!toAccOpt.isPresent()) {
            throw new IllegalArgumentException("Recipient bank account not found");
        }

        BankAccount toAcc = toAccOpt.get();

        // Perform balances updates
        fromAcc.setBalance(fromAcc.getBalance() - amount);
        bankAccountRepo.save(fromAcc);

        toAcc.setBalance(toAcc.getBalance() + amount);
        bankAccountRepo.save(toAcc);

        // Record Transaction
        Transaction tx = new Transaction();
        tx.setFromNumber(fromAcc.getMobileNumber());
        tx.setToNumber(toAcc.getMobileNumber());
        tx.setAmount(amount);
        tx.setType(TransactionType.DEBIT);
        tx.setCategory("UPI_TRANSFER");
        tx.setDescription("UPI transfer to " + recipientUpiId);
        tx.setFromAccountId(fromAcc.getId());
        tx.setToAccountId(toAcc.getId());
        tx.setTimestamp(LocalDateTime.now());
        tx.setStatus(TransactionStatus.SUCCESS);

        User user = userRepo.getByMobileNumber(fromAcc.getMobileNumber());
        if (user != null) {
            tx.setUser(user);
        }

        transactionRepo.save(tx);

        // Double-entry record
        ledgerService.recordDoubleEntry(tx.getId(), fromAccountNumber, toAcc.getAccountNumber(), amount);

        // Send notifications
        notificationService.createNotification(
            fromAcc.getMobileNumber(),
            "UPI Debit Alert",
            "₹" + amount + " debited from account " + fromAcc.getAccountNumber() + " via UPI to " + recipientUpiId + "."
        );

        notificationService.createNotification(
            toAcc.getMobileNumber(),
            "UPI Credit Alert",
            "₹" + amount + " credited to account " + toAcc.getAccountNumber() + " via UPI from " + fromAcc.getMobileNumber() + "."
        );

        return tx;
    }

    public String generateDynamicQrCode(String upiId, double amount) {
        // Creates standard UPI payment link schema
        // pa = payment address, pn = payee name, am = amount, cu = currency
        return "upi://pay?pa=" + upiId.toLowerCase() + "&pn=EliteTrustMerchant&am=" + amount + "&cu=INR&tn=EliteTrustSecureQR";
    }
}
