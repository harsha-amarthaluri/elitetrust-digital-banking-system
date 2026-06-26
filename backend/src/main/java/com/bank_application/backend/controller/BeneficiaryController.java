package com.bank_application.backend.controller;

import com.bank_application.backend.entity.Beneficiary;
import com.bank_application.backend.services.BeneficiaryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/beneficiaries")
public class BeneficiaryController {

    @Autowired
    private BeneficiaryService beneficiaryService;

    @PostMapping
    public ResponseEntity<?> addBeneficiary(@RequestBody Beneficiary beneficiary) {
        try {
            Beneficiary created = beneficiaryService.addBeneficiary(beneficiary);
            return ResponseEntity.ok(created);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/{mobileNumber}")
    public ResponseEntity<List<Beneficiary>> getBeneficiaries(@PathVariable String mobileNumber) {
        return ResponseEntity.ok(beneficiaryService.getBeneficiaries(mobileNumber));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteBeneficiary(@PathVariable Long id) {
        try {
            beneficiaryService.removeBeneficiary(id);
            return ResponseEntity.ok(Map.of("message", "Beneficiary removed successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
