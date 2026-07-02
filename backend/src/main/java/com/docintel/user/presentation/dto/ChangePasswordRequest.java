package com.docintel.user.presentation.dto;

import com.docintel.user.infrastructure.annotation.Password;
import jakarta.validation.constraints.NotBlank;

public record ChangePasswordRequest(
        @NotBlank(message = "A senha atual é obrigatória")
        String oldPassword,

        @NotBlank(message = "A nova senha é obrigatória")
        @Password(message = "A nova senha deve ter pelo menos 8 caracteres")
        String newPassword
) {
}
