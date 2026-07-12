package com.docintel.modules.folder.domain;

import com.docintel.modules.folder.domain.enums.FolderInviteStatus;
import com.docintel.modules.folder.domain.enums.FolderRole;
import com.docintel.modules.user.domain.User;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Entity
@Table(name = "folder_permissions", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"folder_id", "user_id"})
})
public class FolderPermission {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "folder_id", nullable = false)
    private Folder folder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FolderRole role;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FolderInviteStatus inviteStatus =  FolderInviteStatus.NOT_SENT;

    public void setRole(FolderRole role) {
        if (this.getInviteStatus() == FolderInviteStatus.ACCEPTED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User already has access to this folder");
        }

        this.role = role;
        this.inviteStatus = FolderInviteStatus.PENDING;
    }

    public void accept(UUID currentUserId) {
        if (!this.getUser().getId().equals(currentUserId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This invitation does not belong to you");
        }

        if (this.getInviteStatus() != FolderInviteStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invitation is not pending");
        }

        this.inviteStatus = FolderInviteStatus.ACCEPTED;
    }


    public boolean belongsToOwnerOf(Folder folder){
        return this.belongsToUser(folder.getOwner().getId());
    }

    public boolean belongsToUser(UUID userId){
        return this.user.getId().equals(userId);
    }

    public boolean belongsToFolder(UUID folderId){
        return this.folder.getId().equals(folderId);
    }

    public static FolderPermission create(Folder folder ){
        return new FolderPermission(folder);
    }

    private FolderPermission(Folder folder) {
        this.folder = folder;
        this.user = folder.getOwner();
        this.role = FolderRole.ADMIN;
        this.inviteStatus = FolderInviteStatus.ACCEPTED;
    }

}
