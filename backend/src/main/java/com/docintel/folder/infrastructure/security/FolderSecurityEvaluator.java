package com.docintel.folder.infrastructure.security;

import com.docintel.folder.domain.Folder;
import com.docintel.folder.domain.FolderPermission;
import com.docintel.folder.domain.FolderPermissionRepository;
import com.docintel.folder.domain.FolderRepository;
import com.docintel.folder.domain.FolderRole;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

@Component("folderSecurity")
@RequiredArgsConstructor
public class FolderSecurityEvaluator {

    private final FolderPermissionRepository permissionRepository;
    private final FolderRepository folderRepository;

    public boolean hasPermission(UUID folderId, String requiredRoleName) {
        if (folderId == null) {
            return true; // Root access is checked separately or allowed
        }
        UUID userId = getCurrentUserId();
        if (userId == null) {
            return false;
        }
        FolderRole requiredRole = FolderRole.valueOf(requiredRoleName);
        return checkPermissionRecursively(folderId, userId, requiredRole);
    }

    private boolean checkPermissionRecursively(UUID folderId, UUID userId, FolderRole requiredRole) {
        if (folderId == null) {
            return false;
        }

        Optional<FolderPermission> perm = permissionRepository.findByFolderIdAndUserId(folderId, userId);
        if (perm.isPresent()) {
            FolderRole userRole = perm.get().getRole();
            return hasAuthority(userRole, requiredRole);
        }

        Folder folder = folderRepository.findById(folderId).orElse(null);
        if (folder != null && folder.getParent() != null) {
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

    private UUID getCurrentUserId() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated() && authentication.getPrincipal() instanceof UUID userId) {
            return userId;
        }
        return null;
    }
}
