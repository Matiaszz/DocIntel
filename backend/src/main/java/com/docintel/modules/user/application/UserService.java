package com.docintel.modules.user.application;

import com.docintel.shared.infrastructure.security.CurrentUserProvider;
import com.docintel.modules.user.domain.User;
import com.docintel.modules.user.domain.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.docintel.modules.user.presentation.dto.request.UpdateUserRequest;
import com.docintel.modules.user.presentation.dto.request.ChangePasswordRequest;
import com.docintel.modules.auth.infrastructure.exception.EmailAlreadyInUseException;

import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final CurrentUserProvider userProvider;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

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

    public void changePassword(ChangePasswordRequest request) {
        User currentUser = userProvider.getCurrentUser();

        if (!passwordEncoder.matches(request.oldPassword(), currentUser.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Senha atual incorreta");
        }

        currentUser.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(currentUser);
    }

    public User getCurrentUser(){
        return  userProvider.getCurrentUser();
    }
}
