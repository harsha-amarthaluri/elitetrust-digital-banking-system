package com.bank_application.backend.controller;

import com.bank_application.backend.entity.BankAccount;
import com.bank_application.backend.entity.Transaction;
import com.bank_application.backend.entity.TransactionType;
import com.bank_application.backend.entity.TransactionStatus;
import com.bank_application.backend.entity.User;
import com.bank_application.backend.repository.BankAccountRepo;
import com.bank_application.backend.repository.TransactionRepo;
import com.bank_application.backend.repository.UserRepo;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/bill")
public class BillController {

    @Autowired
    private BankAccountRepo bankAccountRepo;

    @Autowired
    private TransactionRepo transactionRepo;

    @Autowired
    private UserRepo userRepo;

    @PostMapping("/fetch")
    public ResponseEntity<?> fetchBill(@RequestBody BillFetchRequest request) {
        BillFetchResponse response = new BillFetchResponse();
        response.setCustomerName("Simulation User");
        response.setAmount(Math.round((Math.random() * 2000 + 500) * 100.0) / 100.0);
        response.setDueDate(LocalDate.now().plusDays((long)(Math.random() * 30 + 1)));
        response.setStatus("PENDING");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/pay")
    public ResponseEntity<?> payBill(@RequestBody BillPayRequest request) {
        Optional<BankAccount> accOpt = bankAccountRepo.findById(request.getFromAccountId());
        if (!accOpt.isPresent()) {
            Map<String, String> err = new HashMap<>();
            err.put("message", "Account not found");
            return ResponseEntity.badRequest().body(err);
        }
        
        BankAccount account = accOpt.get();
        if (account.getBalance() < request.getAmount()) {
            Map<String, String> err = new HashMap<>();
            err.put("message", "Insufficient balance");
            return ResponseEntity.badRequest().body(err);
        }

        // Deduct balance
        account.setBalance(account.getBalance() - request.getAmount());
        bankAccountRepo.save(account);

        // Record Transaction
        Transaction tx = new Transaction();
        tx.setType(TransactionType.DEBIT);
        tx.setCategory("BILL_PAYMENT");
        tx.setDescription(request.getType() + " - " + request.getIdentifier());
        tx.setAmount(request.getAmount());
        tx.setFromAccountId(account.getId());
        tx.setFromNumber(account.getMobileNumber());
        tx.setToNumber("BILLER");
        tx.setTimestamp(LocalDateTime.now());
        tx.setStatus(TransactionStatus.SUCCESS);

        User user = userRepo.getByMobileNumber(account.getMobileNumber());
        if (user != null) {
            tx.setUser(user);
        }

        transactionRepo.save(tx);

        Map<String, Object> res = new HashMap<>();
        res.put("message", "Bill paid successfully");
        res.put("transactionId", tx.getId());
        
        return ResponseEntity.ok(res);
    }
}
