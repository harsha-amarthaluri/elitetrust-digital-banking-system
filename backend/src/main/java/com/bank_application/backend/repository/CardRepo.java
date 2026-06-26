package com.bank_application.backend.repository;

import com.bank_application.backend.entity.Card;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CardRepo extends JpaRepository<Card, Long> {
    List<Card> findByUserId(Long userId);
    List<Card> findByUserIdOrUserId(Long userId, Long userIdAlt);
    Optional<Card> findByCardNumber(String cardNumber);
}
