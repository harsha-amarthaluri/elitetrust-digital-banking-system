package com.bank_application.backend.services;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    public void sendEmail(String to, String subject, String body) {
        if (mailSender != null && fromEmail != null && !fromEmail.trim().isEmpty()) {
            try {
                MimeMessage mimeMessage = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
                helper.setFrom(fromEmail);
                helper.setTo(to);
                helper.setSubject(subject);
                // Send as HTML with nice formatting
                String htmlBody = buildHtmlEmail(subject, body);
                helper.setText(htmlBody, true);
                mailSender.send(mimeMessage);
                logger.info("✅ Real email sent successfully to {}", to);
                return;
            } catch (Exception e) {
                logger.error("❌ Failed to send email via SMTP to {}: {}. Falling back to simulation.", to, e.getMessage());
            }
        }

        // Fallback: simulate email in console
        logger.info("📧 [SIMULATED EMAIL] To: {}, Subject: {}, Body: {}", to, subject, body.replace("\n", " "));
        System.out.println("=================================================");
        System.out.println("📧 SIMULATED EMAIL (SMTP not configured)");
        System.out.println("To: " + to);
        System.out.println("Subject: " + subject);
        System.out.println("Body:\n" + body);
        System.out.println("=================================================");
    }

    private String buildHtmlEmail(String subject, String plainText) {
        // Extract OTP from body if present (6-digit number)
        String otpBlock = "";
        java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("\\b(\\d{6})\\b").matcher(plainText);
        if (matcher.find()) {
            String otp = matcher.group(1);
            otpBlock = "<div style='text-align:center;margin:30px 0;'>" +
                "<div style='display:inline-block;background:linear-gradient(135deg,#4f46e5,#818cf8);" +
                "color:#fff;font-size:36px;font-weight:700;letter-spacing:10px;padding:18px 36px;" +
                "border-radius:12px;font-family:monospace;'>" + otp + "</div></div>";
        }

        return "<!DOCTYPE html><html><head><meta charset='UTF-8'></head><body style='" +
            "margin:0;padding:0;background:#0a0f1e;font-family:Inter,Arial,sans-serif;'>" +
            "<div style='max-width:520px;margin:0 auto;background:#0e1526;" +
            "border-radius:16px;overflow:hidden;border:1px solid rgba(79,70,229,0.3);'>" +
            // Header
            "<div style='background:linear-gradient(135deg,#4f46e5,#312e81);padding:32px;text-align:center;'>" +
            "<h1 style='margin:0;color:#fff;font-size:24px;font-weight:700;letter-spacing:1px;'>🏦 EliteTrust Bank</h1>" +
            "<p style='margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px;'>Secure Digital Banking</p>" +
            "</div>" +
            // Body
            "<div style='padding:32px;'>" +
            "<h2 style='color:#e2e8f0;font-size:18px;margin:0 0 16px;'>" + subject + "</h2>" +
            "<p style='color:#94a3b8;line-height:1.7;font-size:14px;white-space:pre-line;'>" + plainText.replaceAll("\\b\\d{6}\\b", "").trim() + "</p>" +
            otpBlock +
            "<p style='color:#64748b;font-size:12px;margin-top:24px;'>This is a system-generated email from EliteTrust Bank. Do not reply to this email.</p>" +
            "</div>" +
            // Footer
            "<div style='background:#060c1a;padding:16px;text-align:center;border-top:1px solid rgba(79,70,229,0.2);'>" +
            "<p style='margin:0;color:#475569;font-size:11px;'>© 2024 EliteTrust Bank. All rights reserved.</p>" +
            "</div>" +
            "</div></body></html>";
    }
}
