package com.docintel.folder.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FolderRepository extends JpaRepository<Folder, UUID> {
    Optional<Folder> findByNameAndParent(String name, Folder parent);
    Optional<Folder> findByNameAndParentIsNull(String name);

    @Query("SELECT DISTINCT f FROM Folder f LEFT JOIN FolderPermission fp ON fp.folder = f " +
           "WHERE f.owner.id = :userId OR fp.user.id = :userId OR f.folderVisibility = 'PUBLIC'")
    List<Folder> findAllAccessibleFolders(@Param("userId") UUID userId);

    List<Folder> findByParentId(UUID parentId);
}

