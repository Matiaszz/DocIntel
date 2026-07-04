package com.docintel.document.presentation.dto;

import java.util.List;

public record UploadInitiateResponseDTO(
        DocumentDTO document,
        boolean isMultipart,
        String uploadUrl,
        String uploadId,
        List<String> uploadUrls,
        long partSize
) {
}
