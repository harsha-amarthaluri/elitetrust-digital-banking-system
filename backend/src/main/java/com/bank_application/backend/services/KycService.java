package com.bank_application.backend.services;

import com.bank_application.backend.entity.AuditLog;
import com.bank_application.backend.entity.KycStatus;
import com.bank_application.backend.entity.User;
import com.bank_application.backend.repository.AuditLogRepo;
import com.bank_application.backend.repository.UserRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class KycService {

    @Autowired
    private UserRepo userRepo;

    @Autowired
    private AuditLogRepo auditLogRepo;

    @Autowired
    private AuthService authService;

    @Value("${app.upload.dir}")
    private String uploadDir;

    public User submitKyc(String mobileNumber, String pan, String aadhaar) {
        User user = userRepo.getByMobileNumber(mobileNumber);
        if (user == null) {
            throw new IllegalArgumentException("User not found");
        }

        user.setPanCardNumber(pan);
        user.setAadhaarNumber(aadhaar);
        user.setKycStatus(KycStatus.SUBMITTED);

        if (user.getRiskScore() == null || user.getRiskScore().trim().isEmpty()) {
            user.setRiskScore(authService.calculateRiskScore(user));
            user.setRiskAssessedAt(LocalDateTime.now());
        }
        
        User savedUser = userRepo.save(user);
        logAudit("KYC_SUBMIT", mobileNumber, "PAN: " + pan + ", Aadhaar: " + aadhaar);
        return savedUser;
    }

    public String storeKycDocument(String mobileNumber, MultipartFile file) throws IOException {
        User user = userRepo.getByMobileNumber(mobileNumber);
        if (user == null) {
            throw new IllegalArgumentException("User not found");
        }

        // Ensure directory exists
        Path pathDir = Paths.get(uploadDir);
        if (!Files.exists(pathDir)) {
            Files.createDirectories(pathDir);
        }

        // Clean filename
        String fileExtension = getFileExtension(file.getOriginalFilename());
        String uniqueFileName = mobileNumber + "_" + UUID.randomUUID().toString() + fileExtension;
        Path filePath = pathDir.resolve(uniqueFileName);

        Files.copy(file.getInputStream(), filePath);

        String relativePath = "/" + uploadDir + "/" + uniqueFileName;
        user.setKycDocumentUrl(relativePath);
        userRepo.save(user);

        logAudit("KYC_DOC_UPLOAD", mobileNumber, "Document path: " + relativePath);
        return relativePath;
    }

    public List<User> getPendingKycApprovals() {
        return userRepo.findAll().stream()
                .filter(u -> u.getKycStatus() == KycStatus.SUBMITTED)
                .collect(Collectors.toList());
    }

    public User approveKyc(String mobileNumber) {
        User user = userRepo.getByMobileNumber(mobileNumber);
        if (user == null) {
            throw new IllegalArgumentException("User not found");
        }

        user.setKycStatus(KycStatus.APPROVED);
        User savedUser = userRepo.save(user);
        logAudit("KYC_APPROVE", mobileNumber, "KYC approved successfully");
        return savedUser;
    }

    public User rejectKyc(String mobileNumber, String remarks) {
        User user = userRepo.getByMobileNumber(mobileNumber);
        if (user == null) {
            throw new IllegalArgumentException("User not found");
        }

        user.setKycStatus(KycStatus.REJECTED);
        User savedUser = userRepo.save(user);
        logAudit("KYC_REJECT", mobileNumber, "KYC rejected. Reason: " + remarks);
        return savedUser;
    }

    private String getFileExtension(String fileName) {
        if (fileName == null) return "";
        int lastDotIndex = fileName.lastIndexOf('.');
        return lastDotIndex == -1 ? "" : fileName.substring(lastDotIndex);
    }

    private void logAudit(String action, String mobile, String details) {
        AuditLog log = new AuditLog();
        log.setAction(action);
        log.setUserMobile(mobile);
        log.setDetails(details);
        log.setIpAddress("SYSTEM");
        auditLogRepo.save(log);
    }
}
