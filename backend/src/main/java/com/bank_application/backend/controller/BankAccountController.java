package com.bank_application.backend.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.bank_application.backend.entity.BankAccount;
import com.bank_application.backend.services.BankAccountService;
import com.bank_application.backend.repository.BankAccountRepo;

@RestController
@RequestMapping("/bank")
public class BankAccountController {

    @Autowired
    private BankAccountService bankAccountService;

    @Autowired
    private BankAccountRepo bankAccountRepo;

    // Apply for a Bank Account — authenticated users only
    @PostMapping("/apply")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> applyBankAccount(@RequestBody BankAccount request) {
        try {
            BankAccount account = bankAccountService.applyBankAccount(
                    request.getMobileNumber(),
                    request.getAccountType(),
                    request.getNomineeName(),
                    request.getNomineeRelationship(),
                    request.getNomineeAge(),
                    request.getJointHolderName(),
                    request.getJointHolderMobile()
            );
            return ResponseEntity.ok(account);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", e.getMessage()));
        }
    }

    // Get all active bank accounts by mobile — authenticated users only
    @GetMapping("/{mobileNumber}")
    @PreAuthorize("isAuthenticated()")
    public List<BankAccount> getAccounts(@PathVariable String mobileNumber) {
        return bankAccountRepo.findByMobileNumber(mobileNumber).stream()
                .filter(acc -> acc.getAccountStatus() == com.bank_application.backend.entity.AccountStatus.ACTIVE)
                .collect(java.util.stream.Collectors.toList());
    }

    // Get all pending bank account applications by mobile — authenticated users only
    @GetMapping("/{mobileNumber}/applications")
    @PreAuthorize("isAuthenticated()")
    public List<BankAccount> getApplications(@PathVariable String mobileNumber) {
        return bankAccountRepo.findByMobileNumber(mobileNumber).stream()
                .filter(acc -> acc.getAccountStatus() == com.bank_application.backend.entity.AccountStatus.PENDING)
                .collect(java.util.stream.Collectors.toList());
    }

    // Delete bank account — authenticated users only
    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public String deleteAccount(@PathVariable Long id) {
        bankAccountService.deleteBankAccount(id);
        return "Bank account removed successfully";
    }

    // Update bank account details (nominee, limits, type)
    @PutMapping("/{id}/details")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> updateAccountDetails(@PathVariable Long id, @RequestBody BankAccount details) {
        try {
            BankAccount updated = bankAccountService.updateBankAccountDetails(id, details);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", e.getMessage()));
        }
    }
}