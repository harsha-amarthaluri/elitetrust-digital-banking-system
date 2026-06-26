package com.bank_application.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.bank_application.backend.entity.LinkedAccount;

@Repository
public interface LinkedAccountRepo extends JpaRepository<LinkedAccount, Long> {
    List<LinkedAccount> findByMobileNumber(String mobileNumber);
    List<LinkedAccount> findByBankAccountId(Long bankAccountId);
    boolean existsByMobileNumberAndBankAccountId(String mobileNumber, Long bankAccountId);
}
