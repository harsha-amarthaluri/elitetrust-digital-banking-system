package com.bank_application.backend.repository;

import com.bank_application.backend.entity.ScheduledTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ScheduledTransactionRepo extends JpaRepository<ScheduledTransaction, Long> {
    List<ScheduledTransaction> findByActiveTrueAndNextExecutionDateBefore(LocalDateTime dateTime);
    List<ScheduledTransaction> findByFromAccountNumberOrToAccountNumber(String fromAcc, String toAcc);
}
