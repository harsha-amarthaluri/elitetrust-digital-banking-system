package com.bank_application.backend.repository;

import com.bank_application.backend.entity.DeviceSession;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface DeviceSessionRepo extends JpaRepository<DeviceSession, Long> {
    List<DeviceSession> findByUserMobile(String userMobile);
    Optional<DeviceSession> findByUserMobileAndDeviceFingerprint(String userMobile, String deviceFingerprint);
}
