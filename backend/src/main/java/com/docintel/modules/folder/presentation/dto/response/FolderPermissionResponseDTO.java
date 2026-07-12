package com.docintel.modules.folder.presentation.dto.response;

import com.docintel.modules.folder.domain.Folder;
import com.docintel.modules.folder.domain.FolderPermission;
import com.docintel.modules.folder.domain.enums.FolderRole;

import java.util.UUID;

public record FolderPermissionResponseDTO(
        UUID permissionId,
        UUID userId,
        String userName,
        String userEmail,
        FolderRole role,
        String inviteStatus
) {
    public FolderPermissionResponseDTO(FolderPermission fp){
        this(
                fp.getId(),
                fp.getUser().getId(),
                fp.getUser().getFirstName() + " " + fp.getUser().getLastName(),
                fp.getUser().getEmail(),
                fp.getRole(),
                fp.getInviteStatus().name()
        );
    }

    public static FolderPermissionResponseDTO createOwnerResponse(Folder folder, FolderPermission ownerPermission){
        return new FolderPermissionResponseDTO(
                ownerPermission.getId(),
                folder.getOwner().getId(),
                folder.getOwner().getFirstName() + " " + folder.getOwner().getLastName(),
                folder.getOwner().getEmail(),
                ownerPermission.getRole(),
                "OWNER"
        );

    }
}
