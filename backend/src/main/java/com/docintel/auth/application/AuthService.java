package com.docintel.auth.application;

import com.docintel.auth.domain.RefreshToken;
import com.docintel.auth.domain.RefreshTokenRepository;
import com.docintel.auth.infrastructure.exception.EmailAlreadyInUseException;
import com.docintel.auth.infrastructure.exception.InvalidCredentialsException;
import com.docintel.auth.infrastructure.exception.InvalidRefreshTokenException;
import com.docintel.auth.presentation.dto.*;
import com.docintel.auth.domain.PasswordResetToken;
import com.docintel.auth.domain.PasswordResetTokenRepository;
import com.docintel.auth.domain.EmailVerificationToken;
import com.docintel.auth.domain.EmailVerificationTokenRepository;
import com.docintel.shared.infrastructure.email.EmailSender;
import com.docintel.user.domain.User;
import com.docintel.user.domain.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static com.docintel.shared.infrastructure.mappers.UserMapper.mapToUserResponse;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final EmailSender emailSender;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.frontendUrl}")
    private String frontendUrl;

    @Transactional
    public UserResponse register(RegisterRequest request) {
        if (userRepository.findByEmail(request.email()).isPresent()) {
            throw new EmailAlreadyInUseException("Email already in use");
        }

        User user = new User();
        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setEmail(request.email());
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setEmailVerified(false);

        User savedUser = userRepository.save(user);

        sendVerificationEmail(savedUser);

        return mapToUserResponse(savedUser);
    }

    @Transactional
    public LoginResult login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new InvalidCredentialsException("Invalid email or password"));

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new InvalidCredentialsException("Invalid email or password");
        }

        if (!user.isEmailVerified()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "E-mail não verificado. Por favor, verifique seu e-mail.");
        }

        String accessToken = jwtService.generateAccessToken(user);
        RefreshToken refreshToken = createRefreshToken(user);
        LoginResponse response = new LoginResponse(accessToken, mapToUserResponse(user));

        return new LoginResult(response, refreshToken.getToken());
    }

    @Transactional
    public String refresh(String refreshTokenStr) {
        RefreshToken refreshToken = refreshTokenRepository.findByToken(refreshTokenStr)
                .orElseThrow(() -> new InvalidRefreshTokenException("Invalid refresh token"));

        if (refreshToken.getExpiryDate().isBefore(Instant.now())) {
            refreshTokenRepository.delete(refreshToken);
            throw new InvalidRefreshTokenException("Refresh token was expired. Please sign in again");
        }

        // Generate new access token
        return jwtService.generateAccessToken(refreshToken.getUser());
    }

    @Transactional
    public void logout(String refreshTokenStr) {
        if (refreshTokenStr != null) {
            refreshTokenRepository.findByToken(refreshTokenStr)
                    .ifPresent(refreshTokenRepository::delete);
        }
    }

    @Transactional
    public void sendVerificationEmail(User user) {
        emailVerificationTokenRepository.deleteByUser(user);

        String token = UUID.randomUUID().toString();
        EmailVerificationToken verificationToken = EmailVerificationToken.builder()
                .user(user)
                .token(token)
                .expiryDate(Instant.now().plus(24, ChronoUnit.HOURS))
                .build();
        emailVerificationTokenRepository.save(verificationToken);

        String verificationLink = frontendUrl + "/verify-email?token=" + token;
        String subject = "Verifique seu e-mail - DocIntel";
        String body = String.format("<h3>Olá, %s!</h3>" +
                "<p>Obrigado por se cadastrar no DocIntel. Por favor, clique no link abaixo para verificar seu endereço de e-mail:</p>" +
                "<p><a href=\"%s\">Verificar E-mail</a></p>" +
                "<p>Este link expira em 24 horas.</p>", user.getFirstName(), verificationLink);

        emailSender.sendEmail(user.getEmail(), subject, body);
    }

    @Transactional
    public void verifyEmail(String tokenStr) {
        EmailVerificationToken token = emailVerificationTokenRepository.findByToken(tokenStr)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Token de verificação inválido"));

        if (token.getExpiryDate().isBefore(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Token de verificação expirado");
        }

        User user = token.getUser();
        user.setEmailVerified(true);
        userRepository.save(user);

        emailVerificationTokenRepository.delete(token);
    }

    @Transactional
    public void resendVerificationEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado"));

        if (user.isEmailVerified()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Este e-mail já está verificado.");
        }

        sendVerificationEmail(user);
    }

    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        userRepository.findByEmail(request.email()).ifPresent(user -> {
            passwordResetTokenRepository.deleteByUser(user);

            String token = UUID.randomUUID().toString();
            PasswordResetToken resetToken = PasswordResetToken.builder()
                    .user(user)
                    .token(token)
                    .expiryDate(Instant.now().plus(1, ChronoUnit.HOURS))
                    .build();
            passwordResetTokenRepository.save(resetToken);

            String resetLink = frontendUrl + "/reset-password?token=" + token;
            String subject = "Recuperação de Senha - DocIntel";
            String body = String.format("<h3>Olá, %s!</h3>" +
                    "<p>Recebemos uma solicitação para redefinir a sua senha no DocIntel.</p>" +
                    "<p>Clique no link abaixo para criar uma nova senha:</p>" +
                    "<p><a href=\"%s\">Redefinir Senha</a></p>" +
                    "<p>Este link expira em 1 hora.</p>" +
                    "<p>Se você não solicitou a redefinição de senha, por favor ignore este e-mail.</p>",
                    user.getFirstName(), resetLink);

            emailSender.sendEmail(user.getEmail(), subject, body);
        });
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        PasswordResetToken token = passwordResetTokenRepository.findByToken(request.token())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Token de recuperação inválido ou expirado"));

        if (token.getExpiryDate().isBefore(Instant.now())) {
            passwordResetTokenRepository.delete(token);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Token de recuperação expirado");
        }

        User user = token.getUser();
        user.setPassword(passwordEncoder.encode(request.password()));
        userRepository.save(user);

        passwordResetTokenRepository.delete(token);
    }

    private RefreshToken createRefreshToken(User user) {
        // Option: delete older refresh tokens for this user
        refreshTokenRepository.deleteByUser(user);

        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .token(UUID.randomUUID().toString())
                .expiryDate(Instant.now().plus(7, ChronoUnit.DAYS))
                .build();

        return refreshTokenRepository.save(refreshToken);
    }


}
