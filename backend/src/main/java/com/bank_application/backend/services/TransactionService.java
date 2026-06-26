package com.bank_application.backend.services;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bank_application.backend.entity.*;
import com.bank_application.backend.repository.BankAccountRepo;
import com.bank_application.backend.repository.TransactionRepo;
import com.bank_application.backend.repository.AuditLogRepo;
import com.bank_application.backend.repository.NotificationRepo;
import com.bank_application.backend.repository.UserRepo;

@Service
public class TransactionService {

    private static final org.slf4j.Logger auditLogger = org.slf4j.LoggerFactory.getLogger("com.bank_application.backend.audit");

    @Autowired
    private BankAccountRepo bankAccountRepo;

    @Autowired
    private TransactionRepo transactionRepo;

    @Autowired
    private AuditLogRepo auditLogRepo;

    @Autowired
    private NotificationRepo notificationRepo;

    @Autowired
    private EmailService emailService;

    @Autowired
    private LedgerService ledgerService;

    @Autowired
    private UserRepo userRepo;

    @Autowired
    private FraudDetectionService fraudDetectionService;

    @Autowired
    private com.bank_application.backend.repository.FraudAlertRepo fraudAlertRepo;

    @Autowired
    private com.bank_application.backend.repository.BeneficiaryRepo beneficiaryRepo;

    @Transactional
    public com.bank_application.backend.controller.TransferResponse processTransfer(com.bank_application.backend.controller.TransferRequest request) {
        if (request.getAmount() <= 0) {
            throw new IllegalArgumentException("Amount must be greater than zero");
        }

        // Get Sender Account (with lock to prevent double spending)
        BankAccount sender = bankAccountRepo.findByIdForUpdate(request.getFromAccountId())
                .orElseThrow(() -> new RuntimeException("Sender account not found"));

        if (!sender.isActive()) {
            throw new RuntimeException("Sender account is inactive/frozen");
        }

        // --- Limit Checks ---
        if (request.getAmount() > sender.getTransactionLimit()) {
            throw new IllegalArgumentException("Amount exceeds per-transaction limit of ₹" + sender.getTransactionLimit());
        }

        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        double dailyTotal = transactionRepo.calculateDailyDebitTotal(sender.getId(), startOfDay);
        if (dailyTotal + request.getAmount() > sender.getDailyLimit()) {
            throw new IllegalArgumentException("Amount exceeds daily cumulative transfer limit. Remaining: ₹" + (sender.getDailyLimit() - dailyTotal));
        }

        // --- Beneficiary Cooling Period Check ---
        String destinationAccountNumber = null;
        if ("ACCOUNT".equals(request.getType())) {
            destinationAccountNumber = request.getToAccountNumber();
        } else if ("MOBILE".equals(request.getType())) {
            BankAccount rec = bankAccountRepo.findByMobileNumberAndPrimaryAccountTrue(request.getToMobileNumber())
                    .orElseGet(() -> {
                        List<BankAccount> accounts = bankAccountRepo.findByMobileNumber(request.getToMobileNumber());
                        return accounts.isEmpty() ? null : accounts.get(0);
                    });
            if (rec != null) {
                destinationAccountNumber = rec.getAccountNumber();
            }
        }

        if (destinationAccountNumber != null) {
            java.util.Optional<com.bank_application.backend.entity.Beneficiary> beneficiaryOpt = 
                beneficiaryRepo.findByUserMobileAndAccountNumber(sender.getMobileNumber(), destinationAccountNumber);
            if (beneficiaryOpt.isPresent()) {
                com.bank_application.backend.entity.Beneficiary beneficiary = beneficiaryOpt.get();
                if (beneficiary.getCreatedAt() != null && 
                    beneficiary.getCreatedAt().plusHours(24).isAfter(LocalDateTime.now())) {
                    if (request.getAmount() > 10000.0) {
                        throw new IllegalArgumentException("Transfer exceeds the ₹10,000 limit allowed during the 24-hour beneficiary cooling period.");
                    }
                }
            }
        }

        // --- Run Fraud / AML Evaluator ---
        FraudAlert fraudAlert = fraudDetectionService.evaluateTransaction(sender.getMobileNumber(), request.getAmount(), null);
        boolean isHighRisk = fraudAlert != null && "HIGH".equals(fraudAlert.getSeverity());

        // --- Maker-Checker Workflow (₹50,000 threshold or high risk fraud alert) ---
        if (request.getAmount() > 50000.0 || isHighRisk) {
            // Find receiver account to record in transaction details
            BankAccount receiverAcc = null;
            if ("MOBILE".equals(request.getType())) {
                receiverAcc = bankAccountRepo.findByMobileNumberAndPrimaryAccountTrueForUpdate(request.getToMobileNumber())
                        .orElseGet(() -> {
                            List<BankAccount> accounts = bankAccountRepo.findByMobileNumber(request.getToMobileNumber());
                            if (accounts.isEmpty()) {
                                throw new RuntimeException("Recipient mobile number has no linked bank accounts");
                            }
                            return bankAccountRepo.findByIdForUpdate(accounts.get(0).getId()).orElse(null);
                        });
            } else if ("ACCOUNT".equals(request.getType())) {
                receiverAcc = bankAccountRepo.findByAccountNumberForUpdate(request.getToAccountNumber()).orElse(null);
            } else if ("SELF".equals(request.getType())) {
                receiverAcc = bankAccountRepo.findByIdForUpdate(request.getToAccountId()).orElse(null);
            }

            Transaction pendingTx = new Transaction();
            pendingTx.setFromNumber(sender.getMobileNumber());
            pendingTx.setToNumber(receiverAcc != null ? receiverAcc.getMobileNumber() : "SYSTEM");
            pendingTx.setFromAccountId(sender.getId());
            pendingTx.setToAccountId(receiverAcc != null ? receiverAcc.getId() : null);
            pendingTx.setAmount(request.getAmount());
            pendingTx.setType(TransactionType.DEBIT);
            pendingTx.setCategory(request.getCategory() != null ? request.getCategory() : "Transfer");
            pendingTx.setStatus(TransactionStatus.PENDING_APPROVAL);
            pendingTx.setTimestamp(LocalDateTime.now());
            
            String desc = request.getAmount() > 50000.0 ? 
                    "Transfer pending manager approval (Over limit ₹50k)" : 
                    "Transfer pending review: Suspicious AML rule triggered (" + fraudAlert.getRuleName() + ")";
            pendingTx.setDescription(desc);
            
            User user = userRepo.getByMobileNumber(sender.getMobileNumber());
            if (user != null) {
                pendingTx.setUser(user);
            }

            pendingTx = transactionRepo.save(pendingTx);

            if (fraudAlert != null) {
                fraudAlert.setTransactionId(pendingTx.getId());
                fraudAlertRepo.save(fraudAlert);
            }

            logAudit("MAKER_CHECKER_FLAG", sender.getMobileNumber(), "Transaction flagged for manager approval: " + request.getAmount() + " (TxId: " + pendingTx.getId() + ")");
            createNotification(sender.getMobileNumber(), "Transfer Pending Review", 
                    "Your transfer of ₹" + request.getAmount() + " is pending review by the compliance manager.", "SYSTEM");

            return new com.bank_application.backend.controller.TransferResponse("Transfer requires manager approval", pendingTx.getId(), sender.getBalance());
        }

        BankAccount receiver = null;

        if ("MOBILE".equals(request.getType())) {
            receiver = bankAccountRepo.findByMobileNumberAndPrimaryAccountTrueForUpdate(request.getToMobileNumber())
                    .orElseGet(() -> {
                        List<BankAccount> accounts = bankAccountRepo.findByMobileNumber(request.getToMobileNumber());
                        if (accounts.isEmpty()) {
                            throw new RuntimeException("Recipient mobile number has no linked bank accounts");
                        }
                        return bankAccountRepo.findByIdForUpdate(accounts.get(0).getId())
                                .orElseThrow(() -> new RuntimeException("Recipient account not found"));
                    });
        } else if ("ACCOUNT".equals(request.getType())) {
            receiver = bankAccountRepo.findByAccountNumberForUpdate(request.getToAccountNumber())
                    .orElseThrow(() -> new RuntimeException("Recipient account not found"));
        } else if ("SELF".equals(request.getType())) {
            receiver = bankAccountRepo.findByIdForUpdate(request.getToAccountId())
                    .orElseThrow(() -> new RuntimeException("Recipient account not found"));
        } else {
            throw new IllegalArgumentException("Invalid transfer type");
        }

        if (!receiver.isActive()) {
            throw new RuntimeException("Recipient account is inactive/frozen");
        }

        if (sender.getId().equals(receiver.getId())) {
            throw new IllegalArgumentException("Cannot transfer to same account");
        }

        if (sender.getBalance() < request.getAmount()) {
            throw new RuntimeException("Insufficient balance");
        }

        // Deduct
        sender.setBalance(sender.getBalance() - request.getAmount());

        // Credit
        receiver.setBalance(receiver.getBalance() + request.getAmount());

        bankAccountRepo.save(sender);
        bankAccountRepo.save(receiver);

        // Transaction records
        // 1. Sender (DEBIT)
        Transaction debitTx = new Transaction();
        debitTx.setFromNumber(sender.getMobileNumber());
        debitTx.setToNumber(receiver.getMobileNumber());
        debitTx.setFromAccountId(sender.getId());
        debitTx.setToAccountId(receiver.getId());
        debitTx.setAmount(request.getAmount());
        debitTx.setType(TransactionType.DEBIT);
        debitTx.setCategory(request.getCategory() != null ? request.getCategory() : "Transfer");
        debitTx.setStatus(TransactionStatus.SUCCESS);
        debitTx.setTimestamp(LocalDateTime.now());
        
        if ("SELF".equals(request.getType())) {
            debitTx.setDescription("Self Transfer Debit");
        } else {
            debitTx.setDescription("Money Transfer sent to A/c ending " + maskAcc(receiver.getAccountNumber()));
        }
        
        debitTx = transactionRepo.save(debitTx);

        if (fraudAlert != null) {
            fraudAlert.setTransactionId(debitTx.getId());
            fraudAlertRepo.save(fraudAlert);
        }

        // 2. Receiver (CREDIT)
        Transaction creditTx = new Transaction();
        creditTx.setFromNumber(sender.getMobileNumber());
        creditTx.setToNumber(receiver.getMobileNumber());
        creditTx.setFromAccountId(sender.getId());
        creditTx.setToAccountId(receiver.getId());
        creditTx.setAmount(request.getAmount());
        creditTx.setType(TransactionType.CREDIT);
        creditTx.setCategory(request.getCategory() != null ? request.getCategory() : "Transfer");
        creditTx.setStatus(TransactionStatus.SUCCESS);
        creditTx.setTimestamp(LocalDateTime.now());

        if ("SELF".equals(request.getType())) {
            creditTx.setDescription("Self Transfer Credit");
        } else {
            creditTx.setDescription("Money Transfer received from A/c ending " + maskAcc(sender.getAccountNumber()));
        }

        transactionRepo.save(creditTx);

        // Double-entry record
        ledgerService.recordDoubleEntry(debitTx.getId(), sender.getAccountNumber(), receiver.getAccountNumber(), request.getAmount());

        // Audit Logging
        logAudit("FUND_TRANSFER", sender.getMobileNumber(), "Debited: " + request.getAmount() + " to " + receiver.getMobileNumber() + " (TxId: " + debitTx.getId() + ")");
        logAudit("FUND_TRANSFER_CREDIT", receiver.getMobileNumber(), "Credited: " + request.getAmount() + " from " + sender.getMobileNumber());

        // Notifications
        createNotification(sender.getMobileNumber(), "Debit Alert", 
                "₹" + request.getAmount() + " has been debited from your account " + maskAcc(sender.getAccountNumber()) + " to A/c ending " + maskAcc(receiver.getAccountNumber()) + ". Updated Balance: ₹" + sender.getBalance(), "TRANSACTION");

        createNotification(receiver.getMobileNumber(), "Credit Alert", 
                "₹" + request.getAmount() + " has been credited to your account " + maskAcc(receiver.getAccountNumber()) + " from A/c ending " + maskAcc(sender.getAccountNumber()) + ". Updated Balance: ₹" + receiver.getBalance(), "TRANSACTION");

        // Simulated Emails
        emailService.sendEmail("customer@elitetrust.com", "EliteTrust - Debit Alert", 
                "Dear Customer,\n\nAn amount of ₹" + request.getAmount() + " has been debited from your account ending in " + maskAcc(sender.getAccountNumber()) + ".\nUpdated Balance: ₹" + sender.getBalance());
        
        emailService.sendEmail("customer@elitetrust.com", "EliteTrust - Credit Alert", 
                "Dear Customer,\n\nAn amount of ₹" + request.getAmount() + " has been credited to your account ending in " + maskAcc(receiver.getAccountNumber()) + ".\nUpdated Balance: ₹" + receiver.getBalance());

        return new com.bank_application.backend.controller.TransferResponse("Transfer successful", debitTx.getId(), sender.getBalance());
    }

    @Transactional
    public Transaction approveTransaction(Long transactionId) {
        Transaction tx = transactionRepo.findById(transactionId)
                .orElseThrow(() -> new RuntimeException("Transaction not found"));

        if (tx.getStatus() != TransactionStatus.PENDING_APPROVAL) {
            throw new IllegalStateException("Transaction is not pending approval");
        }

        BankAccount sender = bankAccountRepo.findByIdForUpdate(tx.getFromAccountId())
                .orElseThrow(() -> new RuntimeException("Sender account not found"));
        BankAccount receiver = bankAccountRepo.findByIdForUpdate(tx.getToAccountId())
                .orElseThrow(() -> new RuntimeException("Recipient account not found"));

        if (sender.getBalance() < tx.getAmount()) {
            tx.setStatus(TransactionStatus.FAILED);
            tx.setDescription(tx.getDescription() + " (Failed: Insufficient balance on execution)");
            transactionRepo.save(tx);
            throw new RuntimeException("Insufficient balance to execute this transaction");
        }

        // Deduct & Credit
        sender.setBalance(sender.getBalance() - tx.getAmount());
        receiver.setBalance(receiver.getBalance() + tx.getAmount());

        bankAccountRepo.save(sender);
        bankAccountRepo.save(receiver);

        // Update tx
        tx.setStatus(TransactionStatus.SUCCESS);
        tx.setTimestamp(LocalDateTime.now());
        tx.setDescription("Money Transfer sent to A/c ending " + maskAcc(receiver.getAccountNumber()));
        transactionRepo.save(tx);

        // Record credit transaction matching this debit
        Transaction creditTx = new Transaction();
        creditTx.setFromNumber(sender.getMobileNumber());
        creditTx.setToNumber(receiver.getMobileNumber());
        creditTx.setFromAccountId(sender.getId());
        creditTx.setToAccountId(receiver.getId());
        creditTx.setAmount(tx.getAmount());
        creditTx.setType(TransactionType.CREDIT);
        creditTx.setCategory(tx.getCategory());
        creditTx.setStatus(TransactionStatus.SUCCESS);
        creditTx.setTimestamp(LocalDateTime.now());
        creditTx.setDescription("Money Transfer received from A/c ending " + maskAcc(sender.getAccountNumber()));
        transactionRepo.save(creditTx);

        // Double-entry record
        ledgerService.recordDoubleEntry(tx.getId(), sender.getAccountNumber(), receiver.getAccountNumber(), tx.getAmount());

        // Notifications
        createNotification(sender.getMobileNumber(), "Transfer Approved", 
                "Your transfer of ₹" + tx.getAmount() + " to A/c ending " + maskAcc(receiver.getAccountNumber()) + " has been approved by the manager and executed.", "TRANSACTION");

        createNotification(receiver.getMobileNumber(), "Credit Alert", 
                "₹" + tx.getAmount() + " credited to account " + maskAcc(receiver.getAccountNumber()) + " from A/c ending " + maskAcc(sender.getAccountNumber()) + ".", "TRANSACTION");

        return tx;
    }

    @Transactional
    public Transaction rejectTransaction(Long transactionId) {
        Transaction tx = transactionRepo.findById(transactionId)
                .orElseThrow(() -> new RuntimeException("Transaction not found"));

        if (tx.getStatus() != TransactionStatus.PENDING_APPROVAL) {
            throw new IllegalStateException("Transaction is not pending approval");
        }

        tx.setStatus(TransactionStatus.FAILED);
        tx.setDescription("Transfer rejected by compliance manager");
        tx.setTimestamp(LocalDateTime.now());
        transactionRepo.save(tx);

        createNotification(tx.getFromNumber(), "Transfer Rejected", 
                "Your transfer of ₹" + tx.getAmount() + " was rejected by the compliance manager.", "TRANSACTION");

        return tx;
    }


    @Transactional
    public Transaction transferMoneyUsingMobile(String fromMobile, String toMobile, double amount, String category) {
        // Fallback or legacy method
        com.bank_application.backend.controller.TransferRequest req = new com.bank_application.backend.controller.TransferRequest();
        req.setType("MOBILE");
        req.setToMobileNumber(toMobile);
        req.setAmount(amount);
        req.setCategory(category);
        
        List<BankAccount> senderAccounts = bankAccountRepo.findByMobileNumber(fromMobile);
        if (senderAccounts.isEmpty()) {
            throw new RuntimeException("Sender not found");
        }
        BankAccount sender = senderAccounts.stream()
                .filter(BankAccount::isPrimaryAccount)
                .findFirst()
                .orElse(senderAccounts.get(0));
        
        req.setFromAccountId(sender.getId());
        
        processTransfer(req);
        
        // Return a mock Success Transaction record
        Transaction tx = new Transaction();
        tx.setFromNumber(fromMobile);
        tx.setToNumber(toMobile);
        tx.setAmount(amount);
        tx.setType(TransactionType.DEBIT);
        tx.setStatus(TransactionStatus.SUCCESS);
        tx.setTimestamp(LocalDateTime.now());
        tx.setDescription("Money Transfer to " + toMobile);
        return tx;
    }

    public List<Transaction> getTransactions(String mobileNumber){
    	return transactionRepo.findDoubleEntryTransactionsForUser(mobileNumber);
    }
    
    public List<Transaction> getAllTransactions(){
    	return transactionRepo.findAll();
    }

    private String maskAcc(String acc) {
        if (acc == null || acc.length() < 4) return "****";
        return "**** " + acc.substring(acc.length() - 4);
    }

    private void logAudit(String action, String mobile, String details) {
        AuditLog log = new AuditLog();
        log.setAction(action);
        log.setUserMobile(mobile);
        log.setDetails(details);
        log.setIpAddress("SYSTEM");
        auditLogRepo.save(log);

        auditLogger.info("Action: {}, User: {}, Details: {}", action, mobile, details);
    }

    private void createNotification(String mobile, String title, String msg, String type) {
        Notification notification = new Notification();
        notification.setUserMobile(mobile);
        notification.setTitle(title);
        notification.setMessage(msg);
        notification.setType(type);
        notification.setTimestamp(LocalDateTime.now());
        notification.setRead(false);
        notificationRepo.save(notification);
    }
}