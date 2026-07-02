package com.docintel.document.presentation.dto;

import com.docintel.document.domain.DocumentCategory;

import java.util.UUID;

public record DocumentDTO(
        UUID id, String name,
        String s3Key, UUID folderId,
        UUID ownerId, String agentAnalysis,
        boolean analyzed, DocumentCategory category,
        boolean favorite, String tags
) {
}
