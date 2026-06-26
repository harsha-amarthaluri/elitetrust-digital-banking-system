package com.bank_application.backend.controller;

public class TransferResponse {
    private String message;
    private Long transactionId;
    private double updatedBalance;

    public TransferResponse() {}

    public TransferResponse(String message, Long transactionId, double updatedBalance) {
        this.message = message;
        this.transactionId = transactionId;
        this.updatedBalance = updatedBalance;
    }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public Long getTransactionId() { return transactionId; }
    public void setTransactionId(Long transactionId) { this.transactionId = transactionId; }

    public double getUpdatedBalance() { return updatedBalance; }
    public void setUpdatedBalance(double updatedBalance) { this.updatedBalance = updatedBalance; }
}
