package com.docintel.shared.infrastructure.mappers;

import com.docintel.auth.presentation.dto.UserResponse;
import com.docintel.user.domain.User;

public class UserMapper {
    public static UserResponse mapToUserResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName()
        );
    }
}
