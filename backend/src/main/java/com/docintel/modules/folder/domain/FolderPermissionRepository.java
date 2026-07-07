package com.docintel.modules.folder.domain;

import com.docintel.modules.folder.domain.enums.FolderInviteStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FolderPermissionRepository extends JpaRepository<FolderPermission, UUID> {
    Optional<FolderPermission> findByFolderIdAndUserId(UUID folderId, UUID userId);
    void deleteByFolderId(UUID folderId);
    List<FolderPermission> findByUserIdAndInviteStatus(UUID userId, FolderInviteStatus inviteStatus);
    List<FolderPermission> findByFolderId(UUID folderId);
}

