package com.docintel.modules.folder.presentation.dto.request;


import com.docintel.modules.folder.domain.enums.FolderRole;

public record FolderInviteRequestDTO(String email, FolderRole role) {}
