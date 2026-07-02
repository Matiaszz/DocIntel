package com.docintel.document.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.UUID;

public interface DocumentRepository extends JpaRepository<Document, UUID> {

    @Query("SELECT DISTINCT d FROM Document d LEFT JOIN Folder f ON d.folder = f LEFT JOIN FolderPermission fp ON fp.folder = f " +
           "WHERE d.owner.id = :userId OR f.owner.id = :userId OR fp.user.id = :userId OR f.folderVisibility = 'PUBLIC' " +
           "OR (d.folder IS NULL AND d.owner.id = :userId)")
    List<Document> findAllAccessibleDocuments(@Param("userId") UUID userId);

    List<Document> findByFolderId(UUID folderId);
}

