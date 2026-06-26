package com.bank_application.backend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "bank_accounts")
public class BankAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String accountNumber;
    private String mobileNumber;
    private String bankName;
    private double balance;

    private boolean primaryAccount;

    @Enumerated(EnumType.STRING)
    private AccountType accountType = AccountType.SAVINGS;

    private String nomineeName;
    private String nomineeRelationship;
    private Integer nomineeAge;

    private String jointHolderName;
    private String jointHolderMobile;

    private double transactionLimit = 50000.0;
    private double dailyLimit = 100000.0;

    private boolean active = true;

    private double interestRate = 0.04; // 4.0% per annum default
    private java.time.LocalDateTime lastInterestDate = java.time.LocalDateTime.now();

    // Extended banking fields
    private String ifscCode;           // e.g. ELTR0001234
    private String customerId;
    private java.time.LocalDate accountOpenDate = java.time.LocalDate.now();
    private double minimumBalance = 1000.0;
    private String frozenReason;

    @Enumerated(EnumType.STRING)
    private AccountStatus accountStatus = AccountStatus.ACTIVE;

    // Getters & Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getAccountNumber() { return accountNumber; }
    public void setAccountNumber(String accountNumber) { this.accountNumber = accountNumber; }

    public String getMobileNumber() { return mobileNumber; }
    public void setMobileNumber(String mobileNumber) { this.mobileNumber = mobileNumber; }

    public String getBankName() { return bankName; }
    public void setBankName(String bankName) { this.bankName = bankName; }

    public double getBalance() { return balance; }
    public void setBalance(double balance) { this.balance = balance; }

    public boolean isPrimaryAccount() { return primaryAccount; }
    public void setPrimaryAccount(boolean primaryAccount) { this.primaryAccount = primaryAccount; }

    public AccountType getAccountType() { return accountType; }
    public void setAccountType(AccountType accountType) { this.accountType = accountType; }

    public String getNomineeName() { return nomineeName; }
    public void setNomineeName(String nomineeName) { this.nomineeName = nomineeName; }

    public String getNomineeRelationship() { return nomineeRelationship; }
    public void setNomineeRelationship(String nomineeRelationship) { this.nomineeRelationship = nomineeRelationship; }

    public java.lang.Integer getNomineeAge() { return nomineeAge; }
    public void setNomineeAge(java.lang.Integer nomineeAge) { this.nomineeAge = nomineeAge; }

    public String getJointHolderName() { return jointHolderName; }
    public void setJointHolderName(String jointHolderName) { this.jointHolderName = jointHolderName; }

    public String getJointHolderMobile() { return jointHolderMobile; }
    public void setJointHolderMobile(String jointHolderMobile) { this.jointHolderMobile = jointHolderMobile; }

    public double getTransactionLimit() { return transactionLimit; }
    public void setTransactionLimit(double transactionLimit) { this.transactionLimit = transactionLimit; }

    public double getDailyLimit() { return dailyLimit; }
    public void setDailyLimit(double dailyLimit) { this.dailyLimit = dailyLimit; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public double getInterestRate() { return interestRate; }
    public void setInterestRate(double interestRate) { this.interestRate = interestRate; }

    public java.time.LocalDateTime getLastInterestDate() { return lastInterestDate; }
    public void setLastInterestDate(java.time.LocalDateTime lastInterestDate) { this.lastInterestDate = lastInterestDate; }

    public String getIfscCode() { return ifscCode; }
    public void setIfscCode(String ifscCode) { this.ifscCode = ifscCode; }

    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }

    public java.time.LocalDate getAccountOpenDate() { return accountOpenDate; }
    public void setAccountOpenDate(java.time.LocalDate accountOpenDate) { this.accountOpenDate = accountOpenDate; }

    public double getMinimumBalance() { return minimumBalance; }
    public void setMinimumBalance(double minimumBalance) { this.minimumBalance = minimumBalance; }

    public String getFrozenReason() { return frozenReason; }
    public void setFrozenReason(String frozenReason) { this.frozenReason = frozenReason; }

    public AccountStatus getAccountStatus() { return accountStatus; }
    public void setAccountStatus(AccountStatus accountStatus) { this.accountStatus = accountStatus; }
}