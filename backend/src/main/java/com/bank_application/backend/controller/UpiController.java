package com.bank_application.backend.controller;

import com.bank_application.backend.entity.Transaction;
import com.bank_application.backend.entity.UpiMapping;
import com.bank_application.backend.services.UpiService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/upi")
public class UpiController {

    @Autowired
    private UpiService upiService;

    @PostMapping("/register")
    public ResponseEntity<?> registerUpi(@RequestParam String accountNumber, @RequestParam String upiId) {
        try {
            UpiMapping mapping = upiService.registerUpiId(accountNumber, upiId);
            return ResponseEntity.ok(mapping);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @GetMapping("/mapping/{accountNumber}")
    public ResponseEntity<?> getMapping(@PathVariable String accountNumber) {
        Optional<UpiMapping> mapping = upiService.getMappingByAccountNumber(accountNumber);
        if (mapping.isPresent()) {
            return ResponseEntity.ok(mapping.get());
        }
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/pay")
    public ResponseEntity<?> payViaUpi(@RequestParam String fromAccountNumber, @RequestParam String recipientUpiId, @RequestParam double amount) {
        try {
            Transaction tx = upiService.payViaUpi(fromAccountNumber, recipientUpiId, amount);
            return ResponseEntity.ok(tx);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @PostMapping("/qr/generate-dynamic")
    public ResponseEntity<?> generateDynamicQr(@RequestParam String upiId, @RequestParam double amount) {
        try {
            String qrString = upiService.generateDynamicQrCode(upiId, amount);
            Map<String, String> response = new HashMap<>();
            response.put("qrPayload", qrString);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @PostMapping("/qr/pay")
    public ResponseEntity<?> payViaQr(@RequestParam String fromAccountNumber, @RequestParam String qrPayload) {
        try {
            // Parse: upi://pay?pa=recipient@elitetrust&pn=PayeeName&am=12.34
            if (!qrPayload.startsWith("upi://pay?")) {
                throw new IllegalArgumentException("Invalid QR payload format");
            }
            
            String query = qrPayload.substring(qrPayload.indexOf("?") + 1);
            String[] params = query.split("&");
            
            String pa = null;
            double am = 0.0;
            
            for (String param : params) {
                String[] pair = param.split("=");
                if (pair.length == 2) {
                    if (pair[0].equals("pa")) {
                        pa = pair[1];
                    } else if (pair[0].equals("am")) {
                        am = Double.parseDouble(pair[1]);
                    }
                }
            }

            if (pa == null || am <= 0.0) {
                throw new IllegalArgumentException("Invalid UPI details in QR");
            }

            Transaction tx = upiService.payViaUpi(fromAccountNumber, pa, am);
            return ResponseEntity.ok(tx);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }
}
