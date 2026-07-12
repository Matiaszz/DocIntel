package com.docintel.modules.document.presentation;

import com.docintel.modules.document.application.DocumentService;
import com.docintel.modules.document.domain.Document;
import com.docintel.modules.document.domain.enums.DocumentCategory;
import com.docintel.modules.document.presentation.dto.request.MoveDocumentRequestDTO;
import com.docintel.modules.document.presentation.dto.request.UploadCompleteRequestDTO;
import com.docintel.modules.document.presentation.dto.request.UploadInitiateRequestDTO;
import com.docintel.modules.document.presentation.dto.response.DocumentResponseDTO;
import com.docintel.modules.document.presentation.dto.response.FileTreeViewResponseDTO;
import com.docintel.modules.document.presentation.dto.response.FolderResponseDTO;
import com.docintel.modules.document.presentation.dto.response.UploadInitiateResponseDTO;
import com.docintel.modules.folder.application.FolderService;
import com.docintel.modules.folder.domain.Folder;
import com.docintel.modules.folder.domain.enums.FolderRole;
import com.docintel.modules.folder.infrastructure.security.FolderSecurityEvaluator;
import com.docintel.shared.auth.CurrentUserProvider;
import com.docintel.modules.user.domain.User;
import jakarta.validation.Valid;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.net.URI;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.zip.ZipOutputStream;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;
    private final FolderService folderService;
    private final CurrentUserProvider userProvider;
    private final FolderSecurityEvaluator folderSecurity;

    /**
     * Endpoint to initiate a client-side upload.
     * Registers document metadata and returns upload instructions (URLs).
     */
    @PostMapping("/upload/initiate")
    public ResponseEntity<UploadInitiateResponseDTO> initiateUpload(
            @RequestBody UploadInitiateRequestDTO request
    ) {
        UploadInitiateResponseDTO response = documentService.initiateUpload(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Endpoint to complete an upload.
     * Marks the document as UPLOADED and performs multipart completion if applicable.
     */
    @PostMapping("/{id}/complete")
    public ResponseEntity<DocumentResponseDTO> completeUpload(
            @PathVariable UUID id,
            @RequestBody UploadCompleteRequestDTO request
    ) {
        DocumentResponseDTO completed = documentService.completeUpload(id, request);
        return ResponseEntity.ok(completed);
    }

    /**
     * Endpoint to resolve a dynamic path in the database.
     * Determines whether the relativePath contains a file or just folders, builds the hierarchy,
     * and grants ADMIN permissions to the current user.
     */
    @PostMapping("/resolve-path")
    public ResponseEntity<FolderResponseDTO> resolvePath(
            @RequestParam("relativePath") String relativePath,
            @RequestParam(value = "parentFolderId", required = false) UUID parentFolderId) {

        if (parentFolderId != null && !folderSecurity.hasPermission(parentFolderId, FolderRole.EDITOR)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "You do not have permission to modify this folder.");
        }

        Folder folder = folderService.resolveAndCreatePath(relativePath, parentFolderId);

        return ResponseEntity.ok(new FolderResponseDTO(
                folder != null ? folder.getId() : null,
                folder != null ? folder.getName() : "Root",
                folder != null && folder.getParent() != null ? folder.getParent().getId() : null
        ));
    }

    /**
     * Endpoint to fetch the entire folder and file tree structure.
     */
    @GetMapping("/tree")
    public ResponseEntity<List<FileTreeViewResponseDTO>> getTreeView() {
        List<FileTreeViewResponseDTO> tree = documentService.getFileTreeView();
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

    @GetMapping("/{id}/presigned-url")
    public ResponseEntity<Map<String, String>> getPresignedUrl(@PathVariable UUID id) {
        Document doc = documentService.getDocument(id);
        String presignedUrl = documentService.generatePresignedDownloadUrl(doc);
        return ResponseEntity.ok(Map.of("url", presignedUrl));
    }

    @GetMapping("/download/{id}")
    public ResponseEntity<Void> downloadDocument(@PathVariable UUID id) {
        Document doc = documentService.getDocument(id);
        String presignedUrl = documentService.generatePresignedDownloadUrl(doc);
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(presignedUrl))
                .build();
    }

    @GetMapping("/view/{id}")
    public ResponseEntity<Void> viewDocument(@PathVariable UUID id) {
        Document doc = documentService.getDocument(id);
        String presignedUrl = documentService.generatePresignedDownloadUrl(doc);
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(presignedUrl))
                .build();
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
        if (id != null && !folderSecurity.hasPermission(id, FolderRole.VIEWER)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Not authorized to access this folder.");
        }

        Folder folder = folderService.resolveAndCreatePath(null, id);
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
    public ResponseEntity<Page<DocumentResponseDTO>> searchDocuments(
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
        Page<DocumentResponseDTO> dtoPage = result.map(DocumentResponseDTO::new);
        return ResponseEntity.ok(dtoPage);
    }

    @PutMapping("/{id}/favorite")
    public ResponseEntity<DocumentResponseDTO> toggleFavorite(@PathVariable UUID id) {
        Document document = documentService.toggleFavorite(id);
        return ResponseEntity.ok(new DocumentResponseDTO(document));
    }

    @PutMapping("/{id}/tags")
    public ResponseEntity<DocumentResponseDTO> updateTags(@PathVariable UUID id, @RequestBody String tags) {
        String cleanTags = tags;

        boolean areBetweenQuotes = tags != null && (
                tags.startsWith("\"") && tags.endsWith("\"")
                || tags.startsWith("'") && tags.endsWith("'")
        );

        if (areBetweenQuotes) {
            cleanTags = tags.substring(1, tags.length() - 1);
        }

        Document document = documentService.updateTags(id, cleanTags);
        return ResponseEntity.ok(new DocumentResponseDTO(document));
    }

    @PutMapping("/move/{id}")
    public ResponseEntity<DocumentResponseDTO> moveDocument(

            @PathVariable UUID id,
            @Valid @RequestBody MoveDocumentRequestDTO request
    ) {
        Document document = documentService.moveDocument(id, request.folderId());
        return ResponseEntity.ok(new DocumentResponseDTO(document));
    }
}

