package com.docintel.folder.application;

import com.docintel.modules.folder.application.FolderService;
import com.docintel.modules.folder.domain.enums.FolderRole;
import com.docintel.modules.folder.domain.Folder;
import com.docintel.modules.folder.domain.FolderPermission;
import com.docintel.modules.folder.domain.FolderPermissionRepository;
import com.docintel.modules.folder.domain.FolderRepository;
import com.docintel.modules.user.domain.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

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

    @InjectMocks
    private FolderService folderService;

    @Test
    void shouldReturnNullWhenRelativePathAndParentFolderIdAreNull() {
        // Act
        Folder result = folderService.resolveAndCreatePath(null, null, new User());

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
        Folder result = folderService.resolveAndCreatePath(" ", parentId, new User());

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
            folderService.resolveAndCreatePath("", parentId, new User());
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
        Folder result = folderService.resolveAndCreatePath("finance/invoices/", null, user);

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

        when(folderRepository.findByNameAndParentIsNull("finance")).thenReturn(Optional.empty());

        Folder savedRootFolder = new Folder();
        savedRootFolder.setId(UUID.randomUUID());
        savedRootFolder.setName("finance");
        savedRootFolder.setOwner(user);

        when(folderRepository.save(any(Folder.class))).thenReturn(savedRootFolder);

        // Act
        Folder result = folderService.resolveAndCreatePath("finance/", null, user);

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
    }

    @Test
    void shouldThrowBadRequestWhenPathContainsTraversalSegment() {
        // Arrange
        User user = new User();

        // Act & Assert for ".."
        ResponseStatusException exception1 = assertThrows(ResponseStatusException.class, () -> {
            folderService.resolveAndCreatePath("finance/../invoices", null, user);
        });
        assertEquals(HttpStatus.BAD_REQUEST, exception1.getStatusCode());
        assertEquals("Invalid path segment.", exception1.getReason());

        // Act & Assert for "."
        ResponseStatusException exception2 = assertThrows(ResponseStatusException.class, () -> {
            folderService.resolveAndCreatePath("finance/./invoices", null, user);
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
}
