package com.docintel.modules.document.presentation.dto.request;

import com.docintel.shared.infrastructure.storage.CompletedPartDTO;

import java.util.List;

public record UploadCompleteRequestDTO(
        String uploadId,
        List<CompletedPartDTO> completedParts
) {
}
