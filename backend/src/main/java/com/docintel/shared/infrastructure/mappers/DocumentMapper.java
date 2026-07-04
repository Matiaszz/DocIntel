package com.docintel.shared.infrastructure.mappers;

import com.docintel.document.domain.Document;
import com.docintel.document.presentation.dto.DocumentDTO;

public class DocumentMapper {
    public static DocumentDTO mapToDocumentDTO(Document document) {
        return new DocumentDTO(
                document.getId(),
                document.getName(),
                document.getS3Key(),
                document.getFolder() != null ? document.getFolder().getId() : null,
                document.getOwner().getId(),
                document.getAgentAnalysis(),
                document.isAnalyzed(),
                document.getCategory(),
                document.isFavorite(),
                document.getTags(),
                document.getStatus()
        );
    }
}
