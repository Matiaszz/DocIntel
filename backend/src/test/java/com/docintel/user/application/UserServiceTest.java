package com.docintel.user.application;

import com.docintel.modules.user.application.UserService;
import com.docintel.shared.auth.CurrentUserProvider;
import com.docintel.modules.user.domain.User;
import com.docintel.modules.user.domain.UserRepository;
import com.docintel.modules.user.presentation.dto.request.UpdateUserRequest;
import com.docintel.modules.user.presentation.dto.request.ChangePasswordRequest;
import com.docintel.modules.auth.infrastructure.exception.EmailAlreadyInUseException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private CurrentUserProvider userProvider;

    @Mock
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    @Test
    void shouldGetUserByIdSuccessfully() {
        // Arrange
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setId(userId);
        user.setEmail("test@example.com");

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        // Act
        User result = userService.getUserById(userId);

        // Assert
        assertNotNull(result);
        assertEquals(userId, result.getId());
        assertEquals("test@example.com", result.getEmail());
        verify(userRepository).findById(userId);
    }

    @Test
    void shouldThrowNotFoundWhenUserDoesNotExist() {
        // Arrange
        UUID userId = UUID.randomUUID();
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        // Act & Assert
        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            userService.getUserById(userId);
        });

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
        assertEquals("User not found", exception.getReason());
        verify(userRepository).findById(userId);
    }

    @Test
    void shouldThrowUnauthorizedWhenUserProviderThrowsUnauthorized() {
        // Arrange
        when(userProvider.getCurrentUser()).thenThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User is not authenticated"));

        // Act & Assert
        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            userService.getCurrentUser();
        });

        assertEquals(HttpStatus.UNAUTHORIZED, exception.getStatusCode());
        assertEquals("User is not authenticated", exception.getReason());
    }

    @Test
    void shouldGetCurrentUserSuccessfully() {
        // Arrange
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setId(userId);
        user.setEmail("current@example.com");

        when(userProvider.getCurrentUser()).thenReturn(user);

        // Act
        User result = userService.getCurrentUser();

        // Assert
        assertNotNull(result);
        assertEquals(userId, result.getId());
        assertEquals("current@example.com", result.getEmail());
        verify(userProvider).getCurrentUser();
    }

    @Test
    void shouldUpdateCurrentUserWithoutEmailChange() {
        // Arrange
        UUID userId = UUID.randomUUID();
        User currentUser = new User();
        currentUser.setId(userId);
        currentUser.setEmail("test@example.com");
        currentUser.setFirstName("OldFirst");
        currentUser.setLastName("OldLast");

        when(userProvider.getCurrentUser()).thenReturn(currentUser);
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateUserRequest request = new UpdateUserRequest("NewFirst", "NewLast", "test@example.com");

        // Act
        User result = userService.updateCurrentUser(request);

        // Assert
        assertNotNull(result);
        assertEquals("NewFirst", result.getFirstName());
        assertEquals("NewLast", result.getLastName());
        assertEquals("test@example.com", result.getEmail());
        verify(userRepository, never()).findByEmail(anyString());
        verify(userRepository).save(currentUser);
    }

    @Test
    void shouldUpdateCurrentUserWithEmailChangeSuccessfully() {
        // Arrange
        UUID userId = UUID.randomUUID();
        User currentUser = new User();
        currentUser.setId(userId);
        currentUser.setEmail("old@example.com");

        when(userProvider.getCurrentUser()).thenReturn(currentUser);
        when(userRepository.findByEmail("new@example.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateUserRequest request = new UpdateUserRequest("First", "Last", "new@example.com");

        // Act
        User result = userService.updateCurrentUser(request);

        // Assert
        assertNotNull(result);
        assertEquals("new@example.com", result.getEmail());
        verify(userRepository).findByEmail("new@example.com");
        verify(userRepository).save(currentUser);
    }

    @Test
    void shouldThrowEmailAlreadyInUseWhenUpdatingEmailToExistingOne() {
        // Arrange
        UUID userId = UUID.randomUUID();
        User currentUser = new User();
        currentUser.setId(userId);
        currentUser.setEmail("old@example.com");

        when(userProvider.getCurrentUser()).thenReturn(currentUser);
        when(userRepository.findByEmail("existing@example.com")).thenReturn(Optional.of(new User()));

        UpdateUserRequest request = new UpdateUserRequest("First", "Last", "existing@example.com");

        // Act & Assert
        assertThrows(EmailAlreadyInUseException.class, () -> {
            userService.updateCurrentUser(request);
        });

        verify(userRepository).findByEmail("existing@example.com");
        verify(userRepository, never()).save(any(User.class));
     }

     @Test
     void shouldChangePasswordSuccessfully() {
         // Arrange
         User currentUser = new User();
         currentUser.setPassword("encodedOldPassword");

         ChangePasswordRequest request = new ChangePasswordRequest("oldPassword", "newPassword8Chars");

         when(userProvider.getCurrentUser()).thenReturn(currentUser);
         when(passwordEncoder.matches("oldPassword", "encodedOldPassword")).thenReturn(true);
         when(passwordEncoder.encode("newPassword8Chars")).thenReturn("encodedNewPassword");
         when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

         // Act
         userService.changePassword(request);

         // Assert
         assertEquals("encodedNewPassword", currentUser.getPassword());
         verify(passwordEncoder).matches("oldPassword", "encodedOldPassword");
         verify(passwordEncoder).encode("newPassword8Chars");
         verify(userRepository).save(currentUser);
     }

     @Test
     void shouldThrowExceptionWhenOldPasswordIsIncorrect() {
         // Arrange
         User currentUser = new User();
         currentUser.setPassword("encodedOldPassword");

         ChangePasswordRequest request = new ChangePasswordRequest("wrongPassword", "newPassword8Chars");

         when(userProvider.getCurrentUser()).thenReturn(currentUser);
         when(passwordEncoder.matches("wrongPassword", "encodedOldPassword")).thenReturn(false);

         // Act & Assert
         ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
             userService.changePassword(request);
         });

         assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
         assertEquals("Senha atual incorreta", exception.getReason());
         verify(passwordEncoder).matches("wrongPassword", "encodedOldPassword");
         verify(userRepository, never()).save(any(User.class));
     }
}
