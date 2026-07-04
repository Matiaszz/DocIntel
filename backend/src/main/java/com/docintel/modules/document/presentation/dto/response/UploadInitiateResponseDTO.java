package com.docintel.modules.document.presentation.dto.response;

import java.util.List;

public record UploadInitiateResponseDTO(
        DocumentResponseDTO document,
        boolean isMultipart,
        String uploadUrl,
        String uploadId,
        List<String> uploadUrls,
        long partSize
) {
}
