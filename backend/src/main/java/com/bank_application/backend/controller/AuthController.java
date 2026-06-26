package com.bank_application.backend.controller;

import com.bank_application.backend.entity.User;
import com.bank_application.backend.services.AuthService;
import com.bank_application.backend.services.GoogleAuthService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @Autowired
    private GoogleAuthService googleAuthService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        try {
            Map<String, Object> response = authService.register(user);
            String otp = (String) response.get("otp");
            response.remove("otp");
            return ResponseEntity.ok()
                    .header("X-Simulated-OTP", otp)
                    .body(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/verify-signup")
    public ResponseEntity<?> verifySignup(@RequestBody Map<String, String> request) {
        String mobileNumber = request.get("mobileNumber");
        String otp = request.get("otp");
        try {
            authService.verifySignup(mobileNumber, otp);
            return ResponseEntity.ok(Map.of("message", "Account verified successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/resend-otp")
    public ResponseEntity<?> resendOtp(@RequestBody Map<String, String> request) {
        String mobileNumber = request.get("mobileNumber");
        try {
            String otp = authService.resendOtp(mobileNumber);
            return ResponseEntity.ok()
                    .header("X-Simulated-OTP", otp)
                    .body(Map.of("message", "OTP resent successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request, HttpServletRequest servletRequest) {
        String mobileNumber = request.get("mobileNumber");
        String password = request.get("password");
        String ipAddress = servletRequest.getRemoteAddr();

        try {
            Map<String, Object> response = authService.login(mobileNumber, password, ipAddress);
            String otp = (String) response.get("otp");
            response.remove("otp");
            return ResponseEntity.ok()
                    .header("X-Simulated-OTP", otp)
                    .body(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> request, HttpServletRequest servletRequest) {
        String mobileNumber = request.get("mobileNumber");
        String otp = request.get("otp");
        String deviceFingerprint = request.get("deviceFingerprint");
        String deviceName = request.get("deviceName");
        String ipAddress = servletRequest.getRemoteAddr();

        try {
            Map<String, Object> response = authService.verifyOtp(mobileNumber, otp, ipAddress, deviceFingerprint, deviceName);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> request) {
        String mobileNumber = request.get("mobileNumber");
        try {
            String otp = authService.forgotPassword(mobileNumber);
            return ResponseEntity.ok()
                    .header("X-Simulated-OTP", otp)
                    .body(Map.of("message", "OTP sent successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        String mobileNumber = request.get("mobileNumber");
        String otp = request.get("otp");
        String newPassword = request.get("newPassword");
        try {
            authService.resetPassword(mobileNumber, otp, newPassword);
            return ResponseEntity.ok(Map.of("message", "Password reset successful"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestBody Map<String, String> request) {
        String refreshToken = request.get("refreshToken");
        try {
            Map<String, String> tokens = authService.refreshToken(refreshToken);
            return ResponseEntity.ok(tokens);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/google")
    public ResponseEntity<?> googleLogin(@RequestBody Map<String, String> request) {
        String idToken = request.get("idToken"); // This is actually the access_token from implicit flow
        String email = request.get("email");
        String name = request.get("name");
        String googleId = request.get("googleId");
        String deviceFingerprint = request.get("deviceFingerprint");
        String deviceName = request.get("deviceName");

        if (idToken == null || idToken.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Google token is required"));
        }
        try {
            Map<String, Object> response = googleAuthService.loginOrRegister(
                    idToken, email, name, googleId, deviceFingerprint, deviceName);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, String> request) {
        try {
            User updatedUser = authService.updateProfile(request);
            return ResponseEntity.ok(updatedUser);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
