package com.docintel.document.presentation.dto;

import com.docintel.shared.infrastructure.storage.CompletedPartDTO;

import java.util.List;

public record UploadCompleteRequestDTO(
        String uploadId,
        List<CompletedPartDTO> completedParts
) {
}
