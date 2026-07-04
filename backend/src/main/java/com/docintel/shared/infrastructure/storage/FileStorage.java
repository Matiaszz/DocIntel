package com.docintel.shared.infrastructure.storage;

import java.io.InputStream;
import java.util.List;
import java.util.UUID;

public interface FileStorage {

    InputStream download(String key);

    void deleteFile(UUID userId, UUID fileId);

    boolean deleteProfilePicture(UUID userId, UUID fileId);

    String generatePresignedUploadUrl(String key);

    String initiateMultipartUpload(String key);

    String generatePresignedUploadPartUrl(String key, String uploadId, int partNumber);

    void completeMultipartUpload(String key, String uploadId, List<CompletedPartDTO> parts);

    String generatePresignedDownloadUrl(String key);

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