package com.docintel.auth.presentation.dto;

import com.docintel.modules.auth.presentation.dto.request.RegisterRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RegisterRequestValidationTest {

    private Validator validator;

    @BeforeEach
    void setUp() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @Test
    void shouldPassValidationWithValidData() {
        RegisterRequest request = new RegisterRequest("John", "Doe", "john.doe@example.com", "Password123");
        Set<ConstraintViolation<RegisterRequest>> violations = validator.validate(request);
        assertTrue(violations.isEmpty());
    }

    @Test
    void shouldFailValidationWhenEmailIsInvalid() {
        RegisterRequest request = new RegisterRequest("John", "Doe", "invalid-email", "Password123");
        Set<ConstraintViolation<RegisterRequest>> violations = validator.validate(request);
        assertEquals(1, violations.size());
        assertEquals("Invalid email format", violations.iterator().next().getMessage());
    }

    @Test
    void shouldFailValidationWhenPasswordIsTooShort() {
        RegisterRequest request = new RegisterRequest("John", "Doe", "john.doe@example.com", "short"); // < 8 characters
        Set<ConstraintViolation<RegisterRequest>> violations = validator.validate(request);
        assertEquals(1, violations.size());
        assertEquals("Weak Password", violations.iterator().next().getMessage());
    }

    @Test
    void shouldFailValidationWhenFirstNameIsBlank() {
        RegisterRequest request = new RegisterRequest("", "Doe", "john.doe@example.com", "Password123");
        Set<ConstraintViolation<RegisterRequest>> violations = validator.validate(request);
        assertEquals(1, violations.size());
        assertEquals("First name is required", violations.iterator().next().getMessage());
    }
}
