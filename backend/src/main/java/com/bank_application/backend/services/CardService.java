package com.bank_application.backend.services;

import com.bank_application.backend.entity.BankAccount;
import com.bank_application.backend.entity.Card;
import com.bank_application.backend.entity.CardType;
import com.bank_application.backend.repository.BankAccountRepo;
import com.bank_application.backend.repository.CardRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.Random;

@Service
public class CardService {

    @Autowired
    private CardRepo cardRepo;

    @Autowired
    private BankAccountRepo bankAccountRepo;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private com.bank_application.backend.repository.UserRepo userRepo;

    private final Random random = new Random();

    public Card generateDebitCard(Long associatedAccountId, String cardHolderName) {
        Optional<BankAccount> accountOpt = bankAccountRepo.findById(associatedAccountId);
        if (!accountOpt.isPresent()) {
            throw new IllegalArgumentException("Account not found");
        }

        BankAccount account = accountOpt.get();

        Card card = new Card();
        card.setCardNumber(generateRandomCardNumber(4)); // Starts with 4 (Visa)
        card.setCvv(String.format("%03d", random.nextInt(1000)));
        card.setExpiryDate(generateExpiryDate());
        card.setPin(passwordEncoder.encode("1234")); // Default PIN
        card.setCardType(CardType.DEBIT);
        card.setCardHolderName(cardHolderName);
        card.setAssociatedAccountId(associatedAccountId);
        
        com.bank_application.backend.entity.User user = userRepo.getByMobileNumber(account.getMobileNumber());
        if (user != null) {
            card.setUserId(user.getUser_Id());
        } else {
            try {
                card.setUserId(Long.parseLong(account.getMobileNumber()));
            } catch (NumberFormatException e) {
                // Ignore
            }
        }
        
        return cardRepo.save(card);
    }

    public Card generateCreditCard(String userIdentifier, String cardHolderName) {
        com.bank_application.backend.entity.User user = null;
        if (userIdentifier.matches("\\d+")) {
            user = userRepo.getByMobileNumber(userIdentifier);
            if (user == null) {
                try {
                    user = userRepo.findById(Long.parseLong(userIdentifier)).orElse(null);
                } catch (NumberFormatException e) {
                    // Ignore
                }
            }
        } else {
            user = userRepo.getByMobileNumber(userIdentifier);
        }

        if (user == null) {
            throw new IllegalArgumentException("User not found: " + userIdentifier);
        }

        Card card = new Card();
        card.setCardNumber(generateRandomCardNumber(5)); // Starts with 5 (Mastercard)
        card.setCvv(String.format("%03d", random.nextInt(1000)));
        card.setExpiryDate(generateExpiryDate());
        card.setPin(passwordEncoder.encode("1234")); // Default PIN
        card.setCardType(CardType.CREDIT);
        card.setCardHolderName(cardHolderName);
        card.setUserId(user.getUser_Id());
        card.setCreditLimit(150000.0); // Default credit limit
        card.setBalance(0.0);

        return cardRepo.save(card);
    }

    public List<Card> getCardsByUserIdentifier(String userIdentifier) {
        com.bank_application.backend.entity.User user = null;
        if (userIdentifier.matches("\\d+")) {
            user = userRepo.getByMobileNumber(userIdentifier);
            if (user == null) {
                try {
                    user = userRepo.findById(Long.parseLong(userIdentifier)).orElse(null);
                } catch (NumberFormatException e) {
                    // Ignore
                }
            }
        } else {
            user = userRepo.getByMobileNumber(userIdentifier);
        }

        if (user == null) {
            return java.util.Collections.emptyList();
        }

        Long id1 = user.getUser_Id();
        Long id2 = null;
        if (user.getMobileNumber().matches("\\d+")) {
            try {
                id2 = Long.parseLong(user.getMobileNumber());
            } catch (NumberFormatException e) {
                // Ignore
            }
        }

        if (id2 != null) {
            return cardRepo.findByUserIdOrUserId(id1, id2);
        } else {
            return cardRepo.findByUserId(id1);
        }
    }

    public Card toggleFreeze(Long cardId) {
        Card card = cardRepo.findById(cardId)
                .orElseThrow(() -> new IllegalArgumentException("Card not found"));
        card.setFrozen(!card.isFrozen());
        return cardRepo.save(card);
    }

    public Card updateLimits(Long cardId, double spendingLimit, double dailyLimit) {
        Card card = cardRepo.findById(cardId)
                .orElseThrow(() -> new IllegalArgumentException("Card not found"));
        card.setSpendingLimit(spendingLimit);
        card.setDailyLimit(dailyLimit);
        return cardRepo.save(card);
    }

    public Card updatePin(Long cardId, String newPin) {
        if (newPin == null || newPin.length() != 4 || !newPin.matches("\\d+")) {
            throw new IllegalArgumentException("PIN must be exactly 4 digits");
        }
        Card card = cardRepo.findById(cardId)
                .orElseThrow(() -> new IllegalArgumentException("Card not found"));
        card.setPin(passwordEncoder.encode(newPin));
        return cardRepo.save(card);
    }

    public Card toggleInternational(Long cardId) {
        Card card = cardRepo.findById(cardId)
                .orElseThrow(() -> new IllegalArgumentException("Card not found"));
        card.setInternationalEnabled(!card.isInternationalEnabled());
        return cardRepo.save(card);
    }

    private String generateRandomCardNumber(int prefixDigit) {
        StringBuilder sb = new StringBuilder();
        sb.append(prefixDigit);
        for (int i = 0; i < 15; i++) {
            sb.append(random.nextInt(10));
        }
        return sb.toString();
    }

    private String generateExpiryDate() {
        // Expiry in 5 years
        int month = random.nextInt(12) + 1;
        int year = (java.time.Year.now().getValue() + 5) % 100;
        return String.format("%02d/%02d", month, year);
    }
}
