package com.bank_application.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.bank_application.backend.entity.BankAccount;

public interface BankAccountRepo extends JpaRepository<BankAccount, Long> {

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT b FROM BankAccount b WHERE b.accountNumber = :accountNumber")
    Optional<BankAccount> findByAccountNumberForUpdate(@org.springframework.data.repository.query.Param("accountNumber") String accountNumber);

    Optional<BankAccount> findByAccountNumber(String accountNumber);

    List<BankAccount> findByMobileNumber(String mobileNumber);

    List<BankAccount> findAllByMobileNumber(String mobileNumber);

    Optional<BankAccount> findByMobileNumberAndPrimaryAccountTrue(String mobileNumber);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT b FROM BankAccount b WHERE b.mobileNumber = :mobileNumber AND b.primaryAccount = true")
    Optional<BankAccount> findByMobileNumberAndPrimaryAccountTrueForUpdate(@org.springframework.data.repository.query.Param("mobileNumber") String mobileNumber);

	boolean existsByMobileNumberAndBankName(String mobileNumber, String bankName);
    
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT b FROM BankAccount b WHERE b.id = :id")
    Optional<BankAccount> findByIdForUpdate(@org.springframework.data.repository.query.Param("id") Long id);
}