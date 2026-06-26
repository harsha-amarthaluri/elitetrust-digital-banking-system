package com.bank_application.backend.services;

import com.bank_application.backend.entity.DeviceSession;
import com.bank_application.backend.repository.DeviceSessionRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class DeviceService {

    @Autowired
    private DeviceSessionRepo deviceSessionRepo;

    public List<DeviceSession> getDevicesForUser(String mobileNumber) {
        return deviceSessionRepo.findByUserMobile(mobileNumber);
    }

    public DeviceSession toggleTrustDevice(Long id) {
        DeviceSession session = deviceSessionRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Device session not found"));
        session.setTrusted(!session.isTrusted());
        return deviceSessionRepo.save(session);
    }

    public void revokeDeviceSession(Long id) {
        if (!deviceSessionRepo.existsById(id)) {
            throw new IllegalArgumentException("Device session not found");
        }
        deviceSessionRepo.deleteById(id);
    }
}
