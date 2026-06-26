package com.bank_application.backend.repository;

import com.bank_application.backend.entity.FixedDeposit;
import com.bank_application.backend.entity.FdStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface FixedDepositRepo extends JpaRepository<FixedDeposit, Long> {

    List<FixedDeposit> findByMobileNumber(String mobileNumber);

    List<FixedDeposit> findByStatus(FdStatus status);

    List<FixedDeposit> findByLinkedAccountNumber(String accountNumber);

    List<FixedDeposit> findByStatusAndMaturityDateBefore(FdStatus status, LocalDate date);
}
