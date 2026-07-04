package com.docintel.modules.user.presentation;

import com.docintel.modules.user.presentation.dto.response.UserResponse;
import com.docintel.modules.user.application.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.docintel.modules.user.presentation.dto.request.UpdateUserRequest;
import com.docintel.modules.user.presentation.dto.request.ChangePasswordRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

import static com.docintel.shared.infrastructure.mappers.UserMapper.mapToUserResponse;

@RestController
@RequestMapping("/user")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<UserResponse> getUserById(@RequestParam UUID id){
        UserResponse response = mapToUserResponse(userService.getUserById(id));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getCurrentUser(){
        UserResponse response = mapToUserResponse(userService.getCurrentUser());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/me")
    public ResponseEntity<UserResponse> updateCurrentUser(@Valid @RequestBody UpdateUserRequest request){
        UserResponse response = mapToUserResponse(userService.updateCurrentUser(request));
        return ResponseEntity.ok(response);
    }

    @PutMapping("/me/password")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request){
        userService.changePassword(request);
        return ResponseEntity.ok().build();
    }

}
