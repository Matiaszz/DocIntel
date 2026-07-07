package com.docintel.modules.folder.presentation;

import com.docintel.modules.folder.application.FolderService;
import com.docintel.modules.folder.domain.Folder;
import com.docintel.modules.folder.domain.FolderPermission;
import com.docintel.modules.folder.domain.FolderPermissionRepository;
import com.docintel.modules.folder.domain.FolderRepository;
import com.docintel.modules.folder.domain.enums.FolderRole;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/folders")
@RequiredArgsConstructor
public class FolderController {

    private final FolderService folderService;
    private final FolderRepository folderRepository;
    private final FolderPermissionRepository folderPermissionRepository;

    public record FolderInviteRequestDTO(String email, FolderRole role) {}

    public record PendingInviteResponseDTO(
            UUID inviteId,
            UUID folderId,
            String folderName,
            String inviterName,
            FolderRole role
     ) {}

    @PostMapping("/{id}/invites")
    public ResponseEntity<Map<String, String>> sendInvite(
            @PathVariable UUID id,
            @RequestBody FolderInviteRequestDTO request
    ) {
        folderService.sendFolderInvite(id, request.email(), request.role());
        return ResponseEntity.ok(Map.of("message", "Convite enviado com sucesso"));
    }

    @GetMapping("/invites/pending")
    @Transactional(readOnly = true)
    public ResponseEntity<List<PendingInviteResponseDTO>> getPendingInvites() {
        List<FolderPermission> pendingInvites = folderService.getPendingInvitesForCurrentUser();
        List<PendingInviteResponseDTO> dtos = pendingInvites.stream()
                .map(permission -> new PendingInviteResponseDTO(
                        permission.getId(),
                        permission.getFolder().getId(),
                        permission.getFolder().getName(),
                        permission.getFolder().getOwner().getFirstName() + " " + permission.getFolder().getOwner().getLastName(),
                        permission.getRole()
                ))
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @PostMapping("/invites/{inviteId}/accept")
    public ResponseEntity<Map<String, String>> acceptInvite(@PathVariable UUID inviteId) {
        folderService.acceptFolderInvite(inviteId);
        return ResponseEntity.ok(Map.of("message", "Convite aceito com sucesso"));
    }

    @PostMapping("/invites/{inviteId}/reject")
    public ResponseEntity<Map<String, String>> rejectInvite(@PathVariable UUID inviteId) {
        folderService.rejectFolderInvite(inviteId);
        return ResponseEntity.ok(Map.of("message", "Convite rejeitado com sucesso"));
    }

    @PostMapping("/{id}/toggle-visibility")
    public ResponseEntity<Map<String, String>> toggleVisibility(@PathVariable UUID id) {
        folderService.toggleFolderVisibility(id);
        return ResponseEntity.ok(Map.of("message", "Visibilidade da pasta alterada com sucesso"));
    }

    public record FolderPermissionResponseDTO(
            UUID permissionId,
            UUID userId,
            String userName,
            String userEmail,
            FolderRole role,
            String inviteStatus
    ) {}

    public record UpdatePermissionRequestDTO(FolderRole role) {}

    @GetMapping("/{id}/permissions")
    @Transactional
    public ResponseEntity<List<FolderPermissionResponseDTO>> getPermissions(@PathVariable UUID id) {
        Folder folder = folderRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found"));

        List<FolderPermission> permissions = folderService.getFolderPermissions(id);

        FolderPermission ownerPermission = permissions.stream()
                .filter(fp -> fp.getUser().getId().equals(folder.getOwner().getId()))
                .findFirst()
                .orElse(null);

        if (ownerPermission == null) {
            ownerPermission = new FolderPermission();
            ownerPermission.setFolder(folder);
            ownerPermission.setUser(folder.getOwner());
            ownerPermission.setRole(FolderRole.ADMIN);
            ownerPermission.setInviteStatus(com.docintel.modules.folder.domain.enums.FolderInviteStatus.ACCEPTED);
            ownerPermission = folderPermissionRepository.save(ownerPermission);
        }

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

        return ResponseEntity.ok(list);
    }

    @PutMapping("/{id}/permissions/{permissionId}")
    public ResponseEntity<Map<String, String>> updatePermission(
            @PathVariable UUID id,
            @PathVariable UUID permissionId,
            @RequestBody UpdatePermissionRequestDTO request
    ) {
        folderService.updateFolderPermission(id, permissionId, request.role());
        return ResponseEntity.ok(Map.of("message", "Permissão atualizada com sucesso"));
    }

    @DeleteMapping("/{id}/permissions/{permissionId}")
    public ResponseEntity<Map<String, String>> deletePermission(
            @PathVariable UUID id,
            @PathVariable UUID permissionId
    ) {
        folderService.deleteFolderPermission(id, permissionId);
        return ResponseEntity.ok(Map.of("message", "Membro removido com sucesso"));
    }
}
