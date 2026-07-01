package com.docintel.user.presentation.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record UpdateUserRequest(
        @NotBlank(message = "O primeiro nome é obrigatório")
        String firstName,

        @NotBlank(message = "O sobrenome é obrigatório")
        String lastName,

        @NotBlank(message = "O e-mail é obrigatório")
        @Email(message = "E-mail inválido")
        String email
) {
}
