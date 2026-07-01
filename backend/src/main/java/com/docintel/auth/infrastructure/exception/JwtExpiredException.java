package com.docintel.auth.infrastructure.exception;

public class JwtExpiredException extends JwtException {
    public JwtExpiredException(String message) {
        super(message);
    }
}
