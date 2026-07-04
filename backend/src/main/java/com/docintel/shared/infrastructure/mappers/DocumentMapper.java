package com.docintel.shared.infrastructure.mappers;

import com.docintel.modules.document.domain.Document;
import com.docintel.modules.document.presentation.dto.response.DocumentResponseDTO;

public class DocumentMapper {
    public static DocumentResponseDTO mapToDocumentDTO(Document document) {
        return new DocumentResponseDTO(
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
