package com.docintel.auth.presentation.dto;

import com.docintel.user.presentation.dto.UserResponse;

public record LoginResponse(
        String accessToken,
        UserResponse user
) {
}