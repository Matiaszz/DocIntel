package com.docintel.folder.application;

import com.docintel.modules.folder.application.FolderService;
import com.docintel.modules.folder.domain.enums.FolderInviteStatus;
import com.docintel.modules.folder.domain.enums.FolderRole;
import com.docintel.modules.folder.domain.Folder;
import com.docintel.modules.folder.domain.FolderPermission;
import com.docintel.modules.folder.domain.FolderPermissionRepository;
import com.docintel.modules.folder.domain.FolderRepository;
import com.docintel.modules.user.domain.User;
import com.docintel.modules.user.domain.UserRepository;
import com.docintel.shared.contracts.EmailSender;
import com.docintel.modules.folder.infrastructure.security.FolderSecurityEvaluator;
import com.docintel.shared.auth.CurrentUserProvider;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class FolderServiceTest {

    @Mock
    private FolderRepository folderRepository;

    @Mock
    private FolderPermissionRepository permissionRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private EmailSender emailSender;

    @Mock
    private FolderSecurityEvaluator folderSecurity;

    @Mock
    private CurrentUserProvider userProvider;

    @InjectMocks
    private FolderService folderService;

    @Test
    void shouldReturnNullWhenRelativePathAndParentFolderIdAreNull() {
        // Act
        Folder result = folderService.resolveAndCreatePath(null, null);

        // Assert
        assertNull(result);
        verifyNoInteractions(folderRepository, permissionRepository);
    }

    @Test
    void shouldReturnParentFolderWhenRelativePathIsEmptyAndParentFolderExists() {
        // Arrange
        UUID parentId = UUID.randomUUID();
        Folder parentFolder = new Folder();
        parentFolder.setId(parentId);
        parentFolder.setName("Parent");

        when(folderRepository.findById(parentId)).thenReturn(Optional.of(parentFolder));

        // Act
        Folder result = folderService.resolveAndCreatePath(" ", parentId);

        // Assert
        assertNotNull(result);
        assertEquals(parentFolder, result);
        verify(folderRepository).findById(parentId);
        verifyNoMoreInteractions(folderRepository);
        verifyNoInteractions(permissionRepository);
    }

    @Test
    void shouldThrowNotFoundWhenRelativePathIsEmptyAndParentFolderDoesNotExist() {
        // Arrange
        UUID parentId = UUID.randomUUID();
        when(folderRepository.findById(parentId)).thenReturn(Optional.empty());

        // Act & Assert
        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            folderService.resolveAndCreatePath("", parentId);
        });

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
        assertEquals("Parent folder not found", exception.getReason());
        verify(folderRepository).findById(parentId);
    }

    @Test
    void shouldReturnExistingFoldersWithoutCreatingNewOnes() {
        // Arrange
        User user = new User();
        user.setId(UUID.randomUUID());

        Folder rootFolder = new Folder();
        rootFolder.setId(UUID.randomUUID());
        rootFolder.setName("finance");

        Folder subFolder = new Folder();
        subFolder.setId(UUID.randomUUID());
        subFolder.setName("invoices");
        subFolder.setParent(rootFolder);

        when(folderRepository.findByNameAndParentIsNull("finance")).thenReturn(Optional.of(rootFolder));
        when(folderRepository.findByNameAndParent("invoices", rootFolder)).thenReturn(Optional.of(subFolder));

        // Act
        Folder result = folderService.resolveAndCreatePath("finance/invoices/", null);

        // Assert
        assertNotNull(result);
        assertEquals(subFolder, result);
        verify(folderRepository).findByNameAndParentIsNull("finance");
        verify(folderRepository).findByNameAndParent("invoices", rootFolder);
        verifyNoMoreInteractions(folderRepository);
        verifyNoInteractions(permissionRepository);
    }

    @Test
    void shouldCreateNewFoldersAndGrantAdminPermissions() {
        // Arrange
        User user = new User();
        user.setId(UUID.randomUUID());
        when(userProvider.getCurrentUser()).thenReturn(user);

        when(folderRepository.findByNameAndParentIsNull("finance")).thenReturn(Optional.empty());

        Folder savedRootFolder = new Folder();
        savedRootFolder.setId(UUID.randomUUID());
        savedRootFolder.setName("finance");
        savedRootFolder.setOwner(user);

        when(folderRepository.save(any(Folder.class))).thenReturn(savedRootFolder);

        // Act
        Folder result = folderService.resolveAndCreatePath("finance/", null);

        // Assert
        assertNotNull(result);
        assertEquals(savedRootFolder, result);

        // Verify folder saved
        ArgumentCaptor<Folder> folderCaptor = ArgumentCaptor.forClass(Folder.class);
        verify(folderRepository).save(folderCaptor.capture());
        Folder createdFolder = folderCaptor.getValue();
        assertEquals("finance", createdFolder.getName());
        assertNull(createdFolder.getParent());
        assertEquals(user, createdFolder.getOwner());

        // Verify permission granted
        ArgumentCaptor<FolderPermission> permissionCaptor = ArgumentCaptor.forClass(FolderPermission.class);
        verify(permissionRepository).save(permissionCaptor.capture());
        FolderPermission createdPermission = permissionCaptor.getValue();
        assertEquals(savedRootFolder, createdPermission.getFolder());
        assertEquals(user, createdPermission.getUser());
        assertEquals(FolderRole.ADMIN, createdPermission.getRole());
        assertEquals(FolderInviteStatus.ACCEPTED, createdPermission.getInviteStatus());
    }

    @Test
    void shouldThrowBadRequestWhenPathContainsTraversalSegment() {
        // Arrange
        User user = new User();

        // Act & Assert for ".."
        ResponseStatusException exception1 = assertThrows(ResponseStatusException.class, () -> {
            folderService.resolveAndCreatePath("finance/../invoices", null);
        });
        assertEquals(HttpStatus.BAD_REQUEST, exception1.getStatusCode());
        assertEquals("Invalid path segment.", exception1.getReason());

        // Act & Assert for "."
        ResponseStatusException exception2 = assertThrows(ResponseStatusException.class, () -> {
            folderService.resolveAndCreatePath("finance/./invoices", null);
        });
        assertEquals(HttpStatus.BAD_REQUEST, exception2.getStatusCode());
        assertEquals("Invalid path segment.", exception2.getReason());
    }

    @Test
    void shouldCorrectlyDetectFilePaths() {
        // Act & Assert
        assertTrue(folderService.isFilePath("path/to/file.txt"));
        assertTrue(folderService.isFilePath("file.txt"));
        assertFalse(folderService.isFilePath("path/to/folder/"));
        assertFalse(folderService.isFilePath("path/to/folder"));
        assertFalse(folderService.isFilePath(""));
        assertFalse(folderService.isFilePath(null));
    }

    @Test
    void shouldCorrectlyExtractFileName() {
        // Act & Assert
        assertEquals("file.txt", folderService.extractFileName("path/to/file.txt"));
        assertEquals("file.txt", folderService.extractFileName("file.txt"));
        assertNull(folderService.extractFileName(""));
        assertNull(folderService.extractFileName(null));
    }

    @Test
    void shouldSendFolderInviteSuccessfully() {
        // Arrange
        UUID folderId = UUID.randomUUID();
        String recipientEmail = "recipient@example.com";
        FolderRole role = FolderRole.EDITOR;

        Folder folder = new Folder();
        folder.setId(folderId);
        folder.setName("Test Folder");
        User owner = new User();
        owner.setFirstName("OwnerFirstName");
        owner.setLastName("OwnerLastName");
        folder.setOwner(owner);

        User currentUser = new User();
        currentUser.setId(UUID.randomUUID());
        currentUser.setFirstName("SenderFirstName");
        currentUser.setLastName("SenderLastName");

        User recipient = new User();
        recipient.setId(UUID.randomUUID());
        recipient.setEmail(recipientEmail);
        recipient.setFirstName("RecipientFirstName");

        when(folderRepository.findById(folderId)).thenReturn(Optional.of(folder));
        when(folderSecurity.hasPermission(folderId, FolderRole.ADMIN)).thenReturn(true);
        when(userRepository.findByEmail(recipientEmail)).thenReturn(Optional.of(recipient));
        when(permissionRepository.findByFolderIdAndUserId(folderId, recipient.getId())).thenReturn(Optional.empty());
        when(userProvider.getCurrentUser()).thenReturn(currentUser);

        // Act
        folderService.sendFolderInvite(folderId, recipientEmail, role);

        // Assert
        ArgumentCaptor<FolderPermission> permissionCaptor = ArgumentCaptor.forClass(FolderPermission.class);
        verify(permissionRepository).save(permissionCaptor.capture());
        FolderPermission savedPermission = permissionCaptor.getValue();
        assertEquals(folder, savedPermission.getFolder());
        assertEquals(recipient, savedPermission.getUser());
        assertEquals(role, savedPermission.getRole());
        assertEquals(FolderInviteStatus.PENDING, savedPermission.getInviteStatus());

        verify(emailSender).sendEmail(eq(recipientEmail), anyString(), anyString());
    }

    @Test
    void shouldFailToSendFolderInviteWhenNotAdmin() {
        // Arrange
        UUID folderId = UUID.randomUUID();
        Folder folder = new Folder();
        folder.setId(folderId);

        when(folderRepository.findById(folderId)).thenReturn(Optional.of(folder));
        when(folderSecurity.hasPermission(folderId, FolderRole.ADMIN)).thenReturn(false);

        // Act & Assert
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            folderService.sendFolderInvite(folderId, "recipient@example.com", FolderRole.VIEWER);
        });
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        assertEquals("Only folder ADMINs can send invitations", ex.getReason());
    }

    @Test
    void shouldFailToSendFolderInviteWhenFolderNotFound() {
        // Arrange
        UUID folderId = UUID.randomUUID();
        when(folderRepository.findById(folderId)).thenReturn(Optional.empty());

        // Act & Assert
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            folderService.sendFolderInvite(folderId, "recipient@example.com", FolderRole.VIEWER);
        });
        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        assertEquals("Folder not found", ex.getReason());
    }

    @Test
    void shouldFailToSendFolderInviteWhenUserNotFound() {
        // Arrange
        UUID folderId = UUID.randomUUID();
        String recipientEmail = "nonexistent@example.com";
        Folder folder = new Folder();
        folder.setId(folderId);

        when(folderRepository.findById(folderId)).thenReturn(Optional.of(folder));
        when(folderSecurity.hasPermission(folderId, FolderRole.ADMIN)).thenReturn(true);
        when(userRepository.findByEmail(recipientEmail)).thenReturn(Optional.empty());

        // Act & Assert
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            folderService.sendFolderInvite(folderId, recipientEmail, FolderRole.VIEWER);
        });
        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        assertEquals("User with this email not found", ex.getReason());
    }

    @Test
    void shouldFailToSendFolderInviteWhenUserAlreadyHasAccess() {
        // Arrange
        UUID folderId = UUID.randomUUID();
        String recipientEmail = "recipient@example.com";
        Folder folder = new Folder();
        folder.setId(folderId);

        User recipient = new User();
        recipient.setId(UUID.randomUUID());

        FolderPermission existingPermission = new FolderPermission();
        existingPermission.setInviteStatus(FolderInviteStatus.ACCEPTED);

        when(folderRepository.findById(folderId)).thenReturn(Optional.of(folder));
        when(folderSecurity.hasPermission(folderId, FolderRole.ADMIN)).thenReturn(true);
        when(userRepository.findByEmail(recipientEmail)).thenReturn(Optional.of(recipient));
        when(permissionRepository.findByFolderIdAndUserId(folderId, recipient.getId())).thenReturn(Optional.of(existingPermission));

        // Act & Assert
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            folderService.sendFolderInvite(folderId, recipientEmail, FolderRole.VIEWER);
        });
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertEquals("User already has access to this folder", ex.getReason());
    }

    @Test
    void shouldAcceptFolderInviteSuccessfully() {
        // Arrange
        UUID inviteId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        User user = new User();
        user.setId(userId);

        FolderPermission permission = new FolderPermission();
        permission.setId(inviteId);
        permission.setUser(user);
        permission.setInviteStatus(FolderInviteStatus.PENDING);

        when(permissionRepository.findById(inviteId)).thenReturn(Optional.of(permission));
        when(userProvider.getCurrentUserId()).thenReturn(userId);

        // Act
        folderService.acceptFolderInvite(inviteId);

        // Assert
        assertEquals(FolderInviteStatus.ACCEPTED, permission.getInviteStatus());
        verify(permissionRepository).save(permission);
    }

    @Test
    void shouldFailToAcceptFolderInviteWhenNotFound() {
        // Arrange
        UUID inviteId = UUID.randomUUID();
        when(permissionRepository.findById(inviteId)).thenReturn(Optional.empty());

        // Act & Assert
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            folderService.acceptFolderInvite(inviteId);
        });
        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        assertEquals("Invitation not found", ex.getReason());
    }

    @Test
    void shouldFailToAcceptFolderInviteWhenWrongUser() {
        // Arrange
        UUID inviteId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID wrongUserId = UUID.randomUUID();

        User user = new User();
        user.setId(userId);

        FolderPermission permission = new FolderPermission();
        permission.setUser(user);

        when(permissionRepository.findById(inviteId)).thenReturn(Optional.of(permission));
        when(userProvider.getCurrentUserId()).thenReturn(wrongUserId);

        // Act & Assert
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            folderService.acceptFolderInvite(inviteId);
        });
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        assertEquals("This invitation does not belong to you", ex.getReason());
    }

    @Test
    void shouldFailToAcceptFolderInviteWhenNotPending() {
        // Arrange
        UUID inviteId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        User user = new User();
        user.setId(userId);

        FolderPermission permission = new FolderPermission();
        permission.setUser(user);
        permission.setInviteStatus(FolderInviteStatus.ACCEPTED);

        when(permissionRepository.findById(inviteId)).thenReturn(Optional.of(permission));
        when(userProvider.getCurrentUserId()).thenReturn(userId);

        // Act & Assert
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            folderService.acceptFolderInvite(inviteId);
        });
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertEquals("Invitation is not pending", ex.getReason());
    }

    @Test
    void shouldRejectFolderInviteSuccessfully() {
        // Arrange
        UUID inviteId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        User user = new User();
        user.setId(userId);

        FolderPermission permission = new FolderPermission();
        permission.setId(inviteId);
        permission.setUser(user);
        permission.setInviteStatus(FolderInviteStatus.PENDING);

        when(permissionRepository.findById(inviteId)).thenReturn(Optional.of(permission));
        when(userProvider.getCurrentUserId()).thenReturn(userId);

        // Act
        folderService.rejectFolderInvite(inviteId);

        // Assert
        verify(permissionRepository).delete(permission);
    }

    @Test
    void shouldGetPendingInvitesForCurrentUser() {
        // Arrange
        UUID userId = UUID.randomUUID();
        List<FolderPermission> expected = List.of(new FolderPermission());

        when(userProvider.getCurrentUserId()).thenReturn(userId);
        when(permissionRepository.findByUserIdAndInviteStatus(userId, FolderInviteStatus.PENDING)).thenReturn(expected);

        // Act
        List<FolderPermission> result = folderService.getPendingInvitesForCurrentUser();

        // Assert
        assertEquals(expected, result);
    }

    @Test
    void shouldToggleFolderVisibilityFromPrivateToPublicSuccessfully() {
        // Arrange
        UUID folderId = UUID.randomUUID();
        Folder folder = new Folder();
        folder.setId(folderId);
        folder.setFolderVisibility(com.docintel.modules.folder.domain.enums.FolderVisibility.PRIVATE);

        when(folderRepository.findById(folderId)).thenReturn(Optional.of(folder));
        when(folderSecurity.hasPermission(folderId, FolderRole.ADMIN)).thenReturn(true);

        // Act
        folderService.toggleFolderVisibility(folderId);

        // Assert
        assertEquals(com.docintel.modules.folder.domain.enums.FolderVisibility.PUBLIC, folder.getFolderVisibility());
        verify(folderRepository).save(folder);
    }

    @Test
    void shouldToggleFolderVisibilityFromPublicToPrivateSuccessfully() {
        // Arrange
        UUID folderId = UUID.randomUUID();
        Folder folder = new Folder();
        folder.setId(folderId);
        folder.setFolderVisibility(com.docintel.modules.folder.domain.enums.FolderVisibility.PUBLIC);

        when(folderRepository.findById(folderId)).thenReturn(Optional.of(folder));
        when(folderSecurity.hasPermission(folderId, FolderRole.ADMIN)).thenReturn(true);

        // Act
        folderService.toggleFolderVisibility(folderId);

        // Assert
        assertEquals(com.docintel.modules.folder.domain.enums.FolderVisibility.PRIVATE, folder.getFolderVisibility());
        verify(folderRepository).save(folder);
    }

    @Test
    void shouldFailToToggleFolderVisibilityWhenNotAdmin() {
        // Arrange
        UUID folderId = UUID.randomUUID();
        Folder folder = new Folder();
        folder.setId(folderId);

        when(folderRepository.findById(folderId)).thenReturn(Optional.of(folder));
        when(folderSecurity.hasPermission(folderId, FolderRole.ADMIN)).thenReturn(false);

        // Act & Assert
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            folderService.toggleFolderVisibility(folderId);
        });
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        assertEquals("Only folder ADMINs can change visibility", ex.getReason());
        verify(folderRepository, never()).save(any(Folder.class));
    }

    @Test
    void shouldFailToToggleFolderVisibilityWhenFolderNotFound() {
        // Arrange
        UUID folderId = UUID.randomUUID();
        when(folderRepository.findById(folderId)).thenReturn(Optional.empty());

        // Act & Assert
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            folderService.toggleFolderVisibility(folderId);
        });
        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        assertEquals("Folder not found", ex.getReason());
        verify(folderRepository, never()).save(any(Folder.class));
    }

    @Test
    void shouldLoadFolderPermissionsSuccessfully() {
        // Arrange
        UUID folderId = UUID.randomUUID();
        Folder folder = new Folder();
        folder.setId(folderId);

        when(folderRepository.findById(folderId)).thenReturn(Optional.of(folder));
        when(folderSecurity.hasPermission(folderId, FolderRole.VIEWER)).thenReturn(true);
        List<FolderPermission> expected = List.of(new FolderPermission());
        when(permissionRepository.findByFolderId(folderId)).thenReturn(expected);

        // Act
        List<FolderPermission> result = folderService.loadFolderPermissions(folderId).permissions();

        // Assert
        assertEquals(expected, result);
    }

    @Test
    void shouldFailToLoadFolderPermissionsWhenNotAdmin() {
        // Arrange
        UUID folderId = UUID.randomUUID();
        Folder folder = new Folder();
        folder.setId(folderId);

        when(folderRepository.findById(folderId)).thenReturn(Optional.of(folder));
        when(folderSecurity.hasPermission(folderId, FolderRole.VIEWER)).thenReturn(false);

        // Act & Assert
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            folderService.loadFolderPermissions(folderId);
        });
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        assertEquals("Only folder ADMINs can view permissions", ex.getReason());
    }

    @Test
    void shouldUpdateFolderPermissionSuccessfully() {
        // Arrange
        UUID folderId = UUID.randomUUID();
        UUID permissionId = UUID.randomUUID();
        
        User owner = new User();
        owner.setId(UUID.randomUUID());
        
        Folder folder = new Folder();
        folder.setId(folderId);
        folder.setOwner(owner);

        FolderPermission permission = new FolderPermission();
        permission.setId(permissionId);
        permission.setFolder(folder);
        permission.setRole(FolderRole.VIEWER);

        UUID currentUserId = UUID.randomUUID(); // different from owner.getId()

        when(permissionRepository.findById(permissionId)).thenReturn(Optional.of(permission));
        when(folderSecurity.hasPermission(folderId, FolderRole.ADMIN)).thenReturn(true);
        when(userProvider.getCurrentUserId()).thenReturn(currentUserId);

        // Act
        folderService.updateFolderPermission(folderId, permissionId, FolderRole.EDITOR);

        // Assert
        assertEquals(FolderRole.EDITOR, permission.getRole());
        verify(permissionRepository).save(permission);
    }

    @Test
    void shouldFailToUpdateFolderPermissionWhenUserIsOwner() {
        // Arrange
        UUID folderId = UUID.randomUUID();
        UUID permissionId = UUID.randomUUID();
        
        User owner = new User();
        UUID ownerId = UUID.randomUUID();
        owner.setId(ownerId);
        
        Folder folder = new Folder();
        folder.setId(folderId);
        folder.setOwner(owner);

        FolderPermission permission = new FolderPermission();
        permission.setId(permissionId);
        permission.setFolder(folder);
        permission.setRole(FolderRole.VIEWER);

        when(permissionRepository.findById(permissionId)).thenReturn(Optional.of(permission));
        when(folderSecurity.hasPermission(folderId, FolderRole.ADMIN)).thenReturn(true);
        when(userProvider.getCurrentUserId()).thenReturn(ownerId); // Same as ownerId

        // Act & Assert
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            folderService.updateFolderPermission(folderId, permissionId, FolderRole.EDITOR);
        });
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        assertEquals("Owner's role cannot be changed", ex.getReason());
    }

    @Test
    void shouldFailToUpdateFolderPermissionWhenNotAdmin() {
        // Arrange
        UUID folderId = UUID.randomUUID();
        UUID permissionId = UUID.randomUUID();
        Folder folder = new Folder();
        folder.setId(folderId);

        FolderPermission permission = new FolderPermission();
        permission.setId(permissionId);
        permission.setFolder(folder);

        when(permissionRepository.findById(permissionId)).thenReturn(Optional.of(permission));
        when(folderSecurity.hasPermission(folderId, FolderRole.ADMIN)).thenReturn(false);

        // Act & Assert
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            folderService.updateFolderPermission(folderId, permissionId, FolderRole.EDITOR);
        });
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        assertEquals("Only folder ADMINs can manage permissions", ex.getReason());
    }

    @Test
    void shouldDeleteFolderPermissionSuccessfully() {
        // Arrange
        UUID folderId = UUID.randomUUID();
        UUID permissionId = UUID.randomUUID();
        Folder folder = new Folder();
        folder.setId(folderId);

        FolderPermission permission = new FolderPermission();
        permission.setId(permissionId);
        permission.setFolder(folder);

        when(permissionRepository.findById(permissionId)).thenReturn(Optional.of(permission));
        when(folderSecurity.hasPermission(folderId, FolderRole.ADMIN)).thenReturn(true);

        // Act
        folderService.deleteFolderPermission(folderId, permissionId);

        // Assert
        verify(permissionRepository).delete(permission);
    }

    @Test
    void shouldFailToDeleteFolderPermissionWhenNotAdmin() {
        // Arrange
        UUID folderId = UUID.randomUUID();
        UUID permissionId = UUID.randomUUID();
        Folder folder = new Folder();
        folder.setId(folderId);

        FolderPermission permission = new FolderPermission();
        permission.setId(permissionId);
        permission.setFolder(folder);

        when(permissionRepository.findById(permissionId)).thenReturn(Optional.of(permission));
        when(folderSecurity.hasPermission(folderId, FolderRole.ADMIN)).thenReturn(false);

        // Act & Assert
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            folderService.deleteFolderPermission(folderId, permissionId);
        });
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        assertEquals("Only folder ADMINs can manage permissions", ex.getReason());
    }
}
