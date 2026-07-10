package com.docintel.modules.auth.presentation;

import com.docintel.modules.auth.application.AuthService;
import com.docintel.modules.auth.infrastructure.exception.InvalidRefreshTokenException;
import com.docintel.modules.auth.presentation.dto.LoginResult;
import com.docintel.modules.auth.presentation.dto.request.ForgotPasswordRequest;
import com.docintel.modules.auth.presentation.dto.request.LoginRequest;
import com.docintel.modules.auth.presentation.dto.request.RegisterRequest;
import com.docintel.modules.auth.presentation.dto.request.ResetPasswordRequest;
import com.docintel.modules.auth.presentation.dto.response.LoginResponse;
import com.docintel.modules.auth.presentation.dto.response.TokenResponse;
import com.docintel.modules.user.domain.User;
import com.docintel.modules.user.presentation.dto.response.UserResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Value("${app.cookie.secure:false}")
    private boolean cookieSecure;

    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(@Valid @RequestBody RegisterRequest request) {
        log.info("Registering user: {}", request.email());
        User user = authService.register(request);
        UserResponse response = UserResponse.from(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        log.info("User logging in: {}", request.email());
        LoginResult result = authService.login(request);

        ResponseCookie cookie = ResponseCookie.from("refreshToken", result.refreshToken())
                .httpOnly(true)
                .secure(cookieSecure)
                .path("/")
                .maxAge(7 * 24 * 60 * 60)
                .sameSite("strict")
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(result.response());
    }

    @PostMapping("/refresh")
    public ResponseEntity<TokenResponse> refresh(@CookieValue(name = "refreshToken", required = false) String refreshToken) {
        log.info("Refreshing access token");

        if (refreshToken == null || refreshToken.isBlank()) {
            throw new InvalidRefreshTokenException("Refresh token is missing");
        }

        String newAccessToken = authService.refresh(refreshToken);
        return ResponseEntity.ok(new TokenResponse(newAccessToken));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@CookieValue(name = "refreshToken", required = false) String refreshToken) {
        log.info("User logging out");
        authService.logout(refreshToken);

        ResponseCookie cookie = ResponseCookie.from("refreshToken", "")
                .httpOnly(true)
                .secure(cookieSecure)
                .path("/")
                .maxAge(0)
                .sameSite("strict")
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .build();
    }

    @PostMapping("/verify-email")
    public ResponseEntity<Void> verifyEmail(@RequestParam("token") String token) {
        log.info("Verifying email with token");
        authService.verifyEmail(token);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<Void> resendVerification(@RequestParam("email") String email) {
        log.info("Resending verification email to {}", email);
        authService.resendVerificationEmail(email);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        log.info("Request forgot password for email {}", request.email());
        authService.forgotPassword(request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        log.info("Resetting password using token");
        authService.resetPassword(request);
        return ResponseEntity.ok().build();
    }
}