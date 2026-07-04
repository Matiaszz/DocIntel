package com.docintel.modules.document.presentation.dto.request;

import com.docintel.modules.document.domain.enums.DocumentCategory;

import java.util.UUID;


public record UploadInitiateRequestDTO(
        String name, long size,
        String relativePath,
        UUID parentFolderId,
        DocumentCategory category) {
}
