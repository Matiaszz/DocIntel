package com.docintel.modules.folder.presentation.dto.response;

import com.docintel.modules.folder.domain.enums.FolderRole;

import java.util.UUID;

public record PendingInviteResponseDTO(
        UUID inviteId,
        UUID folderId,
        String folderName,
        String inviterName,
        FolderRole role
) {}
