package com.bank_application.backend.repository;

import com.bank_application.backend.entity.LedgerEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LedgerEntryRepo extends JpaRepository<LedgerEntry, Long> {
    List<LedgerEntry> findByAccountNumber(String accountNumber);
    List<LedgerEntry> findByTransactionId(Long transactionId);
}
