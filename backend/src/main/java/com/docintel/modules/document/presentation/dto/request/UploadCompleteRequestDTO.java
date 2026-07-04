package com.docintel.modules.document.presentation.dto.request;

import com.docintel.shared.dto.CompletedPartDTO;

import java.util.List;

public record UploadCompleteRequestDTO(
        String uploadId,
        List<CompletedPartDTO> completedParts
) {
}
