package com.bank_application.backend.utils;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class JwtUtilsTest {

    private JwtUtils jwtUtils;
    private final String secret = "supersecretkeyforhmacsha256mustbe32bytesorlonger!";
    private final long accessTokenExpiry = 60000; // 1 minute
    private final long refreshTokenExpiry = 120000; // 2 minutes

    @BeforeEach
    void setUp() {
        jwtUtils = new JwtUtils(secret, accessTokenExpiry, refreshTokenExpiry);
    }

    @Test
    void generateAndValidateAccessToken() {
        String username = "9876543210";
        String token = jwtUtils.generateAccessToken(username);
        
        assertNotNull(token);
        assertTrue(jwtUtils.validateJwtToken(token));
        assertEquals(username, jwtUtils.getUsernameFromJwtToken(token));
    }

    @Test
    void generateAndValidateRefreshToken() {
        String username = "9876543210";
        String token = jwtUtils.generateRefreshToken(username);
        
        assertNotNull(token);
        assertTrue(jwtUtils.validateJwtToken(token));
        assertEquals(username, jwtUtils.getUsernameFromJwtToken(token));
    }

    @Test
    void validateInvalidToken() {
        String invalidToken = "invalidTokenString";
        assertFalse(jwtUtils.validateJwtToken(invalidToken));
    }
}
