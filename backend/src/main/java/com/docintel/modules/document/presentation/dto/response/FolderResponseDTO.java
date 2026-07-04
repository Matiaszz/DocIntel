package com.docintel.modules.document.presentation.dto.response;

import java.util.UUID;

public record FolderResponseDTO(
        UUID id,
        String name,
        UUID parentId
) {}

