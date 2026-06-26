package com.bank_application.backend.controller;

import com.bank_application.backend.entity.Transaction;
import com.bank_application.backend.services.TransactionService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/transactions")
public class TransactionController {

    @Autowired
    private TransactionService transactionService;

    // Transfer API
    @PostMapping("/transfer")
    public org.springframework.http.ResponseEntity<?> transferMoney(@jakarta.validation.Valid @RequestBody TransferRequest request) {
        TransferResponse response = transactionService.processTransfer(request);
        return org.springframework.http.ResponseEntity.ok(response);
    }

    
    @GetMapping("/{mobileNumber}")
    public List<Transaction> getTransactionsByMobileAlias(@PathVariable String mobileNumber) {
        return transactionService.getTransactions(mobileNumber);
    }
    
    @GetMapping
    public List<Transaction> getAllTransactions(){
    	return transactionService.getAllTransactions();
    }
}