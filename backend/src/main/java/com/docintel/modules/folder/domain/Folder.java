package com.docintel.modules.folder.domain;

import com.docintel.modules.folder.domain.enums.FolderVisibility;
import com.docintel.modules.user.domain.User;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@Entity
@Table(name = "folders")
public class Folder {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Folder parent;

    @OneToMany(mappedBy = "parent", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Folder> subfolders = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FolderVisibility folderVisibility = FolderVisibility.PRIVATE;

    public boolean isOwnedBy(UUID userId){
        return this.owner.getId().equals(userId);
    }

    public static Folder create(String folderName, Folder parent, User owner) {
        if (folderName == null || folderName.isBlank()) {
            throw new IllegalArgumentException("Folder name cannot be empty");
        }

        if (owner == null) {
            throw new IllegalArgumentException("Folder owner is required");
        }

        if (folderName.length() > 255) {
            throw new IllegalArgumentException("Folder name cannot exceed 255 characters");
        }

        return new Folder(
                folderName,
                parent,
                owner
        );
    }

    private Folder(String folderName, Folder currentParent, User owner){
        this.name = folderName;
        this.parent = currentParent;
        this.owner = owner;
    }

}
