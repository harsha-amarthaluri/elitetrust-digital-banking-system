package com.bank_application.backend.services;

import com.bank_application.backend.controller.TransferRequest;
import com.bank_application.backend.controller.TransferResponse;
import com.bank_application.backend.entity.BankAccount;
import com.bank_application.backend.entity.Transaction;
import com.bank_application.backend.repository.AuditLogRepo;
import com.bank_application.backend.repository.BankAccountRepo;
import com.bank_application.backend.repository.NotificationRepo;
import com.bank_application.backend.repository.TransactionRepo;
import com.bank_application.backend.repository.UserRepo;
import com.bank_application.backend.repository.FraudAlertRepo;
import com.bank_application.backend.repository.BeneficiaryRepo;
import com.bank_application.backend.services.FraudDetectionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class TransactionLimitTest {

    @Mock
    private BankAccountRepo bankAccountRepo;

    @Mock
    private TransactionRepo transactionRepo;

    @Mock
    private AuditLogRepo auditLogRepo;

    @Mock
    private NotificationRepo notificationRepo;

    @Mock
    private EmailService emailService;

    @Mock
    private LedgerService ledgerService;

    @Mock
    private UserRepo userRepo;

    @Mock
    private FraudDetectionService fraudDetectionService;

    @Mock
    private FraudAlertRepo fraudAlertRepo;

    @Mock
    private BeneficiaryRepo beneficiaryRepo;

    @InjectMocks
    private TransactionService transactionService;

    private BankAccount sender;
    private BankAccount receiver;

    @BeforeEach
    void setUp() {
        sender = new BankAccount();
        sender.setId(1L);
        sender.setAccountNumber("123456");
        sender.setMobileNumber("9876543210");
        sender.setBalance(50000.0);
        sender.setActive(true);
        sender.setTransactionLimit(10000.0); // Single Tx Limit: 10,000
        sender.setDailyLimit(25000.0);       // Daily Limit: 25,000

        receiver = new BankAccount();
        receiver.setId(2L);
        receiver.setAccountNumber("654321");
        receiver.setMobileNumber("9123456789");
        receiver.setBalance(10000.0);
        receiver.setActive(true);
    }

    @Test
    void testSingleTransactionLimitExceeded() {
        TransferRequest request = new TransferRequest();
        request.setFromAccountId(1L);
        request.setToAccountNumber("654321");
        request.setAmount(15000.0); // 15,000 > 10,000 limit
        request.setType("ACCOUNT");

        when(bankAccountRepo.findByIdForUpdate(1L)).thenReturn(Optional.of(sender));

        assertThrows(IllegalArgumentException.class, () -> transactionService.processTransfer(request));
        verify(bankAccountRepo, never()).save(any());
    }

    @Test
    void testDailyLimitExceeded() {
        TransferRequest request = new TransferRequest();
        request.setFromAccountId(1L);
        request.setToAccountNumber("654321");
        request.setAmount(8000.0); // Within single limit (8,000 < 10,000)
        request.setType("ACCOUNT");

        when(bankAccountRepo.findByIdForUpdate(1L)).thenReturn(Optional.of(sender));
        // Simulate that user already transferred 20,000 today. 20,000 + 8,000 = 28,000 > 25,000 daily limit
        when(transactionRepo.calculateDailyDebitTotal(eq(1L), any(LocalDateTime.class))).thenReturn(20000.0);

        assertThrows(IllegalArgumentException.class, () -> transactionService.processTransfer(request));
        verify(bankAccountRepo, never()).save(any());
    }

    @Test
    void testSuccessfulTransferWithinLimits() {
        TransferRequest request = new TransferRequest();
        request.setFromAccountId(1L);
        request.setToAccountNumber("654321");
        request.setAmount(8000.0); // Within limits
        request.setType("ACCOUNT");

        when(bankAccountRepo.findByIdForUpdate(1L)).thenReturn(Optional.of(sender));
        when(bankAccountRepo.findByAccountNumberForUpdate("654321")).thenReturn(Optional.of(receiver));
        when(transactionRepo.calculateDailyDebitTotal(eq(1L), any(LocalDateTime.class))).thenReturn(5000.0);
        when(transactionRepo.save(any(Transaction.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TransferResponse response = transactionService.processTransfer(request);

        assertNotNull(response);
        assertEquals("Transfer successful", response.getMessage());
        assertEquals(42000.0, sender.getBalance()); // 50,000 - 8,000
        assertEquals(18000.0, receiver.getBalance()); // 10,000 + 8,000
        verify(bankAccountRepo, times(2)).save(any(BankAccount.class));
    }

    @Test
    void testBeneficiaryCoolingPeriodExceeded() {
        sender.setTransactionLimit(50000.0);
        TransferRequest request = new TransferRequest();
        request.setFromAccountId(1L);
        request.setToAccountNumber("654321");
        request.setAmount(15000.0); // > 10,000 cooling period limit
        request.setType("ACCOUNT");

        when(bankAccountRepo.findByIdForUpdate(1L)).thenReturn(Optional.of(sender));
        when(transactionRepo.calculateDailyDebitTotal(eq(1L), any(LocalDateTime.class))).thenReturn(5000.0);

        com.bank_application.backend.entity.Beneficiary beneficiary = new com.bank_application.backend.entity.Beneficiary();
        beneficiary.setAccountNumber("654321");
        beneficiary.setUserMobile(sender.getMobileNumber());
        beneficiary.setCreatedAt(LocalDateTime.now().minusHours(2)); // added 2 hours ago

        when(beneficiaryRepo.findByUserMobileAndAccountNumber(sender.getMobileNumber(), "654321"))
                .thenReturn(Optional.of(beneficiary));

        assertThrows(IllegalArgumentException.class, () -> transactionService.processTransfer(request));
    }

    @Test
    void testBeneficiaryCoolingPeriodSucceeds() {
        TransferRequest request = new TransferRequest();
        request.setFromAccountId(1L);
        request.setToAccountNumber("654321");
        request.setAmount(5000.0); // <= 10,000 cooling period limit
        request.setType("ACCOUNT");

        when(bankAccountRepo.findByIdForUpdate(1L)).thenReturn(Optional.of(sender));
        when(bankAccountRepo.findByAccountNumberForUpdate("654321")).thenReturn(Optional.of(receiver));
        when(transactionRepo.calculateDailyDebitTotal(eq(1L), any(LocalDateTime.class))).thenReturn(5000.0);
        when(transactionRepo.save(any(Transaction.class))).thenAnswer(invocation -> invocation.getArgument(0));

        com.bank_application.backend.entity.Beneficiary beneficiary = new com.bank_application.backend.entity.Beneficiary();
        beneficiary.setAccountNumber("654321");
        beneficiary.setUserMobile(sender.getMobileNumber());
        beneficiary.setCreatedAt(LocalDateTime.now().minusHours(2)); // added 2 hours ago

        when(beneficiaryRepo.findByUserMobileAndAccountNumber(sender.getMobileNumber(), "654321"))
                .thenReturn(Optional.of(beneficiary));

        TransferResponse response = transactionService.processTransfer(request);

        assertNotNull(response);
        assertEquals("Transfer successful", response.getMessage());
        assertEquals(45000.0, sender.getBalance()); // 50,000 - 5,000
        assertEquals(15000.0, receiver.getBalance()); // 10,000 + 5,000
    }
}
