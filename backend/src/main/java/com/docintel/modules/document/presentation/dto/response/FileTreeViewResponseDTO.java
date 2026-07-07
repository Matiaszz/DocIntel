package com.docintel.modules.document.presentation.dto.response;

import com.docintel.modules.document.domain.enums.DocumentCategory;
import com.docintel.modules.folder.domain.enums.FolderVisibility;
import com.docintel.modules.folder.domain.enums.FolderRole;

import java.util.List;
import java.util.UUID;

public record FileTreeViewResponseDTO(
        UUID id,
        String name,
        String type, // "FOLDER" or "FILE"
        String s3Key, // null for folders
        FolderVisibility visibility, // null for files
        DocumentCategory category, // null for folders
        boolean analyzed, // false for folders
        List<FileTreeViewResponseDTO> children,
        boolean favorite,
        String tags,
        UUID ownerId,
        FolderRole role
) {}
