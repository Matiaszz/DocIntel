package com.docintel.modules.folder.presentation;

import com.docintel.modules.folder.application.FolderService;
import com.docintel.modules.folder.domain.Folder;
import com.docintel.modules.folder.domain.FolderPermission;
import com.docintel.modules.folder.presentation.dto.request.FolderInviteRequestDTO;
import com.docintel.modules.folder.presentation.dto.request.UpdatePermissionRequestDTO;
import com.docintel.modules.folder.presentation.dto.request.MoveFolderRequestDTO;
import com.docintel.modules.folder.presentation.dto.response.FolderPermissionResponseDTO;
import com.docintel.modules.folder.presentation.dto.response.PendingInviteResponseDTO;
import com.docintel.modules.document.presentation.dto.response.FolderResponseDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/folders")
@RequiredArgsConstructor
public class FolderController {

    private final FolderService folderService;

    @PostMapping("/{id}/invites")
    public ResponseEntity<Map<String, String>> sendInvite(
            @PathVariable UUID id,
            @RequestBody FolderInviteRequestDTO request
    ) {
        folderService.sendFolderInvite(id, request.email(), request.role());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/invites/pending")
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
    public ResponseEntity<Void> acceptInvite(@PathVariable UUID inviteId) {
        folderService.acceptFolderInvite(inviteId);

        return ResponseEntity.noContent().build(); // 204
    }

    @PostMapping("/invites/{inviteId}/reject")
    public ResponseEntity<Void> rejectInvite(@PathVariable UUID inviteId) {
        folderService.rejectFolderInvite(inviteId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/toggle-visibility")
    public ResponseEntity<Map<String, String>> toggleVisibility(@PathVariable UUID id) {
        folderService.toggleFolderVisibility(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/permissions")
    public ResponseEntity<List<FolderPermissionResponseDTO>> getPermissions(@PathVariable UUID id) {
        List<FolderPermissionResponseDTO> response = folderService.getFolderPermission(id);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/permissions/{permissionId}")
    public ResponseEntity<Void> updatePermission(
            @PathVariable UUID id,
            @PathVariable UUID permissionId,
            @RequestBody UpdatePermissionRequestDTO request
    ) {
        folderService.updateFolderPermission(id, permissionId, request.role());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/permissions/{permissionId}")
    public ResponseEntity<Void> deletePermission(
            @PathVariable UUID id,
            @PathVariable UUID permissionId
    ) {
        folderService.deleteFolderPermission(id, permissionId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/move/{id}")
    public ResponseEntity<FolderResponseDTO> moveFolder(
            @PathVariable UUID id,
            @RequestBody MoveFolderRequestDTO request
    ) {
        Folder folder = folderService.moveFolder(id, request.parentFolderId());
        return ResponseEntity.ok(new FolderResponseDTO(
                folder.getId(),
                folder.getName(),
                folder.getParent() != null ? folder.getParent().getId() : null
        ));
    }
}
