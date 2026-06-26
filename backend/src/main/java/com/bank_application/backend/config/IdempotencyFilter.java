package com.bank_application.backend.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.util.ContentCachingResponseWrapper;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

@Component
public class IdempotencyFilter implements Filter {

    @Autowired(required = false)
    private StringRedisTemplate redisTemplate;

    private static final String IDEMPOTENCY_PREFIX = "idempotency:";

    private volatile boolean redisOffline = false;
    private volatile long lastRedisRetryTime = 0;
    private static final long RETRY_INTERVAL_MS = 60000;

    // Local Idempotency fallback
    private static final java.util.concurrent.ConcurrentHashMap<String, String> localIdempotencyMap = new java.util.concurrent.ConcurrentHashMap<>();
    private static final java.util.concurrent.ConcurrentHashMap<String, Long> localIdempotencyExpiry = new java.util.concurrent.ConcurrentHashMap<>();

    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain)
            throws IOException, ServletException {
        
        if (!(servletRequest instanceof HttpServletRequest) || !(servletResponse instanceof HttpServletResponse)) {
            filterChain.doFilter(servletRequest, servletResponse);
            return;
        }

        HttpServletRequest httpRequest = (HttpServletRequest) servletRequest;
        HttpServletResponse httpResponse = (HttpServletResponse) servletResponse;

        String method = httpRequest.getMethod();
        String idempotencyKey = httpRequest.getHeader("Idempotency-Key");

        // Apply idempotency check only on POST or PUT requests with a key
        if (idempotencyKey == null || idempotencyKey.trim().isEmpty() || 
            (!method.equalsIgnoreCase("POST") && !method.equalsIgnoreCase("PUT"))) {
            filterChain.doFilter(servletRequest, servletResponse);
            return;
        }

        String redisKey = IDEMPOTENCY_PREFIX + idempotencyKey;
        boolean useRedis = (redisTemplate != null) && (!redisOffline || (System.currentTimeMillis() - lastRedisRetryTime > RETRY_INTERVAL_MS));

        if (useRedis) {
            try {
                // Try to reserve the key by setting it to IN_PROGRESS
                Boolean wasAbsent = redisTemplate.opsForValue().setIfAbsent(redisKey, "IN_PROGRESS", 5, TimeUnit.MINUTES);

                if (redisOffline) {
                    redisOffline = false;
                    System.out.println("Redis is back online in IdempotencyFilter.");
                }

                if (Boolean.FALSE.equals(wasAbsent)) {
                    // Key already exists. Check what its value is.
                    String existingVal = redisTemplate.opsForValue().get(redisKey);
                    if ("IN_PROGRESS".equals(existingVal)) {
                        httpResponse.setStatus(HttpServletResponse.SC_CONFLICT);
                        httpResponse.setContentType("application/json");
                        httpResponse.getWriter().write("{\"message\":\"Transaction already in progress. Please wait.\"}");
                        return;
                    } else if (existingVal != null) {
                        // Return cached response
                        String[] parts = existingVal.split("\\|", 2);
                        if (parts.length == 2) {
                            int status = Integer.parseInt(parts[0]);
                            String body = parts[1];
                            httpResponse.setStatus(status);
                            httpResponse.setContentType("application/json");
                            httpResponse.getWriter().write(body);
                            return;
                        }
                    }
                    filterChain.doFilter(servletRequest, servletResponse);
                    return;
                }

                // Key was absent and is now locked as IN_PROGRESS
                ContentCachingResponseWrapper responseWrapper = new ContentCachingResponseWrapper(httpResponse);
                try {
                    filterChain.doFilter(servletRequest, responseWrapper);
                    
                    int status = responseWrapper.getStatus();
                    byte[] responseBodyBytes = responseWrapper.getContentAsByteArray();
                    String responseBody = new String(responseBodyBytes, responseWrapper.getCharacterEncoding());

                    if (status >= 200 && status < 300) {
                        // Save successful response in Redis for 24 hours
                        String cacheValue = status + "|" + responseBody;
                        redisTemplate.opsForValue().set(redisKey, cacheValue, 24, TimeUnit.HOURS);
                    } else {
                        // If not successful, release the key so they can retry
                        redisTemplate.delete(redisKey);
                    }
                    
                    responseWrapper.copyBodyToResponse();
                } catch (Exception e) {
                    // Delete key on exception/failure
                    redisTemplate.delete(redisKey);
                    throw e;
                }
                return;
            } catch (Exception e) {
                redisOffline = true;
                lastRedisRetryTime = System.currentTimeMillis();
                System.err.println("Redis idempotency error. Tripping circuit breaker, using in-memory: " + e.getMessage());
            }
        }

        // Local In-Memory Fallback Idempotency
        long now = System.currentTimeMillis();
        // Clean up expired items
        for (String k : localIdempotencyExpiry.keySet()) {
            if (localIdempotencyExpiry.get(k) < now) {
                localIdempotencyMap.remove(k);
                localIdempotencyExpiry.remove(k);
            }
        }

        String existingVal = localIdempotencyMap.get(idempotencyKey);
        if (existingVal != null) {
            if ("IN_PROGRESS".equals(existingVal)) {
                httpResponse.setStatus(HttpServletResponse.SC_CONFLICT);
                httpResponse.setContentType("application/json");
                httpResponse.getWriter().write("{\"message\":\"Transaction already in progress. Please wait. (Local Fallback)\"}");
                return;
            } else {
                String[] parts = existingVal.split("\\|", 2);
                if (parts.length == 2) {
                    int status = Integer.parseInt(parts[0]);
                    String body = parts[1];
                    httpResponse.setStatus(status);
                    httpResponse.setContentType("application/json");
                    httpResponse.getWriter().write(body);
                    return;
                }
            }
            filterChain.doFilter(servletRequest, servletResponse);
            return;
        }

        // Lock as IN_PROGRESS locally for 5 minutes
        localIdempotencyMap.put(idempotencyKey, "IN_PROGRESS");
        localIdempotencyExpiry.put(idempotencyKey, now + TimeUnit.MINUTES.toMillis(5));

        ContentCachingResponseWrapper responseWrapper = new ContentCachingResponseWrapper(httpResponse);
        try {
            filterChain.doFilter(servletRequest, responseWrapper);
            
            int status = responseWrapper.getStatus();
            byte[] responseBodyBytes = responseWrapper.getContentAsByteArray();
            String responseBody = new String(responseBodyBytes, responseWrapper.getCharacterEncoding());

            if (status >= 200 && status < 300) {
                String cacheValue = status + "|" + responseBody;
                localIdempotencyMap.put(idempotencyKey, cacheValue);
                localIdempotencyExpiry.put(idempotencyKey, now + TimeUnit.HOURS.toMillis(24));
            } else {
                localIdempotencyMap.remove(idempotencyKey);
                localIdempotencyExpiry.remove(idempotencyKey);
            }
            
            responseWrapper.copyBodyToResponse();
        } catch (Exception e) {
            localIdempotencyMap.remove(idempotencyKey);
            localIdempotencyExpiry.remove(idempotencyKey);
            throw e;
        }
    }
}
