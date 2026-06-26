package com.bank_application.backend.repository;

import com.bank_application.backend.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AuditLogRepo extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findByUserMobileOrderByTimestampDesc(String userMobile);
}
