package com.bank_application.backend.controller;

import com.bank_application.backend.entity.DeviceSession;
import com.bank_application.backend.services.DeviceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/devices")
public class DeviceController {

    @Autowired
    private DeviceService deviceService;

    @GetMapping("/{mobileNumber}")
    public ResponseEntity<List<DeviceSession>> getDevices(@PathVariable String mobileNumber) {
        return ResponseEntity.ok(deviceService.getDevicesForUser(mobileNumber));
    }

    @PostMapping("/{id}/trust")
    public ResponseEntity<?> toggleTrust(@PathVariable Long id) {
        try {
            DeviceSession updated = deviceService.toggleTrustDevice(id);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDevice(@PathVariable Long id) {
        try {
            deviceService.revokeDeviceSession(id);
            return ResponseEntity.ok(Map.of("message", "Device session revoked successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
