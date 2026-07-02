package com.docintel.shared.infrastructure.storage;

import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.UUID;

public interface FileStorage {

    boolean uploadFile(MultipartFile file, UUID userId, UUID fileId);

    boolean uploadProfilePicture(MultipartFile file, UUID userId, UUID fileId);

    InputStream download(String key);

    void deleteFile(UUID userId, UUID fileId);

    boolean deleteProfilePicture(UUID userId, UUID fileId);

    default String getUserPath(UUID userId){
        return "users/" + userId.toString() + "/";
    }

    default String resolvePictureKey(UUID userId, UUID fileId){
        return getUserPath(userId) + "picture/" + fileId.toString();
    }

    default String resolveFileKey(UUID fileId, String fileName){
        return String.format("documents/%s_%s", fileId.toString(), fileName);
    }

}
