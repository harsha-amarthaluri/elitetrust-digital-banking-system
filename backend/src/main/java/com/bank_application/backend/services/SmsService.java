package com.bank_application.backend.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class SmsService {

    private static final Logger logger = LoggerFactory.getLogger(SmsService.class);

    @Value("${app.twilio.account-sid:}")
    private String accountSid;

    @Value("${app.twilio.auth-token:}")
    private String authToken;

    @Value("${app.twilio.from-number:}")
    private String fromNumber;

    private boolean isConfigured = false;

    @PostConstruct
    public void init() {
        if (accountSid != null && !accountSid.trim().isEmpty() &&
            authToken != null && !authToken.trim().isEmpty() &&
            fromNumber != null && !fromNumber.trim().isEmpty()) {
            try {
                Twilio.init(accountSid, authToken);
                isConfigured = true;
                logger.info("Twilio SMS Service initialized successfully.");
            } catch (Exception e) {
                logger.error("Failed to initialize Twilio SDK: {}", e.getMessage());
            }
        } else {
            logger.info("Twilio credentials not configured. SmsService running in simulation mode.");
        }
    }

    public void sendSms(String toMobileNumber, String messageText) {
        String formattedTo = toMobileNumber;
        if (toMobileNumber != null && toMobileNumber.length() == 10 && !toMobileNumber.startsWith("+")) {
            formattedTo = "+91" + toMobileNumber;
        }

        if (isConfigured) {
            try {
                String formattedFrom = fromNumber;
                if (fromNumber != null && fromNumber.length() == 10 && !fromNumber.startsWith("+")) {
                    formattedFrom = "+91" + fromNumber;
                }
                Message message = Message.creator(
                        new PhoneNumber(formattedTo),
                        new PhoneNumber(formattedFrom),
                        messageText
                ).create();
                logger.info("Real SMS sent successfully via Twilio. SID: {}", message.getSid());
                return;
            } catch (Exception e) {
                logger.error("Failed to send real SMS via Twilio: {}. Falling back to simulation.", e.getMessage());
            }
        }

        logger.info("📱 [SIMULATED SMS] To: {}, Body: {}", formattedTo, messageText);
        System.out.println("=================================================");
        System.out.println("📱 SIMULATED SMS SENT");
        System.out.println("To: " + formattedTo);
        System.out.println("Body: " + messageText);
        System.out.println("=================================================");
    }
}
