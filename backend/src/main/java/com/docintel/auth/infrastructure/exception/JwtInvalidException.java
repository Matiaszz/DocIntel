package com.docintel.auth.infrastructure.exception;

public class JwtInvalidException extends JwtException {
    public JwtInvalidException(String message) {
        super(message);
    }

    public JwtInvalidException(String message, Throwable cause) {
        super(message, cause);
    }
}
