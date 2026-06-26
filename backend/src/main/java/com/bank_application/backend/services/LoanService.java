package com.bank_application.backend.services;

import com.bank_application.backend.entity.*;
import com.bank_application.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Random;

@Service
public class LoanService {

    @Autowired
    private LoanRepo loanRepo;

    @Autowired
    private BankAccountRepo bankAccountRepo;

    @Autowired
    private TransactionRepo transactionRepo;

    @Autowired
    private LedgerService ledgerService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private UserRepo userRepo;

    private final Random random = new Random();

    public double calculateEmi(double amount, double annualRate, int tenureMonths) {
        double monthlyRate = annualRate / 12.0 / 100.0;
        return (amount * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
                (Math.pow(1 + monthlyRate, tenureMonths) - 1);
    }

    public int getAnnualInterestRate(LoanType type) {
        switch (type) {
            case PERSONAL: return 12;
            case EDUCATION: return 8;
            case HOME: return 7;
            case AUTO: return 9;
            default: return 10;
        }
    }

    public int generateMockCibilScore(String panCardNumber) {
        if (panCardNumber == null || panCardNumber.isEmpty()) {
            return 300 + random.nextInt(250); // Low score if no PAN
        }
        // Seeded random based on hash of PAN to keep it stable per user
        int seed = panCardNumber.hashCode();
        Random seededRandom = new Random(seed);
        return 600 + seededRandom.nextInt(250); // 600 to 850
    }

    public boolean isEligible(double monthlySalary, int cibilScore) {
        return cibilScore >= 650 && monthlySalary >= 20000.0;
    }

    public Loan applyForLoan(Long userId, LoanType loanType, double amount, int tenureMonths, double monthlySalary, String panCardNumber) {
        int cibil = generateMockCibilScore(panCardNumber);
        
        Loan loan = new Loan();
        loan.setUserId(userId);
        loan.setLoanType(loanType);
        loan.setAmount(amount);
        loan.setTenureMonths(tenureMonths);
        loan.setMonthlySalary(monthlySalary);
        loan.setCibilScore(cibil);
        
        // Calculate Interest and EMI
        double rate = getAnnualInterestRate(loanType);
        loan.setInterestRate(rate);
        loan.setMonthlyEmi(calculateEmi(amount, rate, tenureMonths));
        
        // Mock risk score calculation
        int risk = 100 - (cibil - 300) * 100 / 550;
        if (monthlySalary > 100000.0) risk -= 20;
        loan.setRiskScore(Math.max(10, Math.min(95, risk)));
        
        // If not eligible, auto-reject or set to PENDING for employee review
        if (!isEligible(monthlySalary, cibil)) {
            loan.setStatus(LoanStatus.REJECTED);
        } else {
            loan.setStatus(LoanStatus.PENDING);
        }
        
        return loanRepo.save(loan);
    }

    public List<Loan> getLoansByUserId(Long userId) {
        return loanRepo.findByUserId(userId);
    }

    public List<Loan> getPendingLoans() {
        return loanRepo.findByStatus(LoanStatus.PENDING);
    }

    @Transactional
    public Loan reviewLoan(Long loanId, LoanStatus reviewStatus) {
        Loan loan = loanRepo.findById(loanId)
                .orElseThrow(() -> new IllegalArgumentException("Loan not found"));

        if (loan.getStatus() != LoanStatus.PENDING) {
            throw new IllegalStateException("Loan is already reviewed");
        }

        loan.setStatus(reviewStatus);
        
        if (reviewStatus == LoanStatus.APPROVED || reviewStatus == LoanStatus.DISBURSED) {
            loan.setApprovedDate(LocalDateTime.now());
            disburseLoanFunds(loan);
        }

        return loanRepo.save(loan);
    }

    private void disburseLoanFunds(Loan loan) {
        // Disburse into user's primary bank account
        // We'll lookup user by ID first to get their actual mobile number
        User user = userRepo.findById(loan.getUserId()).orElse(null);
        String mobileNumber = (user != null) ? user.getMobileNumber() : String.valueOf(loan.getUserId());
        List<BankAccount> accounts = bankAccountRepo.findAllByMobileNumber(mobileNumber);
        
        BankAccount primaryAcc = accounts.stream()
                .filter(BankAccount::isPrimaryAccount)
                .findFirst()
                .orElse(accounts.isEmpty() ? null : accounts.get(0));

        if (primaryAcc == null) {
            // No account found, log transaction as failed/skipped for now
            return;
        }

        primaryAcc.setBalance(primaryAcc.getBalance() + loan.getAmount());
        bankAccountRepo.save(primaryAcc);

        // Record Transaction
        Transaction tx = new Transaction();
        tx.setFromNumber("ELITETRUST_LOAN");
        tx.setToNumber(mobileNumber);
        tx.setAmount(loan.getAmount());
        tx.setType(TransactionType.CREDIT);
        tx.setCategory("LOAN_DISBURSEMENT");
        tx.setDescription(loan.getLoanType() + " Loan Disbursed");
        tx.setToAccountId(primaryAcc.getId());
        tx.setTimestamp(LocalDateTime.now());
        tx.setStatus(TransactionStatus.SUCCESS);
        transactionRepo.save(tx);

        // Double entry entry
        ledgerService.recordDoubleEntry(tx.getId(), "SYSTEM", primaryAcc.getAccountNumber(), loan.getAmount());

        // Notify user
        notificationService.createNotification(
            mobileNumber,
            "Loan Approved & Disbursed",
            "Your " + loan.getLoanType() + " loan of ₹" + loan.getAmount() + " has been approved and disbursed to account " + primaryAcc.getAccountNumber() + "."
        );
    }
}
