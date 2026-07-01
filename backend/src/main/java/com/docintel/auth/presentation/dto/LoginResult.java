package com.docintel.auth.presentation.dto;

public record LoginResult(
        LoginResponse response,
        String refreshToken
) {
}
