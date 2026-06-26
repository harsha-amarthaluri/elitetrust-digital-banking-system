package com.bank_application.backend.controller;

import com.bank_application.backend.entity.FixedDeposit;
import com.bank_application.backend.services.FixedDepositService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/fixed-deposits")
@PreAuthorize("isAuthenticated()")
public class FixedDepositController {

    @Autowired
    private FixedDepositService fixedDepositService;

    @PostMapping("/create")
    public ResponseEntity<?> createFD(@RequestBody Map<String, Object> request) {
        try {
            String mobileNumber = (String) request.get("mobileNumber");
            String linkedAccountNumber = (String) request.get("linkedAccountNumber");
            double amount = ((Number) request.get("amount")).doubleValue();
            int tenureMonths = ((Number) request.get("tenureMonths")).intValue();

            FixedDeposit fd = fixedDepositService.createFD(mobileNumber, linkedAccountNumber, amount, tenureMonths);
            return ResponseEntity.ok(fd);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/user/{mobileNumber}")
    public ResponseEntity<?> getFDs(@PathVariable String mobileNumber) {
        try {
            List<FixedDeposit> fds = fixedDepositService.getFdsByMobile(mobileNumber);
            return ResponseEntity.ok(fds);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{id}/withdraw")
    public ResponseEntity<?> withdrawFD(@PathVariable Long id) {
        try {
            FixedDeposit fd = fixedDepositService.breakFD(id);
            return ResponseEntity.ok(fd);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
