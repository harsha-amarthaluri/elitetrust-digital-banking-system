package com.bank_application.backend.controller;

import com.bank_application.backend.services.AIService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/ai")
public class SpendingAIController {

    @Autowired
    private AIService aiService;

    @GetMapping("/spending-analysis/{mobileNumber}")
    public ResponseEntity<Map<String, Object>> getSpendingAnalysis(@PathVariable String mobileNumber) {
        Map<String, Object> analysis = aiService.getSpendingAnalysis(mobileNumber);
        return ResponseEntity.ok(analysis);
    }

    @GetMapping("/anomaly-detection/{mobileNumber}")
    public ResponseEntity<List<Map<String, Object>>> getAnomalies(@PathVariable String mobileNumber) {
        List<Map<String, Object>> anomalies = aiService.getAnomalies(mobileNumber);
        return ResponseEntity.ok(anomalies);
    }

    @GetMapping("/coach/{mobileNumber}")
    public ResponseEntity<Map<String, String>> getCoachAdvice(@PathVariable String mobileNumber) {
        String advice = aiService.getAIAdvice(mobileNumber);
        Map<String, String> response = new HashMap<>();
        response.put("advice", advice);
        return ResponseEntity.ok(response);
    }
}
