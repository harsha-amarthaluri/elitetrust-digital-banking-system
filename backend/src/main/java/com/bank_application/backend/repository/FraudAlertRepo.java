package com.bank_application.backend.repository;

import com.bank_application.backend.entity.FraudAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FraudAlertRepo extends JpaRepository<FraudAlert, Long> {
    List<FraudAlert> findByStatus(String status);
    List<FraudAlert> findByUserMobile(String userMobile);
}
