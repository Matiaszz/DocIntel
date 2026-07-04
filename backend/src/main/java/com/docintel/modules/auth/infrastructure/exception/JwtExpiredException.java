package com.docintel.modules.auth.infrastructure.exception;

public class JwtExpiredException extends JwtException {
    public JwtExpiredException(String message) {
        super(message);
    }
}
