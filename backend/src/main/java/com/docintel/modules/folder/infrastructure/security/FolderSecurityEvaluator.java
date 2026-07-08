package com.docintel.modules.folder.infrastructure.security;

import com.docintel.modules.folder.domain.Folder;
import com.docintel.modules.folder.domain.FolderPermission;
import com.docintel.modules.folder.domain.FolderPermissionRepository;
import com.docintel.modules.folder.domain.FolderRepository;
import com.docintel.modules.folder.domain.enums.FolderInviteStatus;
import com.docintel.modules.folder.domain.enums.FolderRole;
import com.docintel.modules.folder.domain.enums.FolderVisibility;
import com.docintel.shared.auth.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

@Component("folderSecurity")
@RequiredArgsConstructor
public class FolderSecurityEvaluator {

    private final FolderPermissionRepository permissionRepository;
    private final FolderRepository folderRepository;
    private final CurrentUserProvider userProvider;

    public boolean hasPermission(UUID folderId, FolderRole requiredRole) {
        if (folderId == null) {
            return true; // Root access is checked separately or allowed
        }

        UUID userId = userProvider.getCurrentUserId();
        if (userId == null) {
            return false;
        }

        return checkPermissionRecursively(folderId, userId, requiredRole);
    }

    private boolean checkPermissionRecursively(UUID folderId, UUID userId, FolderRole requiredRole) {
        if (folderId == null) {
            return false;
        }

        Folder folder = folderRepository.findById(folderId).orElse(null);
        if (folder == null) {
            return false;
        }

        Optional<FolderPermission> permissionOpt = permissionRepository.findByFolderIdAndUserId(folderId, userId);

        if (permissionOpt.isPresent()) {
            FolderPermission permission = permissionOpt.get();

            if (permission.getInviteStatus() == FolderInviteStatus.ACCEPTED
                    && hasAuthority(permission.getRole(), requiredRole)) {
                return true;
            }
            if (folder.getOwner().getId().equals(userId)) {
                return hasAuthority(permission.getRole(), requiredRole);
            }
        }

        if (folder.getOwner().getId().equals(userId)) {
            return true;
        }

        if (folder.getFolderVisibility() == FolderVisibility.PUBLIC
                && requiredRole == FolderRole.VIEWER) {
            return true;
        }

        if (folder.getParent() != null) {
            return checkPermissionRecursively(folder.getParent().getId(), userId, requiredRole);
        }

        return false;
    }

    private boolean hasAuthority(FolderRole userRole, FolderRole requiredRole) {
        if (userRole == FolderRole.ADMIN) return true;
        if (userRole == FolderRole.EDITOR) return requiredRole == FolderRole.EDITOR || requiredRole == FolderRole.VIEWER;
        if (userRole == FolderRole.VIEWER) return requiredRole == FolderRole.VIEWER;
        return false;
    }


}
