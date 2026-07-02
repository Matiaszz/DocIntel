package com.docintel.document.application;

import com.docintel.document.domain.Document;
import com.docintel.document.domain.DocumentCategory;
import com.docintel.document.domain.DocumentRepository;
import com.docintel.document.presentation.dto.FileTreeViewDTO;
import com.docintel.folder.application.FolderService;
import com.docintel.folder.domain.Folder;
import com.docintel.folder.domain.FolderRepository;
import com.docintel.shared.infrastructure.security.CurrentUserProvider;
import com.docintel.shared.infrastructure.storage.FileStorage;
import com.docintel.user.domain.User;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import com.docintel.folder.domain.FolderPermissionRepository;

@Service
@RequiredArgsConstructor
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final FolderRepository folderRepository;
    private final FolderPermissionRepository folderPermissionRepository;
    private final FolderService folderService;
    private final FileStorage fileStorage;
    private final CurrentUserProvider currentUserProvider;

    /**
     * Resolves the target folder, uploads the physical file via FileStorage,
     * and saves document metadata with links to the folder tree.
     */
    @Transactional
    public Document uploadDocument(
            MultipartFile file, String relativePath,
            UUID parentFolderId, String category
    ) {
        User currentUser = currentUserProvider.getCurrentUser();

        // 1. Resolve and create folders dynamically from path
        Folder targetFolder = folderService.resolveAndCreatePath(relativePath, parentFolderId, currentUser);

        String fileName = file.getOriginalFilename();
        if (fileName == null || fileName.trim().isEmpty()) {
            if (relativePath == null || !folderService.isFilePath(relativePath)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File name could not be resolved.");
            }

            if (folderService.isFilePath(relativePath)) {
                fileName = folderService.extractFileName(relativePath);
            }
        }

        if (fileName != null) {
            fileName = new java.io.File(fileName).getName();
        }

        DocumentCategory documentCategory = DocumentCategory.fromString(category);
        UUID documentId = UUID.randomUUID();

        // 3. Upload to cloud storage
        boolean uploaded = fileStorage.uploadFile(file, currentUser.getId(), documentId);
        if (!uploaded) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to upload file to cloud storage.");
        }

        // 4. Save metadata to DB (Leverages Persistable<UUID> for clean manually-assigned ID insert)
        Document document = new Document();
        document.setId(documentId);
        document.setName(fileName);
        document.setS3Key(fileStorage.resolveFileKey(documentId, fileName));
        document.setFolder(targetFolder);
        document.setOwner(currentUser);
        document.setCategory(documentCategory != null ? documentCategory : DocumentCategory.GENERAL);

        return documentRepository.save(document);
    }

    /**
     * Loads the entire accessible directory tree structure in a single load
     * and constructs the nested hierarchy in memory.
     */
    @Transactional(readOnly = true)
    public List<FileTreeViewDTO> getFileTreeView() {
        User currentUser = currentUserProvider.getCurrentUser();
        UUID userId = currentUser.getId();

        // 1. Fetch folders and documents
        List<Folder> accessibleFolders = folderRepository.findAllAccessibleFolders(userId);
        List<Document> accessibleDocuments = documentRepository.findAllAccessibleDocuments(userId);

        // 2. Index children by parent ID for fast memory lookup
        Map<UUID, List<Folder>> foldersByParentId = accessibleFolders.stream()
                .filter(f -> f.getParent() != null)
                .collect(Collectors.groupingBy(f -> f.getParent().getId()));

        Map<UUID, List<Document>> documentsByFolderId = accessibleDocuments.stream()
                .filter(d -> d.getFolder() != null)
                .collect(Collectors.groupingBy(d -> d.getFolder().getId()));

        // 3. Find roots (items that are parentless or whose parent is not in the accessible list)
        List<Folder> rootFolders = accessibleFolders.stream()
                .filter(f -> f.getParent() == null || !accessibleFolders.contains(f.getParent()))
                .toList();

        List<Document> rootDocuments = accessibleDocuments.stream()
                .filter(d -> d.getFolder() == null || !accessibleFolders.contains(d.getFolder()))
                .toList();

        List<FileTreeViewDTO> tree = new ArrayList<>();

        // 4. Recursively build folders
        for (Folder rootFolder : rootFolders) {
            tree.add(buildFolderNode(rootFolder, foldersByParentId, documentsByFolderId));
        }

        // 5. Add root documents
        for (Document rootDoc : rootDocuments) {
            tree.add(new FileTreeViewDTO(
                    rootDoc.getId(),
                    rootDoc.getName(),
                    "FILE",
                    rootDoc.getS3Key(),
                    null,
                    rootDoc.getCategory(),
                    rootDoc.isAnalyzed(),
                    List.of(),
                    rootDoc.isFavorite(),
                    rootDoc.getTags()
            ));
        }

        return tree;
    }

    private FileTreeViewDTO buildFolderNode(
            Folder folder,
            Map<UUID, List<Folder>> foldersByParentId,
            Map<UUID, List<Document>> documentsByFolderId) {

        List<FileTreeViewDTO> children = new ArrayList<>();

        // Process subfolders
        List<Folder> subfolders = foldersByParentId.getOrDefault(folder.getId(), List.of());
        for (Folder sub : subfolders) {
            children.add(buildFolderNode(sub, foldersByParentId, documentsByFolderId));
        }

        // Process documents in this folder
        List<Document> docs = documentsByFolderId.getOrDefault(folder.getId(), List.of());
        for (Document doc : docs) {
            children.add(new FileTreeViewDTO(
                    doc.getId(),
                    doc.getName(),
                    "FILE",
                    doc.getS3Key(),
                    null,
                    doc.getCategory(),
                    doc.isAnalyzed(),
                    List.of(),
                    doc.isFavorite(),
                    doc.getTags()
            ));
        }

        return new FileTreeViewDTO(
                folder.getId(),
                folder.getName(),
                "FOLDER",
                null,
                folder.getFolderVisibility(),
                null,
                false,
                children,
                false,
                ""
        );
    }

    @Transactional(readOnly = true)
    public Document getDocument(UUID id) {
        User currentUser = currentUserProvider.getCurrentUser();
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found."));

        if (!doc.getOwner().getId().equals(currentUser.getId())) {
            if (doc.getFolder() == null){
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not authorized to access this document.");
            }

            boolean hasPermission = folderRepository.findAllAccessibleFolders(currentUser.getId())
                    .stream()
                    .anyMatch(f -> f.getId().equals(doc.getFolder().getId()));

            if (!hasPermission) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not authorized to access this document.");
            }

        }
        return doc;
    }

    @Transactional(readOnly = true)
    public InputStream downloadDocumentStream(Document doc) {
        return fileStorage.download(doc.getS3Key());
    }

    @Transactional
    public void deleteDocument(UUID id) {
        User currentUser = currentUserProvider.getCurrentUser();
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found."));

        if (!doc.getOwner().getId().equals(currentUser.getId())) {
            if (doc.getFolder() != null && !doc.getFolder().getOwner().getId().equals(currentUser.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not authorized to delete this document.");
            }
        }

        fileStorage.deleteFile(doc.getOwner().getId(), doc.getId());
        documentRepository.delete(doc);
    }

    @Transactional
    public void deleteFolder(UUID id) {
        User currentUser = currentUserProvider.getCurrentUser();
        Folder folder = folderRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found."));

        if (!folder.getOwner().getId().equals(currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not authorized to delete this folder.");
        }

        deleteFolderRecursive(folder);
    }

    private void deleteFolderRecursive(Folder folder) {
        List<Folder> subfolders = folderRepository.findByParentId(folder.getId());
        for (Folder sub : subfolders) {
            deleteFolderRecursive(sub);
        }

        List<Document> documents = documentRepository.findByFolderId(folder.getId());
        for (Document doc : documents) {
            fileStorage.deleteFile(doc.getOwner().getId(), doc.getId());
            documentRepository.delete(doc);
        }

        folderPermissionRepository.deleteByFolderId(folder.getId());
        folderRepository.delete(folder);
    }

    @Transactional(readOnly = true)
    public void zipFolder(UUID folderId, java.util.zip.ZipOutputStream zos, String currentPath) throws IOException {
        List<Document> documents = documentRepository.findByFolderId(folderId);
        for (Document doc : documents) {
            try (InputStream is = fileStorage.download(doc.getS3Key())) {
                if (is != null) {
                    String zipEntryPath = currentPath + doc.getName();
                    zos.putNextEntry(new java.util.zip.ZipEntry(zipEntryPath));
                    is.transferTo(zos);
                    zos.closeEntry();
                }
            }
        }

        List<Folder> subfolders = folderRepository.findByParentId(folderId);
        for (Folder sub : subfolders) {
            zipFolder(sub.getId(), zos, currentPath + sub.getName() + "/");
        }
    }

    @Transactional(readOnly = true)
    public Page<Document> searchDocuments(
            String search, String categoryStr, Boolean favorite, String tag, int page, int size
    ) {
        User currentUser = currentUserProvider.getCurrentUser();
        DocumentCategory category = DocumentCategory.fromString(categoryStr);
        Pageable pageable = PageRequest.of(page, size);
        
        String searchParam = (search == null || search.trim().isEmpty()) ? null : "%" + search.trim().toLowerCase() + "%";
        String tagParam = (tag == null || tag.trim().isEmpty()) ? null : "%" + tag.trim().toLowerCase() + "%";

        return documentRepository.searchDocuments(
                currentUser.getId(), searchParam, category, favorite, tagParam, pageable
        );
    }

    @Transactional
    public Document toggleFavorite(UUID documentId) {
        Document document = getDocument(documentId);
        document.setFavorite(!document.isFavorite());
        return documentRepository.save(document);
    }

    @Transactional
    public Document updateTags(UUID documentId, String tags) {
        Document document = getDocument(documentId);
        document.setTags(tags != null ? tags.trim() : "");
        return documentRepository.save(document);
    }
}

