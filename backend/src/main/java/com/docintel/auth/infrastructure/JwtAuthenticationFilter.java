package com.docintel.auth.infrastructure;

import com.docintel.auth.application.JwtService;
import com.docintel.auth.infrastructure.exception.JwtException;
import com.docintel.auth.infrastructure.exception.JwtExpiredException;
import com.docintel.auth.infrastructure.exception.JwtInvalidException;
import com.docintel.shared.exception.ApiError;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.NonNull;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {

        String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);

        try {
            UUID userId = jwtService.getUserIdFromToken(token);

            // Construct an authentication object containing the user's principal (their ID)
            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    userId,
                    null,
                    Collections.emptyList()
            );

            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authentication);
        } catch (JwtException e) {
            String code = e instanceof JwtExpiredException ? "TOKEN_EXPIRED" : "INVALID_TOKEN";
            writeErrorResponse(response, request, code, e.getMessage());
            return;
        }

        filterChain.doFilter(request, response);
    }

    private void writeErrorResponse(HttpServletResponse response,
                                    HttpServletRequest request,
                                    String code,
                                    String message) throws IOException {
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        ApiError apiError = ApiError.builder()
                .timestamp(OffsetDateTime.now())
                .status(HttpStatus.UNAUTHORIZED.value())
                .error(HttpStatus.UNAUTHORIZED.getReasonPhrase())
                .code(code)
                .message(message)
                .path(request.getRequestURI())
                .build();

        response.getWriter().write(objectMapper.writeValueAsString(apiError));
    }
}
