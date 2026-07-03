package com.docintel.document.domain;

import com.docintel.folder.domain.Folder;
import com.docintel.user.domain.User;
import jakarta.persistence.*;
import lombok.*;

import org.springframework.data.domain.Persistable;

import java.util.Optional;
import java.util.UUID;

@Data
@AllArgsConstructor
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
}
