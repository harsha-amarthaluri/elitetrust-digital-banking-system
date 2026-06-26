package com.bank_application.backend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "cards")
public class Card {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String cardNumber;
    
    private String cvv;
    private String expiryDate;
    private String pin;

    @Enumerated(EnumType.STRING)
    private CardType cardType;

    private String cardHolderName;
    private Long associatedAccountId; // nullable (for credit cards)
    private Long userId;

    private double spendingLimit = 50000.0;
    private double dailyLimit = 100000.0;
    
    private boolean frozen = false;
    private boolean internationalEnabled = false;

    private double creditLimit = 0.0; // only for credit cards
    private double balance = 0.0; // only for credit cards

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCardNumber() { return cardNumber; }
    public void setCardNumber(String cardNumber) { this.cardNumber = cardNumber; }

    public String getCvv() { return cvv; }
    public void setCvv(String cvv) { this.cvv = cvv; }

    public String getExpiryDate() { return expiryDate; }
    public void setExpiryDate(String expiryDate) { this.expiryDate = expiryDate; }

    public String getPin() { return pin; }
    public void setPin(String pin) { this.pin = pin; }

    public CardType getCardType() { return cardType; }
    public void setCardType(CardType cardType) { this.cardType = cardType; }

    public String getCardHolderName() { return cardHolderName; }
    public void setCardHolderName(String cardHolderName) { this.cardHolderName = cardHolderName; }

    public Long getAssociatedAccountId() { return associatedAccountId; }
    public void setAssociatedAccountId(Long associatedAccountId) { this.associatedAccountId = associatedAccountId; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public double getSpendingLimit() { return spendingLimit; }
    public void setSpendingLimit(double spendingLimit) { this.spendingLimit = spendingLimit; }

    public double getDailyLimit() { return dailyLimit; }
    public void setDailyLimit(double dailyLimit) { this.dailyLimit = dailyLimit; }

    public boolean isFrozen() { return frozen; }
    public void setFrozen(boolean frozen) { this.frozen = frozen; }

    public boolean isInternationalEnabled() { return internationalEnabled; }
    public void setInternationalEnabled(boolean internationalEnabled) { this.internationalEnabled = internationalEnabled; }

    public double getCreditLimit() { return creditLimit; }
    public void setCreditLimit(double creditLimit) { this.creditLimit = creditLimit; }

    public double getBalance() { return balance; }
    public void setBalance(double balance) { this.balance = balance; }
}
