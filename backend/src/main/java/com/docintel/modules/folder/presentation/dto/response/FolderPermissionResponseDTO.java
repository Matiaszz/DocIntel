package com.docintel.modules.folder.presentation.dto.response;

import com.docintel.modules.folder.domain.enums.FolderRole;

import java.util.UUID;

public record FolderPermissionResponseDTO(
        UUID permissionId,
        UUID userId,
        String userName,
        String userEmail,
        FolderRole role,
        String inviteStatus
) {}
