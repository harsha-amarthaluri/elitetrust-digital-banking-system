package com.bank_application.backend.controller;

import com.bank_application.backend.entity.Loan;
import com.bank_application.backend.entity.LoanStatus;
import com.bank_application.backend.entity.LoanType;
import com.bank_application.backend.services.LoanService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/loans")
public class LoanController {

    @Autowired
    private LoanService loanService;

    @PostMapping("/calculate-emi")
    public ResponseEntity<?> calculateEmi(@RequestBody Map<String, Object> payload) {
        try {
            double amount = Double.parseDouble(payload.get("amount").toString());
            String typeStr = (String) payload.get("loanType");
            int tenure = Integer.parseInt(payload.get("tenureMonths").toString());

            LoanType type = LoanType.valueOf(typeStr);
            double rate = loanService.getAnnualInterestRate(type);
            double emi = loanService.calculateEmi(amount, rate, tenure);

            Map<String, Object> response = new HashMap<>();
            response.put("emi", emi);
            response.put("interestRate", rate);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @PostMapping("/check-eligibility")
    public ResponseEntity<?> checkEligibility(@RequestBody Map<String, Object> payload) {
        try {
            double monthlySalary = Double.parseDouble(payload.get("monthlySalary").toString());
            String pan = (String) payload.get("panCardNumber");

            int cibil = loanService.generateMockCibilScore(pan);
            boolean eligible = loanService.isEligible(monthlySalary, cibil);

            Map<String, Object> response = new HashMap<>();
            response.put("cibilScore", cibil);
            response.put("eligible", eligible);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @PostMapping("/apply")
    public ResponseEntity<?> applyForLoan(@RequestBody Map<String, Object> payload) {
        try {
            Long userId = Long.parseLong(payload.get("userId").toString());
            String typeStr = (String) payload.get("loanType");
            double amount = Double.parseDouble(payload.get("amount").toString());
            int tenure = Integer.parseInt(payload.get("tenureMonths").toString());
            double salary = Double.parseDouble(payload.get("monthlySalary").toString());
            String pan = (String) payload.get("panCardNumber");

            LoanType type = LoanType.valueOf(typeStr);
            Loan loan = loanService.applyForLoan(userId, type, amount, tenure, salary, pan);
            
            return ResponseEntity.ok(loan);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Loan>> getLoansByUser(@PathVariable Long userId) {
        List<Loan> loans = loanService.getLoansByUserId(userId);
        return ResponseEntity.ok(loans);
    }

    @GetMapping("/pending")
    public ResponseEntity<List<Loan>> getPendingLoans() {
        List<Loan> pending = loanService.getPendingLoans();
        return ResponseEntity.ok(pending);
    }

    @PostMapping("/{id}/review")
    public ResponseEntity<?> reviewLoan(@PathVariable Long id, @RequestParam String status) {
        try {
            LoanStatus reviewStatus = LoanStatus.valueOf(status);
            Loan loan = loanService.reviewLoan(id, reviewStatus);
            return ResponseEntity.ok(loan);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }
}
