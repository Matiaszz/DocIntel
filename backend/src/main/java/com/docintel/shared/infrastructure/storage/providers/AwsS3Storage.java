package com.docintel.shared.infrastructure.storage.providers;

import com.docintel.shared.infrastructure.storage.FileStorage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;

import java.io.IOException;
import java.io.InputStream;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RequiredArgsConstructor
@Service
@ConditionalOnProperty(
        name = "cloud.storage.provider",
        havingValue = "aws"
)
public class AwsS3Storage implements FileStorage {
    @Value("${cloud.aws.s3.bucket.name}")
    private String bucketName;

    private final S3Client s3;


    @Override
    public boolean uploadFile(MultipartFile file, UUID userId, UUID fileId) {
        try {
            String fileName = file.getOriginalFilename();

            if (fileName == null){
                throw new IOException("Filename is null.");
            }

            String key = resolveFileKey(fileId, fileName);

            // S3 user-defined metadata values must be US-ASCII. Non-ASCII characters (like accents or spaces) will corrupt Signature Version 4.
            String encodedFileName = java.net.URLEncoder.encode(fileName, java.nio.charset.StandardCharsets.UTF_8);
            Map<String, String> metadata = Map.of(
                    "fileId", fileId.toString(),
                    "originalFilename", encodedFileName
            );

            putFile(key, file.getBytes(), metadata);

            return true;
        } catch (IOException e){
            log.error(e.getMessage());
            return false;
        }
    }

    @Override
    public boolean uploadProfilePicture(MultipartFile file, UUID userId, UUID fileId) {
        try {
            String key = resolvePictureKey(userId, fileId);
            Map<String, String> metadata = Map.of(
                    "fileId", fileId.toString()
            );

            putFile(key, file.getBytes(), metadata);

            return true;
        } catch (IOException e){
            log.error(e.getMessage());
            return false;
        }
    }

    @Override
    public InputStream download(String key) {
        try {
            return s3.getObject(
                    GetObjectRequest.builder()
                            .bucket(bucketName)
                            .key(key)
                            .build()
            );
        } catch (Exception e) {
            log.error("Failed to download file from S3. Key: {}, Error: {}", key, e.getMessage());
            return null;
        }
    }

    @Override
    public void deleteFile(UUID userId, UUID fileId) {
        try {
            String prefix = "documents/" + fileId.toString() + "_";
           ListObjectsV2Response listResponse = s3.listObjectsV2(
                    ListObjectsV2Request.builder()
                            .bucket(bucketName)
                            .prefix(prefix)
                            .build()
            );

            listResponse.contents().forEach(object -> {
                deleteFile(object.key());
            });
        } catch (Exception e) {
            log.error("Failed to delete file from S3. FileId: {}, Error: {}", fileId, e.getMessage());
        }
    }

    @Override
    public boolean deleteProfilePicture(UUID userId, UUID fileId) {
        try {
            String key = resolvePictureKey(userId, fileId);
            deleteFile(key);
            return true;
        } catch (Exception e) {
            log.error("Failed to delete profile picture from S3. FileId: {}, Error: {}", fileId, e.getMessage());
            return false;
        }
    }

    private void deleteFile(String key){
        s3.deleteObject(
                DeleteObjectRequest.builder()
                        .bucket(bucketName)
                        .key(key)
                        .build()
        );
    }

    private void putFile(String key, byte[] content, Map<String, String> metadata) {
        s3.putObject(
                PutObjectRequest.builder()
                        .bucket(bucketName)
                        .key(key)
                        .metadata(metadata)
                        .build(), RequestBody.fromBytes(content)
        );
    }
}
