package com.bank_application.backend.controller;

import com.bank_application.backend.entity.KycStatus;
import com.bank_application.backend.entity.User;
import com.bank_application.backend.repository.UserRepo;
import com.bank_application.backend.services.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.bank_application.backend.entity.BankAccount;
import com.bank_application.backend.entity.AccountStatus;
import com.bank_application.backend.repository.BankAccountRepo;
import com.bank_application.backend.entity.LinkedAccount;
import com.bank_application.backend.repository.LinkedAccountRepo;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/employee")
public class EmployeeController {

    @Autowired
    private UserRepo userRepo;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private BankAccountRepo bankAccountRepo;

    @Autowired
    private LinkedAccountRepo linkedAccountRepo;

    @GetMapping("/accounts/pending")
    public ResponseEntity<List<BankAccount>> getPendingAccounts() {
        List<BankAccount> pending = bankAccountRepo.findAll().stream()
                .filter(acc -> acc.getAccountStatus() == AccountStatus.PENDING)
                .toList();
        return ResponseEntity.ok(pending);
    }

    @PostMapping("/accounts/{id}/review")
    @Transactional
    public ResponseEntity<?> reviewAccount(@PathVariable Long id, @RequestParam String status) {
        try {
            BankAccount account = bankAccountRepo.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Bank account not found"));

            if (account.getAccountStatus() != AccountStatus.PENDING) {
                return ResponseEntity.badRequest().body(Map.of("message", "Account is already reviewed."));
            }

            AccountStatus targetStatus = AccountStatus.valueOf(status);
            account.setAccountStatus(targetStatus);

            if (targetStatus == AccountStatus.ACTIVE) {
                account.setActive(true);
                account.setFrozenReason(null);

                // Auto-link to the customer's linked-accounts list
                boolean exists = linkedAccountRepo.existsByMobileNumberAndBankAccountId(account.getMobileNumber(), account.getId());
                if (!exists) {
                    LinkedAccount linked = new LinkedAccount();
                    linked.setMobileNumber(account.getMobileNumber());
                    linked.setBankAccount(account);
                    linked.setPrimary(false);
                    linkedAccountRepo.save(linked);
                }

                // If user doesn't have a primary account set yet, make this primary
                List<LinkedAccount> links = linkedAccountRepo.findByMobileNumber(account.getMobileNumber());
                boolean hasPrimary = links.stream().anyMatch(LinkedAccount::isPrimary);
                if (!hasPrimary && !links.isEmpty()) {
                    LinkedAccount linkToMakePrimary = links.get(0);
                    linkToMakePrimary.setPrimary(true);
                    linkedAccountRepo.save(linkToMakePrimary);
                    
                    account.setPrimaryAccount(true);
                    bankAccountRepo.save(account);
                }

                // Notify customer
                notificationService.createNotification(
                    account.getMobileNumber(),
                    "Bank Account Approved",
                    "Your " + account.getAccountType() + " account application has been approved! A/c: " + account.getAccountNumber() + ", IFSC: " + account.getIfscCode()
                );
            } else if (targetStatus == AccountStatus.CLOSED) {
                account.setActive(false);
                account.setFrozenReason("Application rejected by employee.");
                
                // Notify customer
                notificationService.createNotification(
                    account.getMobileNumber(),
                    "Bank Account Rejected",
                    "Your " + account.getAccountType() + " account application has been rejected by compliance review."
                );
            }

            BankAccount saved = bankAccountRepo.save(account);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/kyc/pending")
    public ResponseEntity<List<User>> getPendingKyc() {
        List<User> users = userRepo.findAll().stream()
                .filter(u -> u.getKycStatus() == KycStatus.PENDING)
                .toList();
        return ResponseEntity.ok(users);
    }

    @PostMapping("/kyc/{userId}/review")
    public ResponseEntity<?> reviewKyc(@PathVariable Long userId, @RequestParam String status) {
        try {
            Optional<User> userOpt = userRepo.findById(userId);
            if (!userOpt.isPresent()) {
                Map<String, String> err = new HashMap<>();
                err.put("message", "User not found");
                return ResponseEntity.badRequest().body(err);
            }

            User user = userOpt.get();
            KycStatus kycStatus = KycStatus.valueOf(status);
            user.setKycStatus(kycStatus);
            userRepo.save(user);

            // Send notification
            notificationService.createNotification(
                user.getMobileNumber(),
                "KYC Review Update",
                "Your identity document verification status has been updated to: " + kycStatus + "."
            );

            return ResponseEntity.ok(user);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }
}
