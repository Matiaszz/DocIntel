package com.docintel.modules.auth.presentation.dto.response;

import com.docintel.modules.user.presentation.dto.response.UserResponse;

public record LoginResponse(
        String accessToken,
        UserResponse user
) {
}