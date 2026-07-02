package com.docintel.document.presentation.controller;

import com.docintel.document.application.DocumentService;
import com.docintel.document.domain.Document;
import com.docintel.document.domain.DocumentCategory;
import com.docintel.document.presentation.dto.DocumentDTO;
import com.docintel.document.presentation.dto.FileTreeViewDTO;
import com.docintel.document.presentation.dto.FolderDTO;
import com.docintel.folder.application.FolderService;
import com.docintel.folder.domain.Folder;
import com.docintel.shared.infrastructure.security.CurrentUserProvider;
import com.docintel.user.application.UserService;
import com.docintel.user.domain.User;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.util.MimeType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.io.InputStream;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.zip.ZipOutputStream;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;
    private final FolderService folderService;
    private final UserService userService;
    private final CurrentUserProvider userProvider;

    /**
     * Endpoint to upload a file.
     * Extracts parent folder and dynamic path from 'relativePath' and uploads the file to S3.
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DocumentDTO> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "relativePath", required = false) String relativePath,
            @RequestParam(value = "parentFolderId", required = false) UUID parentFolderId,
            @RequestParam(value = "category", required = false) String category
            ) {

        Document document = documentService.uploadDocument(file, relativePath, parentFolderId, category);

        return ResponseEntity.ok(new DocumentDTO(
                document.getId(),
                document.getName(),
                document.getS3Key(),
                document.getFolder() != null ? document.getFolder().getId() : null,
                document.getOwner().getId(),
                null,
                false,
                document.getCategory(),
                document.isFavorite(),
                document.getTags()
        ));
    }

    /**
     * Endpoint to resolve a dynamic path in the database.
     * Determines whether the relativePath contains a file or just folders, builds the hierarchy,
     * and grants ADMIN permissions to the current user.
     */
    @PostMapping("/resolve-path")
    public ResponseEntity<FolderDTO> resolvePath(
            @RequestParam("relativePath") String relativePath,
            @RequestParam(value = "parentFolderId", required = false) UUID parentFolderId) {

        User currentUser = userProvider.getCurrentUser();
        Folder folder = folderService.resolveAndCreatePath(relativePath, parentFolderId, currentUser);

        return ResponseEntity.ok(new FolderDTO(
                folder != null ? folder.getId() : null,
                folder != null ? folder.getName() : "Root",
                folder != null && folder.getParent() != null ? folder.getParent().getId() : null
        ));
    }

    /**
     * Endpoint to fetch the entire folder and file tree structure.
     */
    @GetMapping("/tree")
    public ResponseEntity<List<FileTreeViewDTO>> getTreeView() {
        List<FileTreeViewDTO> tree = documentService.getFileTreeView();
        return ResponseEntity.ok(tree);
    }

    public record CategoryDetail(
            String id,
            String label,
            String type,
            String description,
            String color
    ) {}

    @GetMapping("/categories")
    public ResponseEntity<List<CategoryDetail>> getCategories() {
        List<CategoryDetail> categories = Arrays.stream(DocumentCategory.values())
                .map(cat -> new CategoryDetail(
                        cat.name(),
                        cat.getLabel(),
                        cat.getType(),
                        cat.getDescription(),
                        cat.getColor()
                ))
                .toList();
        return ResponseEntity.ok(categories);
    }

    @GetMapping("/download/{id}")
    public ResponseEntity<StreamingResponseBody> downloadDocument(@PathVariable UUID id) {
        Document doc = documentService.getDocument(id);
        StreamingResponseBody responseBody = outputStream -> {
            try (InputStream is = documentService.downloadDocumentStream(doc)) {
                if (is != null) {
                    is.transferTo(outputStream);
                }
            }
        };

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + doc.getName() + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(responseBody);
    }

    @GetMapping("/view/{id}")
    public ResponseEntity<StreamingResponseBody> viewDocument(@PathVariable UUID id) {
        Document doc = documentService.getDocument(id);
        StreamingResponseBody responseBody = outputStream -> {
            try (InputStream is = documentService.downloadDocumentStream(doc)) {
                if (is != null) {
                    is.transferTo(outputStream);
                }
            }
        };

        String contentType = MediaTypeFactory.getMediaType(doc.getName())
                .map(MimeType::toString)
                .orElse(MediaType.APPLICATION_OCTET_STREAM_VALUE);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + doc.getName() + "\"")
                .contentType(MediaType.parseMediaType(contentType))
                .body(responseBody);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDocument(@PathVariable UUID id) {
        documentService.deleteDocument(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/folders/{id}")
    public ResponseEntity<Void> deleteFolder(@PathVariable UUID id) {
        documentService.deleteFolder(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/folders/download-zip/{id}")
    public ResponseEntity<StreamingResponseBody> downloadFolderZip(@PathVariable UUID id) {
        Folder folder = folderService.resolveAndCreatePath(null, id, userProvider.getCurrentUser());
        String folderName = folder != null ? folder.getName() : "Drive";

        StreamingResponseBody responseBody = outputStream -> {
            try (ZipOutputStream zos = new ZipOutputStream(outputStream)) {
                documentService.zipFolder(id, zos, "");
            }
        };

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + folderName + ".zip\"")
                .contentType(MediaType.parseMediaType("application/zip"))
                .body(responseBody);
    }

    @GetMapping("/search")
    public ResponseEntity<Page<DocumentDTO>> searchDocuments(
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "favorite", required = false) Boolean favorite,
            @RequestParam(value = "tag", required = false) String tag,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size
    ) {
        Page<Document> result = documentService.searchDocuments(
                search, category, favorite, tag, page, size
        );
        Page<DocumentDTO> dtoPage = result.map(doc -> new DocumentDTO(
                doc.getId(),
                doc.getName(),
                doc.getS3Key(),
                doc.getFolder() != null ? doc.getFolder().getId() : null,
                doc.getOwner().getId(),
                doc.getAgentAnalysis(),
                doc.isAnalyzed(),
                doc.getCategory(),
                doc.isFavorite(),
                doc.getTags()
        ));
        return ResponseEntity.ok(dtoPage);
    }

    @PutMapping("/{id}/favorite")
    public ResponseEntity<DocumentDTO> toggleFavorite(@PathVariable UUID id) {
        Document document = documentService.toggleFavorite(id);
        return ResponseEntity.ok(new DocumentDTO(
                document.getId(),
                document.getName(),
                document.getS3Key(),
                document.getFolder() != null ? document.getFolder().getId() : null,
                document.getOwner().getId(),
                document.getAgentAnalysis(),
                document.isAnalyzed(),
                document.getCategory(),
                document.isFavorite(),
                document.getTags()
        ));
    }

    @PutMapping("/{id}/tags")
    public ResponseEntity<DocumentDTO> updateTags(@PathVariable UUID id, @RequestBody String tags) {
        String cleanTags = tags;
        if (tags != null && (tags.startsWith("\"") && tags.endsWith("\"") || tags.startsWith("'") && tags.endsWith("'"))) {
            cleanTags = tags.substring(1, tags.length() - 1);
        }
        Document document = documentService.updateTags(id, cleanTags);
        return ResponseEntity.ok(new DocumentDTO(
                document.getId(),
                document.getName(),
                document.getS3Key(),
                document.getFolder() != null ? document.getFolder().getId() : null,
                document.getOwner().getId(),
                document.getAgentAnalysis(),
                document.isAnalyzed(),
                document.getCategory(),
                document.isFavorite(),
                document.getTags()
        ));
    }
}

