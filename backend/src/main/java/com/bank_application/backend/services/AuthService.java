package com.bank_application.backend.services;

import com.bank_application.backend.entity.AuditLog;
import com.bank_application.backend.entity.KycStatus;
import com.bank_application.backend.entity.Role;
import com.bank_application.backend.entity.User;
import com.bank_application.backend.entity.DeviceSession;
import com.bank_application.backend.repository.AuditLogRepo;
import com.bank_application.backend.repository.UserRepo;
import com.bank_application.backend.repository.DeviceSessionRepo;
import com.bank_application.backend.utils.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.concurrent.TimeUnit;

@Service
public class AuthService {

    private static final org.slf4j.Logger auditLogger = org.slf4j.LoggerFactory.getLogger("com.bank_application.backend.audit");

    @Autowired
    private UserRepo userRepo;

    @Autowired
    private DeviceSessionRepo deviceSessionRepo;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private StringRedisTemplate redisTemplate;

    @Autowired
    private EmailService emailService;

    @Autowired
    private SmsService smsService;

    @Autowired
    private AuditLogRepo auditLogRepo;

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final long LOCKOUT_DURATION_SEC = 30; // 30 seconds lock for demo purposes

    private volatile boolean redisOffline = false;
    private volatile long lastRedisRetryTime = 0;
    private static final long RETRY_INTERVAL_MS = 60000;

    public Map<String, Object> register(User user) {
        if (userRepo.getByMobileNumber(user.getMobileNumber()) != null) {
            throw new IllegalArgumentException("Mobile number is already registered");
        }
        if (userRepo.getByEmail(user.getEmail()) != null) {
            throw new IllegalArgumentException("Email address is already registered");
        }
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setRole(Role.ROLE_CUSTOMER);
        user.setKycStatus(KycStatus.PENDING);
        user.setEmailVerified(false);

        User savedUser = userRepo.save(user);
        boolean needsUpdate = false;

        // Auto-generate customerId if not already set
        if (savedUser.getCustomerId() == null || savedUser.getCustomerId().trim().isEmpty()) {
            savedUser.setCustomerId(String.format("CIF%08d", savedUser.getUser_Id()));
            needsUpdate = true;
        }

        // Auto-run risk assessment if enough data is provided
        if (savedUser.getOccupation() != null && !savedUser.getOccupation().trim().isEmpty()
                && savedUser.getAnnualIncome() != null && !savedUser.getAnnualIncome().trim().isEmpty()
                && savedUser.getDateOfBirth() != null && !savedUser.getDateOfBirth().trim().isEmpty()) {
            savedUser.setRiskScore(calculateRiskScore(savedUser));
            savedUser.setRiskAssessedAt(LocalDateTime.now());
            needsUpdate = true;
        }

        if (needsUpdate) {
            savedUser = userRepo.save(savedUser);
        }

        String otp = generateOtp();
        cacheSet("otp:signup:" + savedUser.getMobileNumber(), otp, 10, TimeUnit.MINUTES);

        emailService.sendEmail(
                savedUser.getEmail() != null ? savedUser.getEmail() : "customer@elitetrust.com",
                "EliteTrust Bank - Signup Verification OTP",
                "Dear " + savedUser.getName() + ",\n\nYour One-Time Password (OTP) for verifying your mobile/email is: " + otp + "\n\nThis OTP is valid for 10 minutes."
        );

        smsService.sendSms(
                savedUser.getMobileNumber(),
                "Dear " + savedUser.getName() + ", your EliteTrust Bank Signup Verification OTP is: " + otp + ". Valid for 10 minutes."
        );

        // Audit log
        logAudit("USER_REGISTER", savedUser.getMobileNumber(), "User registered successfully, signup OTP sent");

        Map<String, Object> response = new HashMap<>();
        response.put("user", savedUser);
        response.put("otp", otp);
        response.put("customerId", savedUser.getCustomerId());
        response.put("riskScore", savedUser.getRiskScore());
        return response;
    }

    public void verifySignup(String mobileNumber, String otp) {
        String savedOtp = cacheGet("otp:signup:" + mobileNumber);
        if (savedOtp == null || !savedOtp.equals(otp)) {
            logAudit("SIGNUP_VERIFICATION_FAILED", mobileNumber, "Invalid signup OTP provided");
            throw new IllegalArgumentException("Invalid or expired OTP");
        }

        cacheDelete("otp:signup:" + mobileNumber);

        User user = userRepo.getByMobileNumber(mobileNumber);
        if (user != null) {
            user.setEmailVerified(true);
            userRepo.save(user);
            logAudit("SIGNUP_VERIFICATION_SUCCESS", mobileNumber, "Account verified successfully");
        }
    }

    public Map<String, Object> login(String mobileNumber, String password, String ipAddress) {
        User user = userRepo.getByMobileNumber(mobileNumber);
        if (user == null) {
            throw new IllegalArgumentException("Invalid mobile number or password");
        }

        if (!user.isEmailVerified()) {
            throw new IllegalArgumentException("Your account is not verified yet. Please verify using the OTP sent during registration.");
        }

        // Lockout Check
        if (user.isAccountLocked()) {
            if (user.getLockTime().plusSeconds(LOCKOUT_DURATION_SEC).isBefore(LocalDateTime.now())) {
                user.setAccountLocked(false);
                user.setFailedLoginAttempts(0);
                userRepo.save(user);
                logAudit("ACCOUNT_UNLOCK", mobileNumber, "Account unlocked automatically after timeout");
            } else {
                long secondsLeft = LOCKOUT_DURATION_SEC - java.time.Duration.between(user.getLockTime(), LocalDateTime.now()).getSeconds();
                throw new IllegalStateException("Account is locked. Try again in " + secondsLeft + " seconds.");
            }
        }

        // Password Verification
        if (!passwordEncoder.matches(password, user.getPassword())) {
            int attempts = user.getFailedLoginAttempts() + 1;
            user.setFailedLoginAttempts(attempts);

            if (attempts >= MAX_FAILED_ATTEMPTS) {
                user.setAccountLocked(true);
                user.setLockTime(LocalDateTime.now());
                logAudit("ACCOUNT_LOCK", mobileNumber, "Account locked due to too many failed login attempts");
                userRepo.save(user);
                throw new IllegalStateException("Account is locked due to too many failed attempts. Try again in 30 seconds.");
            }

            userRepo.save(user);
            logAudit("LOGIN_FAILED", mobileNumber, "Failed login attempt: " + attempts);
            throw new IllegalArgumentException("Invalid mobile number or password");
        }

        // Successful Password Verification
        user.setFailedLoginAttempts(0);
        userRepo.save(user);

        Map<String, Object> response = new HashMap<>();

        // Generate and send MFA OTP
        String otp = generateOtp();
        cacheSet("otp:login:" + mobileNumber, otp, 5, TimeUnit.MINUTES);

        emailService.sendEmail(
                user.getEmail() != null ? user.getEmail() : "customer@elitetrust.com",
                "EliteTrust Bank - Login OTP Verification",
                "Dear " + user.getName() + ",\n\nYour One-Time Password (OTP) for logging in is: " + otp + "\n\nThis OTP is valid for 5 minutes. Do not share it with anyone."
        );

        smsService.sendSms(
                user.getMobileNumber(),
                "Dear " + user.getName() + ", your EliteTrust Bank Login OTP is: " + otp + ". Valid for 5 minutes. Do not share this with anyone."
        );

        logAudit("LOGIN_OTP_TRIGGERED", mobileNumber, "MFA OTP triggered and sent to registered channel");

        response.put("mfaRequired", true);
        response.put("mobileNumber", mobileNumber);
        response.put("otp", otp); // Return OTP for verification
        return response;
    }

    public Map<String, Object> verifyOtp(String mobileNumber, String otp, String ipAddress, String deviceFingerprint, String deviceName) {
        String savedOtp = cacheGet("otp:login:" + mobileNumber);
        if (savedOtp == null || !savedOtp.equals(otp)) {
            logAudit("MFA_FAILED", mobileNumber, "Invalid OTP provided");
            throw new IllegalArgumentException("Invalid or expired OTP");
        }

        // OTP verified, clear it
        cacheDelete("otp:login:" + mobileNumber);

        User user = userRepo.getByMobileNumber(mobileNumber);

        // Track Device Session
        if (deviceFingerprint != null && !deviceFingerprint.trim().isEmpty()) {
            Optional<DeviceSession> existingSession = deviceSessionRepo.findByUserMobileAndDeviceFingerprint(mobileNumber, deviceFingerprint);
            DeviceSession session;
            if (existingSession.isPresent()) {
                session = existingSession.get();
                session.setLastActive(LocalDateTime.now());
                session.setIpAddress(ipAddress);
            } else {
                session = new DeviceSession();
                session.setUserMobile(mobileNumber);
                session.setDeviceFingerprint(deviceFingerprint);
                session.setDeviceName(deviceName != null && !deviceName.trim().isEmpty() ? deviceName : "Unknown Device");
                session.setIpAddress(ipAddress);
                session.setLastActive(LocalDateTime.now());
                session.setTrusted(false);
            }
            deviceSessionRepo.save(session);
        }

        // Generate Access & Refresh Tokens
        String accessToken = jwtUtils.generateAccessToken(mobileNumber);
        String refreshToken = jwtUtils.generateRefreshToken(mobileNumber);

        logAudit("LOGIN_SUCCESS", mobileNumber, "Successful user login via MFA");

        Map<String, Object> result = new HashMap<>();
        result.put("accessToken", accessToken);
        result.put("refreshToken", refreshToken);
        result.put("user", user);
        return result;
    }

    public String forgotPassword(String mobileNumber) {
        User user = userRepo.getByMobileNumber(mobileNumber);
        if (user == null) {
            throw new IllegalArgumentException("No user found with mobile number: " + mobileNumber);
        }

        String otp = generateOtp();
        cacheSet("otp:reset:" + mobileNumber, otp, 5, TimeUnit.MINUTES);

        emailService.sendEmail(
                user.getEmail() != null ? user.getEmail() : "customer@elitetrust.com",
                "EliteTrust Bank - Password Reset OTP",
                "Dear " + user.getName() + ",\n\nYou have requested a password reset. Your OTP is: " + otp + "\n\nUse this to reset your password. Valid for 5 minutes."
        );

        smsService.sendSms(
                user.getMobileNumber(),
                "Dear " + user.getName() + ", your EliteTrust Bank password reset OTP is: " + otp + ". Valid for 5 minutes."
        );

        logAudit("FORGOT_PASSWORD_TRIGGERED", mobileNumber, "Password reset OTP sent");
        return otp;
    }

    public void resetPassword(String mobileNumber, String otp, String newPassword) {
        String savedOtp = cacheGet("otp:reset:" + mobileNumber);
        if (savedOtp == null || !savedOtp.equals(otp)) {
            logAudit("RESET_PASSWORD_FAILED", mobileNumber, "Invalid reset OTP provided");
            throw new IllegalArgumentException("Invalid or expired OTP");
        }

        cacheDelete("otp:reset:" + mobileNumber);

        User user = userRepo.getByMobileNumber(mobileNumber);
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setAccountLocked(false);
        user.setFailedLoginAttempts(0);
        userRepo.save(user);

        logAudit("RESET_PASSWORD_SUCCESS", mobileNumber, "Password reset successful");
    }

    public Map<String, String> refreshToken(String refreshToken) {
        if (jwtUtils.validateJwtToken(refreshToken)) {
            String username = jwtUtils.getUsernameFromJwtToken(refreshToken);
            String newAccessToken = jwtUtils.generateAccessToken(username);
            
            Map<String, String> tokens = new HashMap<>();
            tokens.put("accessToken", newAccessToken);
            tokens.put("refreshToken", refreshToken);
            return tokens;
        }
        throw new IllegalArgumentException("Invalid refresh token");
    }

    public String resendOtp(String mobileNumber) {
        User user = userRepo.getByMobileNumber(mobileNumber);
        if (user == null) {
            throw new IllegalArgumentException("No user found with mobile number: " + mobileNumber);
        }
        if (user.isEmailVerified()) {
            throw new IllegalArgumentException("Account is already verified");
        }
        String otp = generateOtp();
        cacheSet("otp:signup:" + mobileNumber, otp, 10, TimeUnit.MINUTES);

        emailService.sendEmail(
                user.getEmail() != null ? user.getEmail() : "customer@elitetrust.com",
                "EliteTrust Bank - Signup Verification OTP",
                "Dear " + user.getName() + ",\n\nYour new One-Time Password (OTP) for verifying your mobile/email is: " + otp + "\n\nThis OTP is valid for 10 minutes."
        );

        smsService.sendSms(
                user.getMobileNumber(),
                "Dear " + user.getName() + ", your new EliteTrust Bank Signup Verification OTP is: " + otp + ". Valid for 10 minutes."
        );

        logAudit("SIGNUP_OTP_RESENT", mobileNumber, "Signup OTP resent successfully");
        return otp;
    }

    private String generateOtp() {
        java.security.SecureRandom random = new java.security.SecureRandom();
        int otp = 100000 + random.nextInt(900000);
        return String.valueOf(otp);
    }

    private void logAudit(String action, String mobile, String details) {
        AuditLog log = new AuditLog();
        log.setAction(action);
        log.setUserMobile(mobile);
        log.setDetails(details);
        log.setIpAddress("SYSTEM");
        auditLogRepo.save(log);
        
        auditLogger.info("Action: {}, User: {}, Details: {}", action, mobile, details);
    }

    // In-memory fallback fields & helper methods for resilient operation without Redis
    private final java.util.Map<String, String> inMemoryStore = new java.util.concurrent.ConcurrentHashMap<>();
    private final java.util.Map<String, Long> inMemoryExpiry = new java.util.concurrent.ConcurrentHashMap<>();

    private void cacheSet(String key, String value, long timeout, TimeUnit unit) {
        boolean useRedis = !redisOffline || (System.currentTimeMillis() - lastRedisRetryTime > RETRY_INTERVAL_MS);
        if (useRedis && redisTemplate != null) {
            try {
                redisTemplate.opsForValue().set(key, value, timeout, unit);
                if (redisOffline) {
                    redisOffline = false;
                }
                return;
            } catch (Exception e) {
                redisOffline = true;
                lastRedisRetryTime = System.currentTimeMillis();
                System.err.println("Redis connection error on SET. Tripping circuit breaker, falling back to in-memory: " + e.getMessage());
            }
        }
        inMemoryStore.put(key, value);
        inMemoryExpiry.put(key, System.currentTimeMillis() + unit.toMillis(timeout));
    }

    private String cacheGet(String key) {
        boolean useRedis = !redisOffline || (System.currentTimeMillis() - lastRedisRetryTime > RETRY_INTERVAL_MS);
        if (useRedis && redisTemplate != null) {
            try {
                String val = redisTemplate.opsForValue().get(key);
                if (redisOffline) {
                    redisOffline = false;
                }
                return val;
            } catch (Exception e) {
                redisOffline = true;
                lastRedisRetryTime = System.currentTimeMillis();
                System.err.println("Redis connection error on GET. Tripping circuit breaker, falling back to in-memory: " + e.getMessage());
            }
        }
        Long expiry = inMemoryExpiry.get(key);
        if (expiry == null || expiry < System.currentTimeMillis()) {
            inMemoryStore.remove(key);
            inMemoryExpiry.remove(key);
            return null;
        }
        return inMemoryStore.get(key);
    }

    private void cacheDelete(String key) {
        boolean useRedis = !redisOffline || (System.currentTimeMillis() - lastRedisRetryTime > RETRY_INTERVAL_MS);
        if (useRedis && redisTemplate != null) {
            try {
                redisTemplate.delete(key);
                if (redisOffline) {
                    redisOffline = false;
                }
                return;
            } catch (Exception e) {
                redisOffline = true;
                lastRedisRetryTime = System.currentTimeMillis();
                System.err.println("Redis connection error on DELETE. Tripping circuit breaker, falling back to in-memory: " + e.getMessage());
            }
        }
        inMemoryStore.remove(key);
        inMemoryExpiry.remove(key);
    }

    public User updateProfile(Map<String, String> payload) {
        String mobileNumber = payload.get("mobileNumber");
        if (mobileNumber == null || mobileNumber.trim().isEmpty()) {
            throw new IllegalArgumentException("Mobile number is required");
        }
        User user = userRepo.getByMobileNumber(mobileNumber);
        if (user == null) {
            throw new IllegalArgumentException("User not found");
        }

        if (payload.containsKey("dateOfBirth") && payload.get("dateOfBirth") != null) user.setDateOfBirth(payload.get("dateOfBirth"));
        if (payload.containsKey("gender") && payload.get("gender") != null) user.setGender(payload.get("gender"));
        if (payload.containsKey("address") && payload.get("address") != null) user.setAddress(payload.get("address"));
        if (payload.containsKey("city") && payload.get("city") != null) user.setCity(payload.get("city"));
        if (payload.containsKey("state") && payload.get("state") != null) user.setState(payload.get("state"));
        if (payload.containsKey("pincode") && payload.get("pincode") != null) user.setPincode(payload.get("pincode"));
        if (payload.containsKey("occupation") && payload.get("occupation") != null) user.setOccupation(payload.get("occupation"));
        if (payload.containsKey("annualIncome") && payload.get("annualIncome") != null) user.setAnnualIncome(payload.get("annualIncome"));
        if (payload.containsKey("nomineeName") && payload.get("nomineeName") != null) user.setNomineeName(payload.get("nomineeName"));
        if (payload.containsKey("nomineeRelationship") && payload.get("nomineeRelationship") != null) user.setNomineeRelationship(payload.get("nomineeRelationship"));
        if (payload.containsKey("nomineeDateOfBirth") && payload.get("nomineeDateOfBirth") != null) user.setNomineeDateOfBirth(payload.get("nomineeDateOfBirth"));

        // Recalculate risk score if enough data is provided
        if (user.getOccupation() != null && !user.getOccupation().trim().isEmpty()
                && user.getAnnualIncome() != null && !user.getAnnualIncome().trim().isEmpty()
                && user.getDateOfBirth() != null && !user.getDateOfBirth().trim().isEmpty()) {
            user.setRiskScore(calculateRiskScore(user));
            user.setRiskAssessedAt(LocalDateTime.now());
        }

        return userRepo.save(user);
    }

    public String calculateRiskScore(User user) {
        int ageFactor = 2; // Default to MEDIUM if no DOB
        if (user.getDateOfBirth() != null && !user.getDateOfBirth().trim().isEmpty()) {
            try {
                java.time.LocalDate dob = java.time.LocalDate.parse(user.getDateOfBirth().trim());
                int age = java.time.Period.between(dob, java.time.LocalDate.now()).getYears();
                if (age < 21 || age > 70) {
                    ageFactor = 3; // HIGH
                } else {
                    ageFactor = 1; // LOW
                }
            } catch (Exception e) {
                ageFactor = 2; // Default to MEDIUM on parse failure
            }
        }

        int incomeFactor = 2; // Default to MEDIUM if no income info
        String income = user.getAnnualIncome();
        if (income != null && !income.trim().isEmpty()) {
            income = income.trim().toUpperCase();
            if (income.equals("BELOW_1L")) {
                incomeFactor = 3; // HIGH
            } else if (income.equals("1L_5L")) {
                incomeFactor = 2; // MEDIUM
            } else if (income.equals("5L_10L") || income.equals("10L_25L") || income.equals("25L_50L") || income.equals("ABOVE_50L")) {
                incomeFactor = 1; // LOW
            } else {
                try {
                    double value = Double.parseDouble(income);
                    if (value > 500000) {
                        incomeFactor = 1;
                    } else if (value >= 200000) {
                        incomeFactor = 2;
                    } else {
                        incomeFactor = 3;
                    }
                } catch (NumberFormatException nfe) {
                    incomeFactor = 2; // default
                }
            }
        }

        int empFactor = 3; // Default to HIGH if no occupation info
        String occ = user.getOccupation();
        if (occ != null && !occ.trim().isEmpty()) {
            occ = occ.trim().toUpperCase();
            if (occ.equals("SALARIED") || occ.equals("BUSINESS")) {
                empFactor = 1; // LOW
            } else if (occ.equals("SELF_EMPLOYED")) {
                empFactor = 2; // MEDIUM
            } else { // STUDENT, RETIRED, OTHER
                empFactor = 3; // HIGH
            }
        }

        double avg = (ageFactor + incomeFactor + empFactor) / 3.0;
        if (avg >= 2.5) {
            return "HIGH";
        } else if (avg >= 1.5) {
            return "MEDIUM";
        } else {
            return "LOW";
        }
    }
}
