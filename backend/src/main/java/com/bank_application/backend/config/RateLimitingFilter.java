package com.bank_application.backend.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

@Component
public class RateLimitingFilter implements Filter {

    @Autowired
    private StringRedisTemplate redisTemplate;

    // Rate Limit: 100 requests per minute
    private static final int MAX_REQUESTS_PER_MINUTE = 100;

    private volatile boolean redisOffline = false;
    private volatile long lastRedisRetryTime = 0;
    private static final long RETRY_INTERVAL_MS = 60000;

    // Local Rate Limiter fallback
    private static final java.util.concurrent.ConcurrentHashMap<String, Integer> localRateMap = new java.util.concurrent.ConcurrentHashMap<>();
    private static final java.util.concurrent.ConcurrentHashMap<String, Long> localExpiryMap = new java.util.concurrent.ConcurrentHashMap<>();

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        // Skip static swagger resources
        String path = httpRequest.getRequestURI();
        if (path.contains("swagger-ui") || path.contains("api-docs")) {
            chain.doFilter(request, response);
            return;
        }

        // Identify requestor by authenticated user or IP address
        String identifier = httpRequest.getRemoteAddr();
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName())) {
            identifier = auth.getName();
        }

        String redisKey = "rate_limit:" + identifier;
        boolean useRedis = !redisOffline || (System.currentTimeMillis() - lastRedisRetryTime > RETRY_INTERVAL_MS);

        if (useRedis && redisTemplate != null) {
            try {
                Long currentRequests = redisTemplate.opsForValue().increment(redisKey);
                if (redisOffline) {
                    redisOffline = false;
                    System.out.println("Redis is back online in RateLimitingFilter.");
                }
                if (currentRequests == null) {
                    httpResponse.setStatus(HttpStatus.INTERNAL_SERVER_ERROR.value());
                    return;
                }

                if (currentRequests == 1) {
                    redisTemplate.expire(redisKey, 1, TimeUnit.MINUTES);
                }

                if (currentRequests > MAX_REQUESTS_PER_MINUTE) {
                    httpResponse.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                    httpResponse.setContentType("application/json");
                    httpResponse.getWriter().write("{\"message\": \"Too many requests. Please try again in a minute.\"}");
                    return;
                }

                chain.doFilter(request, response);
                return;
            } catch (Exception e) {
                redisOffline = true;
                lastRedisRetryTime = System.currentTimeMillis();
                System.err.println("Redis rate limiting error. Tripping circuit breaker, using in-memory: " + e.getMessage());
            }
        }

        // Local In-Memory Fallback rate limiting
        long now = System.currentTimeMillis();
        Long expiry = localExpiryMap.get(identifier);
        if (expiry == null || expiry < now) {
            localRateMap.put(identifier, 1);
            localExpiryMap.put(identifier, now + 60000); // 1 minute window
        } else {
            int current = localRateMap.merge(identifier, 1, Integer::sum);
            if (current > MAX_REQUESTS_PER_MINUTE) {
                httpResponse.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                httpResponse.setContentType("application/json");
                httpResponse.getWriter().write("{\"message\": \"Too many requests. Please try again in a minute. (Local Fallback)\"}");
                return;
            }
        }

        chain.doFilter(request, response);
    }
}
