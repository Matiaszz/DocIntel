package com.docintel.shared.exception;

import com.docintel.modules.auth.infrastructure.exception.EmailAlreadyInUseException;
import com.docintel.modules.auth.infrastructure.exception.InvalidCredentialsException;
import com.docintel.modules.auth.infrastructure.exception.InvalidRefreshTokenException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @Value("${app.cookie.secure:false}")
    private boolean cookieSecure;

    @ExceptionHandler(EmailAlreadyInUseException.class)
    public ResponseEntity<ApiError> handleEmailAlreadyInUse(EmailAlreadyInUseException e, HttpServletRequest request) {
        log.warn("Registration conflict: {}", e.getMessage());
        ApiError error = ApiError.builder()
                .timestamp(OffsetDateTime.now())
                .status(HttpStatus.CONFLICT.value())
                .error(HttpStatus.CONFLICT.getReasonPhrase())
                .code("EMAIL_ALREADY_IN_USE")
                .message(e.getMessage())
                .path(request.getRequestURI())
                .build();
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<ApiError> handleInvalidCredentials(InvalidCredentialsException e, HttpServletRequest request) {
        log.warn("Authentication failed: {}", e.getMessage());
        ApiError error = ApiError.builder()
                .timestamp(OffsetDateTime.now())
                .status(HttpStatus.UNAUTHORIZED.value())
                .error(HttpStatus.UNAUTHORIZED.getReasonPhrase())
                .code("INVALID_CREDENTIALS")
                .message(e.getMessage())
                .path(request.getRequestURI())
                .build();
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
    }

    @ExceptionHandler(InvalidRefreshTokenException.class)
    public ResponseEntity<ApiError> handleInvalidRefreshToken(InvalidRefreshTokenException e, HttpServletRequest request, HttpServletResponse response) {
        log.warn("Token refresh failed: {}", e.getMessage());

        ResponseCookie clearCookie = ResponseCookie.from("refreshToken", "")
                .httpOnly(true)
                .secure(cookieSecure)
                .path("/")
                .maxAge(0)
                .sameSite("Lax")
                .build();

        ApiError error = ApiError.builder()
                .timestamp(OffsetDateTime.now())
                .status(HttpStatus.UNAUTHORIZED.value())
                .error(HttpStatus.UNAUTHORIZED.getReasonPhrase())
                .code("INVALID_REFRESH_TOKEN")
                .message(e.getMessage())
                .path(request.getRequestURI())
                .build();

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .header(HttpHeaders.SET_COOKIE, clearCookie.toString())
                .body(error);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidationExceptions(MethodArgumentNotValidException e, HttpServletRequest request) {
        Map<String, String> details = new HashMap<>();
        e.getBindingResult().getAllErrors().forEach((error) -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            details.put(fieldName, errorMessage);
        });
        log.warn("Validation failed: {}", details);

        boolean isWeakPassword = e.getBindingResult().getFieldErrors().stream()
                .anyMatch(fieldError -> "password".equals(fieldError.getField()));
        String code = isWeakPassword ? "WEAK_PASSWORD" : "VALIDATION_FAILED";

        ApiError error = ApiError.builder()
                .timestamp(OffsetDateTime.now())
                .status(HttpStatus.BAD_REQUEST.value())
                .error(HttpStatus.BAD_REQUEST.getReasonPhrase())
                .code(code)
                .message("Validation failed")
                .path(request.getRequestURI())
                .details(details)
                .build();

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiError> handleMethodNotSupported(
            HttpRequestMethodNotSupportedException e,
            HttpServletRequest request
    ) {
        Map<String, String> details = new HashMap<>();

        details.put("method", e.getMethod());
        details.put("supportedMethods", String.valueOf(e.getSupportedHttpMethods()));

        log.warn("HTTP method not supported: {}", e.getMethod());

        ApiError error = ApiError.builder()
                .timestamp(OffsetDateTime.now())
                .status(HttpStatus.METHOD_NOT_ALLOWED.value())
                .error(HttpStatus.METHOD_NOT_ALLOWED.getReasonPhrase())
                .code("METHOD_NOT_ALLOWED")
                .message("HTTP method not allowed for this endpoint")
                .path(request.getRequestURI())
                .details(details)
                .build();

        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(error);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiError> handleNoResourceFound(
            NoResourceFoundException e,
            HttpServletRequest request
    ) {

        Map<String, String> details = new HashMap<>();

        details.put("message", "Resource not found");
        details.put("path", request.getRequestURI());
        details.put("method", request.getMethod());

        log.warn("No resource found: {} {}", request.getMethod(), request.getRequestURI());

        ApiError error = ApiError.builder()
                .timestamp(OffsetDateTime.now())
                .status(HttpStatus.NOT_FOUND.value())
                .error(HttpStatus.NOT_FOUND.getReasonPhrase())
                .code("NOT_FOUND")
                .message("Endpoint not found")
                .path(request.getRequestURI())
                .details(details)
                .build();

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }


    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiError> handleResponseStatusException(ResponseStatusException e, HttpServletRequest request) {
        log.warn("Response status exception: {} - {}", e.getStatusCode(), e.getReason());
        
        int statusCode = e.getStatusCode().value();
        String errorName = HttpStatus.valueOf(statusCode).getReasonPhrase();
        
        String code = "RESPONSE_STATUS_EXCEPTION";
        if (e.getReason() != null && e.getReason().contains("E-mail não verificado")) {
            code = "EMAIL_UNVERIFIED";
        }

        ApiError error = ApiError.builder()
                .timestamp(OffsetDateTime.now())
                .status(statusCode)
                .error(errorName)
                .code(code)
                .message(e.getReason())
                .path(request.getRequestURI())
                .build();
        return ResponseEntity.status(e.getStatusCode()).body(error);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiError> handleInvalidArgumentException(IllegalArgumentException e, HttpServletRequest request) {
        log.warn("Invalid argument exception: {}", e.getMessage());

        String errorName = HttpStatus.valueOf(400).getReasonPhrase();

        String code = "ILLEGAL_ARGUMENT_EXCEPTION";

        ApiError error = ApiError.builder()
                .timestamp(OffsetDateTime.now())
                .status(400)
                .error(errorName)
                .code(code)
                .message(e.getMessage())
                .path(request.getRequestURI())
                .build();
        return ResponseEntity.status(400).body(error);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleGenericException(Exception e, HttpServletRequest request) {
        log.error("Unhandled exception occurred", e);
        ApiError error = ApiError.builder()
                .timestamp(OffsetDateTime.now())
                .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                .error(HttpStatus.INTERNAL_SERVER_ERROR.getReasonPhrase())
                .code("INTERNAL_SERVER_ERROR")
                .message("An unexpected error occurred")
                .path(request.getRequestURI())
                .build();
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }

    @ExceptionHandler(UnsupportedOperationException.class)
    public ResponseEntity<ApiError> handleUnsupportedOperationException(Exception e, HttpServletRequest request) {
        log.error("Unsupported operation exception: {}", e.getMessage());
        ApiError error = ApiError.builder()
                .timestamp(OffsetDateTime.now())
                .status(HttpStatus.NOT_IMPLEMENTED.value())
                .error(HttpStatus.NOT_IMPLEMENTED.getReasonPhrase())
                .code("UNSUPPORTED_OPERATION")
                .message(e.getMessage())
                .path(request.getRequestURI())
                .build();
        
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).body(error);

    }
}
