package com.docintel.modules.auth.presentation.dto;

import com.docintel.modules.auth.presentation.dto.response.LoginResponse;

public record LoginResult(
        LoginResponse response,
        String refreshToken
) {
}
