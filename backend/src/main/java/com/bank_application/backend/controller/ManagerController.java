package com.bank_application.backend.controller;

import com.bank_application.backend.entity.AuditLog;
import com.bank_application.backend.entity.Transaction;
import com.bank_application.backend.entity.TransactionStatus;
import com.bank_application.backend.repository.AuditLogRepo;
import com.bank_application.backend.repository.TransactionRepo;
import com.bank_application.backend.services.TransactionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/manager")
public class ManagerController {

    @Autowired
    private TransactionService transactionService;

    @Autowired
    private TransactionRepo transactionRepo;

    @Autowired
    private AuditLogRepo auditLogRepo;

    @Autowired
    private com.bank_application.backend.repository.FraudAlertRepo fraudAlertRepo;

    @GetMapping("/transactions/pending")
    public ResponseEntity<List<Transaction>> getPendingTransactions() {
        List<Transaction> pending = transactionRepo.findByStatus(TransactionStatus.PENDING_APPROVAL);
        return ResponseEntity.ok(pending);
    }

    @PostMapping("/transactions/{id}/approve")
    public ResponseEntity<?> approveTransaction(@PathVariable Long id) {
        try {
            Transaction tx = transactionService.approveTransaction(id);
            return ResponseEntity.ok(tx);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @PostMapping("/transactions/{id}/reject")
    public ResponseEntity<?> rejectTransaction(@PathVariable Long id) {
        try {
            Transaction tx = transactionService.rejectTransaction(id);
            return ResponseEntity.ok(tx);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @GetMapping("/compliance/logs")
    public ResponseEntity<List<AuditLog>> getComplianceLogs() {
        List<AuditLog> logs = auditLogRepo.findAll();
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/fraud-alerts")
    public ResponseEntity<List<com.bank_application.backend.entity.FraudAlert>> getFraudAlerts() {
        return ResponseEntity.ok(fraudAlertRepo.findAll());
    }

    @PostMapping("/fraud-alerts/{id}/resolve")
    public ResponseEntity<?> resolveFraudAlert(@PathVariable Long id, @RequestParam String action) {
        com.bank_application.backend.entity.FraudAlert alert = fraudAlertRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Fraud Alert not found"));
        alert.setStatus(action);
        fraudAlertRepo.save(alert);

        AuditLog log = new AuditLog();
        log.setAction("FRAUD_ALERT_RESOLVE");
        log.setUserMobile(alert.getUserMobile());
        log.setDetails("Fraud alert ID " + id + " resolved as: " + action);
        log.setIpAddress("SYSTEM");
        auditLogRepo.save(log);

        return ResponseEntity.ok(alert);
    }
}
