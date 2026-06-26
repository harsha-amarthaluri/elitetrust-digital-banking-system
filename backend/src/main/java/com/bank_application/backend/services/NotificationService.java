package com.bank_application.backend.services;

import com.bank_application.backend.entity.Notification;
import com.bank_application.backend.repository.NotificationRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class NotificationService {

    @Autowired
    private NotificationRepo notificationRepo;

    @Autowired(required = false)
    private org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    public List<Notification> getNotifications(String mobileNumber) {
        return notificationRepo.findByUserMobileOrderByTimestampDesc(mobileNumber);
    }

    public long getUnreadCount(String mobileNumber) {
        return notificationRepo.countByUserMobileAndReadFalse(mobileNumber);
    }

    public Notification markAsRead(Long id) {
        Notification notification = notificationRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found"));
        notification.setRead(true);
        return notificationRepo.save(notification);
    }

    public Notification createNotification(String mobileNumber, String title, String message) {
        Notification notification = new Notification();
        notification.setUserMobile(mobileNumber);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setTimestamp(java.time.LocalDateTime.now());
        notification.setRead(false);
        
        Notification saved = notificationRepo.save(notification);

        if (messagingTemplate != null) {
            try {
                messagingTemplate.convertAndSend("/topic/notifications/" + mobileNumber, saved);
            } catch (Exception e) {
                System.err.println("WebSocket notify error: " + e.getMessage());
            }
        }
        return saved;
    }
}
