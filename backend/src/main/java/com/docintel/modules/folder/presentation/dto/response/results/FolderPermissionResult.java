package com.docintel.modules.folder.presentation.dto.response.results;

import com.docintel.modules.folder.domain.Folder;
import com.docintel.modules.folder.domain.FolderPermission;

import java.util.List;

public record FolderPermissionResult(
        Folder folder,
        List<FolderPermission> permissions
) {
}
