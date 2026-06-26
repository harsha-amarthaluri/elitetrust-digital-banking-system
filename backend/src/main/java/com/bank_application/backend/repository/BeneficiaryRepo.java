package com.bank_application.backend.repository;

import com.bank_application.backend.entity.Beneficiary;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BeneficiaryRepo extends JpaRepository<Beneficiary, Long> {
    List<Beneficiary> findByUserMobile(String userMobile);
    boolean existsByUserMobileAndAccountNumber(String userMobile, String accountNumber);
    java.util.Optional<Beneficiary> findByUserMobileAndAccountNumber(String userMobile, String accountNumber);
}
