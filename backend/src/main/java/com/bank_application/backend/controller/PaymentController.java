package com.bank_application.backend.controller;

import com.bank_application.backend.entity.BankAccount;
import com.bank_application.backend.entity.RecurrenceInterval;
import com.bank_application.backend.entity.ScheduledTransaction;
import com.bank_application.backend.repository.BankAccountRepo;
import com.bank_application.backend.repository.ScheduledTransactionRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/payments")
public class PaymentController {

    @Autowired
    private ScheduledTransactionRepo scheduledTransactionRepo;

    @Autowired
    private BankAccountRepo bankAccountRepo;

    @PostMapping("/scheduled")
    public ResponseEntity<?> createScheduledPayment(@RequestBody Map<String, Object> payload) {
        try {
            String fromAccountNum = (String) payload.get("fromAccountNumber");
            String toAccountNum = (String) payload.get("toAccountNumber");
            double amount = Double.parseDouble(payload.get("amount").toString());
            String category = (String) payload.get("category");
            String description = (String) payload.get("description");
            String frequencyStr = (String) payload.get("frequency");
            String nextExecutionStr = (String) payload.get("nextExecutionDate"); // ISO format: yyyy-MM-ddTHH:mm:ss

            Optional<BankAccount> fromAccOpt = bankAccountRepo.findByAccountNumber(fromAccountNum);
            if (!fromAccOpt.isPresent()) {
                Map<String, String> err = new HashMap<>();
                err.put("message", "Source account not found");
                return ResponseEntity.badRequest().body(err);
            }

            ScheduledTransaction scheduledTx = new ScheduledTransaction();
            scheduledTx.setFromAccountNumber(fromAccountNum);
            scheduledTx.setToAccountNumber(toAccountNum);
            scheduledTx.setAmount(amount);
            scheduledTx.setCategory(category != null ? category : "SCHEDULED_PAYMENT");
            scheduledTx.setDescription(description != null ? description : "Scheduled Transfer");
            scheduledTx.setFrequency(RecurrenceInterval.valueOf(frequencyStr));
            
            LocalDateTime nextExec = nextExecutionStr != null ? LocalDateTime.parse(nextExecutionStr) : LocalDateTime.now().plusMinutes(5);
            scheduledTx.setNextExecutionDate(nextExec);
            scheduledTx.setActive(true);

            scheduledTransactionRepo.save(scheduledTx);
            return ResponseEntity.ok(scheduledTx);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @GetMapping("/scheduled/{mobileNumber}")
    public ResponseEntity<List<ScheduledTransaction>> getScheduledPayments(@PathVariable String mobileNumber) {
        // Find all accounts associated with this mobile number, then find their scheduled transfers
        List<BankAccount> accounts = bankAccountRepo.findAllByMobileNumber(mobileNumber);
        
        // Find scheduled payments where source account is any of the user's accounts
        // We'll simplify by fetching all, then filtering (suitable for standard volumes)
        List<ScheduledTransaction> allTasks = scheduledTransactionRepo.findAll();
        List<ScheduledTransaction> userTasks = allTasks.stream()
                .filter(t -> accounts.stream().anyMatch(a -> a.getAccountNumber().equals(t.getFromAccountNumber()) || a.getAccountNumber().equals(t.getToAccountNumber())))
                .toList();

        return ResponseEntity.ok(userTasks);
    }

    @DeleteMapping("/scheduled/{id}")
    public ResponseEntity<?> cancelScheduledPayment(@PathVariable Long id) {
        Optional<ScheduledTransaction> taskOpt = scheduledTransactionRepo.findById(id);
        if (!taskOpt.isPresent()) {
            Map<String, String> err = new HashMap<>();
            err.put("message", "Scheduled payment not found");
            return ResponseEntity.badRequest().body(err);
        }
        
        ScheduledTransaction task = taskOpt.get();
        task.setActive(false);
        scheduledTransactionRepo.save(task);

        Map<String, String> res = new HashMap<>();
        res.put("message", "Scheduled payment cancelled successfully");
        return ResponseEntity.ok(res);
    }
}
