package com.docintel.auth.application;

import com.docintel.auth.infrastructure.exception.JwtException;
import com.docintel.auth.infrastructure.exception.JwtExpiredException;
import com.docintel.auth.infrastructure.exception.JwtInvalidException;
import com.docintel.user.domain.User;
import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.text.ParseException;
import java.util.Date;
import java.util.UUID;

@Slf4j
@Service
public class JwtService {

    @Value("${JWT_SECRET:sua-chave-super-secreta-com-pelo-menos-32-caracteres}")
    private String jwtSecret;

    // Access token expires in 15 minutes (900,000 ms)
    private static final long ACCESS_TOKEN_EXPIRATION = 900_000;

    public String generateAccessToken(User user) {
        try {
            JWSSigner signer = new MACSigner(jwtSecret.getBytes(StandardCharsets.UTF_8));

            JWTClaimsSet claimsSet = new JWTClaimsSet.Builder()
                    .subject(user.getId().toString())
                    .claim("email", user.getEmail())
                    .claim("firstName", user.getFirstName())
                    .claim("lastName", user.getLastName())
                    .issuer("docintel")
                    .issueTime(new Date())
                    .expirationTime(new Date(System.currentTimeMillis() + ACCESS_TOKEN_EXPIRATION))
                    .build();

            SignedJWT signedJWT = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claimsSet);
            signedJWT.sign(signer);

            return signedJWT.serialize();
        } catch (JOSEException e) {
            log.error("Error creating JWT token", e);
            throw new JwtException("Could not generate access token", e);
        }
    }

    private void validateTokenOrThrow(String token) throws JwtException {
        try {
            SignedJWT signedJWT = SignedJWT.parse(token);
            JWSVerifier verifier = new MACVerifier(jwtSecret.getBytes(StandardCharsets.UTF_8));

            if (!signedJWT.verify(verifier)) {
                throw new JwtInvalidException("JWT signature verification failed");
            }

            Date expirationTime = signedJWT.getJWTClaimsSet().getExpirationTime();
            if (expirationTime == null || new Date().after(expirationTime)) {
                throw new JwtExpiredException("JWT token is expired");
            }
        } catch (ParseException e) {
            throw new JwtInvalidException("Invalid JWT token format", e);
        } catch (JOSEException e) {
            throw new JwtInvalidException("JWT signature verification failed due to internal error", e);
        }
    }

    public boolean isValidToken(String token) {
        try {
            validateTokenOrThrow(token);
            return true;
        } catch (JwtException e) {
            log.warn("JWT validation failed: {}", e.getMessage());
            return false;
        }
    }

    public UUID getUserIdFromToken(String token) {
        try {
            SignedJWT signedJWT = SignedJWT.parse(token);
            String subject = signedJWT.getJWTClaimsSet().getSubject();
            return UUID.fromString(subject);
        } catch (ParseException e) {
            log.error("Error parsing JWT token for user ID", e);
            throw new JwtInvalidException("Invalid token format", e);
        }
    }
}
