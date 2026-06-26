package com.bank_application.backend.repository;

import com.bank_application.backend.entity.UpiMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UpiMappingRepo extends JpaRepository<UpiMapping, Long> {
    Optional<UpiMapping> findByUpiId(String upiId);
    Optional<UpiMapping> findByAccountNumber(String accountNumber);
}
