package com.docintel.modules.document.presentation.dto.response;

import com.docintel.modules.document.domain.Document;
import com.docintel.modules.document.domain.enums.DocumentCategory;
import com.docintel.modules.folder.domain.Folder;
import com.docintel.shared.dto.TreeViewType;
import com.docintel.modules.folder.domain.enums.FolderVisibility;
import com.docintel.modules.folder.domain.enums.FolderRole;

import java.util.List;
import java.util.UUID;

public record FileTreeViewResponseDTO(
        UUID id,
        String name,
        TreeViewType type, // "FOLDER" or "FILE"
        String s3Key, // null for folders
        FolderVisibility visibility, // null for files
        DocumentCategory category, // null for folders
        boolean analyzed, // false for folders
        List<FileTreeViewResponseDTO> children,
        boolean favorite,
        String tags,
        UUID ownerId,
        FolderRole role
) {
    public FileTreeViewResponseDTO(
            Document doc,
            List<FileTreeViewResponseDTO> children,
            FolderRole role) {
        this(
                doc.getId(),
                doc.getName(),
                TreeViewType.FILE,
                doc.getS3Key(),
                null,
                doc.getCategory(),
                doc.isAnalyzed(),
                children,
                doc.isFavorite(),
                doc.getTags(),
                doc.getOwner().getId(),
                role
        );
    }

    public FileTreeViewResponseDTO(
            Folder folder,
             List<FileTreeViewResponseDTO> children,
            FolderRole role) {
        this(
                folder.getId(),
                folder.getName(),
                TreeViewType.FOLDER,
                null,
                folder.getFolderVisibility(),
                null,
                false,
                children,
                false,
                "",
                folder.getOwner().getId(),
                role
        );
    }
}
