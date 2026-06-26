package com.bank_application.backend.services;

import com.bank_application.backend.entity.Beneficiary;
import com.bank_application.backend.repository.BeneficiaryRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class BeneficiaryService {

    @Autowired
    private BeneficiaryRepo beneficiaryRepo;

    public Beneficiary addBeneficiary(Beneficiary beneficiary) {
        if (beneficiaryRepo.existsByUserMobileAndAccountNumber(beneficiary.getUserMobile(), beneficiary.getAccountNumber())) {
            throw new IllegalArgumentException("Beneficiary already registered for this user");
        }
        return beneficiaryRepo.save(beneficiary);
    }

    public List<Beneficiary> getBeneficiaries(String mobileNumber) {
        return beneficiaryRepo.findByUserMobile(mobileNumber);
    }

    public void removeBeneficiary(Long id) {
        if (!beneficiaryRepo.existsById(id)) {
            throw new IllegalArgumentException("Beneficiary not found");
        }
        beneficiaryRepo.deleteById(id);
    }
}
