package com.docintel.modules.document.presentation.dto.response;

import com.docintel.modules.document.domain.enums.DocumentCategory;
import com.docintel.modules.document.domain.enums.DocumentStatus;

import java.util.UUID;

public record DocumentResponseDTO(
        UUID id, String name,
        String s3Key, UUID folderId,
        UUID ownerId, String agentAnalysis,
        boolean analyzed, DocumentCategory category,
        boolean favorite, String tags,
        DocumentStatus status
) {
}
