package com.bank_application.backend.controller;

public class BillPayRequest {
    private String type;
    private String identifier;
    private double amount;
    private Long fromAccountId;

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getIdentifier() { return identifier; }
    public void setIdentifier(String identifier) { this.identifier = identifier; }
    public double getAmount() { return amount; }
    public void setAmount(double amount) { this.amount = amount; }
    public Long getFromAccountId() { return fromAccountId; }
    public void setFromAccountId(Long fromAccountId) { this.fromAccountId = fromAccountId; }
}
