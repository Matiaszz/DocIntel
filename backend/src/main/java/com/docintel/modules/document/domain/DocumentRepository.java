package com.docintel.modules.document.domain;

import com.docintel.modules.document.domain.enums.DocumentCategory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.UUID;

public interface DocumentRepository extends JpaRepository<Document, UUID> {

    @Query("SELECT DISTINCT d FROM Document d LEFT JOIN Folder f ON d.folder = f LEFT JOIN FolderPermission fp ON fp.folder = f " +
           "WHERE (d.owner.id = :userId OR f.owner.id = :userId OR fp.user.id = :userId OR f.folderVisibility = 'PUBLIC' " +
           "OR (d.folder IS NULL AND d.owner.id = :userId)) AND d.status = DocumentStatus.UPLOADED")
    List<Document> findAllAccessibleDocuments(@Param("userId") UUID userId);

    @Query("SELECT DISTINCT d FROM Document d LEFT JOIN Folder f ON d.folder = f LEFT JOIN FolderPermission fp ON fp.folder = f " +
           "WHERE (d.owner.id = :userId OR f.owner.id = :userId OR fp.user.id = :userId OR f.folderVisibility = 'PUBLIC' OR (d.folder IS NULL AND d.owner.id = :userId)) " +
           "AND (:search IS NULL OR LOWER(d.name) LIKE :search) " +
           "AND (:category IS NULL OR d.category = :category) " +
           "AND (:favorite IS NULL OR d.favorite = :favorite) " +
           "AND (:tag IS NULL OR LOWER(d.tags) LIKE :tag) " +
           "AND d.status = DocumentStatus.UPLOADED")
    Page<Document> searchDocuments(
            @Param("userId") UUID userId,
            @Param("search") String search,
            @Param("category") DocumentCategory category,
            @Param("favorite") Boolean favorite,
            @Param("tag") String tag,
            Pageable pageable
    );

    List<Document> findByFolderId(UUID folderId);
}

