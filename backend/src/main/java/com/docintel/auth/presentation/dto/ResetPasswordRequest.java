package com.docintel.auth.presentation.dto;

import com.docintel.user.infrastructure.annotation.Password;
import jakarta.validation.constraints.NotBlank;

public record ResetPasswordRequest(
        @NotBlank(message = "O token é obrigatório")
        String token,

        @NotBlank(message = "A senha é obrigatória")
        @Password(message = "A senha deve ter pelo menos 8 caracteres")
        String password
) {
}
