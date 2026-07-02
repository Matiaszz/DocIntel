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
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

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

            String key = resolveFileKey(userId, fileId, fileName);
            Map<String, String> metadata = Map.of(
                    "fileId", fileId.toString(),
                    "originalFilename", fileName
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
        return null;
    }

    @Override
    public boolean deleteFile(UUID userId, UUID fileId) {
        return false;
    }

    @Override
    public boolean deleteProfilePicture(UUID userId, UUID fileId) {
        return false;
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
