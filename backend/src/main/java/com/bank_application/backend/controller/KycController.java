package com.bank_application.backend.controller;

import com.bank_application.backend.entity.User;
import com.bank_application.backend.services.KycService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/kyc")
public class KycController {

    @Autowired
    private KycService kycService;

    @PostMapping("/submit")
    public ResponseEntity<?> submitKyc(@RequestBody Map<String, String> request) {
        String mobileNumber = request.get("mobileNumber");
        String pan = request.get("pan");
        String aadhaar = request.get("aadhaar");

        try {
            User user = kycService.submitKyc(mobileNumber, pan, aadhaar);
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadKycDocument(@RequestParam("mobileNumber") String mobileNumber,
                                               @RequestParam("file") MultipartFile file) {
        try {
            String path = kycService.storeKycDocument(mobileNumber, file);
            return ResponseEntity.ok(Map.of("documentUrl", path));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    public ResponseEntity<List<User>> getPendingKycApprovals() {
        return ResponseEntity.ok(kycService.getPendingKycApprovals());
    }

    @PostMapping("/approve/{mobileNumber}")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> approveKyc(@PathVariable String mobileNumber) {
        try {
            User user = kycService.approveKyc(mobileNumber);
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/reject/{mobileNumber}")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> rejectKyc(@PathVariable String mobileNumber, @RequestBody Map<String, String> request) {
        String remarks = request.getOrDefault("remarks", "Rejected by administrator");
        try {
            User user = kycService.rejectKyc(mobileNumber, remarks);
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
