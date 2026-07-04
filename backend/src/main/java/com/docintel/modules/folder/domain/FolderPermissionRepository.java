package com.docintel.modules.folder.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface FolderPermissionRepository extends JpaRepository<FolderPermission, UUID> {
    Optional<FolderPermission> findByFolderIdAndUserId(UUID folderId, UUID userId);
    void deleteByFolderId(UUID folderId);
}
