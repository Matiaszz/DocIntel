package com.docintel.document.presentation.dto;

import com.docintel.document.domain.DocumentCategory;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.UUID;


public record UploadInitiateRequestDTO(
        String name, long size,
        String relativePath,
        UUID parentFolderId,
        DocumentCategory category) {
}
