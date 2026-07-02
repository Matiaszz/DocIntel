package com.docintel.document.presentation.dto;

import java.util.UUID;

public record FolderDTO(
        UUID id,
        String name,
        UUID parentId
) {}

