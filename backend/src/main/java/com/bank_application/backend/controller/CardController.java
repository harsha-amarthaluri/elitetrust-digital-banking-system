package com.bank_application.backend.controller;

import com.bank_application.backend.entity.Card;
import com.bank_application.backend.services.CardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/cards")
public class CardController {

    @Autowired
    private CardService cardService;

    @PostMapping("/debit/generate")
    public ResponseEntity<?> generateDebitCard(@RequestParam Long accountId, @RequestParam String cardHolderName) {
        try {
            Card card = cardService.generateDebitCard(accountId, cardHolderName);
            return ResponseEntity.ok(card);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @PostMapping("/credit/generate")
    public ResponseEntity<?> generateCreditCard(@RequestParam String userId, @RequestParam String cardHolderName) {
        try {
            Card card = cardService.generateCreditCard(userId, cardHolderName);
            return ResponseEntity.ok(card);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Card>> getCardsByUser(@PathVariable String userId) {
        List<Card> cards = cardService.getCardsByUserIdentifier(userId);
        return ResponseEntity.ok(cards);
    }

    @PostMapping("/{id}/toggle-freeze")
    public ResponseEntity<?> toggleFreeze(@PathVariable Long id) {
        try {
            Card card = cardService.toggleFreeze(id);
            return ResponseEntity.ok(card);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @PostMapping("/{id}/limits")
    public ResponseEntity<?> updateLimits(@PathVariable Long id, @RequestParam double spendingLimit, @RequestParam double dailyLimit) {
        try {
            Card card = cardService.updateLimits(id, spendingLimit, dailyLimit);
            return ResponseEntity.ok(card);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @PostMapping("/{id}/pin")
    public ResponseEntity<?> updatePin(@PathVariable Long id, @RequestParam String pin) {
        try {
            Card card = cardService.updatePin(id, pin);
            return ResponseEntity.ok(card);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @PostMapping("/{id}/toggle-international")
    public ResponseEntity<?> toggleInternational(@PathVariable Long id) {
        try {
            Card card = cardService.toggleInternational(id);
            return ResponseEntity.ok(card);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }
}
