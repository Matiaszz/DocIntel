package com.docintel.modules.folder.application;

import com.docintel.modules.folder.domain.enums.FolderInviteStatus;
import com.docintel.modules.folder.domain.enums.FolderRole;
import com.docintel.modules.folder.domain.enums.FolderVisibility;
import com.docintel.modules.folder.domain.Folder;
import com.docintel.modules.folder.domain.FolderPermission;
import com.docintel.modules.folder.domain.FolderPermissionRepository;
import com.docintel.modules.folder.domain.FolderRepository;
import com.docintel.modules.folder.presentation.dto.response.FolderPermissionResponseDTO;
import com.docintel.modules.folder.presentation.dto.response.results.FolderPermissionResult;
import com.docintel.modules.user.domain.User;
import com.docintel.modules.user.domain.UserRepository;
import com.docintel.shared.contracts.EmailSender;
import lombok.RequiredArgsConstructor;
import com.docintel.modules.folder.infrastructure.security.FolderSecurityEvaluator;
import com.docintel.shared.auth.CurrentUserProvider;
import org.jspecify.annotations.NonNull;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.HtmlUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static com.docintel.modules.folder.domain.enums.FolderInviteStatus.ACCEPTED;
import static com.docintel.modules.folder.domain.enums.FolderRole.ADMIN;

@Service
@RequiredArgsConstructor
public class FolderService {

    private final FolderRepository folderRepository;
    private final FolderPermissionRepository permissionRepository;
    private final UserRepository userRepository;
    private final EmailSender emailSender;
    private final FolderSecurityEvaluator folderSecurity;
    private final CurrentUserProvider userProvider;

    @Value("${app.frontendUrl}")
    private String frontendUrl;

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
                permission.setInviteStatus(FolderInviteStatus.ACCEPTED);
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

    @Transactional
    public void sendFolderInvite(UUID folderId, String destinataryEmail, FolderRole role) {
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found"));

        if (!folderSecurity.hasPermission(folderId, FolderRole.ADMIN)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only folder ADMINs can send invitations");
        }

        User recipient = userRepository.findByEmail(destinataryEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User with this email not found"));

        Optional<FolderPermission> existingPermissionOpt = permissionRepository.findByFolderIdAndUserId(folderId, recipient.getId());

        FolderPermission permission;
        if (existingPermissionOpt.isPresent()) {
            permission = existingPermissionOpt.get();
            if (permission.getInviteStatus() == FolderInviteStatus.ACCEPTED) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User already has access to this folder");
            }
            permission.setRole(role);
            permission.setInviteStatus(FolderInviteStatus.PENDING);
        } else {
            permission = FolderPermission.builder()
                    .folder(folder)
                    .user(recipient)
                    .role(role)
                    .inviteStatus(FolderInviteStatus.PENDING)
                    .build();
        }

        permissionRepository.save(permission);

        User currentUser = userProvider.getCurrentUser();
        String inviteLink = frontendUrl + "/folders/invites/accept?inviteId=" + permission.getId();
        String subject = "Convite para a pasta - " + folder.getName();
        String body = String.format(
                "<h3>Olá, %s!</h3>" +
                "<p>Você foi convidado por %s %s para colaborar na pasta <strong>%s</strong> com a permissão de <strong>%s</strong>.</p>" +
                "<p>Clique no link abaixo para aceitar o convite:</p>" +
                "<p><a href=\"%s\">Aceitar Convite</a></p>",
                recipient.getFirstName(),
                currentUser.getFirstName(),
                currentUser.getLastName(),
                folder.getName(),
                role.name(),
                inviteLink
        );

        emailSender.sendEmail(recipient.getEmail(), subject, body);
    }

    @Transactional
    public void acceptFolderInvite(UUID inviteId) {
        FolderPermission permission = permissionRepository.findById(inviteId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invitation not found"));

        UUID currentUserId = userProvider.getCurrentUserId();
        if (!permission.getUser().getId().equals(currentUserId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This invitation does not belong to you");
        }

        if (permission.getInviteStatus() != FolderInviteStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invitation is not pending");
        }

        permission.setInviteStatus(FolderInviteStatus.ACCEPTED);
        permissionRepository.save(permission);
    }

    @Transactional
    public void rejectFolderInvite(UUID inviteId) {
        FolderPermission permission = permissionRepository.findById(inviteId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invitation not found"));

        UUID currentUserId = userProvider.getCurrentUserId();
        if (!permission.getUser().getId().equals(currentUserId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This invitation does not belong to you");
        }

        if (permission.getInviteStatus() != FolderInviteStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invitation is not pending");
        }

        permissionRepository.delete(permission);
    }

    @Transactional(readOnly = true)
    public List<FolderPermission> getPendingInvitesForCurrentUser() {
        UUID currentUserId = userProvider.getCurrentUserId();
        return permissionRepository.findByUserIdAndInviteStatus(currentUserId, FolderInviteStatus.PENDING);
    }

    @Transactional
    public void toggleFolderVisibility(UUID folderId) {
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found"));

        if (!folderSecurity.hasPermission(folderId, FolderRole.ADMIN)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only folder ADMINs can change visibility");
        }

        if (folder.getFolderVisibility() == FolderVisibility.PUBLIC) {
            folder.setFolderVisibility(FolderVisibility.PRIVATE);
        } else {
            folder.setFolderVisibility(FolderVisibility.PUBLIC);
        }

        folderRepository.save(folder);
    }

    @Transactional(readOnly = true)
    public FolderPermissionResult loadFolderPermissions(UUID folderId) {
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found"));

        if (!folderSecurity.hasPermission(folderId, FolderRole.VIEWER)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only folder ADMINs can view permissions");
        }

        List<FolderPermission> permissions = permissionRepository.findByFolderId(folderId);

        return new FolderPermissionResult(folder, permissions);
    }

    @Transactional
    public void updateFolderPermission(UUID folderId, UUID permissionId, FolderRole newRole) {
        FolderPermission permission = permissionRepository.findById(permissionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Permission not found"));

        Folder folder = permission.getFolder();

        if (!folder.getId().equals(folderId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Permission does not belong to this folder");
        }

        if (!folderSecurity.hasPermission(folderId, FolderRole.ADMIN)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only folder ADMINs can manage permissions");
        }

        UUID currentUserId = userProvider.getCurrentUserId();
        UUID folderOwnerId = folder.getOwner().getId();

        if (folderOwnerId.equals(currentUserId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Owner's role cannot be changed");
        }

        permission.setRole(newRole);
        permissionRepository.save(permission);
    }

    @Transactional
    public void deleteFolderPermission(UUID folderId, UUID permissionId) {
        FolderPermission permission = permissionRepository.findById(permissionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Permission not found"));

        if (!permission.getFolder().getId().equals(folderId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Permission does not belong to this folder");
        }

        if (!folderSecurity.hasPermission(folderId, FolderRole.ADMIN)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only folder ADMINs can manage permissions");
        }

        permissionRepository.delete(permission);
    }

    @Transactional
    public @NonNull List<FolderPermissionResponseDTO> getFolderPermission(UUID id) {
        FolderPermissionResult result = loadFolderPermissions(id);
        Folder folder = result.folder();
        List<FolderPermission> permissions = result.permissions();

        FolderPermission ownerPermission = permissions.stream()
                .filter(fp -> fp.getUser().getId().equals(folder.getOwner().getId()))
                .findFirst()
                .orElse(null);

        if (ownerPermission == null) {
            ownerPermission = new FolderPermission();
            ownerPermission.setFolder(folder);
            ownerPermission.setUser(folder.getOwner());
            ownerPermission.setRole(ADMIN);
            ownerPermission.setInviteStatus(ACCEPTED);
            ownerPermission = permissionRepository.save(ownerPermission);
        }

        return getFolderPermissionResponseDTOS(folder, permissions, ownerPermission);
    }

    private static @NonNull List<FolderPermissionResponseDTO> getFolderPermissionResponseDTOS(Folder folder, List<FolderPermission> permissions, FolderPermission ownerPermission) {
        List<FolderPermissionResponseDTO> list = new ArrayList<>();
        list.add(new FolderPermissionResponseDTO(
                ownerPermission.getId(),
                folder.getOwner().getId(),
                folder.getOwner().getFirstName() + " " + folder.getOwner().getLastName(),
                folder.getOwner().getEmail(),
                ownerPermission.getRole(),
                "OWNER"
        ));

        for (FolderPermission fp : permissions) {
            if (fp.getUser().getId().equals(folder.getOwner().getId())) {
                continue;
            }

            list.add(new FolderPermissionResponseDTO(
                    fp.getId(),
                    fp.getUser().getId(),
                    fp.getUser().getFirstName() + " " + fp.getUser().getLastName(),
                    fp.getUser().getEmail(),
                    fp.getRole(),
                    fp.getInviteStatus().name()
            ));
        }
        return list;
    }

}
