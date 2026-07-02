package com.docintel.document.presentation.dto;

import com.docintel.document.domain.DocumentCategory;
import com.docintel.folder.domain.FolderVisibility;

import java.util.List;
import java.util.UUID;

public record FileTreeViewDTO(
        UUID id,
        String name,
        String type, // "FOLDER" or "FILE"
        String s3Key, // null for folders
        FolderVisibility visibility, // null for files
        DocumentCategory category, // null for folders
        boolean analyzed, // false for folders
        List<FileTreeViewDTO> children
) {}
