package com.docintel.auth.presentation.dto;

public record LoginResponse(
        String accessToken,
        UserResponse user
) {
}