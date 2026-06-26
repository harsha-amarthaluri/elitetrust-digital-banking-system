package com.bank_application.backend.services;

import com.bank_application.backend.entity.*;
import com.bank_application.backend.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Random;

@Service
public class FixedDepositService {

    private static final Logger logger = LoggerFactory.getLogger(FixedDepositService.class);

    @Autowired
    private FixedDepositRepo fixedDepositRepo;

    @Autowired
    private BankAccountRepo bankAccountRepo;

    @Autowired
    private AuditLogRepo auditLogRepo;

    @Autowired
    private EmailService emailService;

    @Autowired
    private UserRepo userRepo;

    // ─── Interest rate lookup by tenure ──────────────────────────────────────
    private double resolveInterestRate(int tenureMonths) {
        if (tenureMonths <= 6)  return 6.5;
        if (tenureMonths <= 12) return 7.0;
        if (tenureMonths <= 24) return 7.5;
        return 8.0; // 36+ months
    }

    // ─── Maturity amount: simple interest ────────────────────────────────────
    private double calculateMaturityAmount(double principal, double rate, int months) {
        return principal * (1 + (rate / 100.0) * (months / 12.0));
    }

    // ─── Auto-generate FD number ──────────────────────────────────────────────
    private String generateFdNumber() {
        int year = LocalDate.now().getYear();
        int random = 100000 + new Random().nextInt(900000);
        return "FD" + year + random;
    }

    /**
     * Create a new Fixed Deposit.
     * Deducts the principal from the linked savings account and opens the FD.
     */
    @Transactional
    public FixedDeposit createFD(String mobileNumber, String linkedAccountNumber,
                                  double amount, int tenureMonths) {

        // 1. Validate and lock linked account
        BankAccount account = bankAccountRepo.findByAccountNumberForUpdate(linkedAccountNumber)
                .orElseThrow(() -> new RuntimeException("Account not found: " + linkedAccountNumber));

        if (!account.getMobileNumber().equals(mobileNumber)) {
            throw new RuntimeException("Account does not belong to the given mobile number.");
        }
        if (account.getAccountStatus() != AccountStatus.ACTIVE) {
            throw new RuntimeException("Account is not active. Cannot create FD.");
        }
        if (account.getBalance() < amount) {
            throw new RuntimeException("Insufficient balance. Available: ₹" + account.getBalance());
        }
        if (amount <= 0) {
            throw new RuntimeException("FD amount must be positive.");
        }

        // 2. Deduct from savings account
        account.setBalance(account.getBalance() - amount);
        bankAccountRepo.save(account);

        // 3. Calculate FD details
        double rate           = resolveInterestRate(tenureMonths);
        double maturityAmount = calculateMaturityAmount(amount, rate, tenureMonths);
        LocalDate startDate    = LocalDate.now();
        LocalDate maturityDate = startDate.plusMonths(tenureMonths);

        // 4. Build FD entity
        FixedDeposit fd = new FixedDeposit();
        fd.setFdNumber(generateFdNumber());
        fd.setMobileNumber(mobileNumber);
        fd.setLinkedAccountNumber(linkedAccountNumber);
        fd.setPrincipalAmount(amount);
        fd.setInterestRate(rate);
        fd.setTenureMonths(tenureMonths);
        fd.setStartDate(startDate);
        fd.setMaturityDate(maturityDate);
        fd.setMaturityAmount(maturityAmount);
        fd.setStatus(FdStatus.ACTIVE);
        fd.setCreatedAt(LocalDateTime.now());

        FixedDeposit saved = fixedDepositRepo.save(fd);

        // 5. Audit log
        logAudit("FD_CREATED", mobileNumber,
                "FD " + saved.getFdNumber() + " created for ₹" + amount +
                " at " + rate + "% for " + tenureMonths + " months. Matures: " + maturityDate);

        // 6. Email notification
        sendFdCreationEmail(mobileNumber, saved);

        logger.info("FD created: {} for mobile {} — principal ₹{}, matures {}", 
                saved.getFdNumber(), mobileNumber, amount, maturityDate);

        return saved;
    }

    /**
     * Break (pre-mature withdraw) a Fixed Deposit.
     * Applies 1% penalty on the earned interest. Credits principal + (interest - penalty) back.
     */
    @Transactional
    public FixedDeposit breakFD(Long fdId) {

        FixedDeposit fd = fixedDepositRepo.findById(fdId)
                .orElseThrow(() -> new RuntimeException("Fixed Deposit not found: " + fdId));

        if (fd.getStatus() != FdStatus.ACTIVE) {
            throw new RuntimeException("FD " + fd.getFdNumber() + " is not active. Current status: " + fd.getStatus());
        }

        // Calculate pro-rata interest earned until today
        long daysElapsed = java.time.temporal.ChronoUnit.DAYS.between(fd.getStartDate(), LocalDate.now());
        double earnedInterest = fd.getPrincipalAmount() * (fd.getInterestRate() / 100.0) * (daysElapsed / 365.0);

        // 1% penalty on earned interest
        double penalty = earnedInterest * 0.01;
        double creditAmount = fd.getPrincipalAmount() + earnedInterest - penalty;

        // Update FD status
        fd.setStatus(FdStatus.WITHDRAWN);
        fd.setClosureReason("Premature withdrawal by customer.");
        fd.setPenaltyAmount(penalty);
        fixedDepositRepo.save(fd);

        // Credit back to linked account
        BankAccount account = bankAccountRepo.findByAccountNumberForUpdate(fd.getLinkedAccountNumber())
                .orElseThrow(() -> new RuntimeException("Linked account not found: " + fd.getLinkedAccountNumber()));
        account.setBalance(account.getBalance() + creditAmount);
        bankAccountRepo.save(account);

        // Audit log
        logAudit("FD_BROKEN", fd.getMobileNumber(),
                "FD " + fd.getFdNumber() + " broken. Principal: ₹" + fd.getPrincipalAmount() +
                ", Interest earned: ₹" + String.format("%.2f", earnedInterest) +
                ", Penalty (1%): ₹" + String.format("%.2f", penalty) +
                ", Credited: ₹" + String.format("%.2f", creditAmount));

        // Email notification
        sendFdBreakEmail(fd.getMobileNumber(), fd, creditAmount, penalty);

        logger.info("FD broken: {} — credited ₹{} (penalty ₹{}) to account {}", 
                fd.getFdNumber(), creditAmount, penalty, fd.getLinkedAccountNumber());

        return fd;
    }

    /**
     * Get all Fixed Deposits for a mobile number.
     */
    public List<FixedDeposit> getFdsByMobile(String mobileNumber) {
        return fixedDepositRepo.findByMobileNumber(mobileNumber);
    }

    /**
     * Scheduled job — runs daily at 9:00 AM.
     * Finds all ACTIVE FDs whose maturity date has passed and credits the maturity amount.
     */
    @Scheduled(cron = "0 0 9 * * *")
    @Transactional
    public void matureOverdueFDs() {
        LocalDate today = LocalDate.now();
        List<FixedDeposit> overdue = fixedDepositRepo.findByStatusAndMaturityDateBefore(FdStatus.ACTIVE, today);

        logger.info("FD maturity scheduler: found {} overdue FDs to process.", overdue.size());

        for (FixedDeposit fd : overdue) {
            try {
                BankAccount account = bankAccountRepo.findByAccountNumberForUpdate(fd.getLinkedAccountNumber())
                        .orElse(null);

                if (account == null) {
                    logger.warn("Cannot mature FD {} — linked account {} not found.", 
                            fd.getFdNumber(), fd.getLinkedAccountNumber());
                    continue;
                }

                // Credit maturity amount
                account.setBalance(account.getBalance() + fd.getMaturityAmount());
                bankAccountRepo.save(account);

                // Update FD status
                fd.setStatus(FdStatus.MATURED);
                fd.setClosureReason("Auto-matured on " + today);
                fixedDepositRepo.save(fd);

                // Audit log
                logAudit("FD_MATURED", fd.getMobileNumber(),
                        "FD " + fd.getFdNumber() + " matured. ₹" + fd.getMaturityAmount() + " credited to " + fd.getLinkedAccountNumber());

                // Email notification
                sendFdMaturityEmail(fd.getMobileNumber(), fd);

                logger.info("FD matured: {} — ₹{} credited to {}", 
                        fd.getFdNumber(), fd.getMaturityAmount(), fd.getLinkedAccountNumber());

            } catch (Exception e) {
                logger.error("Error processing maturity for FD {}: {}", fd.getFdNumber(), e.getMessage());
            }
        }
    }

    // ─── Internal helpers ──────────────────────────────────────────────────────

    private void logAudit(String action, String mobileNumber, String details) {
        try {
            AuditLog log = new AuditLog();
            log.setAction(action);
            log.setUserMobile(mobileNumber);
            log.setDetails(details);
            log.setTimestamp(LocalDateTime.now());
            auditLogRepo.save(log);
        } catch (Exception e) {
            logger.warn("Failed to write audit log for {}: {}", action, e.getMessage());
        }
    }

    private void sendFdCreationEmail(String mobileNumber, FixedDeposit fd) {
        try {
            User user = userRepo.getByMobileNumber(mobileNumber);
            if (user != null && user.getEmail() != null) {
                String subject = "Fixed Deposit Created — " + fd.getFdNumber();
                String body = String.format(
                    "Dear %s,\n\n" +
                    "Your Fixed Deposit has been successfully created.\n\n" +
                    "  FD Number       : %s\n" +
                    "  Principal       : ₹%.2f\n" +
                    "  Interest Rate   : %.1f%% p.a.\n" +
                    "  Tenure          : %d months\n" +
                    "  Start Date      : %s\n" +
                    "  Maturity Date   : %s\n" +
                    "  Maturity Amount : ₹%.2f\n\n" +
                    "Thank you for banking with EliteTrust Bank.",
                    user.getName(), fd.getFdNumber(), fd.getPrincipalAmount(),
                    fd.getInterestRate(), fd.getTenureMonths(),
                    fd.getStartDate(), fd.getMaturityDate(), fd.getMaturityAmount());
                emailService.sendEmail(user.getEmail(), subject, body);
            }
        } catch (Exception e) {
            logger.warn("Failed to send FD creation email: {}", e.getMessage());
        }
    }

    private void sendFdBreakEmail(String mobileNumber, FixedDeposit fd, double credited, double penalty) {
        try {
            User user = userRepo.getByMobileNumber(mobileNumber);
            if (user != null && user.getEmail() != null) {
                String subject = "Fixed Deposit Withdrawn — " + fd.getFdNumber();
                String body = String.format(
                    "Dear %s,\n\n" +
                    "Your Fixed Deposit has been prematurely withdrawn.\n\n" +
                    "  FD Number     : %s\n" +
                    "  Principal     : ₹%.2f\n" +
                    "  Penalty (1%%) : ₹%.2f\n" +
                    "  Amount Credit : ₹%.2f\n\n" +
                    "The amount has been credited to your linked account %s.\n\n" +
                    "Thank you for banking with EliteTrust Bank.",
                    user.getName(), fd.getFdNumber(),
                    fd.getPrincipalAmount(), penalty, credited,
                    fd.getLinkedAccountNumber());
                emailService.sendEmail(user.getEmail(), subject, body);
            }
        } catch (Exception e) {
            logger.warn("Failed to send FD break email: {}", e.getMessage());
        }
    }

    private void sendFdMaturityEmail(String mobileNumber, FixedDeposit fd) {
        try {
            User user = userRepo.getByMobileNumber(mobileNumber);
            if (user != null && user.getEmail() != null) {
                String subject = "Fixed Deposit Matured — " + fd.getFdNumber();
                String body = String.format(
                    "Dear %s,\n\n" +
                    "Congratulations! Your Fixed Deposit has matured.\n\n" +
                    "  FD Number       : %s\n" +
                    "  Principal       : ₹%.2f\n" +
                    "  Maturity Amount : ₹%.2f\n\n" +
                    "The maturity amount has been credited to your account %s.\n\n" +
                    "Thank you for banking with EliteTrust Bank.",
                    user.getName(), fd.getFdNumber(),
                    fd.getPrincipalAmount(), fd.getMaturityAmount(),
                    fd.getLinkedAccountNumber());
                emailService.sendEmail(user.getEmail(), subject, body);
            }
        } catch (Exception e) {
            logger.warn("Failed to send FD maturity email: {}", e.getMessage());
        }
    }
}
