package com.docintel.user.infrastructure.annotation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class StrongPasswordValidator
        implements ConstraintValidator<Password, String> {

    @Override
    public boolean isValid(String value,
                           ConstraintValidatorContext context) {

        return value != null && value.length() >= 8;
    }
}