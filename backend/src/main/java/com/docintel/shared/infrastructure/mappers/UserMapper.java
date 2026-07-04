package com.docintel.shared.infrastructure.mappers;

import com.docintel.modules.user.presentation.dto.response.UserResponse;
import com.docintel.modules.user.domain.User;

public class UserMapper {
    public static UserResponse mapToUserResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.isEmailVerified()
        );
    }
}
