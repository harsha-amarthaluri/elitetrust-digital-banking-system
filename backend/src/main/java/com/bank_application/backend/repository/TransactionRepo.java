package com.bank_application.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.bank_application.backend.entity.Transaction;

public interface TransactionRepo extends JpaRepository<Transaction, Long> {
	
    // Get the all transactions which are did using mobile number or get the money using this mobile number
	List<Transaction> findByFromNumberOrToNumber(String from, String to);
    
    // 
    List<Transaction> findByUserMobileNumber(String mobileNumber);

    List<Transaction> findByStatus(com.bank_application.backend.entity.TransactionStatus status);

	@org.springframework.data.jpa.repository.Query("SELECT t FROM Transaction t WHERE (t.fromNumber = :mobile AND t.type = 'DEBIT') OR (t.toNumber = :mobile AND t.type = 'CREDIT') ORDER BY t.timestamp DESC")
	List<Transaction> findDoubleEntryTransactionsForUser(@org.springframework.data.repository.query.Param("mobile") String mobile);

	@org.springframework.data.jpa.repository.Query("SELECT COALESCE(SUM(t.amount), 0.0) FROM Transaction t WHERE t.fromAccountId = :accountId AND t.type = 'DEBIT' AND t.status = 'SUCCESS' AND t.timestamp >= :startOfDay")
	double calculateDailyDebitTotal(@org.springframework.data.repository.query.Param("accountId") Long accountId, @org.springframework.data.repository.query.Param("startOfDay") java.time.LocalDateTime startOfDay);

	List<Transaction> findByFromNumberAndTimestampAfter(String fromNumber, java.time.LocalDateTime timestamp);
}