package com.bank_application.backend.services;

import com.bank_application.backend.entity.AuditLog;
import com.bank_application.backend.entity.KycStatus;
import com.bank_application.backend.entity.Role;
import com.bank_application.backend.entity.User;
import com.bank_application.backend.repository.AuditLogRepo;
import com.bank_application.backend.repository.DeviceSessionRepo;
import com.bank_application.backend.repository.UserRepo;
import com.bank_application.backend.utils.JwtUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AuthServiceTest {

    @Mock
    private UserRepo userRepo;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtUtils jwtUtils;

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @Mock
    private EmailService emailService;

    @Mock
    private SmsService smsService;

    @Mock
    private AuditLogRepo auditLogRepo;

    @Mock
    private DeviceSessionRepo deviceSessionRepo;

    @InjectMocks
    private AuthService authService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setUser_Id(1L);
        testUser.setMobileNumber("9876543210");
        testUser.setName("John Doe");
        testUser.setEmail("john@example.com");
        testUser.setPassword("encodedPassword");
        testUser.setRole(Role.ROLE_CUSTOMER);
        testUser.setKycStatus(KycStatus.PENDING);
        testUser.setEmailVerified(true);
        testUser.setFailedLoginAttempts(0);
        testUser.setAccountLocked(false);
    }

    @Test
    void registerUserSuccess() {
        when(userRepo.getByMobileNumber(anyString())).thenReturn(null);
        when(passwordEncoder.encode(anyString())).thenReturn("encodedPassword");
        when(userRepo.save(any(User.class))).thenReturn(testUser);

        User toRegister = new User();
        toRegister.setMobileNumber("9876543210");
        toRegister.setPassword("rawPassword");

        Map<String, Object> response = authService.register(toRegister);
        assertNotNull(response);
        User registered = (User) response.get("user");
        assertNotNull(registered);
        assertEquals("9876543210", registered.getMobileNumber());
        assertNotNull(response.get("otp"));
        verify(userRepo, atLeastOnce()).save(any(User.class));
    }

    @Test
    void registerUserAlreadyExists() {
        when(userRepo.getByMobileNumber("9876543210")).thenReturn(testUser);
        
        User toRegister = new User();
        toRegister.setMobileNumber("9876543210");

        assertThrows(IllegalArgumentException.class, () -> authService.register(toRegister));
    }

    @Test
    void loginSuccessTriggersMfa() {
        when(userRepo.getByMobileNumber("9876543210")).thenReturn(testUser);
        when(passwordEncoder.matches("rawPassword", "encodedPassword")).thenReturn(true);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        Map<String, Object> result = authService.login("9876543210", "rawPassword", "127.0.0.1");

        assertTrue((Boolean) result.get("mfaRequired"));
        assertEquals("9876543210", result.get("mobileNumber"));
        verify(valueOperations).set(eq("otp:login:9876543210"), anyString(), eq(5L), eq(TimeUnit.MINUTES));
        verify(emailService).sendEmail(eq("john@example.com"), anyString(), anyString());
    }

    @Test
    void loginFailsLockoutIncrement() {
        when(userRepo.getByMobileNumber("9876543210")).thenReturn(testUser);
        when(passwordEncoder.matches("wrongPassword", "encodedPassword")).thenReturn(false);

        assertThrows(IllegalArgumentException.class, () -> authService.login("9876543210", "wrongPassword", "127.0.0.1"));
        assertEquals(1, testUser.getFailedLoginAttempts());
        verify(userRepo).save(testUser);
    }

    @Test
    void loginLockoutAfterMaxAttempts() {
        testUser.setFailedLoginAttempts(4);
        when(userRepo.getByMobileNumber("9876543210")).thenReturn(testUser);
        when(passwordEncoder.matches("wrongPassword", "encodedPassword")).thenReturn(false);

        assertThrows(IllegalStateException.class, () -> authService.login("9876543210", "wrongPassword", "127.0.0.1"));
        assertTrue(testUser.isAccountLocked());
        assertNotNull(testUser.getLockTime());
        verify(userRepo).save(testUser);
    }

    @Test
    void verifyOtpSuccess() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get("otp:login:9876543210")).thenReturn("123456");
        when(userRepo.getByMobileNumber("9876543210")).thenReturn(testUser);
        when(jwtUtils.generateAccessToken("9876543210")).thenReturn("access_token");
        when(jwtUtils.generateRefreshToken("9876543210")).thenReturn("refresh_token");

        Map<String, Object> result = authService.verifyOtp("9876543210", "123456", "127.0.0.1", "fingerprint", "Chrome Desktop");

        assertEquals("access_token", result.get("accessToken"));
        assertEquals("refresh_token", result.get("refreshToken"));
        verify(redisTemplate).delete("otp:login:9876543210");
        verify(deviceSessionRepo).save(any());
    }

    @Test
    void loginFailsIfUnverified() {
        testUser.setEmailVerified(false);
        when(userRepo.getByMobileNumber("9876543210")).thenReturn(testUser);

        assertThrows(IllegalArgumentException.class, () -> authService.login("9876543210", "rawPassword", "127.0.0.1"));
    }
}
