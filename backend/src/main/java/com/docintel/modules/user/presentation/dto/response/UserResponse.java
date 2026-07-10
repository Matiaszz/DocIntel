package com.docintel.modules.user.presentation.dto.response;

import com.docintel.modules.user.domain.User;

import java.util.UUID;

public record UserResponse(
        UUID id,
        String email,
        String firstName,
        String lastName,
        boolean emailVerified
) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.isEmailVerified());
    }
}
