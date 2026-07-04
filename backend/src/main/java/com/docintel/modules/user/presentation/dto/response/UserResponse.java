package com.docintel.modules.user.presentation.dto.response;

import java.util.UUID;

public record UserResponse(
        UUID id,
        String email,
        String firstName,
        String lastName,
        boolean emailVerified
) {
}
