package com.bank_application.backend.services;

import com.bank_application.backend.controller.TransferRequest;
import com.bank_application.backend.controller.TransferResponse;
import com.bank_application.backend.entity.*;
import com.bank_application.backend.repository.*;
import com.bank_application.backend.services.FraudDetectionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class Phase2IntegrationTest {

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
        sender.setAccountNumber("111111");
        sender.setMobileNumber("9876543210");
        sender.setBalance(150000.0);
        sender.setActive(true);
        sender.setTransactionLimit(200000.0);
        sender.setDailyLimit(300000.0);

        receiver = new BankAccount();
        receiver.setId(2L);
        receiver.setAccountNumber("222222");
        receiver.setMobileNumber("9123456789");
        receiver.setBalance(10000.0);
        receiver.setActive(true);
    }

    @Test
    void testMakerCheckerTriggered() {
        TransferRequest request = new TransferRequest();
        request.setFromAccountId(1L);
        request.setToAccountNumber("222222");
        request.setAmount(60000.0); // > 50,000 trigger limit
        request.setType("ACCOUNT");

        when(bankAccountRepo.findByIdForUpdate(1L)).thenReturn(Optional.of(sender));
        when(bankAccountRepo.findByAccountNumberForUpdate("222222")).thenReturn(Optional.of(receiver));
        when(transactionRepo.save(any(Transaction.class))).thenAnswer(invocation -> {
            Transaction tx = invocation.getArgument(0);
            tx.setId(100L);
            return tx;
        });

        TransferResponse response = transactionService.processTransfer(request);

        assertNotNull(response);
        assertEquals("Transfer requires manager approval", response.getMessage());
        assertEquals(100L, response.getTransactionId());
        // Verify balance was NOT deducted
        assertEquals(150000.0, sender.getBalance());
        assertEquals(10000.0, receiver.getBalance());
        
        verify(transactionRepo, times(1)).save(argThat(tx -> tx.getStatus() == TransactionStatus.PENDING_APPROVAL));
        verify(bankAccountRepo, never()).save(any());
    }

    @Test
    void testApprovePendingTransaction() {
        Transaction pendingTx = new Transaction();
        pendingTx.setId(100L);
        pendingTx.setFromAccountId(1L);
        pendingTx.setToAccountId(2L);
        pendingTx.setFromNumber("9876543210");
        pendingTx.setToNumber("9123456789");
        pendingTx.setAmount(60000.0);
        pendingTx.setStatus(TransactionStatus.PENDING_APPROVAL);

        when(transactionRepo.findById(100L)).thenReturn(Optional.of(pendingTx));
        when(bankAccountRepo.findByIdForUpdate(1L)).thenReturn(Optional.of(sender));
        when(bankAccountRepo.findByIdForUpdate(2L)).thenReturn(Optional.of(receiver));

        Transaction result = transactionService.approveTransaction(100L);

        assertNotNull(result);
        assertEquals(TransactionStatus.SUCCESS, result.getStatus());
        // Verify balances were updated
        assertEquals(90000.0, sender.getBalance()); // 150,000 - 60,000
        assertEquals(70000.0, receiver.getBalance()); // 10,000 + 60,000
        
        verify(ledgerService, times(1)).recordDoubleEntry(eq(100L), eq("111111"), eq("222222"), eq(60000.0));
        verify(bankAccountRepo, times(2)).save(any(BankAccount.class));
    }

    @Test
    void testRejectPendingTransaction() {
        Transaction pendingTx = new Transaction();
        pendingTx.setId(100L);
        pendingTx.setFromNumber("9876543210");
        pendingTx.setToNumber("9123456789");
        pendingTx.setAmount(60000.0);
        pendingTx.setStatus(TransactionStatus.PENDING_APPROVAL);

        when(transactionRepo.findById(100L)).thenReturn(Optional.of(pendingTx));

        Transaction result = transactionService.rejectTransaction(100L);

        assertNotNull(result);
        assertEquals(TransactionStatus.FAILED, result.getStatus());
        assertTrue(result.getDescription().contains("rejected"));
        // Verify balances unchanged
        assertEquals(150000.0, sender.getBalance());
        verify(bankAccountRepo, never()).save(any());
    }
}
