package com.bank_application.backend.controller;

import java.util.List;
import java.util.stream.Collectors;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import com.bank_application.backend.entity.BankAccount;
import com.bank_application.backend.entity.LinkedAccount;
import com.bank_application.backend.repository.BankAccountRepo;
import com.bank_application.backend.repository.LinkedAccountRepo;

@RestController
public class LinkedAccountController {

    @Autowired
    private LinkedAccountRepo linkedAccountRepo;

    @Autowired
    private BankAccountRepo bankAccountRepo;

    @Transactional
    public void enforcePrimaryAccountRules(String mobileNumber) {
        List<LinkedAccount> accounts = linkedAccountRepo.findByMobileNumber(mobileNumber);
        
        if (accounts.isEmpty()) {
            return;
        }

        boolean hasPrimary = false;
        LinkedAccount activePrimary = null;

        for (LinkedAccount acc : accounts) {
            if (acc.isPrimary() && !hasPrimary) {
                hasPrimary = true;
                activePrimary = acc;
            } else if (acc.isPrimary() && hasPrimary) {
                acc.setPrimary(false); 
            }
        }

        if (accounts.size() == 1 || (!hasPrimary && !accounts.isEmpty())) {
            activePrimary = accounts.get(0);
            activePrimary.setPrimary(true);
        }

        linkedAccountRepo.saveAll(accounts);

        // Sync with BankAccount table to keep TransactionService happy
        List<BankAccount> bankAccounts = bankAccountRepo.findByMobileNumber(mobileNumber);
        for (BankAccount ba : bankAccounts) {
            boolean shouldBePrimary = (activePrimary != null && ba.getId().equals(activePrimary.getBankAccount().getId()));
            if (ba.isPrimaryAccount() != shouldBePrimary) {
                ba.setPrimaryAccount(shouldBePrimary);
                bankAccountRepo.save(ba);
            }
        }
    }

    @PostMapping("/link-account")
    @Transactional
    public String linkAccount(@RequestBody List<BankAccount> accounts) {
        String userMobile = null;
        for (BankAccount acc : accounts) {
            userMobile = acc.getMobileNumber();
            boolean exists = linkedAccountRepo.existsByMobileNumberAndBankAccountId(acc.getMobileNumber(), acc.getId());
            if (!exists) {
                BankAccount existingBank = bankAccountRepo.findById(acc.getId()).orElse(null);
                if (existingBank != null) {
                    LinkedAccount linked = new LinkedAccount();
                    linked.setMobileNumber(acc.getMobileNumber());
                    linked.setBankAccount(existingBank);
                    linked.setPrimary(false); // will be fixed by enforce
                    linkedAccountRepo.save(linked);
                }
            }
        }
        if (userMobile != null) {
            enforcePrimaryAccountRules(userMobile);
        }
        return "Accounts linked successfully";
    }

    @PostMapping("/unlink-account")
    @Transactional
    public String unlinkAccount(@RequestBody Map<String, Object> payload) {
        Number accIdNum = (Number) payload.get("accountId");
        if (accIdNum != null) {
            Long accountId = accIdNum.longValue();
            List<LinkedAccount> linksToDelete = linkedAccountRepo.findByBankAccountId(accountId);
            if (!linksToDelete.isEmpty()) {
                String mobile = linksToDelete.get(0).getMobileNumber();
                linkedAccountRepo.deleteAll(linksToDelete);
                enforcePrimaryAccountRules(mobile);
            }
        }
        return "Account unlinked successfully";
    }

    @GetMapping("/linked-accounts/{mobileNumber}")
    @Transactional
    public List<Map<String, Object>> getLinkedAccounts(@PathVariable String mobileNumber) {
        // Safety check before returning
        enforcePrimaryAccountRules(mobileNumber);

        List<LinkedAccount> links = linkedAccountRepo.findByMobileNumber(mobileNumber);

        return links.stream().map(link -> {
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", link.getBankAccount().getId());
            map.put("accountNumber", link.getBankAccount().getAccountNumber());
            map.put("mobileNumber", link.getBankAccount().getMobileNumber());
            map.put("bankName", link.getBankAccount().getBankName());
            map.put("balance", link.getBankAccount().getBalance());
            map.put("isPrimary", link.isPrimary());
            map.put("accountType", link.getBankAccount().getAccountType() != null ? link.getBankAccount().getAccountType().toString() : "SAVINGS");
            map.put("nomineeName", link.getBankAccount().getNomineeName());
            map.put("nomineeRelationship", link.getBankAccount().getNomineeRelationship());
            map.put("nomineeAge", link.getBankAccount().getNomineeAge());
            map.put("jointHolderName", link.getBankAccount().getJointHolderName());
            map.put("jointHolderMobile", link.getBankAccount().getJointHolderMobile());
            map.put("transactionLimit", link.getBankAccount().getTransactionLimit());
            map.put("dailyLimit", link.getBankAccount().getDailyLimit());
            map.put("active", link.getBankAccount().isActive());
            return map;
        }).collect(Collectors.toList());
    }

    @GetMapping("/primary-account/{mobileNumber}")
    public ResponseEntity<?> getPrimaryAccount(@PathVariable String mobileNumber) {
        List<LinkedAccount> links = linkedAccountRepo.findByMobileNumber(mobileNumber);
        if (links.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        LinkedAccount primary = links.stream().filter(LinkedAccount::isPrimary).findFirst().orElse(null);
        if (primary == null) {
            return ResponseEntity.noContent().build();
        }
        Map<String, Object> response = new java.util.HashMap<>();
        response.put("accountId", primary.getBankAccount().getId());
        response.put("bankName", primary.getBankAccount().getBankName());
        response.put("balance", primary.getBankAccount().getBalance());
        response.put("isPrimary", true);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/set-primary-account")
    @Transactional
    public String setPrimaryAccount(@RequestBody Map<String, Object> payload) {
        String mobileNumber = (String) payload.get("mobileNumber");
        Number accIdNum = (Number) payload.get("accountId");
        if (mobileNumber == null || accIdNum == null) return "Invalid payload";
        Long accountId = accIdNum.longValue();

        List<LinkedAccount> links = linkedAccountRepo.findByMobileNumber(mobileNumber);
        for (LinkedAccount link : links) {
            link.setPrimary(link.getBankAccount().getId().equals(accountId));
        }
        linkedAccountRepo.saveAll(links);
        
        enforcePrimaryAccountRules(mobileNumber);
        
        return "Primary account set successfully";
    }
}
