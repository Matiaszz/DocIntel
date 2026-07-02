package com.docintel.user.application;

import com.docintel.shared.infrastructure.security.CurrentUserProvider;
import com.docintel.user.domain.User;
import com.docintel.user.domain.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.docintel.user.presentation.dto.UpdateUserRequest;
import com.docintel.auth.infrastructure.exception.EmailAlreadyInUseException;

import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final CurrentUserProvider userProvider;

    public User getUserById(UUID id){

        return  userRepository.findById(id).orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")
        );
    }

    public User updateCurrentUser(UpdateUserRequest request) {
        User currentUser = userProvider.getCurrentUser();

        if (!currentUser.getEmail().equalsIgnoreCase(request.email())) {
            if (userRepository.findByEmail(request.email()).isPresent()) {
                throw new EmailAlreadyInUseException("O endereço de e-mail informado já está em uso.");
            }
            currentUser.setEmail(request.email());
        }

        currentUser.setFirstName(request.firstName());
        currentUser.setLastName(request.lastName());

        return userRepository.save(currentUser);
    }

    public User getCurrentUser(){
        return  userProvider.getCurrentUser();
    }
}
