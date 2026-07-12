package com.docintel.modules.document.application;

import com.docintel.modules.document.domain.Document;
import com.docintel.modules.document.domain.enums.DocumentCategory;
import com.docintel.modules.document.domain.DocumentRepository;
import com.docintel.modules.document.domain.enums.DocumentStatus;
import com.docintel.modules.document.presentation.dto.request.UploadCompleteRequestDTO;
import com.docintel.modules.document.presentation.dto.request.UploadInitiateRequestDTO;
import com.docintel.modules.document.presentation.dto.response.DocumentResponseDTO;
import com.docintel.modules.document.presentation.dto.response.FileTreeViewResponseDTO;
import com.docintel.modules.document.presentation.dto.response.UploadInitiateResponseDTO;
import com.docintel.modules.folder.application.FolderService;
import com.docintel.modules.folder.domain.Folder;
import com.docintel.modules.folder.domain.FolderPermission;
import com.docintel.modules.folder.domain.FolderRepository;
import com.docintel.modules.folder.domain.enums.FolderInviteStatus;
import com.docintel.modules.folder.domain.enums.FolderVisibility;
import com.docintel.shared.auth.CurrentUserProvider;
import com.docintel.shared.contracts.FileStorage;
import com.docintel.modules.user.domain.User;
import com.docintel.shared.dto.TreeViewType;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import com.docintel.modules.folder.domain.FolderPermissionRepository;
import com.docintel.modules.folder.domain.enums.FolderRole;
import com.docintel.modules.folder.infrastructure.security.FolderSecurityEvaluator;

import static com.docintel.modules.document.mapper.DocumentMapper.mapToDocumentDTO;

@Service
@RequiredArgsConstructor
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final FolderRepository folderRepository;
    private final FolderPermissionRepository folderPermissionRepository;
    private final FolderService folderService;
    private final FileStorage fileStorage;
    private final CurrentUserProvider currentUserProvider;
    private final FolderSecurityEvaluator folderSecurity;

    /**
     * Initiates a client-side upload by registering the document metadata
     * and generating presigned URLs (single or multipart depending on size).
     */
    @Transactional
    public UploadInitiateResponseDTO initiateUpload(UploadInitiateRequestDTO request) {
        User currentUser = currentUserProvider.getCurrentUser();

        if (request.parentFolderId() != null && !folderSecurity.hasPermission(request.parentFolderId(), FolderRole.EDITOR)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have permission to modify this folder.");
        }

        // 1. Resolve and create folders dynamically from path
        Folder targetFolder = folderService.resolveAndCreatePath(
                request.relativePath(),
                request.parentFolderId());

        String fileName = request.name();
        if (fileName == null || fileName.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File name could not be resolved.");
        }
        fileName = new File(fileName).getName();

        DocumentCategory documentCategory = request.category();
        UUID documentId = UUID.randomUUID();
        String s3Key = fileStorage.resolveFileKey(documentId, fileName);

        // 2. Create metadata in PENDING state
        Document document = Document.create(fileName, s3Key, targetFolder, currentUser, documentCategory);

        long size = request.size();
        long multipartThreshold = 5 * 1024 * 1024; // 5MB

        boolean isMultipart = size > multipartThreshold;
        String uploadUrl = null;
        String uploadId = null;
        List<String> uploadUrls = new ArrayList<>();
        long partSize = 5 * 1024 * 1024; // 5MB

        if (isMultipart) {
            uploadId = fileStorage.initiateMultipartUpload(s3Key);
            document.setUploadId(uploadId);

            int numParts = (int) Math.ceil((double) size / partSize);
            for (int i = 1; i <= numParts; i++) {
                String partUrl = fileStorage.generatePresignedUploadPartUrl(s3Key, uploadId, i);
                uploadUrls.add(partUrl);
            }
        } else {
            uploadUrl = fileStorage.generatePresignedUploadUrl(s3Key);
        }

        Document saved = documentRepository.save(document);
        DocumentResponseDTO dto = mapToDocumentDTO(saved);

        return new UploadInitiateResponseDTO(dto, isMultipart, uploadUrl, uploadId, uploadUrls, partSize);
    }

    /**
     * Completes a document upload, confirming the single upload or completing the multipart upload on S3.
     */
    @Transactional
    public DocumentResponseDTO completeUpload(UUID documentId, UploadCompleteRequestDTO request) {
        Document document = getDocument(documentId);

        if (document.getStatus() == DocumentStatus.UPLOADED) {
            return mapToDocumentDTO(document);
        }

        if (document.getUploadId() != null) {
            // Multipart upload completion
            if (request.completedParts() == null || request.completedParts().isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Parts list is required to complete multipart upload.");
            }
            fileStorage.completeMultipartUpload(document.getS3Key(), document.getUploadId(), request.completedParts());
        }

        document.setStatus(DocumentStatus.UPLOADED);
        Document saved = documentRepository.save(document);
        return mapToDocumentDTO(saved);
    }

    @Transactional(readOnly = true)
    public String generatePresignedDownloadUrl(Document doc) {
        return fileStorage.generatePresignedDownloadUrl(doc.getS3Key());
    }

    /**
     * Loads the entire accessible directory tree structure in a single load
     * and constructs the nested hierarchy in memory.
     */
    @Transactional(readOnly = true)
    public List<FileTreeViewResponseDTO> getFileTreeView() {
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

        // Fetch all accepted permissions for the current user to resolve roles
        List<FolderPermission> userPermissions = folderPermissionRepository.findByUserIdAndInviteStatus(userId, FolderInviteStatus.ACCEPTED);
        Map<UUID, FolderRole> roleByFolderId = userPermissions.stream()
                .collect(Collectors.toMap(fp -> fp.getFolder().getId(), FolderPermission::getRole, (r1, r2) -> r1));

        List<FileTreeViewResponseDTO> tree = new ArrayList<>();

        // 4. Recursively build folders
        for (Folder rootFolder : rootFolders) {
            FolderRole initialRole = FolderRole.VIEWER;
            if (rootFolder.getOwner().getId().equals(userId)) {
                initialRole = FolderRole.ADMIN;
            } else if (roleByFolderId.containsKey(rootFolder.getId())) {
                initialRole = roleByFolderId.get(rootFolder.getId());
            }
            tree.add(buildFolderNode(rootFolder, foldersByParentId, documentsByFolderId, roleByFolderId, userId, initialRole));
        }

        // 5. Add root documents
        for (Document rootDoc : rootDocuments) {
            FolderRole role = rootDoc.getOwner().getId().equals(userId) ? FolderRole.ADMIN : FolderRole.VIEWER;
            tree.add(new FileTreeViewResponseDTO(
                    rootDoc, List.of(), role
            ));
        }

        return tree;
    }

    private FileTreeViewResponseDTO buildFolderNode(
            Folder folder,
            Map<UUID, List<Folder>> foldersByParentId,
            Map<UUID, List<Document>> documentsByFolderId,
            Map<UUID, FolderRole> roleByFolderId,
            UUID userId,
            FolderRole inheritedRole) {

        // Determine current folder's role
        FolderRole computedRole = inheritedRole;
        if (folder.getOwner().getId().equals(userId)) {
            computedRole = FolderRole.ADMIN;
        } else if (roleByFolderId.containsKey(folder.getId())) {
            computedRole = roleByFolderId.get(folder.getId());
        }

        List<FileTreeViewResponseDTO> children = new ArrayList<>();

        // Process subfolders
        List<Folder> subfolders = foldersByParentId.getOrDefault(folder.getId(), List.of());
        for (Folder sub : subfolders) {
            children.add(buildFolderNode(
                    sub,
                    foldersByParentId,
                    documentsByFolderId,
                    roleByFolderId,
                    userId,
                    computedRole)
            );
        }

        // Process documents in this folder
        List<Document> docs = documentsByFolderId.getOrDefault(folder.getId(), List.of());

        for (Document doc : docs) {
            children.add(new FileTreeViewResponseDTO(
                    doc,
                    List.of(),
                    computedRole));
        }

        return new FileTreeViewResponseDTO(folder, children, computedRole);
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

            if (!folderSecurity.hasPermission(doc.getFolder().getId(), FolderRole.VIEWER)) {
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
            if (doc.getFolder() == null) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not authorized to delete this document.");
            }
            if (!doc.getFolder().getOwner().getId().equals(currentUser.getId())
                    && !folderSecurity.hasPermission(doc.getFolder().getId(), FolderRole.EDITOR)) {
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

        if (!folder.getOwner().getId().equals(currentUser.getId())
                && !folderSecurity.hasPermission(id, FolderRole.EDITOR)) {
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
    public void zipFolder(UUID folderId, ZipOutputStream zos, String currentPath) throws IOException {
        List<Document> documents = documentRepository.findByFolderId(folderId);
        for (Document doc : documents) {
            try (InputStream is = fileStorage.download(doc.getS3Key())) {
                if (is != null) {
                    String zipEntryPath = currentPath + doc.getName();
                    zos.putNextEntry(new ZipEntry(zipEntryPath));
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

    @Transactional
    public Document moveDocument(UUID documentId, UUID folderId) {
        Document document = getDocument(documentId);
        Folder folder = null;
        if (folderId != null) {
            folder = folderSecurity.getAuthorizedFolder(folderId, FolderRole.EDITOR);
            if (folder == null) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Folder not found or access denied.");
            }
        }

        document.setFolder(folder);
        return documentRepository.save(document);
    }
}

