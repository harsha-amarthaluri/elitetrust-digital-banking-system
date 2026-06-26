package com.bank_application.backend.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.bank_application.backend.entity.BankAccount;
import com.bank_application.backend.entity.AccountStatus;
import com.bank_application.backend.entity.AccountType;
import com.bank_application.backend.entity.KycStatus;
import com.bank_application.backend.entity.User;
import com.bank_application.backend.repository.BankAccountRepo;
import com.bank_application.backend.repository.UserRepo;
import java.security.SecureRandom;

@Service
public class BankAccountService {

    @Autowired
    private BankAccountRepo bankAccountRepo;

    @Autowired
    private UserRepo userRepo;

    private final SecureRandom secureRandom = new SecureRandom();

    public BankAccount applyBankAccount(String mobileNumber, AccountType type, String nomineeName,
                                        String nomineeRelationship, Integer nomineeAge,
                                        String jointHolderName, String jointHolderMobile) {
        User user = userRepo.getByMobileNumber(mobileNumber);
        if (user == null) {
            throw new IllegalArgumentException("User not found with mobile: " + mobileNumber);
        }
        if (user.getKycStatus() != KycStatus.APPROVED) {
            throw new IllegalStateException("KYC verification is required before opening a bank account.");
        }

        // Generate unique 12-digit account number
        String accountNumber;
        do {
            StringBuilder sb = new StringBuilder(12);
            for (int i = 0; i < 12; i++) {
                sb.append(secureRandom.nextInt(10));
            }
            accountNumber = sb.toString();
        } while (bankAccountRepo.findByAccountNumber(accountNumber).isPresent());

        BankAccount account = new BankAccount();
        account.setAccountNumber(accountNumber);
        account.setMobileNumber(mobileNumber);
        account.setBankName("EliteTrust Bank");
        account.setBalance(0.0);
        account.setPrimaryAccount(false);
        account.setAccountType(type);
        account.setNomineeName(nomineeName);
        account.setNomineeRelationship(nomineeRelationship);
        account.setNomineeAge(nomineeAge);
        account.setJointHolderName(jointHolderName);
        account.setJointHolderMobile(jointHolderMobile);
        account.setActive(false);
        account.setAccountStatus(AccountStatus.PENDING);
        account.setIfscCode("ELTR0001234");
        account.setCustomerId(user.getCustomerId());
        account.setFrozenReason("Awaiting employee approval");

        if (type == AccountType.SAVINGS) {
            account.setInterestRate(0.04);
        } else if (type == AccountType.CURRENT) {
            account.setInterestRate(0.0);
        }

        return bankAccountRepo.save(account);
    }

    // ✅ Add Bank Account
    public String addBankAccount(BankAccount bankAccount) {

        boolean exists = bankAccountRepo.existsByMobileNumberAndBankName(
                bankAccount.getMobileNumber(),
                bankAccount.getBankName()
        );

        if (exists) {
            throw new IllegalArgumentException("Bank already linked with this mobile number!");
        }

        bankAccountRepo.save(bankAccount);
        return "Bank account added successfully";
    }

    // ✅ Delete Bank Account
    public String deleteBankAccount(Long id) {

        if (!bankAccountRepo.existsById(id)) {
            throw new IllegalArgumentException("Bank account not found");
        }

        bankAccountRepo.deleteById(id);
        return "Bank account removed successfully";
    }

    // ✅ Update Bank Account Details
    public BankAccount updateBankAccountDetails(Long id, BankAccount updatedDetails) {
        BankAccount existing = bankAccountRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Bank account not found"));
        
        existing.setNomineeName(updatedDetails.getNomineeName());
        existing.setNomineeRelationship(updatedDetails.getNomineeRelationship());
        existing.setNomineeAge(updatedDetails.getNomineeAge());
        existing.setJointHolderName(updatedDetails.getJointHolderName());
        existing.setJointHolderMobile(updatedDetails.getJointHolderMobile());
        
        if (updatedDetails.getTransactionLimit() > 0) {
            existing.setTransactionLimit(updatedDetails.getTransactionLimit());
        }
        if (updatedDetails.getDailyLimit() > 0) {
            existing.setDailyLimit(updatedDetails.getDailyLimit());
        }
        if (updatedDetails.getAccountType() != null) {
            existing.setAccountType(updatedDetails.getAccountType());
        }
        
        return bankAccountRepo.save(existing);
    }
}