package com.docintel.modules.document.domain;

import com.docintel.modules.document.domain.enums.DocumentCategory;
import com.docintel.modules.document.domain.enums.DocumentStatus;
import com.docintel.modules.folder.domain.Folder;
import com.docintel.modules.user.domain.User;
import jakarta.persistence.*;
import lombok.*;

import org.springframework.data.domain.Persistable;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Data
@NoArgsConstructor
@Entity
@Table(name = "documents")
public class Document implements Persistable<UUID> {
    @Id
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String s3Key;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DocumentStatus status = DocumentStatus.PENDING;

    @Column(name = "upload_id")
    private String uploadId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "folder_id")
    private Folder folder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Enumerated(EnumType.STRING)
    private DocumentCategory category;

    private boolean analyzed = false;

    private String agentAnalysis = null;

    private boolean favorite = false;

    private String tags = "";

    @Transient
    private boolean isNew = true;

    @Override
    public boolean isNew() {
        return isNew;
    }

    @PostPersist
    @PostLoad
    void markNotNew() {
        this.isNew = false;
    }


    public static Document create(
            String fileName,
            String s3Key,
            Folder folder,
            User owner,
            DocumentCategory category
    ) {
        if (fileName == null || fileName.isBlank()) {
            throw new IllegalArgumentException("Document name cannot be empty");
        }

        if (s3Key == null || s3Key.isBlank()) {
            throw new IllegalArgumentException("S3 key cannot be empty");
        }

        if (owner == null) {
            throw new IllegalArgumentException("Document must have an owner");
        }

        return new Document(
                UUID.randomUUID(),
                fileName,
                s3Key,
                folder,
                owner,
                category != null ? category : DocumentCategory.GENERAL
        );
    }

    private Document(UUID id, String name, String s3Key, Folder folder, User owner, DocumentCategory category) {
        this.id = id;
        this.name = name;
        this.s3Key = s3Key;
        this.folder = folder;
        this.owner = owner;
        this.category = category;
    }

}
