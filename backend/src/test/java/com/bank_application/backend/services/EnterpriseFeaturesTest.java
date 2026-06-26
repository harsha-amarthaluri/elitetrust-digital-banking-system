package com.bank_application.backend.services;

import com.bank_application.backend.entity.*;
import com.bank_application.backend.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class EnterpriseFeaturesTest {

    @Mock
    private BankAccountRepo bankAccountRepo;

    @Mock
    private TransactionRepo transactionRepo;

    @Mock
    private LedgerService ledgerService;

    @Mock
    private NotificationService notificationService;

    @Mock
    private DeviceSessionRepo deviceSessionRepo;

    @Mock
    private FraudAlertRepo fraudAlertRepo;

    @InjectMocks
    private InterestService interestService;

    @InjectMocks
    private FraudDetectionService fraudDetectionService;

    private BankAccount savingsAccount;

    @BeforeEach
    void setUp() {
        savingsAccount = new BankAccount();
        savingsAccount.setId(1L);
        savingsAccount.setAccountNumber("999999");
        savingsAccount.setMobileNumber("9876543210");
        savingsAccount.setBalance(10000.0);
        savingsAccount.setActive(true);
        savingsAccount.setAccountType(AccountType.SAVINGS);
        savingsAccount.setInterestRate(0.04); // 4% p.a.
        savingsAccount.setLastInterestDate(LocalDateTime.now().minusDays(30));
    }

    @Test
    void testInterestCalculationAccrual() {
        when(bankAccountRepo.findAll()).thenReturn(Collections.singletonList(savingsAccount));
        when(transactionRepo.save(any(Transaction.class))).thenAnswer(inv -> inv.getArgument(0));

        int processed = interestService.processInterest(true);

        assertEquals(1, processed);
        // Balance should be: 10,000 + (10,000 * 0.04 * 30/365) = 10,000 + 32.88 = 10032.88
        assertEquals(10032.88, savingsAccount.getBalance());

        verify(ledgerService, times(1)).recordDoubleEntry(any(), eq("INTEREST_POOL"), eq("999999"), eq(32.88));
        verify(notificationService, times(1)).createNotification(eq("9876543210"), anyString(), anyString());
    }

    @Test
    void testFraudVelocityRuleTriggered() {
        // Mock 3 previous transactions in the last minute
        List<Transaction> previousTxs = new ArrayList<>();
        previousTxs.add(new Transaction());
        previousTxs.add(new Transaction());
        previousTxs.add(new Transaction());

        when(transactionRepo.findByFromNumberAndTimestampAfter(eq("9876543210"), any(LocalDateTime.class)))
                .thenReturn(previousTxs);
        when(fraudAlertRepo.save(any(FraudAlert.class))).thenAnswer(inv -> inv.getArgument(0));

        FraudAlert alert = fraudDetectionService.evaluateTransaction("9876543210", 5000.0, null);

        assertNotNull(alert);
        assertEquals("HIGH_VELOCITY", alert.getRuleName());
        assertEquals("HIGH", alert.getSeverity());
        assertEquals("PENDING_REVIEW", alert.getStatus());
    }

    @Test
    void testFraudStructuringRuleTriggered() {
        // Mock 1 previous transaction between 40k and 50k in the last hour
        List<Transaction> previousTxs = new ArrayList<>();
        Transaction structuringTx = new Transaction();
        structuringTx.setAmount(45000.0);
        previousTxs.add(structuringTx);

        when(transactionRepo.findByFromNumberAndTimestampAfter(eq("9876543210"), any(LocalDateTime.class)))
                .thenReturn(previousTxs);
        when(fraudAlertRepo.save(any(FraudAlert.class))).thenAnswer(inv -> inv.getArgument(0));

        FraudAlert alert = fraudDetectionService.evaluateTransaction("9876543210", 48000.0, null);

        assertNotNull(alert);
        assertEquals("STRUCTURING_TRANSFER", alert.getRuleName());
        assertEquals("HIGH", alert.getSeverity());
        assertEquals("PENDING_REVIEW", alert.getStatus());
    }

    @Test
    void testFraudUntrustedDeviceTransferTriggered() {
        when(transactionRepo.findByFromNumberAndTimestampAfter(eq("9876543210"), any(LocalDateTime.class)))
                .thenReturn(new ArrayList<>());
        
        // Mock an untrusted active session
        DeviceSession session = new DeviceSession();
        session.setUserMobile("9876543210");
        session.setTrusted(false);
        when(deviceSessionRepo.findByUserMobile("9876543210")).thenReturn(Collections.singletonList(session));
        
        when(fraudAlertRepo.save(any(FraudAlert.class))).thenAnswer(inv -> inv.getArgument(0));

        FraudAlert alert = fraudDetectionService.evaluateTransaction("9876543210", 35000.0, null);

        assertNotNull(alert);
        assertEquals("UNTRUSTED_DEVICE_TRANSFER", alert.getRuleName());
        assertEquals("MEDIUM", alert.getSeverity());
        assertEquals("PENDING_REVIEW", alert.getStatus());
    }
}
