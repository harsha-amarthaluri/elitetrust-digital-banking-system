package com.bank_application.backend.controller;

import com.bank_application.backend.entity.AuditLog;
import com.bank_application.backend.entity.FraudAlert;
import com.bank_application.backend.entity.Role;
import com.bank_application.backend.entity.User;
import com.bank_application.backend.entity.BankAccount;
import com.bank_application.backend.repository.AuditLogRepo;
import com.bank_application.backend.repository.BankAccountRepo;
import com.bank_application.backend.repository.FraudAlertRepo;
import com.bank_application.backend.repository.UserRepo;
import com.bank_application.backend.services.LedgerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/admin")
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
public class AdminController {

    @Autowired private UserRepo userRepo;
    @Autowired private AuditLogRepo auditLogRepo;
    @Autowired private LedgerService ledgerService;
    @Autowired private BankAccountRepo bankAccountRepo;
    @Autowired private FraudAlertRepo fraudAlertRepo;

    @Autowired
    private org.springframework.cache.CacheManager cacheManager;

    @Autowired
    private com.bank_application.backend.services.InterestService interestService;

    // ── Customer Management ──────────────────────────────────────────────

    @GetMapping("/users")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userRepo.findAll());
    }

    @PostMapping("/users/{userId}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateUserRole(@PathVariable Long userId, @RequestParam String role) {
        try {
            Optional<User> userOpt = userRepo.findById(userId);
            if (!userOpt.isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("message", "User not found"));
            }
            User user = userOpt.get();
            user.setRole(Role.valueOf(role));
            userRepo.save(user);
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ── Account Management ───────────────────────────────────────────────

    @GetMapping("/accounts")
    public ResponseEntity<?> getAllAccounts() {
        return ResponseEntity.ok(bankAccountRepo.findAll());
    }

    @PostMapping("/accounts/{accountNumber}/freeze")
    public ResponseEntity<?> freezeAccount(@PathVariable String accountNumber, @RequestBody Map<String, String> body) {
        try {
            BankAccount account = bankAccountRepo.findByAccountNumber(accountNumber)
                    .orElseThrow(() -> new RuntimeException("Account not found: " + accountNumber));
            account.setActive(false);
            account.setFrozenReason(body.getOrDefault("reason", "Frozen by administrator"));
            bankAccountRepo.save(account);
            return ResponseEntity.ok(Map.of("message", "Account " + accountNumber + " frozen successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/accounts/{accountNumber}/unfreeze")
    public ResponseEntity<?> unfreezeAccount(@PathVariable String accountNumber) {
        try {
            BankAccount account = bankAccountRepo.findByAccountNumber(accountNumber)
                    .orElseThrow(() -> new RuntimeException("Account not found: " + accountNumber));
            account.setActive(true);
            account.setFrozenReason(null);
            bankAccountRepo.save(account);
            return ResponseEntity.ok(Map.of("message", "Account " + accountNumber + " unfrozen successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/accounts/{accountNumber}/close")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> closeAccount(@PathVariable String accountNumber, @RequestBody Map<String, String> body) {
        try {
            BankAccount account = bankAccountRepo.findByAccountNumber(accountNumber)
                    .orElseThrow(() -> new RuntimeException("Account not found: " + accountNumber));
            if (account.getBalance() > 0) {
                return ResponseEntity.badRequest().body(Map.of("message",
                        "Cannot close account with balance ₹" + account.getBalance() + ". Please transfer remaining balance first."));
            }
            account.setActive(false);
            account.setFrozenReason("CLOSED: " + body.getOrDefault("reason", "Closed by administrator"));
            bankAccountRepo.save(account);
            return ResponseEntity.ok(Map.of("message", "Account " + accountNumber + " closed permanently"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ── Fraud Alert Management ───────────────────────────────────────────

    @GetMapping("/fraud-alerts")
    public ResponseEntity<?> getFraudAlerts(@RequestParam(defaultValue = "PENDING_REVIEW") String status) {
        try {
            List<FraudAlert> alerts;
            if ("ALL".equalsIgnoreCase(status)) {
                alerts = fraudAlertRepo.findAll();
            } else {
                alerts = fraudAlertRepo.findByStatus(status);
            }
            // Sort by timestamp descending (newest first)
            alerts.sort((a, b) -> b.getTimestamp().compareTo(a.getTimestamp()));
            return ResponseEntity.ok(alerts);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/fraud-alerts/{id}/resolve")
    public ResponseEntity<?> resolveFraudAlert(@PathVariable Long id, @RequestBody Map<String, String> body) {
        try {
            FraudAlert alert = fraudAlertRepo.findById(id)
                    .orElseThrow(() -> new RuntimeException("Fraud alert not found: " + id));
            String newStatus = body.getOrDefault("status", "RESOLVED");
            alert.setStatus(newStatus);
            alert.setResolvedBy(body.get("resolvedBy"));
            alert.setResolvedAt(LocalDateTime.now());
            alert.setResolutionNotes(body.get("notes"));
            fraudAlertRepo.save(alert);
            return ResponseEntity.ok(Map.of("message", "Alert " + id + " marked as " + newStatus));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/fraud-alerts/stats")
    public ResponseEntity<?> getFraudAlertStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("total", fraudAlertRepo.count());
        stats.put("pending", fraudAlertRepo.findByStatus("PENDING_REVIEW").size());
        stats.put("resolved", fraudAlertRepo.findByStatus("RESOLVED").size());
        stats.put("dismissed", fraudAlertRepo.findByStatus("DISMISSED").size());
        return ResponseEntity.ok(stats);
    }

    // ── Audit & Reporting ────────────────────────────────────────────────

    @GetMapping("/audit-logs")
    public ResponseEntity<List<AuditLog>> getAuditLogs() {
        return ResponseEntity.ok(auditLogRepo.findAll());
    }

    @GetMapping("/reconcile")
    public ResponseEntity<?> reconcileLedger() {
        Map<String, Object> report = ledgerService.reconcileLedger();
        return ResponseEntity.ok(report);
    }

    @PostMapping("/accrual-interest")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> runInterestAccrual() {
        int processedCount = interestService.processInterest(true);
        return ResponseEntity.ok(Map.of(
            "message", "Interest calculated and applied successfully",
            "processedAccounts", processedCount
        ));
    }

    @GetMapping("/cache-stats")
    public ResponseEntity<?> getCacheStats() {
        Map<String, Object> stats = new HashMap<>();
        if (cacheManager != null) {
            stats.put("provider", cacheManager.getClass().getName());
            stats.put("caches", cacheManager.getCacheNames());
        } else {
            stats.put("status", "No CacheManager configured");
        }
        return ResponseEntity.ok(stats);
    }

    // ── KYC Overview ─────────────────────────────────────────────────────

    @GetMapping("/kyc-summary")
    public ResponseEntity<?> getKycSummary() {
        List<User> all = userRepo.findAll();
        Map<String, Object> summary = new HashMap<>();
        summary.put("total", all.size());
        summary.put("pending", all.stream().filter(u -> "PENDING".equals(u.getKycStatus() != null ? u.getKycStatus().name() : "PENDING")).count());
        summary.put("submitted", all.stream().filter(u -> u.getKycStatus() != null && "SUBMITTED".equals(u.getKycStatus().name())).count());
        summary.put("approved", all.stream().filter(u -> u.getKycStatus() != null && "APPROVED".equals(u.getKycStatus().name())).count());
        summary.put("rejected", all.stream().filter(u -> u.getKycStatus() != null && "REJECTED".equals(u.getKycStatus().name())).count());
        return ResponseEntity.ok(summary);
    }
}
