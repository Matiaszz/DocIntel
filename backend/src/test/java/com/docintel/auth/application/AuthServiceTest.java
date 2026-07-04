package com.docintel.auth.application;

import com.docintel.modules.auth.domain.jwt.RefreshTokenRepository;
import com.docintel.modules.auth.domain.password.PasswordResetTokenRepository;
import com.docintel.modules.auth.domain.email.EmailVerificationTokenRepository;
import com.docintel.modules.auth.domain.email.EmailVerificationToken;
import com.docintel.modules.auth.domain.password.PasswordResetToken;
import com.docintel.modules.auth.presentation.dto.request.ForgotPasswordRequest;
import com.docintel.modules.auth.presentation.dto.request.ResetPasswordRequest;
import com.docintel.modules.auth.application.AuthService;
import com.docintel.modules.auth.application.JwtService;
import com.docintel.shared.infrastructure.email.EmailSender;
import com.docintel.modules.auth.infrastructure.exception.EmailAlreadyInUseException;
import com.docintel.modules.auth.presentation.dto.request.RegisterRequest;
import com.docintel.modules.user.presentation.dto.response.UserResponse;
import com.docintel.modules.user.domain.User;
import com.docintel.modules.user.domain.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.time.Instant;

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
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Mock
    private EmailVerificationTokenRepository emailVerificationTokenRepository;

    @Mock
    private EmailSender emailSender;

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

    @Test
    void shouldVerifyEmailSuccessfully() {
        // Arrange
        String tokenStr = "verificationToken";
        User user = new User();
        user.setEmail("user@example.com");
        user.setEmailVerified(false);

        EmailVerificationToken token = EmailVerificationToken.builder()
                .token(tokenStr)
                .user(user)
                .expiryDate(Instant.now().plusSeconds(3600))
                .build();

        when(emailVerificationTokenRepository.findByToken(tokenStr)).thenReturn(Optional.of(token));
        when(userRepository.save(user)).thenReturn(user);

        // Act
        authService.verifyEmail(tokenStr);

        // Assert
        assertTrue(user.isEmailVerified());
        verify(emailVerificationTokenRepository).findByToken(tokenStr);
        verify(userRepository).save(user);
        verify(emailVerificationTokenRepository).delete(token);
    }

    @Test
    void shouldForgotPasswordSuccessfully() {
        // Arrange
        String email = "john.doe@example.com";
        User user = new User();
        user.setEmail(email);
        user.setFirstName("John");

        ForgotPasswordRequest request = new ForgotPasswordRequest(email);

        when(userRepository.findByEmail(email)).thenReturn(Optional.of(user));

        // Act
        authService.forgotPassword(request);

        // Assert
        verify(passwordResetTokenRepository).deleteByUser(user);
        verify(passwordResetTokenRepository).save(any(PasswordResetToken.class));
        verify(emailSender).sendEmail(eq(email), eq("Recuperação de Senha - DocIntel"), anyString());
    }

    @Test
    void shouldResetPasswordSuccessfully() {
        // Arrange
        String tokenStr = "resetToken";
        User user = new User();
        user.setPassword("oldPassword");

        PasswordResetToken token = PasswordResetToken.builder()
                .token(tokenStr)
                .user(user)
                .expiryDate(Instant.now().plusSeconds(3600))
                .build();

        ResetPasswordRequest request = new ResetPasswordRequest(tokenStr, "newPassword123");

        when(passwordResetTokenRepository.findByToken(tokenStr)).thenReturn(Optional.of(token));
        when(passwordEncoder.encode("newPassword123")).thenReturn("encodedNewPassword");
        when(userRepository.save(user)).thenReturn(user);

        // Act
        authService.resetPassword(request);

        // Assert
        assertEquals("encodedNewPassword", user.getPassword());
        verify(passwordResetTokenRepository).findByToken(tokenStr);
        verify(passwordEncoder).encode("newPassword123");
        verify(userRepository).save(user);
        verify(passwordResetTokenRepository).delete(token);
    }
}
