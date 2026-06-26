package com.bank_application.backend.repository;

import com.bank_application.backend.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NotificationRepo extends JpaRepository<Notification, Long> {
    List<Notification> findByUserMobileOrderByTimestampDesc(String userMobile);
    long countByUserMobileAndReadFalse(String userMobile);
}
