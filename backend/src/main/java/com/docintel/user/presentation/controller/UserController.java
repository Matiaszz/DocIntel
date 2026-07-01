package com.docintel.user.presentation.controller;

import com.docintel.auth.presentation.dto.UserResponse;
import com.docintel.user.application.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;


import static com.docintel.shared.mappers.UserMapper.mapToUserResponse;

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

}
