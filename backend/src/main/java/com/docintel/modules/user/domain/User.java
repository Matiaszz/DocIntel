package com.docintel.modules.user.domain;

import com.docintel.modules.user.infrastructure.annotation.Password;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String firstName;
    private String lastName;

    @Column(unique = true)
    @Email
    private String email;

    @Password
    private String password;

    @Column(nullable = false)
    private boolean emailVerified = false;

}
