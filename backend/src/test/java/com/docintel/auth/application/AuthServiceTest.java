package com.docintel.auth.application;

import com.docintel.auth.domain.RefreshTokenRepository;
import com.docintel.auth.infrastructure.exception.EmailAlreadyInUseException;
import com.docintel.auth.presentation.dto.RegisterRequest;
import com.docintel.auth.presentation.dto.UserResponse;
import com.docintel.user.domain.User;
import com.docintel.user.domain.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private JwtService jwtService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AuthService authService;

    private RegisterRequest validRequest;

    @BeforeEach
    void setUp() {
        validRequest = new RegisterRequest(
                "John",
                "Doe",
                "john.doe@example.com",
                "Password123"
        );
    }

    @Test
    void shouldRegisterUserSuccessfully() {
        // Arrange
        when(userRepository.findByEmail(validRequest.email())).thenReturn(Optional.empty());
        when(passwordEncoder.encode(validRequest.password())).thenReturn("encodedPassword");
        
        UUID generatedId = UUID.randomUUID();
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User userToSave = invocation.getArgument(0);
            userToSave.setId(generatedId);
            return userToSave;
        });

        // Act
        UserResponse response = authService.register(validRequest);

        // Assert
        assertNotNull(response);
        assertEquals(generatedId, response.id());
        assertEquals(validRequest.email(), response.email());
        assertEquals(validRequest.firstName(), response.firstName());
        assertEquals(validRequest.lastName(), response.lastName());

        // Verify password was encoded
        verify(passwordEncoder).encode("Password123");

        // Capture saved user and assert properties
        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User savedUser = userCaptor.getValue();
        assertEquals("John", savedUser.getFirstName());
        assertEquals("Doe", savedUser.getLastName());
        assertEquals("john.doe@example.com", savedUser.getEmail());
        assertEquals("encodedPassword", savedUser.getPassword());
    }

    @Test
    void shouldThrowExceptionWhenEmailAlreadyExists() {
        // Arrange
        when(userRepository.findByEmail(validRequest.email()))
                .thenReturn(Optional.of(new User()));

        // Act & Assert
        EmailAlreadyInUseException exception = assertThrows(EmailAlreadyInUseException.class, () -> {
            authService.register(validRequest);
        });

        assertEquals("Email already in use", exception.getMessage());
        
        // Verify userRepository.save was never called
        verify(userRepository, never()).save(any(User.class));
        verify(passwordEncoder, never()).encode(anyString());
    }
}
