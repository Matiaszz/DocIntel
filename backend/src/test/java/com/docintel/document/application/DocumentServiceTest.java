package com.docintel.document.application;

import com.docintel.document.domain.Document;
import com.docintel.document.domain.DocumentRepository;
import com.docintel.document.presentation.dto.FileTreeViewDTO;
import com.docintel.folder.application.FolderService;
import com.docintel.folder.domain.Folder;
import com.docintel.folder.domain.FolderPermissionRepository;
import com.docintel.folder.domain.FolderRepository;
import com.docintel.shared.infrastructure.security.CurrentUserProvider;
import com.docintel.shared.infrastructure.storage.FileStorage;
import com.docintel.user.domain.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class DocumentServiceTest {

    @Mock
    private DocumentRepository documentRepository;

    @Mock
    private FolderRepository folderRepository;

    @Mock
    private FolderPermissionRepository folderPermissionRepository;

    @Mock
    private FolderService folderService;

    @Mock
    private FileStorage fileStorage;

    @Mock
    private CurrentUserProvider currentUserProvider;

    @InjectMocks
    private DocumentService documentService;

    @Test
    void shouldUploadDocumentSuccessfully() {
        // Arrange
        User user = new User();
        user.setId(UUID.randomUUID());

        Folder folder = new Folder();
        folder.setId(UUID.randomUUID());

        MultipartFile file = mock(MultipartFile.class);
        when(file.getOriginalFilename()).thenReturn("test.pdf");

        when(currentUserProvider.getCurrentUser()).thenReturn(user);
        when(folderService.resolveAndCreatePath("finance/", null, user)).thenReturn(folder);
        when(fileStorage.uploadFile(eq(file), eq(user.getId()), any(UUID.class))).thenReturn(true);
        when(fileStorage.resolveFileKey(eq(user.getId()), any(UUID.class), eq("test.pdf"))).thenReturn("resolved-s3-key");

        Document savedDoc = new Document();
        savedDoc.setId(UUID.randomUUID());
        when(documentRepository.save(any(Document.class))).thenReturn(savedDoc);

        // Act
        Document result = documentService.uploadDocument(file, "finance/", null, "INVOICE");

        // Assert
        assertNotNull(result);
        assertEquals(savedDoc, result);
        verify(documentRepository).save(any(Document.class));
    }

    @Test
    void shouldThrowInternalServerErrorWhenUploadFails() {
        // Arrange
        User user = new User();
        user.setId(UUID.randomUUID());

        MultipartFile file = mock(MultipartFile.class);
        when(file.getOriginalFilename()).thenReturn("test.pdf");

        when(currentUserProvider.getCurrentUser()).thenReturn(user);
        when(fileStorage.uploadFile(eq(file), eq(user.getId()), any(UUID.class))).thenReturn(false);

        // Act & Assert
        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            documentService.uploadDocument(file, "finance/", null, "INVOICE");
        });

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, exception.getStatusCode());
        assertEquals("Failed to upload file to cloud storage.", exception.getReason());
        verify(documentRepository, never()).save(any(Document.class));
    }

    @Test
    void shouldResolveFileNameFromRelativePathWhenOriginalFilenameIsEmpty() {
        // Arrange
        User user = new User();
        user.setId(UUID.randomUUID());

        MultipartFile file = mock(MultipartFile.class);
        when(file.getOriginalFilename()).thenReturn("");

        when(currentUserProvider.getCurrentUser()).thenReturn(user);
        when(folderService.isFilePath("finance/file.pdf")).thenReturn(true);
        when(folderService.extractFileName("finance/file.pdf")).thenReturn("file.pdf");
        when(fileStorage.uploadFile(eq(file), eq(user.getId()), any(UUID.class))).thenReturn(true);
        when(documentRepository.save(any(Document.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        Document result = documentService.uploadDocument(file, "finance/file.pdf", null, "GENERAL");

        // Assert
        assertNotNull(result);
        assertEquals("file.pdf", result.getName());
    }

    @Test
    void shouldSanitizeFileNameToPreventPathTraversalAndZipSlip() {
        // Arrange
        User user = new User();
        user.setId(UUID.randomUUID());

        MultipartFile file = mock(MultipartFile.class);
        // Malicious name
        when(file.getOriginalFilename()).thenReturn("../../../etc/passwd");

        when(currentUserProvider.getCurrentUser()).thenReturn(user);
        when(fileStorage.uploadFile(eq(file), eq(user.getId()), any(UUID.class))).thenReturn(true);
        when(documentRepository.save(any(Document.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        Document result = documentService.uploadDocument(file, null, null, "GENERAL");

        // Assert
        assertNotNull(result);
        assertEquals("passwd", result.getName());
    }

    @Test
    void shouldGetFileTreeViewSuccessfully() {
        // Arrange
        User user = new User();
        user.setId(UUID.randomUUID());
        when(currentUserProvider.getCurrentUser()).thenReturn(user);

        Folder folderA = new Folder();
        folderA.setId(UUID.randomUUID());
        folderA.setName("Folder A");
        folderA.setOwner(user);

        Folder folderB = new Folder();
        folderB.setId(UUID.randomUUID());
        folderB.setName("Folder B");
        folderB.setParent(folderA);
        folderB.setOwner(user);

        Document docC = new Document();
        docC.setId(UUID.randomUUID());
        docC.setName("Doc C.txt");
        docC.setFolder(folderB);
        docC.setOwner(user);

        Document docD = new Document();
        docD.setId(UUID.randomUUID());
        docD.setName("Doc D.txt");
        docD.setFolder(null); // root
        docD.setOwner(user);

        when(folderRepository.findAllAccessibleFolders(user.getId())).thenReturn(List.of(folderA, folderB));
        when(documentRepository.findAllAccessibleDocuments(user.getId())).thenReturn(List.of(docC, docD));

        // Act
        List<FileTreeViewDTO> result = documentService.getFileTreeView();

        // Assert
        assertNotNull(result);
        assertEquals(2, result.size()); // Folder A and Doc D at root level

        FileTreeViewDTO rootFolderNode = result.stream().filter(n -> n.type().equals("FOLDER")).findFirst().orElseThrow();
        assertEquals("Folder A", rootFolderNode.name());
        assertEquals(1, rootFolderNode.children().size()); // Folder B is child of Folder A

        FileTreeViewDTO subFolderNode = rootFolderNode.children().get(0);
        assertEquals("Folder B", subFolderNode.name());
        assertEquals(1, subFolderNode.children().size()); // Doc C is child of Folder B

        FileTreeViewDTO docCNode = subFolderNode.children().get(0);
        assertEquals("Doc C.txt", docCNode.name());

        FileTreeViewDTO docDNode = result.stream().filter(n -> n.type().equals("FILE")).findFirst().orElseThrow();
        assertEquals("Doc D.txt", docDNode.name());
    }

    @Test
    void shouldGetDocumentSuccessfullyForOwner() {
        // Arrange
        User user = new User();
        user.setId(UUID.randomUUID());
        when(currentUserProvider.getCurrentUser()).thenReturn(user);

        Document doc = new Document();
        doc.setId(UUID.randomUUID());
        doc.setOwner(user);

        when(documentRepository.findById(doc.getId())).thenReturn(Optional.of(doc));

        // Act
        Document result = documentService.getDocument(doc.getId());

        // Assert
        assertEquals(doc, result);
    }

    @Test
    void shouldGetDocumentSuccessfullyForAuthorizedFolderUser() {
        // Arrange
        User user = new User();
        user.setId(UUID.randomUUID());
        when(currentUserProvider.getCurrentUser()).thenReturn(user);

        User owner = new User();
        owner.setId(UUID.randomUUID());

        Folder folder = new Folder();
        folder.setId(UUID.randomUUID());
        folder.setOwner(owner);

        Document doc = new Document();
        doc.setId(UUID.randomUUID());
        doc.setOwner(owner);
        doc.setFolder(folder);

        when(documentRepository.findById(doc.getId())).thenReturn(Optional.of(doc));
        when(folderRepository.findAllAccessibleFolders(user.getId())).thenReturn(List.of(folder));

        // Act
        Document result = documentService.getDocument(doc.getId());

        // Assert
        assertEquals(doc, result);
    }

    @Test
    void shouldThrowForbiddenWhenUserHasNoAccessToDocumentFolder() {
        // Arrange
        User user = new User();
        user.setId(UUID.randomUUID());
        when(currentUserProvider.getCurrentUser()).thenReturn(user);

        User owner = new User();
        owner.setId(UUID.randomUUID());

        Folder folder = new Folder();
        folder.setId(UUID.randomUUID());
        folder.setOwner(owner);

        Document doc = new Document();
        doc.setId(UUID.randomUUID());
        doc.setOwner(owner);
        doc.setFolder(folder);

        when(documentRepository.findById(doc.getId())).thenReturn(Optional.of(doc));
        when(folderRepository.findAllAccessibleFolders(user.getId())).thenReturn(new ArrayList<>());

        // Act & Assert
        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            documentService.getDocument(doc.getId());
        });

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
        assertEquals("Not authorized to access this document.", exception.getReason());
    }

    @Test
    void shouldThrowForbiddenWhenUserIsNotOwnerAndFolderIsNull() {
        // Arrange
        User user = new User();
        user.setId(UUID.randomUUID());
        when(currentUserProvider.getCurrentUser()).thenReturn(user);

        User owner = new User();
        owner.setId(UUID.randomUUID());

        Document doc = new Document();
        doc.setId(UUID.randomUUID());
        doc.setOwner(owner);
        doc.setFolder(null);

        when(documentRepository.findById(doc.getId())).thenReturn(Optional.of(doc));

        // Act & Assert
        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            documentService.getDocument(doc.getId());
        });

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
    }

    @Test
    void shouldThrowNotFoundWhenDocumentDoesNotExist() {
        // Arrange
        UUID docId = UUID.randomUUID();
        when(documentRepository.findById(docId)).thenReturn(Optional.empty());

        // Act & Assert
        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            documentService.getDocument(docId);
        });

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
    }

    @Test
    void shouldDeleteDocumentSuccessfullyByOwner() {
        // Arrange
        User user = new User();
        user.setId(UUID.randomUUID());
        when(currentUserProvider.getCurrentUser()).thenReturn(user);

        Document doc = new Document();
        doc.setId(UUID.randomUUID());
        doc.setOwner(user);

        when(documentRepository.findById(doc.getId())).thenReturn(Optional.of(doc));

        // Act
        documentService.deleteDocument(doc.getId());

        // Assert
        verify(fileStorage).deleteFile(user.getId(), doc.getId());
        verify(documentRepository).delete(doc);
    }

    @Test
    void shouldDeleteDocumentSuccessfullyByFolderOwner() {
        // Arrange
        User user = new User();
        user.setId(UUID.randomUUID());
        when(currentUserProvider.getCurrentUser()).thenReturn(user);

        User owner = new User();
        owner.setId(UUID.randomUUID());

        Folder folder = new Folder();
        folder.setOwner(user);

        Document doc = new Document();
        doc.setId(UUID.randomUUID());
        doc.setOwner(owner);
        doc.setFolder(folder);

        when(documentRepository.findById(doc.getId())).thenReturn(Optional.of(doc));

        // Act
        documentService.deleteDocument(doc.getId());

        // Assert
        verify(fileStorage).deleteFile(owner.getId(), doc.getId());
        verify(documentRepository).delete(doc);
    }

    @Test
    void shouldThrowForbiddenOnDeleteDocumentWhenNotAuthorized() {
        // Arrange
        User user = new User();
        user.setId(UUID.randomUUID());
        when(currentUserProvider.getCurrentUser()).thenReturn(user);

        User owner = new User();
        owner.setId(UUID.randomUUID());

        Folder folder = new Folder();
        folder.setOwner(owner);

        Document doc = new Document();
        doc.setId(UUID.randomUUID());
        doc.setOwner(owner);
        doc.setFolder(folder);

        when(documentRepository.findById(doc.getId())).thenReturn(Optional.of(doc));

        // Act & Assert
        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            documentService.deleteDocument(doc.getId());
        });

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
        verifyNoInteractions(fileStorage);
        verify(documentRepository, never()).delete(any(Document.class));
    }

    @Test
    void shouldDeleteFolderRecursively() {
        // Arrange
        User user = new User();
        user.setId(UUID.randomUUID());
        when(currentUserProvider.getCurrentUser()).thenReturn(user);

        Folder folder = new Folder();
        folder.setId(UUID.randomUUID());
        folder.setOwner(user);

        Folder subfolder = new Folder();
        subfolder.setId(UUID.randomUUID());
        subfolder.setOwner(user);

        Document doc = new Document();
        doc.setId(UUID.randomUUID());
        doc.setOwner(user);

        when(folderRepository.findById(folder.getId())).thenReturn(Optional.of(folder));
        when(folderRepository.findByParentId(folder.getId())).thenReturn(List.of(subfolder));
        when(folderRepository.findByParentId(subfolder.getId())).thenReturn(new ArrayList<>());
        when(documentRepository.findByFolderId(folder.getId())).thenReturn(List.of(doc));
        when(documentRepository.findByFolderId(subfolder.getId())).thenReturn(new ArrayList<>());

        // Act
        documentService.deleteFolder(folder.getId());

        // Assert
        verify(fileStorage).deleteFile(user.getId(), doc.getId());
        verify(documentRepository).delete(doc);
        verify(folderPermissionRepository).deleteByFolderId(folder.getId());
        verify(folderPermissionRepository).deleteByFolderId(subfolder.getId());
        verify(folderRepository).delete(folder);
        verify(folderRepository).delete(subfolder);
    }

    @Test
    void shouldZipFolderSuccessfully() throws IOException {
        // Arrange
        UUID folderId = UUID.randomUUID();
        Document doc = new Document();
        doc.setName("test.txt");
        doc.setS3Key("s3-test-key");

        when(documentRepository.findByFolderId(folderId)).thenReturn(List.of(doc));
        when(folderRepository.findByParentId(folderId)).thenReturn(new ArrayList<>());

        byte[] content = "Hello World".getBytes();
        when(fileStorage.download("s3-test-key")).thenReturn(new ByteArrayInputStream(content));

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ZipOutputStream zos = new ZipOutputStream(baos);

        // Act
        documentService.zipFolder(folderId, zos, "");
        zos.close();

        // Assert
        byte[] zipBytes = baos.toByteArray();
        assertTrue(zipBytes.length > 0);

        try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(zipBytes))) {
            ZipEntry entry = zis.getNextEntry();
            assertNotNull(entry);
            assertEquals("test.txt", entry.getName());
            byte[] entryContent = zis.readAllBytes();
            assertEquals("Hello World", new String(entryContent));
            assertNull(zis.getNextEntry());
        }
    }
}
