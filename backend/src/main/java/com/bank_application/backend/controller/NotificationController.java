package com.bank_application.backend.controller;

import com.bank_application.backend.entity.Notification;
import com.bank_application.backend.services.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/notifications")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @GetMapping("/{mobileNumber}")
    public ResponseEntity<List<Notification>> getNotifications(@PathVariable String mobileNumber) {
        return ResponseEntity.ok(notificationService.getNotifications(mobileNumber));
    }

    @GetMapping("/{mobileNumber}/unread-count")
    public ResponseEntity<?> getUnreadCount(@PathVariable String mobileNumber) {
        long count = notificationService.getUnreadCount(mobileNumber);
        return ResponseEntity.ok(Map.of("unreadCount", count));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long id) {
        try {
            Notification updated = notificationService.markAsRead(id);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
