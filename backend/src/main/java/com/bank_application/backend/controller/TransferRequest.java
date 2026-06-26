package com.bank_application.backend.controller;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public class TransferRequest {
    @NotNull(message = "Transfer type is required")
    private String type; // "MOBILE" | "ACCOUNT" | "SELF"
    
    @NotNull(message = "Sender account is required")
    private Long fromAccountId;
    private String toMobileNumber;
    private String toAccountNumber;
    private Long toAccountId;
    
    @Positive(message = "Amount must be strictly greater than zero")
    private double amount;
    
    private String category;

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public Long getFromAccountId() { return fromAccountId; }
    public void setFromAccountId(Long fromAccountId) { this.fromAccountId = fromAccountId; }

    public String getToMobileNumber() { return toMobileNumber; }
    public void setToMobileNumber(String toMobileNumber) { this.toMobileNumber = toMobileNumber; }

    public String getToAccountNumber() { return toAccountNumber; }
    public void setToAccountNumber(String toAccountNumber) { this.toAccountNumber = toAccountNumber; }

    public Long getToAccountId() { return toAccountId; }
    public void setToAccountId(Long toAccountId) { this.toAccountId = toAccountId; }

    public double getAmount() { return amount; }
    public void setAmount(double amount) { this.amount = amount; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
}
