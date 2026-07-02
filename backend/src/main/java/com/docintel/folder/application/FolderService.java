package com.docintel.folder.application;

import com.docintel.document.domain.Document;
import com.docintel.folder.domain.*;
import com.docintel.user.domain.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.HtmlUtils;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FolderService {

    private final FolderRepository folderRepository;
    private final FolderPermissionRepository permissionRepository;

    /**
     * Resolves a relative path (e.g. "finance/invoices/2026/") under a parent folder.
     * If folders do not exist, they are created dynamically, and the current user
     * is granted the ADMIN role by default.
     */
    @Transactional
    public Folder resolveAndCreatePath(String relativePath, UUID parentFolderId, User currentUser) {
        if (relativePath == null || relativePath.trim().isEmpty()) {
            if (parentFolderId == null) {
                return null; // Root
            }
            return folderRepository.findById(parentFolderId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Parent folder not found"));
        }

        boolean isFile = isFilePath(relativePath);
        String cleanedPath = relativePath.replaceAll("^/+", "").replaceAll("/+$", "");
        String[] parts = cleanedPath.split("/");

        Folder currentParent = null;
        if (parentFolderId != null) {
            currentParent = folderRepository.findById(parentFolderId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Parent folder not found"));
        }

        int folderCount = isFile ? parts.length - 1 : parts.length;

        for (int i = 0; i < folderCount; i++) {
            String folderName = HtmlUtils.htmlEscape(parts[i]);
            if (folderName.trim().isEmpty()) continue;
            if (parts[i].equals(".") || parts[i].equals("..")) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid path segment.");
            }

            Optional<Folder> existingFolder;
            if (currentParent == null) {
                existingFolder = folderRepository.findByNameAndParentIsNull(folderName);
            } else {
                existingFolder = folderRepository.findByNameAndParent(folderName, currentParent);
            }

            if (existingFolder.isPresent()) {
                currentParent = existingFolder.get();
            } else {
                // Create dynamic folder
                Folder newFolder = new Folder();
                newFolder.setName(folderName);
                newFolder.setParent(currentParent);
                newFolder.setOwner(currentUser);
                currentParent = folderRepository.save(newFolder);

                // Admin by default when created
                FolderPermission permission = new FolderPermission();
                permission.setFolder(currentParent);
                permission.setUser(currentUser);
                permission.setRole(FolderRole.ADMIN);
                permissionRepository.save(permission);
            }
        }

        return currentParent;
    }

    public boolean isFilePath(String path) {
        if (path == null || path.trim().isEmpty()) return false;
        if (path.endsWith("/")) return false;
        String lastSegment = path.substring(path.lastIndexOf("/") + 1);
        return lastSegment.contains(".");
    }

    public String extractFileName(String path) {
        if (path == null || path.trim().isEmpty()) return null;
        return path.substring(path.lastIndexOf("/") + 1);
    }
}
